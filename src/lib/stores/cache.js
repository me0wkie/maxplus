import { invoke } from "@tauri-apps/api/core";

export const getCachedFile = (account, src) => invoke("get_cached_file", { account, src });
export const setCachedFile = (account, src, blob) => invoke("set_cached_file", { account, src, blob });
