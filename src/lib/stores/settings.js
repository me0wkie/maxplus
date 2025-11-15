import { LazyStore } from '@tauri-apps/plugin-store';
//import { browser } from '$app/environment';

const store = new LazyStore('settings.json');

export function keys() {
    return store.keys()
}

export function get(key) {
    return store.get(key)
}

export async function exists(key) {
    return (await store.get(key)) === undefined
}

export async function set(key, value) {
    await store.set(key, value)
}

export default {
    keys,
    get,
    exists,
    set
}
