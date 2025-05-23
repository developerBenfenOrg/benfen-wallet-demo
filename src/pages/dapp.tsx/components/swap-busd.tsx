import { useSignAndExecuteTransactionBlock } from '@benfen/bfc.js/dapp-kit';
import { TransactionBlock } from '@benfen/bfc.js/transactions';
import { BENFEN_CLOCK_OBJECT_ID, BFC_DECIMALS } from '@benfen/bfc.js/utils';
import { useMutation } from '@tanstack/react-query';
import { BigNumber } from 'bignumber.js';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { TOKEN_INFO } from '@/utils/constants';

type SwapBusdForm = {
  amount: string;
};

const SwapBusd = () => {
  const { mutateAsync: executeTransactionBlock } = useSignAndExecuteTransactionBlock({
    executeFromWallet: true,
  });

  const { mutateAsync: swapBusd, isPending } = useMutation({
    mutationKey: ['swapBusd'],
    mutationFn: async ({ amount }: SwapBusdForm) => {
      if (!amount) {
        throw new Error('Amount is required');
      }
      const tx = new TransactionBlock();
      const bigintAmount = BigInt(new BigNumber(amount).shiftedBy(BFC_DECIMALS).toFixed(0));
      const coin = tx.splitCoins(tx.gas, [tx.pure(bigintAmount)]);
      tx.moveCall({
        target: '0xc8::bfc_system::swap_bfc_to_stablecoin',
        typeArguments: [TOKEN_INFO.BUSD.address],
        arguments: [
          tx.object('0xc9'),
          coin,
          tx.object(BENFEN_CLOCK_OBJECT_ID),
          tx.pure(bigintAmount),
          tx.pure('0'),
          tx.pure(dayjs().add(30, 'minute').valueOf()),
        ],
      });
      const result = await executeTransactionBlock({
        transactionBlock: tx,
      });
      if (result.effects?.status.error) {
        throw new Error(result.effects.status.error);
      }
    },
    onSuccess: () => {
      toast.success('Swap successful');
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const { handleSubmit, register } = useForm<SwapBusdForm>();

  return (
    <form
      className="flex flex-col items-start gap-4 rounded border border-green-500 p-4"
      onSubmit={handleSubmit((data) => swapBusd(data))}
    >
      <div>Swap Busd</div>
      <input
        className="rounded border border-gray-500 p-4"
        placeholder="bfc amount"
        {...register('amount')}
      />
      <button type="submit" className="rounded bg-black p-4 text-white" disabled={isPending}>
        {isPending ? 'Swaping...' : 'Swap'}
      </button>
    </form>
  );
};

export default SwapBusd;
