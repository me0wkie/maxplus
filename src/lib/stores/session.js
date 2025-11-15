import { writable, get as getStoreValue } from 'svelte/store';

const data = writable({});

function set(key, value) {
    data.update(current => ({ ...current, [key]: value }));
}

function get(key) {
    const current = getStoreValue(data);
    return current[key];
}

export default {
    set,
    get,
}
