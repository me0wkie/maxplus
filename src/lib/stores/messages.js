import { load } from "@tauri-apps/plugin-store";
import { join, appDataDir } from '@tauri-apps/api/path';
import { writable } from "svelte/store";
import {
  readFile,
  writeFile,
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
  remove,
  readDir
} from '@tauri-apps/plugin-fs';

import {
  getCurrentAccount
} from "$lib/stores/accounts";

// TODO time-based cache removing
const settingsCache = {};
const chatsCache = {};

export const getChatSettings = chatId => {
  if (settingsCache[chatId]) return settingsCache[chatId].store;

  const store = writable(undefined);
  settingsCache[chatId] = { store };

  const unsubscribe = store.subscribe(async updated => {
    const account = await getCurrentAccount();

    const file = await load(await join(await appDataDir(), "data", account.id + "", "chats", chatId + "", "settings"), {
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

      settingsCache[chatId].file = file;
      settingsCache[chatId].unsubscribe = unsubscribe;
    }
  });

  return store;
};

export const getChat = chatId => {
  if (chatsCache[chatId]) return chatsCache[chatId];

  const chatInfo = writable(undefined);
  const receivedMessage = writable(null);

  const entry = {
    chatInfo,
    receivedMessage,
    updateMessages: (messages) => _updateMessages(chatId, messages),
    loadMessages: (time, amount) => _loadMessages(chatId, time, amount),
  }

  chatsCache[chatId] = entry;

  return entry;
}

// TODO rewrite completely (use manifest.json file + ~100 messages per file)
async function _loadMessages(chatId, time, amount) {
  const messages = [];

  const account = await getCurrentAccount();

  const dir = await join(await appDataDir(), "data", account.id + "", "chats", chatId + "", "messages");

  let files;

  try {
    files = (await readDir(dir))
      .map(x => x.name)
      .filter(x => x.startsWith("1_"))
      .sort(); // 1_2026-03-01, 1_2026-03-02...
  } catch (e) {
    return [];
  }

  const target = "1_" + new Date(time).toISOString().slice(0, 10);

  let index = files.findIndex(x => x >= target);
  if (index === -1) index = files.length - 1;
  else if (files[index] !== target) index--;

  for (let i = index; i >= 0 && messages.length < amount; i--) {
    const file = await join(dir, files[i]);
    const data = JSON.parse(await readTextFile(file));

    let l = 0;
    let r = data.length;

    while (l < r) {
      const m = (l + r) >> 1;
      if (data[m].time <= time)
        l = m + 1;
      else
        r = m;
    }

    messages.unshift(...data.slice(0, l));

    if (messages.length > amount) {
      messages.splice(0, messages.length - amount);
    }
  }

  return messages;
}

async function _updateMessages(chatId, messages) {
  const account = await getCurrentAccount();
  const bulks = {};

  for (const message of messages) {
    const fileName = new Date(message.time).toISOString().slice(0, 10);
    if (bulks[fileName]) bulks[fileName].push(message);
    else bulks[fileName] = [ message ];
  }

  const dir = await join(await appDataDir(), "data", account.id + "", "chats", chatId + "", "messages");

  for (const fileName in bulks) {
    const file = await join(dir, "1_" + fileName);
    await mkdir(dir, { recursive: true });

    let savedMessages = [];
    if (await exists(file)) {
      savedMessages = JSON.parse(await readTextFile(file));

      for (const message of bulks[fileName]) {
        const exists = savedMessages.find(x => x.id === message.id);
        if (exists) {
          Object.keys(message).forEach(key => {
            if (exists[key] === message[key]) return;
            if (key === "text") {
              // TODO attach edit save
              const at = Math.floor(Date.now() / 1000);
              if (!exists.history) exists.history = [{
                text: exists.text, at
              }];
              else exists.history.push({ text: exists.text, at });
            }
            exists[key] = message[key]
          });
          //savedMessages.splice(exists, 1, message);
        } else {
          savedMessages.push(message);
        }
      }
    } else {
      savedMessages = bulks[fileName];
    }

    savedMessages.sort((x, y) => x.time - y.time);
    await writeTextFile(file, JSON.stringify(savedMessages));
  }
}

export const closeChatSettings = async (chatId) => {
  const settings = settingsCache[chatId];
  if (!settings) return;

  settings.unsubscribe();
  await settings.file.close();

  delete settingsCache[chatId];
};
