import { useBenfenClient, useSignAndExecuteTransactionBlock } from '@benfen/bfc.js/dapp-kit';
import { TransactionBlock } from '@benfen/bfc.js/transactions';
import { BFC_DECIMALS, isValidBenfenAddress } from '@benfen/bfc.js/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BigNumber } from 'bignumber.js';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { SYSTEM_STATE_OBJECT_ID } from '@/utils/constants';

type StakeCoinForm = {
  amount: string;
  validator: string;
};

const StakeCoin = () => {
  const client = useBenfenClient();

  const { mutateAsync: executeTransactionBlock } = useSignAndExecuteTransactionBlock({
    executeFromWallet: true,
  });

  const { data: systemState } = useQuery({
    queryKey: ['querySystemState'],
    queryFn: async () => {
      return client.getLatestBenfeSystemState();
    },
  });

  const { mutateAsync: stakeCoin, isPending } = useMutation({
    mutationKey: ['stakeCoin'],
    mutationFn: async ({ amount, validator }: StakeCoinForm) => {
      if (!amount) {
        throw new Error('Amount is required');
      }
      if (!isValidBenfenAddress(validator)) {
        throw new Error('Invalid validator address');
      }
      const tx = new TransactionBlock();
      const bigintAmount = BigInt(new BigNumber(amount).shiftedBy(BFC_DECIMALS).toFixed(0));
      const coin = tx.splitCoins(tx.gas, [tx.pure(bigintAmount)]);
      tx.moveCall({
        target: '0x3::sui_system::request_add_stake',
        arguments: [
          tx.sharedObjectRef({
            objectId: SYSTEM_STATE_OBJECT_ID,
            initialSharedVersion: 1,
            mutable: true,
          }),
          coin,
          tx.pure(validator),
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
      toast.success('Stake successful');
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const { handleSubmit, register } = useForm<StakeCoinForm>();

  return (
    <form
      className="flex flex-col items-start gap-4 rounded border border-green-500 p-4"
      onSubmit={handleSubmit((data) => stakeCoin(data))}
    >
      <div>Stake Coin</div>
      <input
        className="rounded border border-gray-500 p-4"
        placeholder="amount"
        {...register('amount')}
      />
      <select
        {...register('validator')}
        className="flex flex-col gap-2 rounded border border-gray-500 p-4"
      >
        {systemState?.activeValidators.map((i) => (
          <option key={i.suiAddress} value={i.suiAddress}>
            {i.name}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-black p-4 text-white" disabled={isPending}>
        {isPending ? 'Staking...' : 'Stake'}
      </button>
    </form>
  );
};

export default StakeCoin;
