import { type Keypair, type SignatureScheme } from '@benfen/bfc.js/cryptography';
import {
  decodeBenfenPrivateKey,
  LEGACY_PRIVATE_KEY_SIZE,
  PRIVATE_KEY_SIZE,
} from '@benfen/bfc.js/cryptography';
import { Ed25519Keypair } from '@benfen/bfc.js/keypairs/ed25519';
import { Secp256k1Keypair } from '@benfen/bfc.js/keypairs/secp256k1';
import { Secp256r1Keypair } from '@benfen/bfc.js/keypairs/secp256r1';
import { fromB64 } from '@benfen/bfc.js/utils';

/**
 * Wallet stored data might contain imported accounts with their keys stored in the previous format.
 * Using this type to type-check it.
 */
export type LegacyExportedKeyPair = {
  schema: SignatureScheme;
  privateKey: string;
};

export function fromExportedKeypair(
  secret: LegacyExportedKeyPair | string,
  legacySupport = false,
): Keypair {
  let schema;
  let secretKey;
  if (typeof secret === 'object') {
    if (!legacySupport) {
      throw new Error('Invalid type of secret key. A string value was expected.');
    }
    secretKey = fromB64(secret.privateKey);
    schema = secret.schema;
  } else {
    const decoded = decodeBenfenPrivateKey(secret);
    schema = decoded.schema;
    secretKey = decoded.secretKey;
  }
  switch (schema) {
    case 'ED25519': {
      let pureSecretKey = secretKey;
      if (secretKey.length === LEGACY_PRIVATE_KEY_SIZE) {
        // This is a legacy secret key, we need to strip the public key bytes and only read the first 32 bytes
        pureSecretKey = secretKey.slice(0, PRIVATE_KEY_SIZE);
      }
      return Ed25519Keypair.fromSecretKey(pureSecretKey);
    }
    case 'Secp256k1':
      return Secp256k1Keypair.fromSecretKey(secretKey);
    case 'Secp256r1':
      return Secp256r1Keypair.fromSecretKey(secretKey);
    default:
      throw new Error(`Invalid keypair schema ${schema}`);
  }
}
