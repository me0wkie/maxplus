import { invoke } from '@tauri-apps/api/core';
import API from './BaseApi'

export default class WebApi extends API {
    
    constructor(token) {
        super(token);
    }
    
    async connect() {
        await invoke("connect");
    }
    
    _telemetry() {
        console.log('Telemetry implemented in rust code')
    }
    
    async login(phone) {
        const response = await this.connect()
        
        console.log('connect', response)
        
        const auth = await invoke("start_auth", { phone });
        console.log(auth)
        
        if (auth.token) return {
            success: true,
            codeLength: auth.codeLength
        }
        
        return { success: false }
    }
    
    async verifyLogin(code) {
        const checkCode = await invoke("check_code", { code });
        
        console.log(checkCode)

        const profile = await invoke("sync_client");
        
        console.log(profile)
        
        
        
        currentUser.set(1111)
        this.setUser(1111)
        this.setUserDetails({})
        this.setToken(111233)
        
        
    }
    
    async logout() {
        
    }
    
    async sync() {
        // must set folders, chats
        if (get(currentlySyncing) === true) throw "Tried to sync while syncing!"
        console.log('Синхронизирукем!')
        currentlySyncing.set(true);
        
        await new Promise(r => setTimeout(r, 1000));
        
        const data = {
            payload: {
                chats: CHATS,
                config: CONFIG
            }
        }
        
        const { chats, config } = data.payload;
            
        currentFolders.set(config.chatFolders.FOLDERS);
        
        const currentChats = get(currentSessionChats) || [];
        const currentContacts = get(currentSessionContacts) || {};
        
        // TODO wtf?
        
        let updated = false;
        chats.forEach(chat => {
            const { id, cid, title, admins, adminParticipants, videoConversation, status, lastMessage, lastEventTime, participants, newMessages } = chat
            const exists = currentChats.find(entry => entry.id === id)
            if(!exists) currentChats.push({ id, cid, title, status, lastMessage, lastEventTime, participants, newMessages })
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
                    if(!currentContacts[member]) requireInfo.add(member)
                })
            }
        })
        console.log(requireInfo)
        if(requireInfo.size) {
            const response = {
                contacts: CONTACTS
            }
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
        currentlySyncing.set(false);
    }
    
    async getMessages(chatId, idk, begin, amount) {
        
    }
    
    async sendMessage(text, chatId, params) {
        
    }
    
    async addContact(name, phone) {
        
    }
}
