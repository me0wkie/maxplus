import { load } from '@tauri-apps/plugin-store';
import { join, appCacheDir } from '@tauri-apps/api/path';
import {
    readFile,
    writeFile,
    mkdir,
    exists,
    BaseDirectory
} from '@tauri-apps/plugin-fs';

let storePromise;

function hash(str) {
    let hash = 2166136261;

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36);
}

async function getStore() {
    if (!storePromise) {
        await mkdir(await join(await appCacheDir(), "cache", "files"), {
            baseDir: BaseDirectory.AppCache,
            recursive: true
        });

        storePromise = await load(await join(await appCacheDir(), "cache", "index.json"), {
            autoSave: false
        });
    }

    return storePromise;
}

export async function getCachedImage(src, type = 'image/jpeg') {
    const store = await getStore();

    const entry = await store.get(src);

    if (!entry)
        return null;

    const [path] = entry;

    if (!await exists(path, {
        baseDir: BaseDirectory.AppCache
    })) {
        await store.delete(src);
        await store.save();

        return null;
    }

    /*const bytes = await readFile(path, {
        baseDir: BaseDirectory.AppCache
    });*/

    return path;//new Blob([bytes], { type });
}

export async function setCachedImage(src, blob) {
    const store = await getStore();

    const bytes = new Uint8Array(await blob.arrayBuffer());

    const path = await join(await appCacheDir(), "cache", "files", hash(src))

    await writeFile(path, bytes, { baseDir: BaseDirectory.AppCache });

    await store.set(src, [ path, Math.ceil(bytes.length / 1024) ]);
    await store.save();

    return path;
}

export async function getCacheEntry(src) {
    const store = await getStore();
    return await store.get(src);
}

export async function removeCachedImage(src) {
    const store = await getStore();

    await store.delete(src);
    await store.save();
}
