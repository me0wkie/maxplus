import { LazyStore } from '@tauri-apps/plugin-store';
import { writable, get } from 'svelte/store';
import MockApi from '../api/MockApi.js';
import MobileApi from '../api/MobileApi.js';

const SELECTED = 'mobile';
const Apis = {
    'mock': MockApi,
    'mobile': MobileApi,
}

let apiInstance = new Apis[SELECTED]();

const users = new LazyStore('users.bin');
const chats = new LazyStore('chats.bin');

export const currentUser = writable(undefined)
export const currentSessionChats = writable(undefined);
export const currentSessionContacts = writable(undefined);
export const currentlySyncing = writable(false);
export const currentFolders = writable([]);
export const currentPresence = writable({});
export const receivedMessage = writable(undefined); // heap
export default writable(apiInstance);

export const currentRealChats = writable([]);
export const currentRealContacts = writable([]);

export const usersDb = users;
export const chatsDb = chats;

export function clearMessages() {
    return currentSessionChats.set([])
}

export function clearContacts() {
    return currentSessionContacts.set({})
}

export async function clearKeys() {
    const keys = await chats.keys();
    const meId = get(currentUser);
    if (!meId) throw "No session!"
    for (const key of keys) {
        if (key.includes(`ckeys-${meId}-`)) await chats.delete(key);
    }
}

export const chatMessages = {
    get: async chatId => {
        const meId = get(currentUser)
        if (!meId) throw "No session!"
        return chats.get(`chat-${meId}-${chatId}`)
    },
    set: async (chatId, sorted) => {
        const meId = get(currentUser)
        if (!meId) throw "No session!"
        return chats.set(`chat-${meId}-${chatId}`, sorted)
    }
}

export const chatKeys = {
    get: chatId => {
        const meId = get(currentUser)
        if (!meId) throw "No session!"
        return chats.get(`ckeys-${meId}-${chatId}`)
    },
    set: (chatId, sorted) => {
        const meId = get(currentUser)
        if (!meId) throw "No session!"
        return chats.set(`ckeys-${meId}-${chatId}`, sorted)
    }
}

currentUser.subscribe(async user => {
    if (user === undefined) {
        const _currentUserId = await users.get('current');
        const _currentUser = await users.get('user-' + _currentUserId);
        if (!_currentUserId || !_currentUser) {
            currentUser.set(null)
        }
        else {
            await apiInstance.loadDevice();
            apiInstance._userDetails = _currentUser;
            apiInstance._user = _currentUserId;
            updateChats(undefined, _currentUserId);
            updateContacts(undefined, _currentUserId);
            updateFolders(undefined, _currentUserId);
            currentUser.set(_currentUserId);
        }
    }
    else {}
})

currentSessionChats.subscribe(async _chats => {
    const user = get(currentUser);
    if (user === undefined || user === null) return;
    await updateChats(_chats, user);
})

currentSessionContacts.subscribe(async _contacts => {
    const user = get(currentUser);
    if (user === undefined || user === null) return;
    await updateContacts(_contacts, user);
})

currentFolders.subscribe(async _folders => {
    const user = get(currentUser);
    if (user === undefined || user === null) return;
    await updateFolders(_folders, user);
})

const updateChats = async (_chats, user) => {
    if (!user) return;
    if (_chats === undefined) {
        const fromDb = await chats.get('chats-' + user);
        currentSessionChats.set(fromDb || []);
    }
    else if (_chats.length) {
        await chats.set('chats-' + user, _chats);
    }
}

const updateContacts = async (_contacts, user) => {
    if (!user) return;
    
    if (_contacts === undefined) {
        const fromDb = await chats.get('contacts-' + user);
        currentSessionContacts.set(fromDb || {});
    }
    else if (Object.keys(_contacts).length) {
        await chats.set('contacts-' + user, _contacts);
    }
}

const updateFolders = async (_folders, user) => {
    if (!user) return;
    if (_folders === undefined) {
        const fromDb = await chats.get('folders-' + user);
        currentFolders.set(fromDb || []);
    }
    else if (_folders.length) {
        await chats.set('folders-' + user, _folders);
    }
}

receivedMessage.subscribe(message => {
    if (!get(currentUser)) return;

    currentSessionChats.update(chats => {
        const index = chats.findIndex(x => x.id === message.chatId);
        if (index === -1) return chats;

        const now = Date.now();
        const newChats = [...chats];

        const updated = {
            ...newChats[index],
            lastEventTime: now
        };

        newChats.splice(index, 1);
        newChats.unshift(updated);

        return newChats;
    });
});

