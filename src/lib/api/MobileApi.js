import { invoke } from '@tauri-apps/api/core';
import BaseAPI from './BaseApi'
import { get } from 'svelte/store';
import { usersDb, currentUser, currentSessionChats, currentSessionContacts, currentFolders, currentlySyncing, currentPresence } from '$lib/stores/api'
import Session from '$lib/stores/session'
import { goto } from '$app/navigation';

export default class MobileApi extends BaseAPI {
    resolve_sync = null;
    synchronized = new Promise(resolve => this.resolve_sync = resolve);
    
    constructor(token) {
        super(token);
    }
    
    _telemetry() {
        console.log('Telemetry implemented in rust code')
    }
    
    async init() {
        console.log('sending token', this.getToken().length)
        if (!this.getDevice()?.id) throw "No device id";
        
        const response = await invoke('init', {
            token: this.getToken(),
            userId: this.getUser(),
            deviceId: this.getDevice().id,
            mtInstance: this.getDevice().mt,
        })
        console.log(response)
        if (response.success) Session.set('connected', true);
        else alert(response);
    }
    
    async startAuth(phone) {
        this._device = this.generateDevice();
            
        const response = await invoke('init', {
            deviceId: this.getDevice().id,
            mtInstance: this.getDevice().mt,
        })
        
        console.log('connect', response)
        
        const auth = await invoke("start_auth", { phone });
        console.log(auth)
        
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
            console.log(profile, tokenAttrs.LOGIN.token)
            
            await usersDb.get('device-' + userId, this._device);
            currentUser.set(userId)
            this.setUser(userId)
            this.setUserDetails(profile.contact)
            this.setToken(tokenAttrs.LOGIN.token)
        }
        
        return {
            success,
            payload: checkCode
        }
    }
    
    async register(code, first_name) {
        const checkCode = await invoke("check_code", { code });
        console.log(checkCode)
        if (!checkCode.token) return { success: false, payload: checkCode }
        const register = await invoke("register", { first_name });
        console.log(register)
        
        const success = !!register.profile
        if (success) {
            const { profile, tokenAttrs } = register
            const userId = profile.contact.id
            console.log(profile)
            
            await usersDb.get('device-' + userId, this._device);
            currentUser.set(userId)
            this.setUser(userId)
            this.setUserDetails(profile.contact)
            this.setToken(tokenAttrs.LOGIN.token)
        }
        
        return {
            success,
            payload: register
        }
    }
    
    async loadToken() {
        if (!this._user) throw "Tried to load token, but no user was set in API instance";
        this._token = await usersDb.get('token-' + this._user);
        const res = await invoke('set_token', { token: this._token });
        console.log('set_token', res, this._token.length);
    }
    
    async logout() {
        console.log('logging out...')
        this.setToken(undefined);
        this.setUser(undefined);
        this.setUserDetails(undefined);
        currentUser.set(null);
        Session.set("synced", false);
        Session.set("connected", false);
        goto('/')
    }
    
    async sync() {
        try {
            if (!this.getToken()) throw "Ошибка: токен не установлен"
            if (!this.getUser()) throw "Ошибка: User ID не установлен"
            if (Session.get("sync")) {
                console.warn("Уже синхронизовано!")
                return;
            }
            
            console.warn('Синхронизируем!')
            
            Session.set("sync", true);
            
            const res = await invoke('sync_client')
            
            const { chats, contacts, config, presence } = res;
            
            console.log('Ответ sync', res)
                
            currentFolders.set(config.chatFolders.FOLDERS);
            currentPresence.set(presence);
            
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
                const exists = currentChats.find(entry => entry.id === id)
                if(!exists) currentChats.push({ id, type, title, status, avatar, lastMessage, lastEventTime, participants, newMessages })
                else {
                    const before = updated ? null : JSON.stringify(exists)
                    exists.lastMessage = lastMessage;
                    exists.lastEventTime = lastEventTime;
                    exists.participantIds = participants;
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

            console.log('contacts', contacts)

            contacts.forEach(contact => {
                const { /*accountStatus: status*/ baseRawUrl: avatar, id, names, options, /*photoId*/ description, gender, updateTime, status, accountStatus: acs } = contact

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
                        accountStatus
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
            
            console.log('Необходимые для обновления контакты', requireInfo)
            
            if(requireInfo.size) {
                const response = await invoke('fetch_contacts', { userIds: [ ...requireInfo ] });
                
                console.log('Got contacts', response)
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
            
            console.log('Синхронизация завершена!');
            this.resolve_sync();
            //await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            alert(e)
            console.error(e)
            if (e.includes("login.token")) await this.logout();
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
        
        console.log(oldContact)
        
        const contactId = oldContact.id;
        
        const { contact: result } = await invoke('add_contact', { contactId, firstName: name }) || {}
        
        if (!result) return { success: false, error: 'denied' }

        console.log(result)

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
        
        return { success: true };
    }
    
    async removeContact(contactId) {
        await this.synchronized;
        const response = await invoke('remove_contact', { contactId })
        console.log(response)
        return { success: true };
    }
}

