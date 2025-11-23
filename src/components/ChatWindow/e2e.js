import API, { currentUser, currentSessionContacts, receivedMessage, chatMessages, chatKeys } from '$lib/stores/api'
import { createIdentity, getEncrypted, handleIncomingEnvelope, bufToBase64Url, publicIdentityPack } from '$lib/crypto/async_encryption.js';
import { obfuscate, deobfuscate, isObfuscated } from '$lib/crypto/messages.js';
import { sendMessage } from '$components/ChatWindow/actions.js';

import { writable, get } from 'svelte/store';

const requestsBlocked = {};
const requests = {};

export const checkForEncryptionRequest = async (chat, chatKeysCached, newMessages) => {
    let encryptionRequest = null;
    let encryptionResponse = null;
    
    const isSavedMessagesChat = chat.id === 0;
    
    /*
     * EncryptionRequest - собеседник отправил запрос
     * EncryptionResponse - собеседник принял запрос
     */
    
    newMessages.forEach(msg => {
        const dmsg = getDeobfuscatedMessage(msg)
        if (dmsg && dmsg.slice(0, 3) === 'idx' && !encryptionRequest) {
            encryptionRequest = { sender: msg.sender, data: dmsg };
        }
        if (dmsg && dmsg.slice(0, 3) === 'idy' && !encryptionResponse) {
            encryptionResponse = { sender: msg.sender, data: dmsg };
        }
    })
    
    if (encryptionRequest && (isSavedMessagesChat || encryptionRequest.sender !== get(currentUser))) {
        const [ _, userId, ed_public, cv_public ] = encryptionRequest.data.split('|')
        
        if (!chatKeysCached) chatKeysCached = { current: null, keys: [], messages: [] }
        
        const entry = chatKeysCached.keys.find(pairs => pairs.edp === ed_public);
        
        // !!deny - отклонили
        // !!eds - уже согласились
        
        if (entry?.deny || entry?.eds || requestsBlocked[chat.id] && requestsBlocked[chat.id] > Date.now()) return;
        
        requests[chat.id] = {
            userId, edp: ed_public, cvp: cv_public
        }
    }
    else if (encryptionResponse && (isSavedMessagesChat || encryptionResponse.sender !== get(currentUser))) {
        const [ _, userId, ed_public, cv_public ] = encryptionResponse.data.split('|')
        
        if (!chatKeysCached) chatKeysCached = { current: null, keys: [], messages: [] }
        const keyIndex = chatKeysCached.keys.length
        
        chatKeysCached.current = keyIndex;
        
        await chatKeysCached.set(chat.id, chatKeysCached)
    }
}


async function encryptMessage(chat, text) {
    // TODO multiple participants support (MLS)
    const otherId = +Object.keys(chat.participants).find(x => x !== get(currentUser))
    const keys = chatKeysCached.keys[chatKeysCached.current];
    const otherIdentityPacked = publicIdentityPack(keys, otherId)
    const envelope = await getEncrypted(get(currentUser), keys, [ otherIdentityPacked ], text)
    
    return obfuscate(envelope, 'zh')
}


function decryptMessage(chatKeysCached, message, deobfuscated) {
    const entry = chatKeysCached.messages.find(entry => entry.from <= message.id && entry.to >= message.id)
    if (!entry) return { error: 'Ключи шифрования не найдены!' };
    return handleIncomingEnvelope(deobfuscated, $currentUser, chatKeysCached.keys[entry.key]);
}


function getDeobfuscatedMessage(msg) {
    if (!isObfuscated(msg.text, 'zh')) return;
    try {
      const data = deobfuscate(msg.text, 'zh')
      if (data && data.length) return data;
    } catch (e) {}
}


export function deobfuscate_msg(msg) {
    const dmsg = getDeobfuscatedMessage(msg);
    if (dmsg) return tryDecryptMessage(dmsg);
    else return null;
}


async function tryDecryptMessage(dmsg) {
    const prefix = dmsg.slice(0, dmsg.indexOf('|'));
    if (prefix === 'idx') {
        return "<b>Запрос на включение шифрования</b>";
    }
    else if (prefix === 'idx') {
        return "<b>Запрос на включение шифрования</b>";
    }
    else if (Number(prefix)) { 
        const msg = await decryptMessage(dmsg);
        if (!msg.ok) return "<b>Ошибка!</b> " + msg.error;
        return msg.plaintext;
    }
    else return "<b>Деобфусцировано:</b> " + dmsg;
}


/* нажатие в меню запроса */
export async function handleEnc(chat, chatKeysCached, messages, action) {
    if (!chatKeysCached) chatKeysCached = { current: null, keys: [], messages: [] }
    
    const request = requests[chat.id];
    if (!request) return alert("Ошибка! Код: 0")
    
    if (action === 'agree') {
        const identity = await createIdentity($currentUser)
        
        await sendMyIdentity(chat, chatKeysCached, messages, identity, 'idy')
        
        const request = requests[chat.id];
        
        const keys = {
            eds: bufToBase64Url(identity.ed25519_sk),
            cvs: bufToBase64Url(identity.curve25519_sk),
            edp: request.edp,
            cvp: request.cvp,
            deny: false,
        }
        
        const keyIndex = chatKeysCached.keys.length
        chatKeysCached.keys.push(keys)
        chatKeysCached.current = keyIndex;
        await chatKeys.set(chat.id, chatKeys)
    }
    else if (action === 'deny' || action === 'block') {
        chatKeysCached.keys.push({ edp: request.edp, deny: true })
        await chatKeys.set(chat.id, chatKeys);
        
        if (action === 'block') {
            requestsBlocked[chat.id] = Date.now() + 10 * 60 * 1000
            // TODO store
        }
    }
    
    gotSecretChatRequest = null
}


/* нажатие в настройках */
export async function switchEnc(chat, chatKeysCached, messages) {
    if(!chatKeysCached || chatKeysCached.current === null) {
        const identity = await createIdentity(get(currentUser))
        
        const startSecretChatRequest = {
            eds: bufToBase64Url(identity.ed25519_sk),
            cvs: bufToBase64Url(identity.curve25519_sk),
        }
        
        if (!chatKeysCached) chatKeysCached = { current: null, keys: [], messages: [] }
        
        chatKeysCached.keys.push({
            eds: startSecretChatRequest.eds,
            cvs: startSecretChatRequest.cvs,
            edp: null,
            cvp: null,
            deny: false,
        })
        
        await new Promise(r => setTimeout(r, 250))
        await sendMyIdentity(chat, chatKeysCached, messages, identity, 'idx')
    }
    else {
        chatKeysCached.current = null;
        await chatKeys.set(chat.cid, chatKeys);
        
        // TODO signal to stop secret chat
        //newMessage = await encryptMessage('$stop-secret-chat')
        //await sendMessage()
    }
}


export const sendMyIdentity = async (chat, chatKeysCached, messages, identity, prefix) => {
    const identityTransfer = [
        prefix,
        get(currentUser),
        bufToBase64Url(identity.ed25519_pk),
        bufToBase64Url(identity.curve25519_pk),
    ].join('|')
    
    const newMessage = await obfuscate(identityTransfer, 'zh') // TODO выбор алфавита
    await sendMessage(chat, chatKeysCached, messages, newMessage)
}
