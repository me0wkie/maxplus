import { invoke } from "@tauri-apps/api/core";
import { writable } from "svelte/store";

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
    /*const dir = await join(await appDataDir(), "data", account.id + "", "contacts", contactId + "");
    const path = await join(dir, "meta");

    try {
      const data = JSON.parse(await readTextFile(path));
      store.set(data);
    } catch (e) {}*/
    // TODO retrieve current account in stores.rs
    const cached = await invoke("get_contact", { account: +account.id, contactId });
    if (cached) store.set(cached);

    cache[contactId].unsubscribe = store.subscribe(async data => {
      if (data !== undefined) {
        /*await mkdir(dir, { recursive: true });
        await writeTextFile(path, JSON.stringify(updated));*/
        getCurrentAccount().then(async _account => {
          invoke("set_contact", { account: +_account.id, contactId, data });
        });
      }
    });
  });

  return store;
};

export const updateContact = async contact => {
  if (!contact) throw new Error("Contact can't be undefined");
  if (!contact.id) throw new Error("No contact id!");
  const store = await getContact(contact.id);
  store.set(contact);
  if (!cachedContacts.includes(contact.id)) {
    cachedContacts.push(contact.id);
  }
}

let contactsLoaded = false;
let cachedContacts = [];

export const getCachedContacts = async () => {
  const account = await getCurrentAccount();
  return invoke("get_contacts", { account: +account.id });
}
