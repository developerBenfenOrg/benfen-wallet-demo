export const CHAIN_NAME = {
  MAIN: 'Benfen',
  TEST: 'BenfenTEST',
  DEV: 'BenfenDevTEST',
};

export const BENFEN_CHAINS = {
  [CHAIN_NAME.MAIN]: {
    label: 'Benfen Mainnet',
    rpc: 'https://rpc-mainnet.benfen.org',
    chain: CHAIN_NAME.MAIN,
  },
  [CHAIN_NAME.TEST]: {
    label: 'BenFen Testnet',
    rpc: 'https://testrpc.benfen.org',
    chain: CHAIN_NAME.TEST,
  },
  [CHAIN_NAME.DEV]: {
    label: 'BenFen Devnet',
    rpc: 'https://devrpc.benfen.org',
    chain: CHAIN_NAME.DEV,
  },
};