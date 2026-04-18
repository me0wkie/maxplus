import { invoke } from '$lib/utils/invoke';
import { listen } from '@tauri-apps/api/event';
import BaseAPI from './BaseApi'
import { get } from 'svelte/store';
import { add as addLog } from '$lib/stores/logs'
import { usersDb, currentUser, currentSessionChats, currentRealChats, currentRealContacts, currentSessionContacts, currentFolders, currentlySyncing, currentPresence, receivedMessage } from '$lib/stores/api'
import { get as sessionGet, set as sessionSet } from '$lib/stores/session'
import { goto } from '$app/navigation';

export default class MobileApi extends BaseAPI {
    resolve_sync = null;
    synchronized = new Promise(resolve => this.resolve_sync = resolve);
    latest_init = null;
    unlisten = null;
    
    constructor(token) {
        super(token);
    }
    
    _telemetry() {
        /* Telemetry implemented in rust code */
    }

    async startListener() {
        this.unlisten = await listen('max', async event => {
            const { payload } = event;

            addLog(payload);

            console.log(payload)

            if (payload.type === "log") {
                if (payload.response === 'closed') {
                    await new Promise(r => setTimeout(r, 1000));
                    alert('Отключен сервером\nПереподключение...')
                    this.init()
                }
                return;
            }
            if (payload.type === 'tx') return;

            // only RX
            const { response } = payload;
            const opc = response.opcode;

            if (opc === 128) {
                // TODO event handler
                const message = response.payload.message;
                message.chatId = response.payload.chatId;
                receivedMessage.set(message);
            }
            else if (opc == 129) {
                // typing
            }
        });
    }
    
    async init() {
        if (this.latest_init > Date.now() + 5000) {
            console.error("Had recent reconnection, not trying again")
            return
        }
        if (!this.getDevice()?.id) throw "No device id";

        if (this.unlisten) await this.unlisten();
        this.startListener();

        sessionSet('connected', false);
        //aessionSet('sync', false);
        this.latest_init = Date.now()
        
        const response = await invoke('init', {
            token: this.getToken(),
            userId: this.getUser(),
            deviceId: this.getDevice().id,
            mtInstance: this.getDevice().mt,
        })

        if (response.success) sessionSet('connected', true);
        else alert(response);
    }
    
    async startAuth(phone) {
        this._device = this.generateDevice();

        const response = await invoke('init', {
            deviceId: this.getDevice().id,
            mtInstance: this.getDevice().mt,
        })

        const auth = await invoke("start_auth", { phone });

        const success = !!auth.token;
        if (!success) return auth;

        return {
            success: !!auth.token,
            codeLength: auth.codeLength
        }
    }
    
    async login(code) {
        const checkCode = await invoke("check_code", { code });

        console.log(checkCode)
        
        const success = !!checkCode.profile
        if (success) {
            const { profile, tokenAttrs } = checkCode
            const userId = profile.contact.id

            await usersDb.set('device-' + userId, this._device);
            currentUser.set(userId)
            this.setUser(userId)
            this.setUserDetails(profile.contact)
            this.setToken(tokenAttrs.LOGIN.token)
        }
        else return checkCode;
        
        return {
            success,
            payload: checkCode
        }
    }
    
    async register(code, first_name) {
        const checkCode = await invoke("check_code", { code });

        if (!checkCode.token) return checkCode;
        const register = await invoke("register", { first_name });

        console.log(register)
        
        const success = !!register.profile
        if (success) {
            const { profile, tokenAttrs } = register
            const userId = profile.contact.id

            await usersDb.get('device-' + userId, this._device);
            currentUser.set(userId)
            this.setUser(userId)
            this.setUserDetails(profile.contact)
            this.setToken(tokenAttrs.LOGIN.token)
        }
        else return register;
        
        return {
            success,
            payload: register
        }
    }
    
    async loadToken() {
        if (!this._user) throw "Tried to load token, but no user was set in API instance";
        const loaded = await usersDb.get('token-' + this._user);
        if (loaded) this._token = loaded;
    }
    
