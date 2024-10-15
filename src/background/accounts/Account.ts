import {
  toSerializedSignature,
  type Keypair,
  type SerializedSignature,
} from '@benfen/bfc.js/cryptography';
import { blake2b } from '@noble/hashes/blake2b';

import { type Serializable } from '../cryptography/keystore';
import { getDB } from '../db';
import {
  clearEphemeralValue,
  getEphemeralValue,
  setEphemeralValue,
} from '../session-ephemeral-values';
import { accountsEvents } from './events';

export type AccountType = 'mnemonic-derived' | 'imported' | 'ledger' | 'qredo' | 'zkLogin';

export abstract class Account<
  T extends SerializedAccount = SerializedAccount,
  V extends Serializable | null = Serializable,
> {
  readonly id: string;
  readonly type: AccountType;
  // optimization to avoid accessing storage for properties that don't change
  private cachedData: Promise<T> | null = null;

  constructor({ id, type, cachedData }: { id: string; type: AccountType; cachedData?: T }) {
    this.id = id;
    this.type = type;
    if (cachedData) {
      this.cachedData = Promise.resolve(cachedData);
    }
  }

  abstract toUISerialized(): Promise<SerializedUIAccount>;

  get address() {
    return this.getCachedData().then(({ address }) => address);
  }

  get publicKey() {
    return this.getCachedData().then(({ publicKey }) => publicKey);
  }

  protected getCachedData() {
    if (!this.cachedData) {
      this.cachedData = this.getStoredData();
    }
    return this.cachedData;
  }

  protected async getStoredData() {
    const data = await (await getDB()).accounts.get(this.id);
    if (!data) {
      throw new Error(`Account data not found. (id: ${this.id})`);
    }
    return data as T;
  }

  protected generateSignature(data: Uint8Array, keyPair: Keypair) {
    const digest = blake2b(data, { dkLen: 32 });
    const pubkey = keyPair.getPublicKey();
    const signature = keyPair.signData(digest);
    const signatureScheme = keyPair.getKeyScheme();
    return toSerializedSignature({
      signature,
      signatureScheme,
      publicKey: pubkey,
    });
  }

  protected getEphemeralValue(): Promise<V | null> {
    return getEphemeralValue<NonNullable<V>>(this.id);
  }

  protected setEphemeralValue(value: V) {
    if (!value) {
      return;
    }
    return setEphemeralValue(this.id, value);
  }

  protected clearEphemeralValue() {
    return clearEphemeralValue(this.id);
  }

  public async setNickname(nickname: string | null) {
    await (await getDB()).accounts.update(this.id, { nickname });
    accountsEvents.emit('accountStatusChanged', { accountID: this.id });
  }
}

export interface SerializedAccount {
  readonly id: string;
  readonly type: AccountType;
  readonly address: string;
  readonly publicKey: string | null;
  /**
   * indicates if it's the selected account in the UI (active account)
   */
  readonly selected: boolean;
  readonly nickname: string | null;
  readonly createdAt: number;
}

export interface SerializedUIAccount {
  readonly id: string;
  readonly type: AccountType;
  readonly address: string;
  readonly publicKey: string | null;
  /**
   * indicates if it's the selected account in the UI (active account)
   */
  readonly selected: boolean;
  readonly nickname: string | null;
  readonly isKeyPairExportable: boolean;
}

export interface SigningAccount {
  readonly canSign: true;
  signData(data: Uint8Array): Promise<SerializedSignature>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSigningAccount(account: any): account is SigningAccount {
  return 'signData' in account && 'canSign' in account && account.canSign === true;
}

export interface KeyPairExportableAccount {
  readonly exportableKeyPair: true;
  exportKeyPair(password: string): Promise<string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isKeyPairExportableAccount(account: any): account is KeyPairExportableAccount {
  return (
    'exportKeyPair' in account &&
    'exportableKeyPair' in account &&
    account.exportableKeyPair === true
  );
}
