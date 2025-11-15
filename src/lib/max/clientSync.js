import API from '$lib/stores/api'

import { goto } from '$app/navigation';

export default async function clientSync() {
        let chatsEntry = await cachedChats();
        let contactsEntry = await cachedContacts();
        setChats(chatsEntry)
        setContacts(contactsEntry)
        Client.onMessage(messageHandler)
        
        if (_isSyncing) {
            console.warn("Попытка запуска синхронизации, пока предыдущая не завершена.");
            return;
        }
        
        const timePassed = Date.now() - _lastSyncedAt;
        
        if (timePassed < 7000) {
            console.warn(`Синхронизация отменена, прошло только ${Math.round(timePassed / 1000)} сек.`);
            return;
        }

        try {
            /*console.log('~ Синхронизация клиента началась...');
            isSyncing.set(true)

            if (!Client.hasToken()) {
                Client.setToken(await getToken(currentUserId));
            }

            const data = await Client.sync();
            const { chats: _chats, config } = data.payload;
            
            folders.set(config.chatFolders.FOLDERS)
            
            console.log('Получены чаты:', _chats);
            
            let updated = false;
            
            _chats.forEach(chat => {
                const { id, cid, title, admins, adminParticipants, videoConversation, status, lastMessage, lastEventTime, participants, newMessages } = chat
                const exists = chatsEntry.find(entry => entry.id === id)
                if(!exists) chatsEntry.push({ id, cid, title, status, lastMessage, lastEventTime, participants, newMessages })
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
            
            _chats.forEach(chat => {
                if(chat.type === 'DIALOG') {
                    Object.keys(chat.participants).forEach(member => {
                        if(!contactsEntry[member]) requireInfo.add(member)
                    })
                }
            })
            
            if(requireInfo.size) {
                const response = await Client.contactInfo(Array.from(requireInfo))
                console.log('Got contacts', response)
                response.contacts.forEach(got => {
                    if(contactsEntry[got.id]) contactsEntry[got.id].avatar = got.baseUrl
                    else {
                        contactsEntry[got.id] = {
                            avatar: got.baseUrl,
                            names: got.names,
                            gender: got.gender,
                            description: got.description,
                            updateTime: got.updateTime,
                        }
                    }
                })
            }
            
            console.log('Sync entries', chatsEntry, contactsEntry)
            
            contacts.set(contactsEntry)
            chats.set(chatsEntry)
            setContacts(contactsEntry)
            setChats(chatsEntry)
            
            lastSyncedAt.set(Date.now())
            console.log('Синхронизация успешно завершена.');*/

        } catch (payload) {
            console.error("Ошибка во время синхронизации:", payload);
            if(payload.error === 'login.token') {
                logout();
                goto('/auth/login');
            }
        } finally {
            isSyncing.set(false)
        }
    }
