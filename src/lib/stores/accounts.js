import { LazyStore, load } from "@tauri-apps/plugin-store";
import { join, appDataDir } from '@tauri-apps/api/path';
import { remove } from '@tauri-apps/plugin-fs';

const store = new LazyStore("accounts.json");
const encrypted = [];//TODO

export const addAccount = async (account, token) => {
  const accounts = await store.get("accounts") || [];

  if (accounts.find(x => x.uid === account.id))
    throw new Error("Account with id " + account.id + " already added!");

  let internalId;
  while (!internalId) {
    const generated = crypto.getRandomValues(new Uint32Array(1))[0] % 100000000 + "";
    if (!accounts.find(x => x.id === generated)) internalId = generated;
  }

  accounts.push({
    id: internalId,
    uid: account.id,
    encryption: null,
    key: null
  });

  const metaStore = await load(await join(await appDataDir(), "data", internalId, "meta.json"), {
    autoSave: false
  });

  await metaStore.set("meta", {
    version: 1,
    token,
    added: Date.now()
  });
  await metaStore.save();
  await metaStore.close();

  await store.set("accounts", accounts);
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

export const init = async () => {
  // TODO
}

export const getAccountMeta = async id => {
  const metaStore = await load(await join(await appDataDir(), "data", id, "meta.json"));
  const data = await metaStore.get("meta");
  await metaStore.close();
  return data;
}

export const removeAccount = async account => {
  const accounts = await store.get("accounts");

  const idx = accounts.findIndex(x => x.id === account.id);
  if (idx === -1)
    throw new Error("Account with id " + account.id + " not found!");

  accounts.splice(idx, 1);

  await store.set("accounts", accounts);
  await remove(await join(await appDataDir(), "data", id, { recursive: true }));
}

export const setEncryption = async (account, type, wrapKey) => {
  // TODO
  // генерирует key, шифрует key и uid через wrapKey
  // также вся папка data/{ID} тоже шифруются через key
  // wrapKey берется из рисунка пинкода или аппаратного хранилища
}
