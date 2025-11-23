<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import VirtualList from 'svelte-tiny-virtual-list';
    import { fade, fly } from 'svelte/transition';
    import { writable, get } from 'svelte/store';
    import Message from '$components/ChatWindow/Message.svelte';
    import Bubbles from '$components/Bubbles.svelte';
    
    import '$lib/styles/AnimatedPanel.css';
    
    import API, { currentUser, currentSessionContacts, receivedMessage, chatMessages, chatKeys } from '$lib/stores/api'
    import Session from '$lib/stores/session'
    
    import { sendMessage, handleReaction } from '$components/ChatWindow/actions.js'
    import { checkForEncryptionRequest, deobfuscate_msg } from '$components/ChatWindow/e2e.js'
    import Settings from '$components/ChatWindow/Settings.svelte'
    import E2eModal from '$components/ChatWindow/E2eModal.svelte'
    import Dropout from '$components/ChatWindow/Dropout.svelte'
    
    export let chat;
    
    let startSecretChatRequest = null;
    let gotSecretChatRequest = null;
    let chatKeysCached = null; // TODO it's a test!!! add secure storage & encryption
    let language = 'ru'
    let key = 'default' // obfuscation key (not an encryption key)
    let banned = false;
    
    let newMessage = '';
    let replyTo = null;
    
    let pinnedMessages = [];
    let currentPinnedIndex = 0;
    
    let showSettings = false;
    
    let activeMessageMenu = null;

    let participants = Object.keys(chat.participants).filter(x => x === $currentUser);
    
    let scrollLoaderTimeout;
    
    let onClick;
    
    let dropoutActiveAt;
    
    let loading = false;
    
    onMount(getKeys);
    
    async function getKeys() {
        chatKeysCached = await chatKeys.get(chat.id);
        
        console.log('setup chat keys', chatKeysCached);
        
        loadHistory();
    }
    
    const dispatch = createEventDispatcher();
    
    const messages = writable($API.savedMessages[chat.id] || []);
    let initialized = false;
    messages.subscribe(async _messages => {
        // todo refactor, join with loadHistory
        if (_messages.length) await chatMessages.set(chat.id, _messages);
    })
    
    let all_loaded = messages.length < 20;
    

    const BATCH_SIZE = 20;

    // TODO выяснить как ставятся аватары
    const avatarUserId = Object.keys(chat.participants).find(x => +x !== $currentUser)
    
    
    
    
    function hasChanged(oldMsg, newMsg) {
        if (oldMsg.text !== newMsg.text) return true;
        
        const oldAtt = oldMsg.attaches || [];
        const newAtt = newMsg.attaches || [];
        
        if (oldAtt.length !== newAtt.length) return true;
        if (JSON.stringify(oldAtt) !== JSON.stringify(newAtt)) return true;
        
        const oldR = oldMsg.reactionInfo;
        const newR = newMsg.reactionInfo;
        
        if (!oldR && newR) return true;
        if (oldR && !newR) return true;
        
        if (oldR && newR) {
            if (oldR.totalCount !== newR.totalCount) return true;
            if (oldR.yourReaction !== newR.yourReaction) return true;
            if (JSON.stringify(oldR.counters) !== JSON.stringify(newR.counters)) return true;
        }

        return false;
    }

    const loadHistory = async () => {
        if (loading || all_loaded) return;
        loading = true;
        
        console.log('Requesting... initialized:', initialized);
        console.log('saved', $messages.length)
        
        if (!initialized) {
            if (!$messages.length) {
                console.log('= Initial loading =')
                const cachedHistory = await chatMessages.get(chat.id) || [];
                const messagesMap = new Map(cachedHistory.map(m => [m.id, { ...m }]));

                const { error, messages: syncedMessages } = await $API.getMessages(chat.id);

                if (error) return alert(error);

                const serverIds = new Set();

                for (const serverMsg of syncedMessages) {
                    serverIds.add(serverMsg.id);
                    
                    const localMsg = messagesMap.get(serverMsg.id);
                    if (!localMsg || hasChanged(localMsg, serverMsg)) {
                        messagesMap.set(serverMsg.id, serverMsg);
                    }
                }

                for (const [id, msg] of messagesMap) {
                    if (!serverIds.has(id)) {
                        msg.deleted = true; 
                    }
                    else if (msg.deleted) msg.deleted = false;
                }

                const finalMessages = Array.from(messagesMap.values())
                    .sort((a, b) => b.time - a.time);

                messages.set(finalMessages);
                
                console.log('synced length', syncedMessages.length)

                if (syncedMessages.length < BATCH_SIZE) {
                    all_loaded = true;
                }

                if (!$API.savedMessages[chat.id]) $API.savedMessages[chat.id] = []
                $API.savedMessages[chat.id] = finalMessages;
            }
            
            initialized = true;
        } else {
            console.log('= Scroll loading =')
            const currentMessages = get(messages);
            const lastMessage = currentMessages[currentMessages.length - 1];

            if (!lastMessage) {
                loading = false;
                return;
            }

            const fromTime = lastMessage.time;
            const { error, messages: syncedMessages } = await $API.getMessages(chat.id, fromTime);

            if (error) return alert(error);

            console.log('Loaded older messages:', syncedMessages.length);

            if (syncedMessages.length > 0) {
                const existingIds = new Set(currentMessages.map(m => m.id));
                const newUniqueMessages = syncedMessages.filter(m => !existingIds.has(m.id));
                
                if (newUniqueMessages.length > 0) {
                    newUniqueMessages.sort((a, b) => b.time - a.time);
                    const updatedList = [...currentMessages, ...newUniqueMessages];
                    
                    messages.set(updatedList);
                }
            }
            
            console.log(BATCH_SIZE)
            
            if (syncedMessages.length < BATCH_SIZE) {
                all_loaded = true;
            }
        }
        
        loading = false;
        console.log('Final messages amount:', $messages.length, '\nIs final?', all_loaded);
        
        const check = get(messages).slice(0, 5);
        checkForEncryptionRequest(chat, chatKeysCached, check);
        
        // funny bug lol (you can send this to any user)
        //await $Client.sendMessage(null, chat.id, { attaches: [{ _type: 'CONTROL', event: 'botStarted' }], notify: true, })
    };
    
    receivedMessage.subscribe(async message => {
        if (!message || message.chatId !== chat.id) return;
        
        messages.update(_messages => {
            const idx = _messages.findIndex(x => x.id === message.id)
            console.log('exists?', idx)
            
            if (idx !== -1) {
                _messages.splice(idx, 1, message)
            }
            else _messages.unshift(message);
            
            return _messages;
        })
        
        checkForEncryptionRequest(chat, chatKeysCached, [ message ])
    })
    
    function handleScroll(event) {
        if(scrollLoaderTimeout) return;
        scrollLoaderTimeout = setTimeout(async () => {
            const target = event.target;
            const untilTop = target.scrollTop + target.scrollHeight - target.clientHeight
            const isNearTop = untilTop < 400
            if(isNearTop && !loading && !all_loaded) await loadHistory()
            scrollLoaderTimeout = null;
        }, 500)
    }
    
    function handleClick(e) {
        /* ЗАКРЫТИЕ DROPOUT ТУТА */
        if (dropoutActiveAt) {
            const isOutside = !['.message-actions-dropout'].some(x => e.target.closest(x))
            if (isOutside) {
                dropoutActiveAt = null;
                e.stopPropagation();
            }
        }
        
        /* НАЖАТИЕ РЕАКЦИИ ТУТА */
        const reactionClicked = ['.reaction'].some(x => e.target.closest(x))
        if (reactionClicked) {
            console.log(e.target.childNodes)
            const reaction = e.target.childNodes[1].nodeValue.trim();
            const msgId = e.target.parentNode.dataset.msgId;
            handleReaction(chat, $messages.find(x => x.id === msgId), reaction);
            messages.update(x => x);
            e.stopPropagation()
        }
    }
    
    function selectMessage(e, msg) {
        dropoutActiveAt = {
            e,
            msg
        }
    }
    
    function handleDropout(e) {
        console.log(e)
        dropoutActiveAt = null;
        if (e.detail?.update) {
            messages.update(x => x);
        }
    }
    
    $: title = chat.title || $currentSessionContacts?.[avatarUserId]?.names?.[0]?.name;
    $: avatar = $currentSessionContacts?.[avatarUserId]?.avatar;
