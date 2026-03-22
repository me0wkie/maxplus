import { currentSessionChats, currentSessionContacts } from '$lib/stores/api'
import { get } from 'svelte/store';

// TODO same function is appears in MobileApi.init, must be merged
export const cacheChat = chat => {
    const currentChats = get(currentSessionChats)
    let updated = false;

    const { id, title, admins, baseIconUrl: avatar,
        adminParticipants, videoConversation, status, lastMessage,
        lastEventTime, participants, newMessages, type } = chat

    const exists = currentChats.find(entry => entry.id === id);

    if(!exists) {
        currentChats.push({ id, type, title, status, avatar, lastMessage, lastEventTime, participants, newMessages });
        updated = true;
    }
    else {
        const before = JSON.stringify(exists)
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

    if (updated) currentSessionChats.set(currentChats)
}

// access, baseIconUrl, baseRawIconUrl, created, description
// id, lastDelayedUpdateTime, lastEventTime, lastFireDelayedErrorTime,
// lastMessage, link, messagesCount, modified, options, owner, participants
// participantsCount, pinnedMessage, reactions, restrictions, status, title, type
