import { useSignAndExecuteTransactionBlock } from '@benfen/bfc.js/dapp-kit';
import { TransactionBlock } from '@benfen/bfc.js/transactions';
import { BFC_DECIMALS, isValidBenfenAddress } from '@benfen/bfc.js/utils';
import { useMutation } from '@tanstack/react-query';
import { BigNumber } from 'bignumber.js';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

type TransferCoinForm = {
  amount: string;
  address: string;
};

const TransferCoin = () => {
  const { mutateAsync: executeTransactionBlock } = useSignAndExecuteTransactionBlock({
    executeFromWallet: true,
  });

  const { mutateAsync: transferCoin, isPending } = useMutation({
    mutationKey: ['transferCoin'],
    mutationFn: async ({ amount, address }: TransferCoinForm) => {
      if (!amount) {
        throw new Error('Amount is required');
      }
      if (!isValidBenfenAddress(address)) {
        throw new Error('Invalid address');
      }
      const tx = new TransactionBlock();
      const bigintAmount = BigInt(new BigNumber(amount).shiftedBy(BFC_DECIMALS).toFixed(0));
      const coin = tx.splitCoins(tx.gas, [tx.pure(bigintAmount)]);
      tx.transferObjects([coin], tx.pure(address));
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
      <button type="submit" className="rounded bg-black p-4 text-white" disabled={isPending}>
        {isPending ? 'Transferring...' : 'Transfer'}
      </button>
    </form>
  );
};

export default TransferCoin;
