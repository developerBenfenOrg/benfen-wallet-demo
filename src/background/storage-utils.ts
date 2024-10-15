import { v4 as uuidV4 } from 'uuid';

import {
  decrypt,
  encrypt,
  getRandomPassword,
  makeEphemeraPassword,
  type Serializable,
} from './cryptography/keystore';

const SESSION_STORAGE = window.sessionStorage;

async function getFromStorage<T>(
  storage: Storage,
  key: string,
  defaultValue: T | null = null,
): Promise<T | null> {
  const data = storage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data) as T;
    } catch (_e) {
      return defaultValue;
    }
  }
  return defaultValue;
}

async function setToStorage<T>(storage: Storage, key: string, value: T): Promise<void> {
  return storage.setItem(key, JSON.stringify(value));
}

export function isSessionStorageSupported() {
  return !!SESSION_STORAGE;
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type OmitFirst<T extends any[]> = T extends [any, ...infer R] ? R : never;
type GetParams<T> = OmitFirst<Parameters<typeof getFromStorage<T>>>;
type SetParams<T> = OmitFirst<Parameters<typeof setToStorage<T>>>;

export function getFromLocalStorage<T>(...params: GetParams<T>) {
  return getFromStorage<T>(window.localStorage, ...params);
}
export function setToLocalStorage<T>(...params: SetParams<T>) {
  return setToStorage<T>(window.localStorage, ...params);
}
export async function getFromSessionStorage<T>(...params: GetParams<T>) {
  if (!SESSION_STORAGE) {
    return null;
  }
  return getFromStorage<T>(SESSION_STORAGE, ...params);
}
export async function setToSessionStorage<T>(...params: SetParams<T>) {
  if (!SESSION_STORAGE) {
    return;
  }
  return setToStorage<T>(SESSION_STORAGE, ...params);
}
export async function removeFromSessionStorage(key: string) {
  if (!SESSION_STORAGE) {
    return;
  }
  await SESSION_STORAGE.remove(key);
}
export async function setToSessionStorageEncrypted<T extends Serializable>(key: string, value: T) {
  const random = getRandomPassword();
  await setToSessionStorage(key, {
    random,
    data: await encrypt(makeEphemeraPassword(random), value),
  });
}
export async function getEncryptedFromSessionStorage<T extends Serializable>(key: string) {
  const encryptedData = await getFromSessionStorage<{ random: string; data: string }>(key, null);
  if (!encryptedData) {
    return null;
  }
  try {
    return decrypt<T>(makeEphemeraPassword(encryptedData.random), encryptedData.data);
  } catch (_e) {
    return null;
  }
}

/**
 * Generates a unique id using uuid, that can be used as a key for storage data
 */
export function makeUniqueKey() {
  return uuidV4();
}
