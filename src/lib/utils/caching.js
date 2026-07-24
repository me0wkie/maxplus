import {
  currentSessionChats,
} from "$lib/stores/api";
import {
  updateContact,
  getCachedContacts,
  getContact as getContactStore
} from "$lib/stores/contacts";
import { invoke } from "$lib/utils/invoke";
import { get, writable } from "svelte/store";

// TODO отказаться от этой хуйни?
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

export const syncContacts = async (contacts, requireInfo) => {
  contacts.forEach((raw) => {
    updateContact(normalizeContact(raw));
    requireInfo.delete(+raw.id);
  });

  if (requireInfo.size) {
    console.log("Необходимые для обновления контакты", requireInfo);

    const response = await invoke("fetch_contacts", {
      userIds: [...requireInfo],
    });

    response.contacts.forEach(raw => {
      updateContact(normalizeContact(raw));
    });
  }
};

const empty = writable(null);
let contactBatch = null;

export const getContact = contactId => {
  if (!+contactId) return empty;

  getCachedContacts().then(async contacts => {
    if (!contacts.includes(+contactId)) {
      if (!contactBatch) {
        contactBatch = {
          ids: [],
          promise: new Promise(resolve =>
            setTimeout(resolve, 300)
          )
        };
      }

      contactBatch.ids.push(+contactId);

      const batch = contactBatch;

      await batch.promise;

      if (contactBatch === batch) {
        contactBatch = null;

        const response = await invoke("fetch_contacts", {
          userIds: [...new Set(batch.ids)]
        });

        for (const raw of response.contacts) {
          updateContact(normalizeContact(raw));
        }
      }
    }
  });

  return getContactStore(+contactId);
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
