import { Dexie } from 'dexie';

import { MnemonicAccount } from './MnemonicAccount';
import { backupDB, getDB } from '../db';
import { makeUniqueKey } from '../storage-utils';
import { type SerializedAccount } from './Account';
import { accountsEvents } from './events';

function toAccount(account: SerializedAccount) {
  if (MnemonicAccount.isOfType(account)) {
    return new MnemonicAccount({ id: account.id, cachedData: account });
  }
  throw new Error(`Unknown account of type ${account.type}`);
}

export async function getAllAccounts(filter?: { sourceID: string }) {
  const db = await getDB();
  let accounts;
  if (filter?.sourceID) {
    accounts = await db.accounts.where('sourceID').equals(filter.sourceID).sortBy('createdAt');
  } else {
    accounts = await db.accounts.toCollection().sortBy('createdAt');
  }
  return accounts.map(toAccount);
}

export async function getAccountByID(id: string) {
  const serializedAccount = await (await getDB()).accounts.get(id);
  if (!serializedAccount) {
    return null;
  }
  return toAccount(serializedAccount);
}

export async function getAccountsByAddress(address: string) {
  return (await (await getDB()).accounts.where('address').equals(address).toArray()).map(toAccount);
}

export async function getAllSerializedUIAccounts() {
  return Promise.all((await getAllAccounts()).map((anAccount) => anAccount.toUISerialized()));
}

export async function isAccountsInitialized() {
  return (await (await getDB()).accounts.count()) > 0;
}

// export async function getAccountsStatusData(
//   accountsFilter?: string[],
// ): Promise<Required<WalletStatusChange>['accounts']> {
//   const allAccounts = await (await getDB()).accounts.toArray();
//   return allAccounts
//     .filter(({ address }) => !accountsFilter || accountsFilter.includes(address))
//     .map(({ address, publicKey, nickname }) => ({ address, publicKey, nickname }));
// }

export async function changeActiveAccount(accountID: string) {
  const db = await getDB();
  return db.transaction('rw', db.accounts, async () => {
    const newSelectedAccount = await db.accounts.get(accountID);
    if (!newSelectedAccount) {
      throw new Error(`Failed, account with id ${accountID} not found`);
    }
    await db.accounts.where('id').notEqual(accountID).modify({ selected: false });
    await db.accounts.update(accountID, { selected: true });
    accountsEvents.emit('activeAccountChanged', { accountID });
  });
}

async function deleteQredoAccounts<T extends SerializedAccount>(accounts: Omit<T, 'id'>[]) {
  const newAccountsQredoSourceIDs = new Set<string>();
  const walletIDsSet = new Set<string>();
  for (const aNewAccount of accounts) {
    if (
      aNewAccount.type === 'qredo' &&
      'sourceID' in aNewAccount &&
      typeof aNewAccount.sourceID === 'string' &&
      'walletID' in aNewAccount &&
      typeof aNewAccount.walletID === 'string'
    ) {
      newAccountsQredoSourceIDs.add(aNewAccount.sourceID);
      walletIDsSet.add(aNewAccount.walletID);
    }
  }
  if (!newAccountsQredoSourceIDs.size) {
    return 0;
  }
  return (await Dexie.waitFor(getDB())).accounts
    .where('sourceID')
    .anyOf(Array.from(newAccountsQredoSourceIDs.values()))
    .filter(
      (anExistingAccount) =>
        anExistingAccount.type === 'qredo' &&
        'walletID' in anExistingAccount &&
        typeof anExistingAccount.walletID === 'string' &&
        !walletIDsSet.has(anExistingAccount.walletID),
    )
    .delete();
}

export async function addNewAccounts<T extends SerializedAccount>(accounts: Omit<T, 'id'>[]) {
  const db = await getDB();
  const accountsCreated = await db.transaction('rw', db.accounts, async () => {
    // delete all existing qredo accounts that have the same sourceID (come from the same connection)
    // and not in the new accounts list
    await deleteQredoAccounts(accounts);
    const accountInstances = [];
    for (const anAccountToAdd of accounts) {
      let id = '';
      const existingSameAddressAccounts = await getAccountsByAddress(anAccountToAdd.address);
      for (const anExistingAccount of existingSameAddressAccounts) {
        if (
          (await Dexie.waitFor(anExistingAccount.address)) === anAccountToAdd.address &&
          anExistingAccount.type === anAccountToAdd.type
        ) {
          // allow importing accounts that have the same address but are of different type
          // probably it's an edge case and we used to see this problem with importing
          // accounts that were exported from the mnemonic while testing
          throw new Error(`Duplicated account ${anAccountToAdd.address}`);
        }
      }
      id = id || makeUniqueKey();
      await db.accounts.put({ ...anAccountToAdd, id });
      const accountInstance = await Dexie.waitFor(getAccountByID(id));
      if (!accountInstance) {
        throw new Error(`Something went wrong account with id ${id} not found`);
      }
      accountInstances.push(accountInstance);
    }
    const selectedAccount = await db.accounts.filter(({ selected }) => selected).first();
    if (!selectedAccount && accountInstances.length) {
      const firstAccount = accountInstances[0];
      await db.accounts.update(firstAccount.id, { selected: true });
    }
    return accountInstances;
  });
  await backupDB();
  accountsEvents.emit('accountsChanged');
  return accountsCreated;
}

