import { invoke } from "$lib/utils/invoke";
import { listen } from "@tauri-apps/api/event";
import BaseAPI from "./BaseApi";
import { get } from "svelte/store";
import { add as addLog } from "$lib/stores/logs";
import {
  usersDb,
  currentUser,
  currentUserDetails,
  currentSessionChats,
  currentRealChats,
  currentRealContacts,
  currentSessionContacts,
  currentFolders,
  currentlySyncing,
  currentPresence,
  receivedMessage,
} from "$lib/stores/api";
import { get as sessionGet, set as sessionSet } from "$lib/stores/session";
import { cacheChat, syncContacts } from "$lib/utils/caching";
import { goto } from "$app/navigation";

export default class MobileApi extends BaseAPI {
  resolve_sync = null;
  synchronized = new Promise((resolve) => (this.resolve_sync = resolve));
  latest_init = null;
  unlisten = null;

  constructor(token) {
    super(token);
  }

  _telemetry() {
    /* Telemetry implemented in rust code */
  }

  async startListener() {
    this.unlisten = await listen("max", async (event) => {
      const { payload } = event;

      addLog(payload);

      console.log(payload);

      if (payload.type === "log") {
        if (payload.response === "closed") {
          await new Promise((r) => setTimeout(r, 1000));
          alert("Отключен сервером\nПереподключение...");
          this.init();
        }
        return;
      }
      if (payload.type === "tx") return;

      // only RX
      const { response } = payload;
      const opc = response.opcode;

      if (opc === 128) {
        // TODO event handler
        const message = response.payload.message;
        message.chatId = response.payload.chatId;
        receivedMessage.set(message);
      } else if (opc == 129) {
        // typing
      }
    });
  }

  async init(forceSync = false) {
    if (this.latest_init > Date.now() - 5000) {
      console.error("Had recent reconnection, not trying again");
      return;
    }
    if (!this.getDevice()?.id) throw "No device id";

    if (this.unlisten) await this.unlisten();
    this.startListener();

    this.latest_init = Date.now();
    sessionSet("connected", false);
    //sessionSet('sync', false);
    this.synchronized = new Promise((resolve) => (this.resolve_sync = resolve));
    sessionSet("sync", false);

    const response = await invoke("init", {
      token: this.getToken(),
      userId: this.getUser(),
      deviceId: this.getDevice().id,
      mtInstance: this.getDevice().mt,
    });

    console.log('Init response', response);

    if (response.success) {
      sessionSet("connected", true);
      if (forceSync) this.sync();
    }
    else alert(response);
  }

  async startAuth(phone) {
    this._device = this.generateDevice();

    const response = await invoke("init", {
      deviceId: this.getDevice().id,
      mtInstance: this.getDevice().mt,
    });
    console.log(response);

    const auth = await invoke("start_auth", { phone });
    console.log(auth);

    const success = !!auth.token;
    if (!success) return auth;

    return {
      success: !!auth.token,
      codeLength: auth.codeLength,
    };
  }

  async login(code) {
    const checkCode = await invoke("check_code", { code });
    console.log(checkCode);

    const success = !!checkCode.profile;
    if (success) {
      const { profile, tokenAttrs } = checkCode;
      const userId = profile.contact.id;

      await usersDb.set("device-" + userId, this._device);
      currentUser.set(userId);
      currentUserDetails.set(profile.contact);
      this.setUser(userId);
      this.setToken(tokenAttrs.LOGIN.token);
    } else return checkCode;

    return {
      success,
      payload: checkCode,
    };
  }

  async register(code, first_name) {
    const checkCode = await invoke("check_code", { code });
    console.log(checkCode);

    let register;

    if (checkCode.profile) {
      register = checkCode; // already registered
    } else {
      console.log("Not registered. Sending request...");
      register = await invoke("register", { first_name });
      console.log(register);
    }

    const success = !!register.profile;
    if (success) {
      const { profile, tokenAttrs } = register;
      const userId = profile.contact.id;

      await usersDb.get("device-" + userId, this._device);
      currentUser.set(userId);
      currentUserDetails.set(profile.contact);
      this.setUser(userId);
      this.setToken(tokenAttrs.LOGIN.token);
    } else return register;

    return {
      success,
      payload: register,
    };
  }

