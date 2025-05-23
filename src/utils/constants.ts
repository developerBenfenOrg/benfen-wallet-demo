import { normalizeHexAddress } from '@benfen/bfc.js/utils';

export const CHAIN_NAME = {
  MAIN: 'Benfen',
  TEST: 'BenfenTEST',
  DEV: 'BenfenDevTEST',
};

export const BENFEN_CHAINS = {
  // [CHAIN_NAME.MAIN]: {
  //   label: 'Benfen Mainnet',
  //   rpc: 'https://rpc-mainnet.benfen.org',
  //   chain: CHAIN_NAME.MAIN,
  // },
  [CHAIN_NAME.TEST]: {
    label: 'BenFen Testnet',
    rpc: 'https://testrpc.benfen.org',
    chain: CHAIN_NAME.TEST,
    faucet: 'https://testfaucet.benfen.org',
  },
  // [CHAIN_NAME.DEV]: {
  //   label: 'BenFen Devnet',
  //   rpc: 'https://devrpc.benfen.org',
  //   chain: CHAIN_NAME.DEV,
  // },
};

export const SYSTEM_STATE_OBJECT_ID = normalizeHexAddress('0x5');

export const TOKEN_INFO = {
  BFC: {
    address: 'BFC000000000000000000000000000000000000000000000000000000000000000268e4::bfc::BFC',
    decimals: 9,
    symbol: 'BFC',
    logoURI: 'https://obstatic.243096.com/mili/images/currency/chain/Benfen2.png',
  },
  BUSD: {
    address: 'BFC00000000000000000000000000000000000000000000000000000000000000c8e30a::busd::BUSD',
    decimals: 9,
    symbol: 'BUSD',
    logoURI:
      'https://obstatic.243096.com/download/token/images/BenfenTEST/BFC00000000000000000000000000000000000000000000000000000000000000c8e30a::busd::BUSD.png',
  },
};
