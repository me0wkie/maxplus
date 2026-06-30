import {
  currentSessionChats,
  currentSessionContacts,
} from "$lib/stores/api";
import { invoke } from "$lib/utils/invoke";
import { get } from "svelte/store";

export const cacheChat = (chat, chats = null) => {
  const normalized = normalizeChat(chat);

  const useStore = chats === null;
  const list = useStore ? get(currentSessionChats) : chats;

  const index = list.findIndex((c) => c.id === normalized.id);

  let changed = false;

  if (index === -1) {
    list.push(normalized);
    changed = true;
  } else {
    const existing = list[index];

    if (!isEqual(existing, normalized)) {
      list[index] = normalized;
      changed = true;
    }
  }

  if (useStore && changed) {
    currentSessionChats.set([...list]);
  }

  return changed;
};

export const removeChat = (chat, chats = null) => {
  const useStore = chats === null;
  const list = useStore ? get(currentSessionChats) : chats;

  const id = chat?.id;
  const index = list.findIndex((c) => c.id === id);

  if (index === -1) return false;

  list.splice(index, 1);

  if (useStore) {
    currentSessionChats.set([...list]);
  }

  return true;
};

const isEqual = (a, b) => {
  for (const key in b) {
    if (a[key] !== b[key]) return false;
  }
  for (const key in a) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const normalizeChat = (chat) => {
  const { baseIconUrl, ...rest } = chat;

  return {
    ...rest,
    avatar: baseIconUrl,
  };
};

export const syncContacts = async (contacts, currentContacts, requireInfo) => {
  contacts.forEach((raw) => {
    const contact = normalizeContact(raw);
    upsertContact(currentContacts, contact);
    requireInfo.delete(+contact.id);
  });

  if (requireInfo.size) {
    console.log("Необходимые для обновления контакты", requireInfo);

    const response = await invoke("fetch_contacts", {
      userIds: [...requireInfo],
    });

    response.contacts.forEach(raw => {
      const contact = normalizeContact(raw);

      upsertContact(currentContacts, contact);
    });
  }
};

const contactBatch = [];
let getContactPromise;

export const getContact = async contactId => {
  const contacts = get(currentSessionContacts);

  if (!contacts[contactId]) {
    contactBatch.push(contactId);
    if (!getContactPromise)
      getContactPromise = new Promise(r => setTimeout(r, 300));
    await getContactPromise;

    const userIds = [...contactBatch];
    contactBatch.length = 0;
    getContactPromise = null;

    const response = await invoke("fetch_contacts", { userIds });

    response.contacts.forEach(raw => {
      const contact = normalizeContact(raw);
      currentSessionContacts.update(contacts => ({
        ...contacts,
        [raw.id]: contact,
      }));
    });
  }

  return contacts[contactId];
}

const upsertContact = (store, contact) => {
  const id = contact.id;
  const existing = store[id];

  if (!existing) {
    store[id] = contact;
    return;
  }

  for (const key in contact) {
    if (contact[key] !== existing[key]) {
      existing[key] = contact[key];
    }
  }
};

const normalizeContact = (contact) => {
  const { baseRawUrl, baseUrl, ...rest } = contact;

  return {
    ...rest,
    avatar: baseRawUrl || baseUrl,
  };
};

// access, baseIconUrl, baseRawIconUrl, created, description
// id, lastDelayedUpdateTime, lastEventTime, lastFireDelayedErrorTime,
// lastMessage, link, messagesCount, modified, options, owner, participants
// participantsCount, pinnedMessage, reactions, restrictions, status, title, type