  async loadToken() {
    if (!this._user)
      throw "Tried to load token, but no user was set in API instance";
    const loaded = await usersDb.get("token-" + this._user);
    if (loaded) this._token = loaded;
  }

  async logout() {
    await invoke("logout");
    this.setToken(undefined);
    this.setUser(undefined);
    currentUserDetails.set(null);
    currentUser.set(null);
    sessionSet("sync", false);
    sessionSet("connected", false);
    goto("/auth/login");
  }

  async checkPassword(password, trackId) {
    const response = await invoke("check_password", { password, trackId });
    console.log(response);

    const { tokenAttrs } = response;

    if (tokenAttrs) {
      this.setToken(tokenAttrs.LOGIN.token);
      await this.sync();
      return {
        success: true,
        payload: response
      }
    }

    return {
      success: false,
      payload: response
    }
  }

  async sync() {
    try {
      if (!this.getToken()) throw "Ошибка: токен не установлен";
      //if (!this.getUser()) throw "Ошибка: User ID не установлен";
      if (sessionGet("sync")) {
        console.warn("Уже синхронизовано!");
        return;
      }

      console.warn("Синхронизируем!");

      sessionSet("sync", true);

      const res = await invoke("sync_client");

      const { chats, contacts, config } = res;

      console.log("Ответ sync", res);

      currentFolders.set(config.chatFolders?.FOLDERS || []);
      currentPresence.set(res.presence);
      currentRealChats.set(chats.map((x) => x.id));
      currentUserDetails.set(res.profile.contact);
      currentRealContacts.set(contacts.map((x) => x.id));

      if (!this.getUser()) this.setUser(res.profile.contact.id);

      sessionSet("reactions", config.server["reactions-menu"]);
      //const callsEndpoint = config.server['calls-endpoint'];

      const currentChats = get(currentSessionChats) || [];
      const currentContacts = get(currentSessionContacts) || {};

      let updated = false;

      chats.forEach((chat) => {
        if (cacheChat(chat, currentChats) && !updated) updated = true;
      });

      let requireInfo = new Set();

      chats.forEach((chat) => {
        if (chat.type === "DIALOG") {
          Object.keys(chat.participants).forEach((member) => {
            if (!currentContacts[member]) requireInfo.add(+member);
          });
        };
      });

      await syncContacts(contacts, currentContacts, requireInfo);

      currentSessionChats.set(currentChats);
      currentSessionContacts.set(currentContacts);
    } catch (e) {
      alert(e);
      console.error(e);
      if (e?.includes("login.token")) await this.logout();
    } finally {
      this.resolve_sync();
      console.log("Синхронизация завершена!");
    }
  }

  async fetchContacts(userIds) {
    await this.synchronized;
    return invoke("fetch_contacts", { userIds });
  }

  async getMessages(chatId, fromTime) {
    await this.synchronized;
    return await invoke("fetch_history", { chatId, fromTime, amount: 200 });
  }

  async sendMessage(message, chatId, params) {
    await this.synchronized;
    return await invoke("send_message", { message, chatId, params });
  }

  async react(chatId, messageId, reaction) {
    await this.synchronized;
    if (!reaction)
      return await invoke("remove_reaction", { chatId, messageId });
    return await invoke("add_reaction", { chatId, messageId, reaction });
  }

  async pinMessage(chatId, messageId) {
    await this.synchronized;
    return await invoke("pin_message", { chatId, messageId, notify: true });
  }

  async deleteMessage(chatId, messageId, forMe) {
    await this.synchronized;
    return await invoke("delete_message", { chatId, messageId, forMe });
  }

