import { LazyStore } from "@tauri-apps/plugin-store";
import { writable, get } from "svelte/store";
import { goto } from "$app/navigation";
import { page } from "$app/stores";

import MobileApi from "$lib/api/MobileApi.js";
import * as Accounts from "$lib/stores/accounts.js";
import {
  get as sessionGet,
  set as sessionSet
} from "$lib/stores/session.js";

export const currentUser = writable(undefined);
export const currentUserDetails = writable(undefined);
export const currentSessionChats = writable(undefined);
export const currentSessionCalls = writable(undefined);
export const currentlySyncing = writable(false);
export const currentFolders = writable([]);
export const currentPresence = writable({});

const API = new MobileApi();
export default writable(API);

export const currentRealChats = writable([]);
export const currentRealContacts = writable([]);

currentUser.subscribe(async (userId) => {
  if (userId === undefined) {
    const data = await Accounts.getCurrentAccount();
    console.log('Accounts.getCurrentAccount() =', data);
    if (!data || !data.uid) { // TODO pin request
      currentUser.set(null);
    } else {
      currentUserDetails.set(data.contact);
      currentUser.set(data.uid);
    }
  }
  else if (userId === null) openAuth();
  else {
    // account init
    try {
      if (sessionGet("sync")) return; // already synced

      if (!sessionGet("connected")) await API.init();

      await API.sync();

      const calls = await API.getCalls();
      currentSessionCalls.set(calls);
    } catch (e) {
      console.error(e);
    } finally {
      sessionSet("loaded", true);
    }
  }
});

async function openAuth() {
  if (await Accounts.getAccounts().length) {
    goto("/auth/select");
  } else {
    goto("/auth/login");
  }
}
