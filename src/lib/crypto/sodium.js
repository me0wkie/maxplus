// TODO избавиться от libsodium wrappers и перейти на rust-based шифрование
import { browser } from "$app/environment";

let sodium;

export async function ready() {
    if (!browser) {
        console.warn("Пропуск инициализации libsodium во время сборки");
        return null;
    }

    if (
        typeof globalThis.crypto === "undefined" ||
        typeof globalThis.crypto.getRandomValues === "undefined"
    ) {
        try {
            const nodeCrypto = await import("node:crypto");
            globalThis.crypto = nodeCrypto.webcrypto || nodeCrypto.default.webcrypto;
        } catch (e) {
            console.warn("Не удалось загрузить node:crypto", e);
        }
    }

    if (!sodium) {
        const sodiumLib = await import("libsodium-wrappers-sumo");
        sodium = sodiumLib.default;
        await sodium.ready;
    }

    return sodium;
}
