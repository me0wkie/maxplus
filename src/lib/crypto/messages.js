import * as fflate from "fflate";

// prettier-ignore
const ALPHABETS = {
  ru: 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
  en: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/',
  mix: 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯabcdefghijklmnopqrstuvwxyzQWERTYUIOPASDFGHJKLZXCVBNM1234567890!@#$%^&*()',
  emoji: [
    '😀', '😂', '😍', '🤔', '😎', '😭', '😡', '😱', '👍', '👎', '🙏', '💪', '🎉', '🎁', '🔥', '💯',
    '🐶', '🐱', '🐭', '🦊', '🐻', '🐼', '🐨', '🐯', '🍔', '🍕', '🍟', '🍓', '🥑', '🥕', '🌶️', '🍭',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🎱', '🚀', '🛸', '❤️', '💔', '⭐', '✨', '⚡', '💣', '💎', '💰',
    '🌍', '🌕', '🌞', '☁️', '🌧️', '🌊', '🏝️', '🌋', '💻', '📱', '⌚', '💡', '🔑', '🔒', '🔔', '✅'
  ],
  zh: Array.from({length: 2048}, (_, i) => String.fromCharCode(0x4E00 + i))
};

const CHARMAP = {};
for (const name in ALPHABETS) {
  const string = ALPHABETS[name] + "" === ALPHABETS[name];
  CHARMAP[name] = new Map(
    (string ? ALPHABETS[name].split("") : ALPHABETS[name]).map((char, i) => [
      char,
      i,
    ]),
  );
}

console.log("Алфавиты обфускации инициализированы");

// Helper: build char array and index map for an alphabet (works with emoji/CJK)
function makeAlphabetData(alphabet) {
  const chars = Array.from(alphabet);
  const map = new Map(chars.map((c, i) => [c, i]));
  return { chars, map };
}

// Bit-packed encoder (uses floor(log2(base)) bits per symbol). Uses BigInt for safety.
function encodeBitPacked(bytes, alphabet) {
  const { chars } = makeAlphabetData(alphabet);
  const base = chars.length;
  const bitsPer = Math.floor(Math.log2(base));
  if (bitsPer <= 0) throw new Error("Alphabet too small");

  let bitBuffer = 0n;
  let bitCount = 0;
  let out = "";

  for (const b of bytes) {
    bitBuffer = (bitBuffer << 8n) | BigInt(b);
    bitCount += 8;
    while (bitCount >= bitsPer) {
      bitCount -= bitsPer;
      const idx = Number(
        (bitBuffer >> BigInt(bitCount)) & ((1n << BigInt(bitsPer)) - 1n),
      );
      out += chars[idx];
      // keep remainder in buffer:
      bitBuffer &= (1n << BigInt(bitCount)) - 1n;
    }
  }

  if (bitCount > 0) {
    const idx = Number(
      (bitBuffer << BigInt(bitsPer - bitCount)) &
        ((1n << BigInt(bitsPer)) - 1n),
    );
    out += chars[idx];
  }

  return out;
}

function decodeBitPacked(str, alphabet) {
  const { chars, map } = makeAlphabetData(alphabet);
  const base = chars.length;
  const bitsPer = Math.floor(Math.log2(base));
  if (bitsPer <= 0) throw new Error("Alphabet too small");

  let bitBuffer = 0n;
  let bitCount = 0;
  const out = [];

  for (const ch of Array.from(str)) {
    if (!map.has(ch)) continue; // игнор неизвестных символов
    bitBuffer = (bitBuffer << BigInt(bitsPer)) | BigInt(map.get(ch));
    bitCount += bitsPer;
    while (bitCount >= 8) {
      bitCount -= 8;
      const byte = Number((bitBuffer >> BigInt(bitCount)) & 0xffn);
      out.push(byte);
    }
    bitBuffer &= (1n << BigInt(bitCount)) - 1n;
  }

  return new Uint8Array(out);
}

function makeMarker(alphabet, count = 5) {
  const chars = Array.from(alphabet);
  const maxEven = Math.floor((chars.length - 1) / 2);
  if (maxEven < 0) throw new Error("Alphabet too small for marker");
  let marker = "";
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * (maxEven + 1)); // 0..maxEven
    const idx = r * 2; // чётный индекс
    marker += chars[idx];
  }
  return marker;
}

// Проверка скрытого признака
export function isObfuscated(str, language) { // TODO оптимизировать?
  const alphabet = ALPHABETS[language];

  const { map } = makeAlphabetData(alphabet);
  const first = Array.from(str).slice(0, 5);
  if (first.length < 5) return false;
  for (const ch of first) {
    if (!map.has(ch)) return false;
    if (map.get(ch) % 2 !== 0) return false; // индекс не чётный -> не наш признак
  }
  return true;
}

export function deflate(text) {
  const bytes = fflate.strToU8(text);
  return fflate.deflateSync(bytes, { level: 9 });
}

export function inflate(bytes) {
  const decompressed = fflate.inflateSync(bytes);
  return fflate.strFromU8(decompressed);
}

export function obfuscate(bytes, language) {
  const alphabet = ALPHABETS[language];

  const payload = encodeBitPacked(bytes, alphabet);
  const marker = makeMarker(alphabet, 5);
  return marker + payload;
}

export function deobfuscate(input, language) {
  const alphabet = ALPHABETS[language];

  try {
    const payloadString = Array.from(input).slice(5).join("");
    return decodeBitPacked(payloadString, alphabet);
  } catch (error) {
    console.error("Ошибка деобфускации:", error);
    return null;
  }
}
