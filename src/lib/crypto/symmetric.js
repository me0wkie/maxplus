import { ready } from "$lib/crypto/sodium";

function deriveKey(sodium, password) {
  return sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    password
  );
}

export async function encryptMessage(text, password) {
  const sodium = await ready();

  const nonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES
  );

  const key = deriveKey(sodium, password);

  const cipher = sodium.crypto_secretbox_easy(
    text,
    nonce,
    key
  );

  return {
    cipher: sodium.to_base64(cipher),
    nonce: sodium.to_base64(nonce),
  };
}

export async function decryptMessage(payload, password) {
  const sodium = await ready();

  const key = deriveKey(sodium, password);

  const message = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(payload.cipher),
    sodium.from_base64(payload.nonce),
    key
  );

  if (!message) {
    throw new Error("Wrong password");
  }

  return sodium.to_string(message);
}

export async function xorDecrypt(encrypted, password) {
  const sodium = await ready();

  const key = deriveKey(sodium, password);

  return xor(encrypted, key);
}

export async function xorEncrypt(data, password) {
  const sodium = await ready();
  const key = deriveKey(sodium, password);

  const withHeader = new Uint8Array(data.length + 1);
  withHeader[0] = 0xFF;
  withHeader.set(data, 1);

  return xor(withHeader, key);
}

function xor(data, key) {
  const out = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length];
  }

  return out;
}

export async function generateSaltHashPair(password) {
  const sodium = await ready();

  const salt = sodium.randombytes_buf(
    sodium.crypto_pwhash_SALTBYTES
  );

  return {
    salt: sodium.to_base64(salt),
    hash: sodium.to_base64(
      await getHash(password, salt)
    )
  };
}

export async function getHash(password, salt) {
  const sodium = await ready();

  return sodium.crypto_pwhash(
    32,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}
