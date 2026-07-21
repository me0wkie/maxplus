import { LazyStore, load } from "@tauri-apps/plugin-store";
import { join, appDataDir } from '@tauri-apps/api/path';
import { remove } from '@tauri-apps/plugin-fs';

import { currentUser } from "$lib/stores/api";

const store = new LazyStore("accounts.json");
const encrypted = []; //TODO

export const addAccount = async (account, token, device) => {
  const accounts = await store.get("accounts") || [];

  if (accounts.find(x => x.uid === account.id))
    throw new Error("Account with id " + account.id + " already added!");

  let internalId;
  while (!internalId) {
    const generated = crypto.getRandomValues(new Uint32Array(1))[0] % 100000000 + "";
    if (!accounts.find(x => x.id === generated)) internalId = generated;
  }

  const entry = {
    id: internalId,
    uid: account.id, // if encryption != null, this will be hidden (encrypted)
    encryption: null,
    key: null
  };

  accounts.push(entry);

  await saveDataEntry(["data", internalId, "meta.json"], "meta", {
    version: 1,
    token,
    device,
    added: Date.now()
  });

  await saveDataEntry(["data", internalId, "self.json"], "self", {
    version: 1,
    ...account
  });

  await store.set("accounts", accounts);

  return entry;
}

export const saveDataEntry = async (storePathArray, key, value) => {
  const now = Date.now();
  const store = await load(await join(await appDataDir(), ...storePathArray), {
    autoSave: false
  });

  await store.set(key, value);

  await store.save();
  await store.close();

  const then = Date.now();
  console.log('Estimated', (then - now) + "MS for saveDataEntry, path", storePathArray);
}

export const getAccounts = async () => {
  const accounts = await store.get("accounts");

  for (const entry of accounts) {
    if (!entry.encryption) {
      if (!encrypted.find(x => x.uid === entry.uid)) encrypted.push(entry);
    }
  }

  return encrypted;
}

// todo caching
export const getCurrentAccount = async () => {
  const currentId = await store.get("current");

  if (!currentId) return null;

  return getAccount(currentId);
}

export const getAccount = async internalId => {
  const accounts = await store.get("accounts") || [];

  const account = accounts.find(x => x.id === internalId);
  if (!account) throw new Error("No account " + internalId + " found!");

  const meta = await getAccountMeta(internalId);
  const contact = await getAccountContact(internalId);

  return {
    ...account,
    meta,
    contact
  }
}

export const setCurrentAccount = async internalId => {
  if (internalId !== null) {
    await getAccount(internalId);
  }

  currentUser.set(internalId);
  await store.set("current", internalId);
}

export const init = async () => {
  // TODO
}

export const getAccountMeta = async internalId => {
  const store = await load(await join(await appDataDir(), "data", internalId, "meta.json"));
  const data = await store.get("meta");
  await store.close().catch(e => {});
  return data;
}

export const getAccountContact = async internalId => {
  const store = await load(await join(await appDataDir(), "data", internalId, "self.json"));
  const data = await store.get("self");
  await store.close().catch(e => {});
  return data;
}

export const removeAccount = async internalId => {
  const accounts = await store.get("accounts");

  const idx = accounts.findIndex(x => x.id === internalId);
  if (idx === -1)
    throw new Error("Account with id " + internalId + " not found!");

  accounts.splice(idx, 1);

  const encryptedEntry = encrypted.findIndex(x => x.id === internalId);
  if (encryptedEntry) encrypted.splice(encryptedEntry, 1);

  await store.set("accounts", accounts);
  await remove(await join(await appDataDir(), "data", internalId), { recursive: true });
}

export const removeAccountByUserId = async uid => {
  const account = encrypted.find(x => x.uid === uid);

  if (!account) throw new Error("No encrypted account with uid " + uid + " found!");

  return removeAccount(account.id);
}

export const setEncryption = async (account, type, wrapKey) => {
  // TODO
  // генерирует key, шифрует key и uid через wrapKey
  // также вся папка data/{ID} тоже шифруются через key
  // wrapKey берется из рисунка пинкода или аппаратного хранилища
}