</script>
<div class="chat-window" on:click|capture={handleClick}>
    <Bubbles/>
    
    <header>
        <div class="align-left">
            <button class="icon-button" on:click|stopPropagation={() => dispatch('close')}>
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <div class="avatar" style={"background-image: url(" + avatar + ")"}></div>
            <a class="title">{ title }</a>
        </div>
        <div class="align-right">
            <button class="icon-button" on:click|stopPropagation={() => showSettings = !showSettings}>
                <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
            </button>
        </div>
    </header>
    
    <Settings
        chat={chat}
        chatKeysCached={chatKeysCached}
        messages={messages}
        showSettings={showSettings}/>

    <div on:scroll={handleScroll} class="message-list">
        <E2eModal gotSecretChatRequest={gotSecretChatRequest}/>
        {#each $messages as msg (msg.id)}
            <div class="message-clickable-area"
              on:click|stopPropagation|preventDefault={e => selectMessage(e, msg)}>
                <Message 
                    {msg} 
                    dropoutActiveAt={dropoutActiveAt}
                    deobfuscated={deobfuscate_msg(msg)}
                />
            </div>
        {/each}
    </div>
    
    <Dropout activeAt={dropoutActiveAt} chat={chat} on:close={handleDropout}/>

    <div class="input-area">
        <div class="input-controls">
             <textarea 
                id="textarea-{chat.id}"
                rows="1" 
                placeholder="Сообщение" 
                bind:value={newMessage} 
                on:keydown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        await sendMessage(chat, chatKeysCached, messages, newMessage, replyTo);
                        newMessage = "";
                    }
                }}
            ></textarea>
            <button class="send-button" on:click={async e => {
                  await sendMessage(chat, chatKeysCached, messages, newMessage, replyTo);
                  newMessage = "";
              }}>
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
        </div>
    </div>
