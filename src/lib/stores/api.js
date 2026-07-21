import { LazyStore } from "@tauri-apps/plugin-store";
import { writable, get } from "svelte/store";
import { goto } from "$app/navigation";
import { page } from "$app/stores";

import MobileApi from "$lib/api/MobileApi.js";
import * as Accounts from "$lib/stores/accounts.js";
import {
  get as sessionGet,
  set as sessionSet
} from "$lib/stores/session.js";

const chats = new LazyStore("chats.bin");

export const currentUser = writable(undefined);
export const currentUserDetails = writable(undefined);
export const currentSessionChats = writable(undefined);
export const currentSessionContacts = writable(undefined);
export const currentSessionCalls = writable(undefined);
export const currentlySyncing = writable(false);
export const currentFolders = writable([]);
export const currentPresence = writable({});
export const receivedMessage = writable(undefined); // heap

const API = new MobileApi();
export default writable(API);

export const currentRealChats = writable([]);
export const currentRealContacts = writable([]);

export const chatsDb = chats;

export function clearMessages() {
  return currentSessionChats.set([]);
}

export function clearContacts() {
  return currentSessionContacts.set({});
}

export async function clearKeys() {
  const keys = await chats.keys();
  const meId = get(currentUser);
  if (!meId) throw "No session!";
  for (const key of keys) {
    if (key.includes(`ckeys-${meId}-`)) await chats.delete(key);
  }
}

export const chatMessages = {
  get: async (chatId) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.get(`chat-${meId}-${chatId}`);
  },
  set: async (chatId, sorted) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.set(`chat-${meId}-${chatId}`, sorted);
  },
};

export const chatKeys = {
  get: (chatId) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.get(`ckeys-${meId}-${chatId}`);
  },
  set: (chatId, value) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.set(`ckeys-${meId}-${chatId}`, value);
  },
};

export const chatPassword = { // TODO будет перенесено в user-ID/settings.bin
  get: (chatId) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.get(`cpass-${meId}-${chatId}`);
  },
  set: (chatId, value) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.set(`cpass-${meId}-${chatId}`, value);
  },
};

export const chatObfs = { // TODO будет перенесено в user-ID/settings.bin
  get: (chatId) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.get(`cobf-${meId}-${chatId}`);
  },
  set: (chatId, value) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.set(`cobf-${meId}-${chatId}`, value);
  },
};

export const chatReader = { // TODO будет перенесено в user-ID/settings.bin
  get: (chatId) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.get(`cnread-${meId}-${chatId}`);
  },
  set: (chatId, value) => {
    const meId = get(currentUser);
    if (!meId) throw "No session!";
    return chats.set(`cnread-${meId}-${chatId}`, value); // reversed
  },
};

currentUser.subscribe(async (userId) => {
  if (userId === undefined) {
    const data = await Accounts.getCurrentAccount();
    console.log('Accounts.getCurrentAccount() =', data);
    if (!data || !data.uid) { // TODO pin request
      currentUser.set(null);
    } else {
      currentUserDetails.set(data.contact);
      updateChats(undefined, data.uid);
      updateContacts(undefined, data.uid);
      updateFolders(undefined, data.uid);
      currentUser.set(data.uid);
    }
  }
  else if (userId === null) openAuth();
  else {
    // account init
    try {
      if (sessionGet("sync")) return; // already synced

      if (!sessionGet("connected")) await API.init();

      await API.sync();

      const calls = await API.getCalls();
      currentSessionCalls.set(calls);
    } catch (e) {
      console.error(e);
    } finally {
      sessionSet("loaded", true);
    }
  }
});

async function openAuth() {
  if (await Accounts.getAccounts().length) {
    goto("/auth/select");
  } else {
    goto("/auth/login");
  }
}

currentSessionChats.subscribe(async (_chats) => {
  const user = get(currentUser);
  if (user === undefined || user === null) return;
  await updateChats(_chats, user);
});

currentSessionContacts.subscribe(async (_contacts) => {
  const user = get(currentUser);
  if (user === undefined || user === null) return;
  await updateContacts(_contacts, user);
});

currentFolders.subscribe(async (_folders) => {
  const user = get(currentUser);
  if (user === undefined || user === null) return;
  await updateFolders(_folders, user);
});

const updateChats = async (_chats, user) => {
  if (!user) return;
  if (_chats === undefined) {
    const fromDb = await chats.get("chats-" + user);
    currentSessionChats.set(fromDb || []);
  } else if (_chats.length) {
    await chats.set("chats-" + user, _chats);
  }
};

const updateContacts = async (_contacts, user) => {
  if (!user) return;

  if (_contacts === undefined) {
    const fromDb = await chats.get("contacts-" + user);
    currentSessionContacts.set(fromDb || {});
  } else if (Object.keys(_contacts).length) {
    await chats.set("contacts-" + user, _contacts);
  }
};

const updateFolders = async (_folders, user) => {
  if (!user) return;
  if (_folders === undefined) {
    const fromDb = await chats.get("folders-" + user);
    currentFolders.set(fromDb || []);
  } else if (_folders.length) {
    await chats.set("folders-" + user, _folders);
  }
};

receivedMessage.subscribe((message) => {
  if (!get(currentUser)) return;

  currentSessionChats.update((chats) => {
    const index = chats.findIndex((x) => x.id === message.chatId);
    if (index === -1) return chats;

    const now = Date.now();
    const newChats = [...chats];

    const updated = {
      ...newChats[index],
      lastEventTime: now,
    };

    newChats.splice(index, 1);
    newChats.unshift(updated);

    return newChats;
  });
});
