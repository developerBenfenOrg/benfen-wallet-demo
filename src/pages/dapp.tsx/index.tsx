import {
  useBenfenClient,
  useConnectWallet,
  useCurrentAccount,
  useWallets,
} from '@benfen/bfc.js/dapp-kit';
import { hex2BfcAddress } from '@benfen/bfc.js/utils';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import StakeCoin from './components/stake-coin';
import SwapBusd from './components/swap-busd';
import TransferCoin from './components/transfer-coin';
import { getAllAccounts } from '@/background/accounts';
import { initializeProvider } from '@/background/provider';
import { useAppStore } from '@/store/app';
import { formatAmount } from '@/utils/helper';

const DApp = () => {
  const navigate = useNavigate();
  const { rpc } = useAppStore();
  const wallets = useWallets();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: connect } = useConnectWallet();
  const client = useBenfenClient();

  const { data: balances } = useQuery({
    queryKey: ['queryBalance', currentAccount?.address],
    enabled: !!currentAccount?.address,
    queryFn: async () => {
      return client.getAllBalances({ owner: currentAccount!.address });
    },
    refetchInterval: 5000,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllAccounts().then(async (accounts) => {
      if (accounts.length === 0) {
        navigate('/welcome');
      } else if (await accounts[0].isLocked()) {
        navigate('/welcome');
      } else {
        initializeProvider(rpc.rpc, accounts[0]);
        setLoading(false);
      }
    });
  }, [navigate, rpc]);

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center">Loading ...</div>;
  }

  return (
    <div className="dapp flex flex-col items-start p-10">
      {currentAccount ? (
        <div className="flex flex-col items-start gap-5">
          <div className="flex items-center gap-2">
            <span>Address: </span>
            <span>{hex2BfcAddress(currentAccount.address)}</span>
          </div>
          {balances?.map((i) => (
            <div className="flex items-center gap-2" key={i.coinType}>
              <span>{i.coinType}</span>
              <span>{formatAmount(i?.totalBalance || '0')}</span>
            </div>
          ))}
          <div className={'flex items-start gap-10'}>
            <TransferCoin />
            <StakeCoin />
            <SwapBusd />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-stretch gap-5">
          {wallets.map((wallet) => (
            <div
              key={wallet.name}
              className="cursor-pointer bg-green-100 p-4"
              onClick={() => {
                connect({ wallet });
              }}
            >
              {wallet.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DApp;
