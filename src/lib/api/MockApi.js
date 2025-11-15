import API from './BaseApi'

import { get, writable } from 'svelte/store';
import { usersDb, chatsDb, currentUser, currentSessionChats, currentSessionContacts, currentFolders, currentlySyncing } from '$lib/stores/api'

const CONTACTS = [
    { id: 2, baseUrl: '/default-avatar.jpg', names: [{ firstName: 'Кот', lastName: 'Ослов', description: 'aaaa' }] },
    { id: 5, baseUrl: '/vlad.jpg', names: [{ firstName: 'Владимир', lastName: 'Путин', description: 'aaaa' }] }
]

const CHATS = [
    { id: 2, cid: 12, title: 'Андрей Бобр', type: 'DIALOG', status: 1, 
      lastMessage: { text: "Привет!", time: Date.now() - 45000 },
      participants: { 123: Date.now(), 2: Date.now() }, newMessages: 0 },
    { id: 5, cid: 99, title: 'Володя', type: 'DIALOG', status: 1, 
      lastMessage: { text: "Трудолюбие — это вообще отдельный талант, это не просто, извините, резиновая попа", time: Date.now() - 1000*600 },
      participants: { 123: Date.now(), 5: Date.now() }, newMessages: 0 },
]

const CONFIG = {
    chatFolders: {
        FOLDERS: [
            { id: 1, title: 'Test' },
            { id: 2, title: 'проститутки' }
        ]
    }
}


const MESSAGES = {
    12: [
        { id: 1, text: "Привет", sender: 2, time: Date.now() - 60000, type: 'text' }
    ],
    99: [
        { id: 1542, text: "Убить нельзя помиловать", sender: 5, time: Date.now() - 5000, type: 'text' }
    ]
}

export default class MockApi extends API {
    
    constructor(token) {
        super(token);
    }
    
    connect() {
        
    }
    
    _telemetry() {
        const interactive = setInterval(() => {
            console.log("Sent interactive payload")
        }, 30000)
        
        const apptracer = setInterval(() => {
            console.log("Sent apptracer request")
        }, 60000)
        
        this._intervals = { interactive, apptracer }
    }
    
    async login() {
        // $session.token = ...
        return {
            success: true,
        }
    }
    
    async verifyLogin() {
        const contact = {
            names: [{ firstName: 'Meowkie', lastName: '007' }]
        }
        
        currentUser.set(123)
        this.setUser(123)
        this.setUserDetails(contact)
        this.setToken(Math.random())
        
        return {
            payload: {
                token: "12345678",
                profile: {
                    contact
                }
            }
        }
    }
    
    async logout() {
        currentUser.set(null)
        this.setUser(undefined)
        this.setUserDetails(undefined)
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
        if (!MESSAGES[chatId]) messages[chatId] = [];
        return MESSAGES[chatId].slice(begin, amount);
    }
    
    async sendMessage(text, chatId, params) {
        const msg = { id: MESSAGES[chatId][MESSAGES[chatId].length - 1].id + Math.ceil(Math.random() * 100), text, sender: 123, time: Date.now(), type: 'text' };
        MESSAGES[chatId].push(msg);
        return msg;
    }
    
    async addContact(name, phone) {
        const id = Math.floor(Math.random() * 10000);
        
        const contacts = get(currentSessionContacts);
        const [ firstName, lastName ] = name.split(' ');
        contacts[id] = {
            id,
            avatar: '/default-avatar.jpg',
            names: [{ firstName, lastName: lastName || "", description: 'I love Svelte' }],
            added: true
        }
        currentSessionContacts.set(contacts);
                
        return true;
    }
}
