import { BenfenClient } from '@benfen/bfc.js/client';
import {
  GAS_SAFE_OVERHEAD,
  DEFAULT_GAS_PRICE,
  TransactionBlock,
} from '@benfen/bfc.js/transactions';
import {
  bfc2HexAddress,
  BFC_DECIMALS,
  MIST_PER_BFC,
  normalizeStructTag,
  parseStructTag,
} from '@benfen/bfc.js/utils';
import { BigNumber } from 'bignumber.js';

import { TOKEN_INFO } from './constants';

export const formatAmount = (amount: string | number) => {
  return BigNumber(amount).shiftedBy(-BFC_DECIMALS).toString();
};

export const normalizeStructTagForRpc = (address: string) => {
  const tag = parseStructTag(address);
  tag.address = bfc2HexAddress(tag.address);
  return normalizeStructTag(tag);
};

export const computeTxBudget = async (
  tx: TransactionBlock,
  gasBalance: bigint,
  gasToken: (typeof TOKEN_INFO)['BFC'],
  client: BenfenClient,
) => {
  const MAX_BFC_BUDGET = 50_000_000_000n;
  let overhead = GAS_SAFE_OVERHEAD * DEFAULT_GAS_PRICE;
  if (gasToken.address === TOKEN_INFO.BFC.address) {
    tx.setGasBudget(gasBalance < MAX_BFC_BUDGET ? gasBalance : MAX_BFC_BUDGET);
  } else {
    const rate = BigInt(await client.getStableRate(normalizeStructTagForRpc(gasToken.address)));
    const max = (((MAX_BFC_BUDGET * MIST_PER_BFC) / rate) * 9n) / 10n; // 10% overhead
    overhead = (overhead * MIST_PER_BFC) / rate;
    tx.setGasBudget(gasBalance < max ? gasBalance : max);
  }
  const result = await client.dryRunTransactionBlock({
    transactionBlock: await tx.build({ client }),
  });
  if (result.effects.status.status !== 'success') {
    throw new Error(result.effects.status.error || 'Unknown error');
  }
  const gasUsed = result.effects.gasUsed;
  const budget = BigInt(gasUsed.computationCost) + BigInt(gasUsed.storageCost) + overhead;
  tx.setGasBudget(budget < gasBalance ? budget : gasBalance);
};
