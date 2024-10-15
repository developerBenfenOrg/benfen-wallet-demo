import { type Serializable } from './cryptography/keystore';
import {
  getEncryptedFromSessionStorage,
  removeFromSessionStorage,
  setToSessionStorageEncrypted,
} from './storage-utils';

export function getEphemeralValue<T extends Serializable>(id: string) {
  return getEncryptedFromSessionStorage<T>(id);
}

export function setEphemeralValue<T extends Serializable>(id: string, data: T) {
  return setToSessionStorageEncrypted(id, data);
}

export function clearEphemeralValue(id: string) {
  return removeFromSessionStorage(id);
}