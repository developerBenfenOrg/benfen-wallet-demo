import { bcs } from '@benfen/bfc.js/bcs';
import { BenfenClient } from '@benfen/bfc.js/client';
import { IntentScope, messageWithIntent } from '@benfen/bfc.js/cryptography';
import { fromB64, hex2BfcAddress, toB64 } from '@benfen/bfc.js/utils';
import {
  BFC_CHAINS,
  ReadonlyWalletAccount,
  type BenfenFeatures,
  type BenfenSignAndExecuteTransactionBlockMethod,
  type BenfenSignMessageMethod,
  type BenfenSignPersonalMessageMethod,
  type BenfenSignTransactionBlockMethod,
  type StandardConnectFeature,
  type StandardConnectMethod,
  type StandardEventsFeature,
  type StandardEventsListeners,
  type StandardEventsOnMethod,
  type Wallet,
  type BfcSwitchChainMethod,
} from '@benfen/bfc.js/wallet-standard';
import { registerWallet } from '@benfen/bfc.js/wallet-standard';
import mitt, { type Emitter } from 'mitt';

import { MnemonicAccount } from './accounts/MnemonicAccount';
import { BENFEN_CHAINS } from '@/utils/constants';

type WalletEventsMap = {
  [E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

export class BenfenDemoWallet implements Wallet {
  readonly #events: Emitter<WalletEventsMap>;
  readonly #version = '1.0.0' as const;
  readonly #name = 'Benfen Demo Wallet';
  #account: MnemonicAccount;
  #client: BenfenClient | undefined = undefined;
  #accounts: ReadonlyWalletAccount[];
  #activeRpc: string = '';

  get version() {
    return this.#version;
  }

  get name() {
    return this.#name;
  }

  get icon() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiByeD0iMTYiIGZpbGw9IiM2RkJDRjAiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMC40MjEzIDUyLjc4MzhDMjMuNjQ5NiA1OC4zNzYgMjkuNDMyMSA2MS43MTQyIDM1Ljg4ODggNjEuNzE0MkM0Mi4zNDU1IDYxLjcxNDIgNDguMTI3IDU4LjM3NiA1MS4zNTY0IDUyLjc4MzhDNTQuNTg0OCA0Ny4xOTI2IDU0LjU4NDggNDAuNTE2MyA1MS4zNTY0IDM0LjkyNEwzNy43NTI0IDExLjM2MTVDMzYuOTI0MSA5LjkyNzAxIDM0Ljg1MzUgOS45MjcwMSAzNC4wMjUzIDExLjM2MTVMMjAuNDIxMyAzNC45MjRDMTcuMTkyOSA0MC41MTUyIDE3LjE5MjkgNDcuMTkxNSAyMC40MjEzIDUyLjc4MzhaTTMyLjA1NjYgMjIuNTcxM0wzNC45NTcxIDE3LjU0NzRDMzUuMzcxMiAxNi44MzAxIDM2LjQwNjUgMTYuODMwMSAzNi44MjA2IDE3LjU0NzRMNDcuOTc5MSAzNi44NzQ4QzUwLjAyOTEgNDAuNDI1NCA1MC40MTM5IDQ0LjUzNSA0OS4xMzM1IDQ4LjI5NTRDNDkuMDAwMiA0Ny42ODE5IDQ4LjgxMzggNDcuMDU0MiA0OC41NjI2IDQ2LjQyMDFDNDcuMDIxMyA0Mi41MzA0IDQzLjUzNjMgMzkuNTI4OSAzOC4yMDIzIDM3LjQ5ODJDMzQuNTM1MSAzNi4xMDcxIDMyLjE5NDMgMzQuMDYxMyAzMS4yNDMxIDMxLjQxNzFDMzAuMDE4IDI4LjAwODkgMzEuMjk3NiAyNC4yOTI0IDMyLjA1NjYgMjIuNTcxM1pNMjcuMTEwNyAzMS4xMzc5TDIzLjc5ODYgMzYuODc0OEMyMS4yNzQ4IDQxLjI0NTkgMjEuMjc0OCA0Ni40NjQxIDIzLjc5ODYgNTAuODM1M0MyNi4zMjIzIDU1LjIwNjQgMzAuODQxMyA1Ny44MTUgMzUuODg4OCA1Ny44MTVDMzkuMjQxMyA1Ny44MTUgNDIuMzYxNSA1Ni42NjMzIDQ0LjgxODQgNTQuNjA4OEM0NS4xMzg4IDUzLjgwMjEgNDYuMTMxIDUwLjg0OTIgNDQuOTA1MiA0Ny44MDU4QzQzLjc3MyA0NC45OTU0IDQxLjA0ODIgNDIuNzUxOSAzNi44MDYxIDQxLjEzNkMzMi4wMTEgMzkuMzE3MSAyOC44OTU4IDM2LjQ3NzQgMjcuNTQ4NiAzMi42OTg0QzI3LjM2MzEgMzIuMTc4MSAyNy4yMTg5IDMxLjY1NjggMjcuMTEwNyAzMS4xMzc5WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+' as const;
  }

  get chains() {
    return BFC_CHAINS;
  }

  get features(): StandardConnectFeature & StandardEventsFeature & BenfenFeatures {
    return {
      'standard:connect': {
        version: '1.0.0',
        connect: this.#connect,
      },
      'standard:events': {
        version: '1.0.0',
        on: this.#on,
      },
      'bfc:signTransactionBlock': {
        version: '1.0.0',
        signTransactionBlock: this.#signTransactionBlock,
      },
      'bfc:signAndExecuteTransactionBlock': {
        version: '1.0.0',
        signAndExecuteTransactionBlock: this.#signAndExecuteTransactionBlock,
      },
      'bfc:signMessage': {
        version: '1.0.0',
        signMessage: this.#signMessage,
      },
      'bfc:signPersonalMessage': {
        version: '1.0.0',
        signPersonalMessage: this.#signPersonalMessage,
      },
      'bfc:switchChain': {
        version: '1.0.0',
        switchChain: this.#switchChain,
      },
    };
  }

  get accounts() {
    return this.#accounts;
  }

  #setAccounts(accounts: { address: string; publicKey?: string }[]) {
    this.#accounts = accounts.map(
      ({ address, publicKey }) =>
        new ReadonlyWalletAccount({
          address: hex2BfcAddress(address),
          publicKey: publicKey ? fromB64(publicKey) : new Uint8Array(),
          chains: this.#activeRpc ? [`bfc:${this.#activeRpc}`] : [],
          features: ['bfc:signAndExecuteTransaction'],
        }),
    );
  }

  constructor(rpc: string, account: MnemonicAccount) {
    this.#events = mitt();
    this.#account = account;
    this.#accounts = [];
    this.#setActiveRpc(rpc);
  }

  #on: StandardEventsOnMethod = (event, listener) => {
    this.#events.on(event, listener);
    return () => this.#events.off(event, listener);
  };

  #connected = async () => {
    if (this.#accounts.length) {
      this.#events.emit('change', { accounts: this.accounts });
    }
  };

  #connect: StandardConnectMethod = async () => {
    this.#setAccounts([
      {
        address: await this.#account.address,
      },
    ]);
    await this.#connected();

    return { accounts: this.accounts };
  };

  #signTransactionBlock: BenfenSignTransactionBlockMethod = async ({ transactionBlock }) => {
    transactionBlock.setSenderIfNotSet(await this.#account!.address);
    const bytes = await transactionBlock.build({ client: this.#client });
    const signature = await this.#account!.signData(
      messageWithIntent(IntentScope.TransactionData, bytes),
    );
    const b64bytes = toB64(bytes);

    return {
      transactionBlockBytes: b64bytes,
      signature,
    };
  };

  #signAndExecuteTransactionBlock: BenfenSignAndExecuteTransactionBlockMethod = async (input) => {
    const signed = await this.#signTransactionBlock(input);

    return this.#client!.executeTransactionBlock({
      transactionBlock: fromB64(signed.transactionBlockBytes),
      signature: signed.signature,
      options: input.options,
      requestType: input.requestType,
    });
  };

  #signMessage: BenfenSignMessageMethod = async ({ message }) => {
    const messageData = messageWithIntent(
      IntentScope.PersonalMessage,
      bcs.ser(['vector', 'u8'], message).toBytes(),
    );
    const signature = await this.#account!.signData(messageData);
    const messageBytes = toB64(message);

    return {
      messageBytes,
      signature,
    };
  };

  #signPersonalMessage: BenfenSignPersonalMessageMethod = async ({ message, account }) => {
    const { messageBytes, signature } = await this.#signMessage({ message, account });

    return {
      bytes: messageBytes,
      signature,
    };
  };

  #switchChain: BfcSwitchChainMethod = async ({ chain }) => {
    const info = Object.values(BENFEN_CHAINS).find((i) => i.chain === chain || i.rpc === chain);
    if (info) {
      this.#setActiveRpc(info.rpc);
    } else {
      this.#setActiveRpc(chain);
    }
    return info?.chain || chain;
  };

  #setActiveRpc(rpc: string) {
    this.#activeRpc = rpc;
    this.#client = new BenfenClient({ url: rpc });
  }
}

let provider: BenfenDemoWallet | undefined = undefined;

export const initializeProvider = (rpc: string, account: MnemonicAccount) => {
  if (!provider) {
    provider = new BenfenDemoWallet(rpc, account);
  }
  registerWallet(provider);
};