    async logout() {
        await invoke('logout');
        this.setToken(undefined);
        this.setUser(undefined);
        this.setUserDetails(undefined);
        currentUser.set(null);
        sessionSet("sync", false);
        sessionSet("connected", false);
        goto('/auth/login');
    }
    
    async sync() {
        try {
            if (!this.getToken()) throw "Ошибка: токен не установлен"
            if (!this.getUser()) throw "Ошибка: User ID не установлен"
            if (sessionGet("sync")) {
                console.warn("Уже синхронизовано!")
                return;
            }
            
            console.warn('Синхронизируем!')
            
            sessionSet("sync", true);
            
            const res = await invoke('sync_client');
            
            const { chats, contacts, config, presence } = res;
            
            console.log('Ответ sync', res)
                
            currentFolders.set(config.chatFolders?.FOLDERS || []);
            currentPresence.set(presence);
            currentRealChats.set(chats.map(x => x.id));
            currentRealContacts.set(contacts.map(x => x.id));

            //const reactions = config.server['reactions-menu'];
            //const callsEndpoint = config.server['calls-endpoint'];
            
            // TODO presence
            
            const currentChats = get(currentSessionChats) || [];
            const currentContacts = get(currentSessionContacts) || {};
            
            // TODO wtf?
            
            let updated = false;
            chats.forEach(chat => {
                const { id, cid, title, admins, baseIconUrl: avatar,
                adminParticipants, videoConversation, status, lastMessage,
                lastEventTime, participants, newMessages, type } = chat

                const exists = currentChats.find(entry => entry.id === id);
                if(!exists) currentChats.push({ id, type, title, status, avatar, lastMessage, lastEventTime, participants, newMessages });

                else {
                    const before = updated ? null : JSON.stringify(exists)
                    exists.lastMessage = lastMessage;
                    exists.lastEventTime = lastEventTime;
                    exists.participant = participants;
                    exists.type = type;
                    exists.newMessages = newMessages;
                    exists.avatar = avatar;
                    if(exists.title) exists.title = title;
                    if(exists.status) exists.status = status;
                    if(exists.admins) {
                        exists.admins = admins;
                        exists.adminParticipants = adminParticipants;
                    }
                    if(exists.videoConversation) exists.videoConversation = videoConversation;
                    if(exists.status) exists.status = status;
                    if(!updated && before !== JSON.stringify(exists)) updated = true;
                }
            });
            
            let requireInfo = new Set();
            
            chats.forEach(chat => {
                if(chat.type === 'DIALOG') {
                    Object.keys(chat.participants).forEach(member => {
                        if(!currentContacts[member]) requireInfo.add(+member)
                    })
                }
            })

            contacts.forEach(contact => {
                const { baseRawUrl: avatar, id, names, options, /*photoId*/ description, gender, updateTime, status, accountStatus: acs } = contact

                if (!currentContacts[contact.id]) {
                    currentContacts[contact.id] = {
                        id,
                        avatar,
                        names,
                        gender,
                        description,
                        updateTime,
                        options,
                        status,
                        accountStatus: acs
                    }
                } else {
                    const prev = currentContacts[contact.id]
                    if (avatar !== prev.avatar) prev.avatar = avatar;
                    if (gender !== prev.gender) prev.gender = gender;
                    if (names  !== prev.names) prev.names = names;
                    if (description !== prev.description) prev.description = description;
                    if (updateTime !== prev.updateTime) prev.updateTime = updateTime;
                    if (options !== prev.options) prev.options = options;
                    if (status !== prev.status) prev.status = status;
                    if (acs !== prev.accountStatus) prev.accountStatus = acs;
                }

                requireInfo.delete(+id)
            })

            if(requireInfo.size) {
                console.log('Необходимые для обновления контакты', requireInfo)
                const response = await invoke('fetch_contacts', { userIds: [ ...requireInfo ] });

                console.log('Ответ', response)

                response.contacts.forEach(contact => {
                    if(currentContacts[contact.id]) {
                        currentContacts[contact.id].avatar = contact.baseUrl
                        currentContacts[contant.id].options = contact.options
                    }
                    else {
                        currentContacts[contact.id] = {
                            id: contact.id,
                            avatar: contact.baseUrl,
                            names: contact.names,
                            gender: contact.gender,
                            description: contact.description,
                            updateTime: contact.updateTime,
                            options: contact.options
                        }
                    }
                })
            }
            
            currentSessionChats.set(currentChats);
            currentSessionContacts.set(currentContacts);

        } catch (e) {
            alert(e)
            console.error(e)
            if (e.includes("login.token")) await this.logout();
        } finally {
            this.resolve_sync();
            console.log('Синхронизация завершена!');
        }
    }
    
