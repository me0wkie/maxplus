import { LazyStore } from '@tauri-apps/plugin-store';
import { writable, get } from 'svelte/store';
import MockApi from '../api/MockApi.js';

const SELECTED = 'mock';
let apiInstance = SELECTED === 'mock' ? new MockApi() : null;

const users = new LazyStore('users.json');
const chats = new LazyStore('chats.json');

export const currentUser = writable(undefined)
export const currentSessionChats = writable(undefined);
export const currentSessionContacts = writable(undefined);
export const currentlySyncing = writable(false);
export const currentFolders = writable([]);
export const receivedMessages = writable([]); // heap
export default writable(apiInstance);

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
    get: chatId => {
        const meId = get(currentUser)
        if (!meId) throw "No session!"
        return chats.get(`chat-${meId}-${chatId}`)
    },
    set: (chatId, sorted) => {
        const meId = get(currentUser)
        if (!meId) throw "No session!"
        console.log('SET', sorted)
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
    console.log('CurrentUser (id) ', user)
    
    if (user === undefined) {
        const _currentUserId = await users.get('current');
        const _currentUser = await users.get('user-' + _currentUserId);
        if (!_currentUserId || !_currentUser) {
            currentUser.set(null)
        }
        else {
            apiInstance._userDetails = _currentUser;
            apiInstance._user = _currentUserId;
            updateChats(undefined, _currentUserId);
            updateContacts(undefined, _currentUserId);
            updateFolders(undefined, _currentUserId);
            currentUser.set(_currentUserId);
        }
    }
    else {
        console.log('Good! ' + user)
    }
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
    
    console.log('chat hook did something', await chats.get('chats-' + user))
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
    
    console.log('contact hook did something', await chats.get('contacts-' + user))
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
    
    console.log('folders hook did something', await chats.get('folders-' + user))
}
