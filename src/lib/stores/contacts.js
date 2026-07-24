import { load } from "@tauri-apps/plugin-store";
import { join, appDataDir } from '@tauri-apps/api/path';
import { writable } from "svelte/store";
import {
  readFile,
  writeFile,
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
  remove,
  readDir
} from '@tauri-apps/plugin-fs';

import {
  getCurrentAccount
} from "$lib/stores/accounts";

const cache = {};

// USE utils/caching.js WHERE CONTACT MAY BE NEW!!!
export const getContact = contactId => {
  if (!contactId) return null;
  if (cache[contactId]) return cache[contactId].store;

  const store = writable(undefined);
  cache[contactId] = { store };

  getCurrentAccount().then(async account => {
    const dir = await join(await appDataDir(), "data", account.id + "", "contacts", contactId + "");
    const path = await join(dir, "meta");

    try {
      const data = JSON.parse(await readTextFile(path));
      store.set(data);
    } catch (e) {}

    cache[contactId].unsubscribe = store.subscribe(async updated => {
      if (updated !== undefined) {
        await mkdir(dir, { recursive: true });
        await writeTextFile(path, JSON.stringify(updated));
      }
    });
  });

  return store;
};

export const updateContact = async contact => {
  const store = await getContact(contact.id);
  store.set(contact);
  if (!cachedContacts.includes(contact.id)) {
    cachedContacts.push(contact.id);
  }
}

let contactsLoaded = false;
let cachedContacts = [];

export const getCachedContacts = async () => {
  if (!contactsLoaded) {
    contactsLoaded = true;
    const account = await getCurrentAccount();
    const path = await join(await appDataDir(), "data", account.id + "", "contacts");
    try {
      const files = await readDir(path);
      files.map(x => cachedContacts.push(+x.name));
    } catch (e) {
      console.error(e);
    }
  }

  return cachedContacts;
}
