import { hex2BfcAddress } from '@benfen/bfc.js/utils';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { MnemonicAccountSource } from '@/background/account-sources/MnemonicAccountSource';
import { addNewAccounts } from '@/background/accounts';
import { useAppStore } from '@/store/app';

type CreateAccountForm = {
  password: string;
};

const Welcome = () => {
  const { account, setAccount } = useAppStore();

  const { mutateAsync: createAccount } = useMutation({
    mutationKey: ['createAccount'],
    mutationFn: async ({ password }: { password: string }) => {
      const source = await MnemonicAccountSource.save(
        await MnemonicAccountSource.createNew({
          password,
        }),
      );
      await source.unlock(password);
      const [account] = await addNewAccounts([await source.deriveAccount({})]);
      const info = await account.toUISerialized();
      setAccount(info);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAccountForm>({});

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
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((data) => createAccount(data))}
          className="flex flex-col items-start gap-4"
        >
          <input
            className="rounded p-4"
            placeholder="password"
            {...register('password', { required: true, minLength: 6, maxLength: 16 })}
          />
          {errors?.password && (
            <div className="rounded border-red-500 bg-red-50 p-4 text-red-500">
              {errors.password.message || 'password is required, 6-16 characters'}
            </div>
          )}
          <button type="submit" className="cursor-pointer rounded bg-black p-4 text-white">
            Create Account
          </button>
        </form>
      )}
    </div>
  );
};

export default Welcome;
