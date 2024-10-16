import { useBenfenClient } from '@benfen/bfc.js/dapp-kit';
import { BFC_TYPE_ARG, hex2BfcAddress } from '@benfen/bfc.js/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { MnemonicAccountSource } from '@/background/account-sources/MnemonicAccountSource';
import { addNewAccounts, getAllAccounts } from '@/background/accounts';
import { MnemonicAccount } from '@/background/accounts/MnemonicAccount';
import { useAppStore } from '@/store/app';
import { formatAmount } from '@/utils/helper';

type CreateAccountForm = {
  password: string;
};

const Welcome = () => {
  const client = useBenfenClient();
  const [loading, setLoading] = useState(true);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [accountToUnlock, setAccountToUnlock] = useState<MnemonicAccount>();
  const { account, setAccount, rpc } = useAppStore();

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['queryBalance', account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      return client.getBalance({ coinType: BFC_TYPE_ARG, owner: account!.address });
    },
    refetchInterval: 5000,
  });

  const { mutateAsync: createAccount } = useMutation({
    mutationKey: ['createAccount'],
    mutationFn: async ({ password }: { password: string }) => {
      if (accountToUnlock) {
        await accountToUnlock.passwordUnlock(password);
        setAccount(await accountToUnlock.toUISerialized());
      } else {
        const source = await MnemonicAccountSource.save(
          await MnemonicAccountSource.createNew({
            password,
          }),
        );
        await source.unlock(password);
        const [account] = await addNewAccounts([await source.deriveAccount({})]);
        setAccount(await account.toUISerialized());
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const { mutateAsync: requestTokens } = useMutation({
    mutationKey: ['requestTokens', account?.address],
    mutationFn: async () => {
      setFaucetLoading(true);
      const {
        data: { error, task: taskId },
      } = await axios.post<{
        task?: string | null;
        error?: string | null;
      }>(rpc.faucet + '/v1/gas', {
        FixedAmountRequest: {
          recipient: account!.address,
        },
      });
      if (error || !taskId) {
        throw new Error(error ?? 'Failed, task id not found.');
      }
    },
    onError: (e) => {
      toast.error(e.message);
      setFaucetLoading(false);
    },
    onSuccess: () => {
      refetchBalance();
      setFaucetLoading(false);
    },
  });

  useEffect(() => {
    getAllAccounts().then(async (accounts) => {
      if (accounts.length > 0) {
        if (await accounts[0].isLocked()) {
          setAccountToUnlock(accounts[0]);
        } else {
          setAccount(await accounts[0].toUISerialized());
        }
      }
      setLoading(false);
    });
  }, [setAccount]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAccountForm>({});

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center">Loading ...</div>;
  }

  return (
    <div className="welcome flex flex-col items-start p-10">
      {account ? (
        <div className="flex flex-col items-start gap-5">
          <div className="flex items-center gap-2">
            <span>Address: </span>
            <span>{hex2BfcAddress(account.address)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>PublicKey: </span>
            <span>{account.publicKey}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Balance: </span>
            <span>{formatAmount(balance?.totalBalance || '0')}</span>
          </div>
          <button
            className="cursor-pointer rounded bg-black p-4 text-white"
            disabled={faucetLoading}
            onClick={() => requestTokens()}
          >
            {faucetLoading ? 'Loading ...' : 'Request Tokens'}
          </button>
          <Link className="cursor-pointer rounded bg-black p-4 text-white" to="/dapp">
            Go to DApp
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((data) => createAccount(data))}
          className="flex flex-col items-start gap-4"
        >
          <input
            className="rounded border border-gray-500 p-4"
            placeholder="password"
            {...register('password', { required: true, minLength: 6, maxLength: 16 })}
          />
          {errors?.password && (
            <div className="rounded border-red-500 bg-red-50 p-4 text-red-500">
              {errors.password.message || 'password is required, 6-16 characters'}
            </div>
          )}
          <button type="submit" className="cursor-pointer rounded bg-black p-4 text-white">
            {accountToUnlock ? 'Unlock Account' : 'Create Account'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Welcome;
