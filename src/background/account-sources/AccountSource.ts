import { getDB } from '../db';
import {
  clearEphemeralValue,
  getEphemeralValue,
  setEphemeralValue,
} from '../session-ephemeral-values';
import { type Serializable } from '@/background/cryptography/keystore';

export type AccountSourceType = 'mnemonic' | 'qredo';

export abstract class AccountSource<
  T extends AccountSourceSerialized = AccountSourceSerialized,
  V extends Serializable = Serializable,
> {
  readonly id: string;
  readonly type: AccountSourceType;

  constructor({ id, type }: { type: AccountSourceType; id: string }) {
    this.id = id;
    this.type = type;
  }

  abstract toUISerialized(): Promise<AccountSourceSerializedUI>;

  protected async getStoredData() {
    const data = await (await getDB()).accountSources.get(this.id);
    if (!data) {
      throw new Error(`Account data not found. (id: ${this.id})`);
    }
    return data as T;
  }

  protected getEphemeralValue(): Promise<V | null> {
    return getEphemeralValue<V>(this.id);
  }

  protected setEphemeralValue(value: V) {
    return setEphemeralValue(this.id, value);
  }

  protected clearEphemeralValue() {
    return clearEphemeralValue(this.id);
  }
}

export interface AccountSourceSerialized {
  readonly id: string;
  readonly type: AccountSourceType;
  readonly createdAt: number;
}

export type AccountSourceSerializedUI = {
  readonly id: string;
  readonly type: AccountSourceType;
};
