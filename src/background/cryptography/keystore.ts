// Copyright (c) Benfen
// SPDX-License-Identifier: Apache-2.0

import {
  decrypt as metamaskDecrypt,
  encrypt as metamaskEncrypt,
} from '@metamask/browser-passworder';
import { randomBytes } from '@noble/hashes/utils';

// we use this password + a random one for each time we store the encrypted
// vault to session storage
const PASSWORD =
  '7dvZ4wXUAclEymbMqCGroWgsa2nfQ1ijSJ9zV0hRkPL853TIeuHDNFpBKOYt6xKLXSnWuIhEJwWJVT2ejwNNBA6qc25aQnT1ZLvCALAzwesYXsEOkoXCOfvxGiWOX42U';

export type Serializable =
  | string
  | number
  | boolean
  | null
  | { [index: string]: Serializable | undefined }
  | Serializable[]
  | (Iterable<Serializable> & { length: number });

export async function encrypt(password: string, secrets: Serializable): Promise<string> {
  return metamaskEncrypt(password, secrets);
}

export async function decrypt<T extends Serializable>(
  password: string,
  ciphertext: string,
): Promise<T> {
  return (await metamaskDecrypt(password, ciphertext)) as T;
}

export function getRandomPassword() {
  return Buffer.from(randomBytes(64)).toString('hex');
}

export function makeEphemeraPassword(rndPass: string) {
  return `${PASSWORD}${rndPass}`;
}

const obfuscationPassword = 'lknTmsZJIexvjA5UbgRM9Hzu8pDNF2YE';

export function obfuscate(value: Serializable) {
  return encrypt(obfuscationPassword, value);
}

export function deobfuscate<T extends Serializable>(obfuscatedValue: string) {
  return decrypt<T>(obfuscationPassword, obfuscatedValue);
}
