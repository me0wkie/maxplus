import { load } from "@tauri-apps/plugin-store";
import { join, appDataDir } from '@tauri-apps/api/path';
import { remove } from '@tauri-apps/plugin-fs';
import { writable } from "svelte/store";

import {
  getCurrentAccount
} from "$lib/stores/accounts";

const container = {};

export const getChatSettings = chatId => {
  if (container[chatId]) return container[chatId].store;

  const store = writable(undefined);
  container[chatId] = { store };

  const unsubscribe = store.subscribe(async updated => {
    const account = await getCurrentAccount();

    const file = await load(await join(await appDataDir(), "data", account.id + "", "chats", chatId + "/settings"), {
      autoSave: false
    }); // TODO use tauri-fs & JSON.parse()

    if (updated !== undefined) {
      await file.set("data", updated);
      await file.save();
    } else {
      let data = await file.get("data");

      if (!data) {
        data = {
          version: 1,
          keys: { current: null, keys: [], messages: [] },
          password: null,
          obfs: null,
          reader: true
        };

        await file.set("data", data);
        await file.save();
      }

      store.set(data);

      container[chatId].file = file;
      container[chatId].unsubscribe = unsubscribe;
    }
  });

  return store;
}

export const closeChatSettings = async (chatId) => {
  const settings = container[chatId];
  if (!settings) return;

  settings.unsubscribe();
  await settings.file.close();

  delete container[chatId];
};
