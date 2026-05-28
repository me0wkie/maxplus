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

export async function xorEncrypt(text, password) {
    const sodium = await ready();

    const key = deriveKey(sodium, password);

    const encrypted = xor(
        sodium.from_string(text),
        key
    );

    return encrypted;
}

function xor(data, key) {
    const out = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
        out[i] = data[i] ^ key[i % key.length];
    }

    return out;
}