// export async function accountsHandleUIMessage(msg: Message, uiConnection: UiConnection) {
//   const { payload } = msg;
//   if (isMethodPayload(payload, 'setAccountNickname')) {
//     const { id, nickname } = payload.args;
//     const account = await getAccountByID(id);
//     if (account) {
//       await account.setNickname(nickname);
//       await uiConnection.send(createMessage({ type: 'done' }, msg.id));
//       return true;
//     }
//   }
//   if (isMethodPayload(payload, 'signData')) {
//     const { id, data } = payload.args;
//     const account = await getAccountByID(id);
//     if (!account) {
//       throw new Error(`Account with address ${id} not found`);
//     }
//     if (!isSigningAccount(account)) {
//       throw new Error(`Account with address ${id} is not a signing account`);
//     }
//     await uiConnection.send(
//       createMessage<MethodPayload<'signDataResponse'>>(
//         {
//           type: 'method-payload',
//           method: 'signDataResponse',
//           args: { signature: await account.signData(fromB64(data)) },
//         },
//         msg.id,
//       ),
//     );
//     return true;
//   }
//   if (isMethodPayload(payload, 'createAccounts')) {
//     const newSerializedAccounts: Omit<SerializedAccount, 'id'>[] = [];
//     const { type } = payload.args;
//     if (type === 'mnemonic-derived') {
//       const { sourceID } = payload.args;
//       const accountSource = await getAccountSourceByID(payload.args.sourceID);
//       if (!accountSource) {
//         throw new Error(`Account source ${sourceID} not found`);
//       }
//       if (!(accountSource instanceof MnemonicAccountSource)) {
//         throw new Error(`Invalid account source type`);
//       }
//       newSerializedAccounts.push(await accountSource.deriveAccount());
//     } else {
//       throw new Error(`Unknown accounts type to create ${type}`);
//     }
//     const newAccounts = await addNewAccounts(newSerializedAccounts);
//     await uiConnection.send(
//       createMessage<MethodPayload<'accountsCreatedResponse'>>(
//         {
//           method: 'accountsCreatedResponse',
//           type: 'method-payload',
//           args: {
//             accounts: await Promise.all(
//               newAccounts.map(async (aNewAccount) => await aNewAccount.toUISerialized()),
//             ),
//           },
//         },
//         msg.id,
//       ),
//     );
//     return true;
//   }
//   if (isMethodPayload(payload, 'switchAccount')) {
//     await changeActiveAccount(payload.args.accountID);
//     await uiConnection.send(createMessage({ type: 'done' }, msg.id));
//     return true;
//   }
//   if (isMethodPayload(payload, 'getAccountKeyPair')) {
//     const { password, accountID } = payload.args;
//     const account = await getAccountByID(accountID);
//     if (!account) {
//       throw new Error(`Account with id ${accountID} not found.`);
//     }
//     if (!isKeyPairExportableAccount(account)) {
//       throw new Error(`Cannot export account with id ${accountID}.`);
//     }
//     await uiConnection.send(
//       createMessage<MethodPayload<'getAccountKeyPairResponse'>>(
//         {
//           type: 'method-payload',
//           method: 'getAccountKeyPairResponse',
//           args: {
//             accountID: account.id,
//             keyPair: await account.exportKeyPair(password),
//           },
//         },
//         msg.id,
//       ),
//     );
//     return true;
//   }
//   if (isMethodPayload(payload, 'removeAccount')) {
//     const { accountID } = payload.args;
//     const db = await getDB();
//     await db.transaction('rw', db.accounts, db.accountSources, async () => {
//       const account = await db.accounts.get(accountID);
//       if (!account) {
//         throw new Error(`Account with id ${accountID} not found.`);
//       }
//       const accountSourceID =
//         'sourceID' in account && typeof account.sourceID === 'string' && account.sourceID;
//       await db.accounts.delete(account.id);
//       if (accountSourceID) {
//         const totalSameSourceAccounts = await db.accounts
//           .where('sourceID')
//           .equals(accountSourceID)
//           .count();
//         if (totalSameSourceAccounts === 0) {
//           await db.accountSources.delete(accountSourceID);
//         }
//       }
//     });
//     await backupDB();
//     accountsEvents.emit('accountsChanged');
//     accountSourcesEvents.emit('accountSourcesChanged');
//     await uiConnection.send(createMessage({ type: 'done' }, msg.id));
//     return true;
//   }
//   return false;
// }