    async fetchContacts(userIds) {
        await this.synchronized;
        return invoke('fetch_contacts', { userIds })
    }
    
    async getMessages(chatId, fromTime) {
        await this.synchronized;
        return await invoke('fetch_history', { chatId, fromTime, amount: 200 })
    }
    
    async sendMessage(message, chatId, params) {
        await this.synchronized;
        return await invoke('send_message', { message, chatId, params })
    }
    
    async react(chatId, messageId, reaction) {
        await this.synchronized;
        if (!reaction) return await invoke('remove_reaction', { chatId, messageId })
        return await invoke('add_reaction', { chatId, messageId, reaction })
    }
    
    async addContact(name, phone) {
        await this.synchronized;
        let oldContact;
        
        try {
            let response = await invoke('get_by_phone', { phone });
            oldContact = response.contact;
            if (!oldContact) throw new Error();
        } catch (e) {
            return { success: false, error: 'not-found' }
        }
        
        const contactId = oldContact.id;
        
        const { contact: result } = await invoke('add_contact', { contactId, firstName: name }) || {}
        
        if (!result) return { success: false, error: 'denied' }

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
        }
        
        currentSessionContacts.update(contacts => {
            return { ...contacts, [contactId]: contact };
        });
        currentRealContacts.update(contacts => {
            if (!contacts.includes(contactId))
                return [...contacts, contactId];
            return contacts;
        });
        
        return { success: true };
    }
    
    async removeContact(contactId) {
        await this.synchronized;
        const response = await invoke('remove_contact', { contactId });
        currentRealContacts.update(contacts => contacts.filter(x => x !== contactId));
        return { success: true };
    }

    async getVideoById(chatId, messageId, videoId) {
        await this.synchronized;
        return await invoke('get_video_by_id', { chatId, messageId, videoId });
    }

    async getFileById(chatId, messageId, fileId) {
        await this.synchronized;
        return await invoke('get_file_by_id', { chatId, messageId, fileId });
    }

    async publicSearch(query) {
        await this.synchronized;
        return await invoke('public_search', { query, count: 5, type: "ALL" });
    }

    async getChats(chatIds) {
        await this.synchronized;
        return await invoke('get_chats', { chatIds });
    }

    async getChat(chatId) {
        await this.synchronized;
        return await invoke('get_chats', { chatIds: [ chatId ] });
    }

    async getSessions() { // wait for sync not required?
        return await invoke('get_sessions');
    }

    async closeAllSessions() {
        return await invoke('close_all_sessions');
    }

    async uploadAttachment(attach) {
        const { type, path, mime } = attach;

        const response = await invoke('get_' + type.toLowerCase() + '_upload', { count: 1, profile: false });

        if (!response?.url && !response?.info) {
            alert("Не удалось получить ссылку на загрузку " + type);
            return null;
        }

        console.log('response', response);

        const payload = {
            path,
            attachType: type,
            mime
        };

        if (type === "PHOTO") {
            payload.uploadUrl = response.url;
        }
        else if (type === "VIDEO") {
            const { token, url, videoId } = response.info[0];
            payload.token = token;
            payload.uploadUrl = url;
            payload.videoId = videoId;
        }
        else if (type === 'FILE') {
            const { token, url, fileId } = response.info[0];
            payload.token = token;
            payload.uploadUrl = url;
            payload.fileId = fileId;
        }

        const data = await invoke('upload', payload);

        console.log(data);

        if (data.error) {
            alert("Не удалось загрузить " + type + "\n" + data.error)
            return null;
        }

        return { _type: type, ...data }
    }

    async getCalls() {
        return await invoke('get_calls', { forward: false, count: 100 });
    }

    async call(actionId, payload) {
        return await invoke('call', { actionId, payload })
    }
}