  async addContact(name, phone) {
    await this.synchronized;
    let oldContact;

    try {
      let response = await invoke("get_by_phone", { phone });
      oldContact = response.contact;
      if (!oldContact) throw new Error();
    } catch (e) {
      return { success: false, error: "not-found" };
    }

    const contactId = oldContact.id;

    const { contact: result } =
      (await invoke("add_contact", { contactId, firstName: name })) || {};

    if (!result) return { success: false, error: "denied" };

    const contact = {
      avatar: result.baseUrl,
      accountStatus: result.accountStatus,
      // country: result.country,
      // photoId: result.photoId,
      id: result.id,
      names: result.names,
      options: result.options,
      status: result.status,
      updateTime: result.updateTime,
      gender: result.gender,
      description: result.description,
    };

    currentSessionContacts.update((contacts) => {
      return { ...contacts, [contactId]: contact };
    });

    currentRealContacts.update((contacts) => {
      if (!contacts.includes(contactId)) return [...contacts, contactId];
      return contacts;
    });

    return { success: true };
  }

  async removeContact(contactId) {
    await this.synchronized;
    const response = await invoke("remove_contact", { contactId });
    currentRealContacts.update((contacts) =>
      contacts.filter((x) => x !== contactId),
    );
    return { success: true };
  }

  async getVideoById(chatId, messageId, videoId) {
    await this.synchronized;
    return await invoke("get_video_by_id", { chatId, messageId, videoId });
  }

  async getFileById(chatId, messageId, fileId) {
    await this.synchronized;
    return await invoke("get_file_by_id", { chatId, messageId, fileId });
  }

  async searchPublic(query) {
    await this.synchronized;
    return await invoke("search_public", { query, count: 5, type: "ALL" });
  }

  async searchMsg(query) {
    await this.synchronized;
    return await invoke("search_msg", { query, count: 30 });
  }

  async getChats(chatIds) {
    await this.synchronized;
    return await invoke("get_chats", { chatIds });
  }

  async getChat(chatId) {
    await this.synchronized;
    return await invoke("get_chats", { chatIds: [chatId] });
  }

  async getSessions() {
    // wait for sync not required?
    return await invoke("get_sessions");
  }

  async closeAllSessions() {
    return await invoke("close_all_sessions");
  }

  async uploadAttachment(attach) {
    const { type, path, mime } = attach;

    const response = await invoke("get_" + type.toLowerCase() + "_upload", {
      count: 1,
      profile: false,
    });

    if (!response?.url && !response?.info) {
      alert("Не удалось получить ссылку на загрузку " + type);
      return null;
    }

    console.log("response", response);

    const payload = {
      path,
      attachType: type,
      mime,
    };

    if (type === "PHOTO") {
      payload.uploadUrl = response.url;
    } else if (type === "VIDEO") {
      const { token, url, videoId } = response.info[0];
      payload.token = token;
      payload.uploadUrl = url;
      payload.videoId = videoId;
    } else if (type === "FILE") {
      const { token, url, fileId } = response.info[0];
      payload.token = token;
      payload.uploadUrl = url;
      payload.fileId = fileId;
    }

    const data = await invoke("upload", payload);

    console.log(data);

    if (data.error) {
      alert("Не удалось загрузить " + type + "\n" + data.error);
      return null;
    }

    return { _type: type, ...data };
  }

  async updateProfile(firstName, lastName, description) {
    const result = await invoke("update_profile", {
      firstName,
      lastName,
      description,
    });

    const details = get(currentUserDetails);
    if (!details) return null;

    details.names[0].firstName = firstName;
    details.names[0].lastName = lastName;
    if (description !== undefined) {
      details.description = description;
    }

    currentUserDetails.set(details);
    return result;
  }

  async getCalls() {
    return await invoke("get_calls", { forward: false, count: 100 });
  }

  async call(actionId, payload) {
    return await invoke("call", { actionId, payload });
  }
}
