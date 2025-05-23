import {
  useBenfenClient,
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
} from '@benfen/bfc.js/dapp-kit';
import { TransactionBlock } from '@benfen/bfc.js/transactions';
import { BFC_DECIMALS, isValidBenfenAddress } from '@benfen/bfc.js/utils';
import { useMutation } from '@tanstack/react-query';
import { BigNumber } from 'bignumber.js';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { TOKEN_INFO } from '@/utils/constants';
import { computeTxBudget } from '@/utils/helper';

type TransferCoinForm = {
  busdGas: boolean;
  amount: string;
  address: string;
};

const TransferCoin = () => {
  const client = useBenfenClient();
  const currentAccount = useCurrentAccount();

  const { mutateAsync: executeTransactionBlock } = useSignAndExecuteTransactionBlock({
    executeFromWallet: true,
  });

  const { mutateAsync: transferCoin, isPending } = useMutation({
    mutationKey: ['transferCoin'],
    mutationFn: async ({ amount, address, busdGas }: TransferCoinForm) => {
      if (!amount) {
        throw new Error('Amount is required');
      }
      if (!isValidBenfenAddress(address)) {
        throw new Error('Invalid address');
      }
      const tx = new TransactionBlock();
      const bigintAmount = BigInt(new BigNumber(amount).shiftedBy(BFC_DECIMALS).toFixed(0));
      const { data: bfcCoins } = await client.getCoins({
        owner: currentAccount!.address,
        coinType: TOKEN_INFO.BFC.address,
      });

      let gasCoins = bfcCoins;
      let coin: ReturnType<(typeof tx)['splitCoins']>;
      if (busdGas) {
        const { data: busdCoins } = await client.getCoins({
          owner: currentAccount!.address,
          coinType: TOKEN_INFO.BUSD.address,
        });
        gasCoins = busdCoins;
        const [primaryCoins, ...otherCoins] = bfcCoins;
        if (otherCoins.length > 0) {
          tx.mergeCoins(
            tx.object(primaryCoins.coinObjectId),
            otherCoins.map((i) => tx.object(i.coinObjectId)),
          );
        }
        coin = tx.splitCoins(tx.object(primaryCoins.coinObjectId), [tx.pure(bigintAmount)]);
      } else {
        coin = tx.splitCoins(tx.gas, [tx.pure(bigintAmount)]);
      }

      tx.transferObjects([coin], tx.pure(address));
      tx.setGasPayment(
        gasCoins.map((i) => ({ objectId: i.coinObjectId, version: i.version, digest: i.digest })),
      );
      tx.setSenderIfNotSet(currentAccount!.address);

      await computeTxBudget(
        tx,
        gasCoins.reduce((pre, cur) => BigInt(cur.balance) + pre, 0n),
        busdGas ? TOKEN_INFO.BUSD : TOKEN_INFO.BFC,
        client,
      );

      const result = await executeTransactionBlock({
        transactionBlock: tx,
      });
      if (result.effects?.status.error) {
        throw new Error(result.effects.status.error);
      }
    },
    onSuccess: () => {
      toast.success('Transfer successful');
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const { handleSubmit, register } = useForm<TransferCoinForm>();

  return (
    <form
      className="flex flex-col items-start gap-4 rounded border border-green-500 p-4"
      onSubmit={handleSubmit((data) => transferCoin(data))}
    >
      <div>Transfer Coin</div>
      <input
        className="rounded border border-gray-500 p-4"
        placeholder="amount"
        {...register('amount')}
      />
      <input
        className="rounded border border-gray-500 p-4"
        placeholder="address"
        {...register('address')}
      />
      <label>
        <input type="checkbox" {...register('busdGas')} />
        use BUSD gas
      </label>
      <button type="submit" className="rounded bg-black p-4 text-white" disabled={isPending}>
        {isPending ? 'Transferring...' : 'Transfer'}
      </button>
    </form>
  );
};

export default TransferCoin;
