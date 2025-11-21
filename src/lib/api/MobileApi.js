import { invoke } from '@tauri-apps/api/core';
import BaseAPI from './BaseApi'
import { get } from 'svelte/store';
import { usersDb, currentUser, currentSessionChats, currentSessionContacts, currentFolders, currentlySyncing } from '$lib/stores/api'
import Session from '$lib/stores/session'
import { goto } from '$app/navigation';

export default class MobileApi extends BaseAPI {
    
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
        console.log(this.getToken(), this.getUser())
        if (!this.getToken()) throw "No token set"
        if (!this.getUser()) throw "No user ID, syncing cancelled"
        if (Session.get("synced")) throw "Already synced!"
        
        console.warn('Синхронизируем!')
        
        Session.set("synced", true);
        
        let res;
        
        try {
            res = await invoke('sync_client')
            console.log(res)
        } catch (e) {
            alert(e)
            console.error(e)
            if (e.includes("login.token")) await this.logout();
            return
        }
        
        const { chats, config } = res;
            
        currentFolders.set(config.chatFolders.FOLDERS);
        
        const currentChats = get(currentSessionChats) || [];
        const currentContacts = get(currentSessionContacts) || {};
        
        // TODO wtf?
        
        let updated = false;
        chats.forEach(chat => {
            const { id, cid, title, admins, adminParticipants, videoConversation, status, lastMessage, lastEventTime, participants, newMessages } = chat
            const exists = currentChats.find(entry => entry.id === id)
            if(!exists) currentChats.push({ id, title, status, lastMessage, lastEventTime, participants, newMessages })
            else {
                const before = updated ? null : JSON.stringify(exists)
                exists.lastMessage = lastMessage;
                exists.lastEventTime = lastEventTime;
                exists.participantIds = participants;
                exists.newMessages = newMessages;
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
        console.log(requireInfo)
        if(requireInfo.size) {
            const response = await this.fetchContacts([ ...requireInfo ]);
            console.log('Got contacts', response)
            response.contacts.forEach(contact => {
                if(currentContacts[contact.id]) currentContacts[contact.id].avatar = contact.baseUrl
                else {
                    currentContacts[contact.id] = {
                        id: contact.id,
                        avatar: contact.baseUrl,
                        names: contact.names,
                        gender: contact.gender,
                        description: contact.description,
                        updateTime: contact.updateTime,
                        added: true,
                    }
                }
            })
        }
        console.log(currentSessionChats, currentChats, currentContacts)
        currentSessionChats.set(currentChats);
        currentSessionContacts.set(currentContacts);
        
        console.log('Синхронизация завершена!')
        
        await new Promise(r => setTimeout(r, 5000));
        //Session.set("syncing", false);
    }
    
    async fetchContacts(userIds) {
        return invoke('fetch_contacts', { userIds })
    }
    
    async getMessages(chatId, fromTime) {
        return await invoke('fetch_history', { chatId, fromTime })
    }
    
    async sendMessage(message, chatId, params) {
        return await invoke('send_message', { message, chatId, params })
    }
    
    async addContact(name, phone) {
        
    }
}

