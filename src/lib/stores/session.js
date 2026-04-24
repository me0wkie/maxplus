import { writable, get as getStoreValue } from 'svelte/store';

const data = writable({
    openedChats: []
});
export default data;

export function set(key, value) {
    data.update(current => ({ ...current, [key]: value }));
}

export function get(key) {
    const current = getStoreValue(data);
    return current[key];
}
