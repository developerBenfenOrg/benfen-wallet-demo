import { BFC_DECIMALS } from '@benfen/bfc.js/utils';
import { BigNumber } from 'bignumber.js';

export const formatAmount = (amount: string | number) => {
  return BigNumber(amount).shiftedBy(-BFC_DECIMALS).toString();
};