</div>

<style>
  .chat-window {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #ccc;
    z-index: 10;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #161621;
    scrollbar-width: none;
  }
  
  header {
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    align-items: center;
    padding: 10px 16px;
    height: 32px;
    cursor: grab;
    flex-shrink: 0;
    background-color: #242320;
    z-index: 5;
  }
  
  header .title {
    color: white;
  }
  
  header .avatar {
    width: 32px;
    height: 32px;
    border-radius: 100px;
    background-size: cover;
    image-rendering: smooth;
  }
  
  header .align-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  
  .icon-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    outline: none;
  }
  
  .icon-button:hover { background-color: rgba(255,255,255,0.2); }
  
  .icon-button svg { 
    width: 24px; 
    height: 24px; 
    fill: currentColor; 
  }
  
  .message-list {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    min-height: 0;
    flex-direction: column-reverse;
    overflow-anchor: auto;
    scrollbar-width: none;
  }
  
  .message-list::-webkit-scrollbar { 
    display: none;
    overflow: -moz-scrollbars-none;
  }
  
  .message-list {
    overflow-y: scroll;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .message-list::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
  
  .message-clickable-area {
    position: relative;
    overflow: visible;
  }

  .input-area {
    padding: 8px;
    flex-shrink: 0;
    background-color: #242320;
    z-index: 5;
  }
  
  .input-controls {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }
  
  textarea {
    flex-grow: 1;
    border-radius: 20px;
    padding: 10px 15px;
    background-color: none;
    resize: none;
    overflow-y: hidden;
    min-height: 42px;
    max-height: 120px;
    font-size: 16px;
    line-height: 1.4;
    box-sizing: border-box;
    outline: none;
  }
  
  .send-button {
    border: none;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
    background: none;
  }

  .send-button:active { transform: scale(0.9); }

  .send-button svg { 
    fill: white; 
    width: 24px; 
    height: 24px; 
  }
</style>
