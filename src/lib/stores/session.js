import { writable, get as getStoreValue, readable } from "svelte/store";

const data = writable({
  openedChats: [],
});

export default data;

export function set(key, value) {
  data.update((current) => ({ ...current, [key]: value }));
}

export function get(key) {
  const current = getStoreValue(data);
  return current[key];
}

export const now = readable(Date.now(), (set) => {
  const interval = setInterval(() => {
    set(Date.now());
  }, 1000);

  return () => clearInterval(interval);
});
