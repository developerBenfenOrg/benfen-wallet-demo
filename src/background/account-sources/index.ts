import { getDB } from '../db';
import { type AccountSourceSerialized, type AccountSourceType } from './AccountSource';
import { MnemonicAccountSource } from './MnemonicAccountSource';

function toAccountSource(accountSource: AccountSourceSerialized) {
  if (MnemonicAccountSource.isOfType(accountSource)) {
    return new MnemonicAccountSource(accountSource.id);
  }
  throw new Error(`Unknown account source of type ${accountSource.type}`);
}

export async function getAccountSources(filter?: { type: AccountSourceType }) {
  const db = await getDB();
  return (
    await (filter?.type
      ? await db.accountSources.where('type').equals(filter.type).sortBy('createdAt')
      : await db.accountSources.toCollection().sortBy('createdAt'))
  ).map(toAccountSource);
}

export async function getAccountSourceByID(id: string) {
  const serializedAccountSource = await (await getDB()).accountSources.get(id);
  if (!serializedAccountSource) {
    return null;
  }
  return toAccountSource(serializedAccountSource);
}

export async function getAllSerializedUIAccountSources() {
  return Promise.all(
    (await getAccountSources()).map((anAccountSource) => anAccountSource.toUISerialized()),
  );
}

// async function createAccountSource({
//   type,
//   params: { password, entropy },
// }: MethodPayload<'createAccountSource'>['args']) {
//   switch (type) {
//     case 'mnemonic':
//       return (
//         await MnemonicAccountSource.save(
//           await MnemonicAccountSource.createNew({
//             password,
//             entropyInput: entropy ? toEntropy(entropy) : undefined,
//           }),
//         )
//       ).toUISerialized();
//     default: {
//       throw new Error(`Unknown Account source type ${type}`);
//     }
//   }
// }

// export async function accountSourcesHandleUIMessage(msg: Message, uiConnection: UiConnection) {
//   const { payload } = msg;
//   if (isMethodPayload(payload, 'createAccountSource')) {
//     await uiConnection.send(
//       createMessage<MethodPayload<'accountSourceCreationResponse'>>(
//         {
//           method: 'accountSourceCreationResponse',
//           type: 'method-payload',
//           args: { accountSource: await createAccountSource(payload.args) },
//         },
//         msg.id,
//       ),
//     );
//     return true;
//   }

//   if (isMethodPayload(payload, 'getAccountSourceEntropy')) {
//     const accountSource = await getAccountSourceByID(payload.args.accountSourceID);
//     if (!accountSource) {
//       throw new Error('Account source not found');
//     }
//     if (!(accountSource instanceof MnemonicAccountSource)) {
//       throw new Error('Invalid account source type');
//     }
//     await uiConnection.send(
//       createMessage<MethodPayload<'getAccountSourceEntropyResponse'>>(
//         {
//           type: 'method-payload',
//           method: 'getAccountSourceEntropyResponse',
//           args: { entropy: await accountSource.getEntropy(payload.args.password) },
//         },
//         msg.id,
//       ),
//     );
//     return true;
//   }
//   if (isMethodPayload(payload, 'verifyPasswordRecoveryData')) {
//     const { accountSourceID, entropy } = payload.args.data;
//     const accountSource = await getAccountSourceByID(accountSourceID);
//     if (!accountSource) {
//       throw new Error('Account source not found');
//     }
//     if (!(accountSource instanceof MnemonicAccountSource)) {
//       throw new Error('Invalid account source type');
//     }
//     await accountSource.verifyRecoveryData(entropy);
//     uiConnection.send(createMessage({ type: 'done' }, msg.id));
//     return true;
//   }
//   return false;
// }