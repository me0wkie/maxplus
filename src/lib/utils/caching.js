import { currentSessionChats } from '$lib/stores/api'
import { get } from 'svelte/store';

export const cacheChat = (chat, chats = null) => {
    const normalized = normalizeChat(chat);

    const useStore = chats === null;
    const list = useStore ? get(currentSessionChats) : chats;

    const index = list.findIndex(c => c.id === normalized.id);

    let changed = false;

    if (index === -1) {
        list.push(normalized);
        changed = true;
    } else {
        const existing = list[index];
        const merged = { ...existing, ...normalized };

        if (!isEqual(existing, merged)) {
            list[index] = merged;
            changed = true;
        }
    }

    if (useStore && changed) {
        currentSessionChats.set([...list]);
    }

    return changed;
};

const isEqual = (a, b) => {
    for (const key in b) {
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
    contacts.forEach(raw => {
        const contact = normalizeContact(raw);
        upsertContact(currentContacts, contact);
        requireInfo.delete(+contact.id);
    });

    if (requireInfo.size) {
        console.log('Необходимые для обновления контакты', requireInfo);

        const response = await invoke('fetch_contacts', {
            userIds: [...requireInfo]
        });

        console.log('Ответ', response);

        response.contacts.forEach(raw => {
            const contact = normalizeContact(raw);

            upsertContact(currentContacts, contact);
        });
    }
};

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
