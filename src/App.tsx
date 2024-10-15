import { NetworkConfig, BenfenClientProvider } from '@benfen/bfc.js/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { RouterProvider, createBrowserRouter, redirect } from 'react-router-dom';

import Layout from './layout';
import Welcome from './pages/welcome';
import { useAppStore } from '@/store/app';
import { BENFEN_CHAINS } from '@/utils/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // We default the stale time to 5 minutes, which is an arbitrary number selected to
      // strike the balance between stale data and cache hits.
      // Individual queries can override this value based on their caching needs.
      staleTime: 5 * 60 * 1000,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      // TODO: re-enable/remove when api is healthy ===>
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      //<======
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        loader: () => redirect('/welcome'),
      },
      {
        path: '/welcome',
        element: <Welcome />,
      },
    ],
  },
]);

function App() {
  const { rpc } = useAppStore();

  const networks: Record<string, NetworkConfig> = useMemo(() => {
    return Object.values(BENFEN_CHAINS).reduce(
      (pre, cur) => ({
        ...pre,
        [cur.chain]: { url: cur.rpc },
      }),
      {},
    );
  }, []);

  const network: keyof typeof networks = useMemo(() => {
    return rpc.chain;
  }, [rpc]);

  return (
    <QueryClientProvider client={queryClient}>
      <BenfenClientProvider network={network} networks={networks}>
        <RouterProvider router={router}></RouterProvider>
      </BenfenClientProvider>
    </QueryClientProvider>
  );
}

export default App;
