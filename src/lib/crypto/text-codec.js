import { LazyStore } from "@tauri-apps/plugin-store";
import { writable, get } from "svelte/store";

import { ready } from "$lib/crypto/sodium";
import { gzipSync, gunzipSync, strToU8 } from "fflate";

const dictSettings = new LazyStore("dict-settings.json");
const dictStore = new LazyStore("dict.json");
const dictionary = writable(undefined);

export const dict = {
  get: async (key) => {
    return await dictSettings.get(`1-${key}`); // in future there might be multiple dicts?
  },
  set: async (key, value) => {
    return await dictSettings.set(`1-${key}`, value);
  },
  getDictionary: async () => {
    const cached = get(dictionary);
    if (cached) return cached;

    const loaded = await dictStore.get("current");
    dictionary.set(loaded);

    return loaded;
  },
};

export async function makeDictionary(text) {
  const sodium = await ready();

  const punctuation = ".,?!—:";
  const punctCount = {};
  for (const c of text) {
    if (punctuation.includes(c)) {
      punctCount[c] = (punctCount[c] || 0) + 1;
    }
  }

  const words = text.match(/[А-Яа-яЁё]+/g) || [];

  let normalized = words.map(w => w.toLowerCase());

  normalized.sort();

  const unique = [];
  const seen = new Set();
  for (const w of normalized) {
    if (!seen.has(w)) {
      seen.add(w);
      unique.push(w);
    }
  }

  const minSize = 65536 + 256;
  if (unique.length < minSize) {
    throw new Error("Not enough words for dictionary");
  }

  let dict16 = unique;
  let dict8 = dict16.filter((_, i) => i % 257 === 0);
  dict16 = dict16.filter((_, i) => i % 257 !== 0);

  const dictConcat = dict8.concat(dict16).join(" ");
  const dict_sha256 = sodium.to_hex(
    sodium.crypto_hash_sha256(
      sodium.from_string(dictConcat.normalize("NFC"))
    )
  );

  const wordsGross = (text.match(/\s+/g) || []).length + 1;

  const punct = Object.entries({
    ".": punctCount["."] || 0,
    ",": punctCount[","] || 0,
    "?": punctCount["?"] || 0,
    "!": punctCount["!"] || 0,
    "—": punctCount["—"] || 0,
    ":": punctCount[":"] || 0,
  }).map(([k, v]) => [
    k,
    Math.floor((v * 10000) / Math.max(wordsGross, 1)),
  ]);

  const json = {
    dict_sha256,
    punct,
    dict8,
    dict16,
  };

  await dictStore.set("current", json);
  dictionary.set(json);

  return JSON.stringify(json, null, 2);
}

export async function encode(inputBuffer, DICT) {
  const sodium = await ready();

  const punctRanges = [];
  let cumulative = 0;

  for (const [char, prob] of DICT.punct) {
    const start = cumulative;
    cumulative += prob;
    punctRanges.push({ start, end: cumulative - 1, char });
  }

  const out = [];

  const len16 = DICT.dict16.length;
  const len8 = DICT.dict8.length;

  const seed = Math.floor(16 * Math.random()); // 0-15
  const dictMiniHash = parseInt(DICT.dict_sha256.slice(0, 1), 16) & 0xF;
  const prefix = (seed << 4) | dictMiniHash;

  // dict8: меньше слов => меньше ложных срабатываний detect
  // minihash: доп. проверка в detect (16 вариантов)
  // seed: рандомный отступ (16 вариантов)
  // TODO fix [!] ложные срабатывания всё еще очень вероятны

  const first = DICT.dict8[prefix];
  out.push(first[0].toUpperCase() + first.slice(1));

  let sentenceStart = false;

  for (let i = 0; i < inputBuffer.length;) {
    let idx;
    let word;

    if (i + 1 < inputBuffer.length) {
      idx = (inputBuffer[i] << 8) | inputBuffer[i + 1];
      word = DICT.dict16[(idx + seed) % len16];
      i += 2;
    } else {
      idx = inputBuffer[i];
      word = DICT.dict8[(idx + seed) % len8];
      i += 1;
    }

    if (sentenceStart) {
      word = word[0].toUpperCase() + word.slice(1);
      sentenceStart = false;
    }

    out.push(" " + word);

    const rand = sodium.randombytes_uniform(10000);

    for (const p of punctRanges) {
      if (rand >= p.start && rand <= p.end) {
        if (p.char === "—") out.push(" ");
        if (/[.!?]/.test(p.char)) sentenceStart = true;
        out.push(p.char);
        break;
      }
    }
  }

  const last = out[out.length - 1];

  if (!/[.!?]$/.test(last)) {
    if (/[,:—]/.test(last)) out.pop();
    out.push(".");
  }

  return out.join("");
}

export function decode(text, DICT, dict8Map, dict16Map) {
  const tokens = text.split(' ');

  const len16 = DICT.dict16.length;
  const len8 = DICT.dict8.length;

  const bytes = [];

  const firstWordRaw = tokens.shift();
  const firstWord = firstWordRaw
    .replace(/[.,?!—:]/g, '')
    .toLowerCase();

  const prefixIdx = dict8Map.get(firstWord);

  if (prefixIdx === undefined) {
    throw new Error("Префикс не в словаре (" + firstWord + ")");
  }

  const seed = (prefixIdx >> 4) & 0xF;

  for (const item of tokens) {
    const word = item.replace(/[.,?!—:]/g, '').toLowerCase();
    if (!word.length) continue;

    const idx16 = dict16Map.get(word);

    if (idx16 !== undefined) {
      const realIdx = (idx16 - seed + len16) % len16;

      const byteA = (realIdx >> 8) & 0xff;
      const byteB = realIdx & 0xff;

      bytes.push(byteA, byteB);
      continue;
    }

    const idx8 = dict8Map.get(word);

    if (idx8 !== undefined) {
      const seed8 = seed % len8;
      const realIdx = (idx8 - seed8 + len8) % len8;

      bytes.push(realIdx);
      continue;
    }

    throw new Error("Unknown word: " + word);
  }

  return new Uint8Array(bytes);
}

export function packDict(dict) {
  const json = JSON.stringify(dict);
  return gzipSync(strToU8(json));
}

export function unpackDict(buffer) {
  const json = new TextDecoder().decode(gunzipSync(buffer));
  return JSON.parse(json);
}
