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

// access, baseIconUrl, baseRawIconUrl, created, description
// id, lastDelayedUpdateTime, lastEventTime, lastFireDelayedErrorTime,
// lastMessage, link, messagesCount, modified, options, owner, participants
// participantsCount, pinnedMessage, reactions, restrictions, status, title, type
