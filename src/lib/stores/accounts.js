import { invoke } from "@tauri-apps/api/core";

export const addAccount = (account, token, device) => invoke("accounts_add", { account, token, device });
export const saveDataEntry = (id, file, value) => invoke("data_save", { id, file, value });
export const getAccounts = () => invoke("accounts_get");
export const getCurrentAccount = () => invoke("current_account");
export const getAccount = id => invoke("account_get", { id });
export const setCurrentAccount = id => invoke("current_account_set", { id });
export const init = () => invoke("accounts_init");
export const getAccountMeta = id => invoke("account_meta", { id });
export const getAccountContact = id => invoke("account_contact", { id });
export const removeAccount = id => invoke( "account_delete", {id});
export const removeAccountByUserId = uid => invoke("account_delete_by_uid", { uid });
export const setEncryption = (id, type, wrapKey) => invoke("account_set_encryption", { id, encryption: { type, wrapKey }, key: null });
