import { create } from 'zustand';

import { MnemonicSerializedUiAccount } from '@/background/accounts/MnemonicAccount';
import { BENFEN_CHAINS, CHAIN_NAME } from '@/utils/constants';

type RPC = (typeof BENFEN_CHAINS)[string];

export interface AppState {
  rpc: RPC;
  setRpc: (rpc: RPC) => void;
  account: MnemonicSerializedUiAccount | undefined;
  setAccount: (account: MnemonicSerializedUiAccount) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  rpc: BENFEN_CHAINS[CHAIN_NAME.TEST],
  setRpc: (rpc) => set({ rpc }),
  account: undefined,
  setAccount: (account) => set({ account }),
}));
