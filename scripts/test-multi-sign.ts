import { BenfenClient } from '@benfen/bfc.js/client';
import {
  decodeBenfenPrivateKey,
  LEGACY_PRIVATE_KEY_SIZE,
  PRIVATE_KEY_SIZE,
} from '@benfen/bfc.js/cryptography';
import { Ed25519Keypair } from '@benfen/bfc.js/keypairs/ed25519';
import { Secp256k1Keypair } from '@benfen/bfc.js/keypairs/secp256k1';
import { Secp256r1Keypair } from '@benfen/bfc.js/keypairs/secp256r1';
import { MultiSigPublicKey } from '@benfen/bfc.js/multisig';
import { TransactionBlock } from '@benfen/bfc.js/transactions';
import {
  bfc2HexAddress,
  hex2BfcAddress,
  normalizeStructTag,
  parseStructTag,
} from '@benfen/bfc.js/utils';
import { BigNumber } from 'bignumber.js';

const multiplyByDecimal = (amount: string | number | BigNumber, decimal: number) => {
  return new BigNumber(amount).shiftedBy(decimal).toString();
};
const TOKEN_INFO = {
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
  BJPY: {
    address: 'BFC00000000000000000000000000000000000000000000000000000000000000c8e30a::bjpy::BJPY',
    decimals: 9,
    symbol: 'BJPY',
    logoURI:
      'https://obstatic.243096.com/download/token/images/BenfenTEST/BFC00000000000000000000000000000000000000000000000000000000000000c8e30a::bjpy::BJPY.png',
  },
};

const normalizeStructTagForRpc = (address: string) => {
  const tag = parseStructTag(address);
  tag.address = bfc2HexAddress(tag.address);
  return normalizeStructTag(tag);
};

export const test_multisig = async () => {
  // const ed25519Keypair = new Ed25519Keypair();
  // const secp256k1Keypair = new Secp256k1Keypair();
  // const secp256r1Keypair = new Secp256r1Keypair();

  // console.log('ed25519Keypair getSecretKey',ed25519Keypair.getSecretKey());
  // console.log('secp256k1Keypair getSecretKey',secp256k1Keypair.getSecretKey());
  // console.log('secp256r1Keypair getSecretKey',secp256r1Keypair.getSecretKey());
  const ed25519KeypairSecretKeyStr =
    'benfenprivkey1qz9c8z8wluu5p3vr58xqxlm8vpxqy4ql6r4cnp4tvl027jnapuwxgd9x0ld';
  const secp256k1KeypairSecretKeyStr =
    'benfenprivkey1q9zplgqsyskenv5whcsj6lahpvyt0nm2q60e79uhrak45m3wqq05qcq4z77';
  const secp256r1KeypairSecretKeyStr =
    'benfenprivkey1qfde86dhy0ycfjkaz5pm6udldmejafw6tx8m5eldjsty2ux9rdhdg664ccx';
  const ed25519KeypairSecretKeydecoded = decodeBenfenPrivateKey(ed25519KeypairSecretKeyStr);
  let ed25519KeypairSecretKey = ed25519KeypairSecretKeydecoded.secretKey;

  const secp256k1KeypairSecretKeydecoded = decodeBenfenPrivateKey(secp256k1KeypairSecretKeyStr);
  const secp256k1KeypairSecretKey = secp256k1KeypairSecretKeydecoded.secretKey;

  const secp256r1KeypairSecretKeydecoded = decodeBenfenPrivateKey(secp256r1KeypairSecretKeyStr);
  const secp256r1KeypairSecretKey = secp256r1KeypairSecretKeydecoded.secretKey;
  if (ed25519KeypairSecretKey.length === LEGACY_PRIVATE_KEY_SIZE) {
    // This is a legacy secret key, we need to strip the public key bytes and only read the first 32 bytes
    ed25519KeypairSecretKey = ed25519KeypairSecretKey.slice(0, PRIVATE_KEY_SIZE);
  }

  const ed25519Keypair = Ed25519Keypair.fromSecretKey(ed25519KeypairSecretKey);
  const secp256k1Keypair = Secp256k1Keypair.fromSecretKey(secp256k1KeypairSecretKey);
  const secp256r1Keypair = Secp256r1Keypair.fromSecretKey(secp256r1KeypairSecretKey);

  const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
    threshold: 2,
    publicKeys: [
      {
        publicKey: ed25519Keypair.getPublicKey(),
        weight: 1,
      },
      {
        publicKey: secp256k1Keypair.getPublicKey(),
        weight: 1,
      },
      {
        publicKey: secp256r1Keypair.getPublicKey(),
        weight: 1,
      },
    ],
  });
  const multisigAddress = multiSigPublicKey.toHexAddress();
  console.log('multisigAddress', hex2BfcAddress(multisigAddress));
  const client = new BenfenClient({ url: 'https://rpc-mainnet.web3app.vip' });
  const token = TOKEN_INFO.BFC;
  const amount = 0.1;
  const bigintAmount = BigInt(multiplyByDecimal(amount, token.decimals));
  const { data: gasCoins } = await client.getCoins({
    owner: multisigAddress,
    coinType: normalizeStructTagForRpc(token.address),
  });

  console.log('gasCoins', gasCoins);
  const tx = new TransactionBlock();
  const toAddress = 'BFCe53440e89f8c4bd8d6fa3a639a534a76151e96e0e2e20ad5eeaf007f9a11000e50eb';
  const coin = tx.splitCoins(tx.gas, [tx.pure(bigintAmount)]);
  tx.transferObjects([coin], tx.pure(toAddress));
  tx.setGasPayment(
    gasCoins.map((i) => ({
      objectId: i.coinObjectId,
      version: i.version,
      digest: i.digest,
    })),
  );
  tx.setSenderIfNotSet(multisigAddress);
  const u8tx = await tx.build({ client });
  const signature1 = (await ed25519Keypair.signTransactionBlock(u8tx)).signature;
  const signature2 = (await secp256k1Keypair.signTransactionBlock(u8tx)).signature;
  const combinedSignature = multiSigPublicKey.combinePartialSignatures([signature1, signature2]);
  const result = await client.executeTransactionBlock({
    transactionBlock: u8tx,
    signature: combinedSignature,
  });
  const txStatus = await client.waitForTransactionBlock({ digest: result.digest });
  console.log('txStatus', txStatus);
};
