<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { writable, get } from 'svelte/store';
    import Message from '$lib/components/ChatWindow/Message.svelte';
    
    import '$lib/styles/AnimatedPanel.css';
    
    import API, { currentUser, currentSessionContacts, receivedMessages, chatMessages, chatKeys } from '$lib/stores/api'
    
    import { createIdentity, getEncrypted, handleIncomingEnvelope, bufToBase64Url, publicIdentityPack } from '$lib/crypto/async_encryption.js';
    import { obfuscate, deobfuscate, isObfuscated } from '$lib/crypto/messages.js';
    
    export let chat;
    
    let avatar;
    let title;
    
    let startSecretChatRequest = null;
    let gotSecretChatRequest = null;
    let chatKeysCached = null; // TODO it's a test!!! add secure storage & encryption
    let language = 'ru'
    let key = 'default' // obfuscation key (not an encryption key)
    let banned = false;
    
    onMount(getKeys);
    async function getKeys() {
        chatKeysCached = await chatKeys.get(chat.cid);
        console.log('setup chat keys', chatKeysCached)
        
        loadHistory();
    }
    
    const dispatch = createEventDispatcher();
    
    let loading = false;
    let all_loaded = false;
    let initialized = false;
    
    const messages = writable([])
    messages.subscribe(async _messages => {
        // todo refactor, join with loadHistory
        console.log('SETTING MESSAGES',_messages)
        if (_messages.length) await chatMessages.set(chat.cid, _messages);
    })

    const BATCH_SIZE = 40;

    // TODO выяснить как ставятся аватары (ну наверно не так как говно ведь)
    const avatarUserId = Object.keys(chat.participants).find(x => +x !== $currentUser)
    
    /*contacts.subscribe(contacts => {
      if(avatar && title || !avatarUserId) return;
      const contact = contacts[avatarUserId]
      if(contact) {
        avatar = contact.avatar;
        title = contact.names[0].name;
      }
    })*/
    
    const sortMessages = (messages) => {
        return messages.sort((a, b) => b.time - a.time);
    };

    const loadHistory = async () => {
        if (loading || all_loaded) return;
        loading = true;

        console.log('Requesting... initialized:', initialized);

        if (!initialized) {
            const cachedHistory = await chatMessages.get(chat.cid);
            console.log(cachedHistory, await chatMessages.get(chat.cid))
            const initialCachedMessages = cachedHistory?.slice(0, BATCH_SIZE) || [];
            const messageMap = new Map(initialCachedMessages.map(m => [m.id, m]));

            messages.set(sortMessages(initialCachedMessages));
            
            const latestServerMessages = await $API.getMessages(chat.cid, null, 0, BATCH_SIZE);
            const serverIds = new Set(latestServerMessages.map(m => m.id));
            
            messageMap.forEach((message, id) => {
                if (!serverIds.has(id)) {
                    message.deleted = true;
                }
            });
            
            latestServerMessages.forEach(serverMsg => {
                messageMap.set(serverMsg.id, serverMsg);
            });
            
            messages.set(sortMessages(Array.from(messageMap.values())));
            
            if (latestServerMessages.length < BATCH_SIZE) {
                all_loaded = true;
            }
            initialized = true;
        } else {
            const _messages = get(messages);
            const lastMessage = _messages[_messages.length - 1];
            if (!lastMessage) {
                all_loaded = true;
                loading = false;
                return;
            }
            const fromTime = lastMessage.time;

            const serverHistory = await $API.getMessages(chat.cid, fromTime, 0, BATCH_SIZE);
            console.log('Loaded older serverHistory', serverHistory.length);
            
            if (serverHistory.length > 0) {
                const existingIds = new Set(_messages.map(m => m.id));
                const newMessages = serverHistory.filter(m => !existingIds.has(m.id));
                _messages.push(...newMessages.reverse());
                messages.set(_messages);
            }

            if (serverHistory.length < BATCH_SIZE) {
                all_loaded = true;
            }
        }
        
        loading = false;
        console.log('Final messages amount:', messages.length);
        
        const check = get(messages).slice(0, 5);
        checkForEncryptionRequest(check);
        
        // funny bug lol (you can send this to any user)
        //await $Client.sendMessage(null, chat.cid, { attaches: [{ _type: 'CONTROL', event: 'botStarted' }], notify: true, })
    };
    
    let newMessage = '';
    let replyTo = null;
    
    let pinnedMessages = [];
    let currentPinnedIndex = 0;
    
    let showSettings = false;
    
    let menuPosition = { top: 0, left: 0 };
    let activeMessageMenu = null;

    let participants = Object.keys(chat.participants).filter(x => x === $currentUser);
    let isFavorites = Object.keys(chat.participants).length === 1; // TODO change
    
    receivedMessages.subscribe(async _messages => {
        const newMessages = _messages.filter(msg => {
            return msg.chatId === chat.cid && !_messages.find(x => x.id === msg.id)
        })

        if (newMessages.length) {
            _messages.unshift(...newMessages.sort((a, b) => b.time - a.time));
            messages.set(_messages);
            console.log('new messages (from subscriber)', newMessages)
            
            checkForEncryptionRequest(newMessages)
        }
    })

    async function sendMessage() {
        if (!newMessage.trim()) return;
        
        const encrypt = chatKeysCached?.current !== undefined;
        console.log(chatKeysCached)
        
        let text = encrypt ? await encryptMessage(newMessage) : newMessage;
        
        let chatId = chat.cid;
        let replyToId = replyTo;
        
        newMessage = ''; replyTo = null;
        
        document.getElementById(`textarea-${chat.cid}`).style.height = 'auto';
        
        const id = Date.now()
        
        const displayMessageEarlyEntry = {
            id, text,
            sender: $currentUser,
            reactions: [],
            type: 'text',
            time: Date.now(),
            replyTo: replyToId,
        }
        
        const _messages = get(messages);
        _messages.unshift(displayMessageEarlyEntry);
        messages.set(_messages);
        
        const createdMessageResponse = await $API.sendMessage(text, chatId, { notify: true, replyTo: replyToId })
        
        if(!createdMessageResponse.text) {
            /*chatMessages.update(array => {
                const entry = array.find(x => x.id === id)
                if (entry) array.splice(array.indexOf(entry), 1);
                return array;
            })*/
            //chatMessages.set()
        } else {
            console.log('Message successfully sent', createdMessageResponse)
            const entry = _messages.find(x => x.id === id)
            if (entry !== undefined) {
                entry.id = createdMessageResponse.id;
                console.log('set id ' + id + ' -> ' + createdMessageResponse.id)
            }
            chatMessages.set(chatId, _messages)
            
            if (encrypt) {
                const { id } = createdMessageResponse;
                const entry = chatKeysCached.messages.find(entry => entry.key === chatKeysCached.current);
                if (!entry)
                    chatKeysCached.messages.push({ from: id, to: id, key: chatKeysCached.current })
                else {
                    entry.to = id;
                }
            }
        }
    }
    
    function toggleMessageMenu(event, msg) {
        if (activeMessageMenu) {
            activeMessageMenu = null;
        } else {
            activeMessageMenu = msg.id;
            menuPosition = { top: event.clientY, left: event.clientX };
        }
    }

    function handleReaction(emoji) {
        const msg = $messages.find(x => x.id === activeMessageMenu);
        console.log(`Reacted to message ${msg.id} with ${emoji}`);
        activeMessageMenu = null;
    }

    function handlePinMessage() {
        const msg = $messages.find(x => x.id === activeMessageMenu);
        if (!pinnedMessages.find(p => p.id === msg.id)) {
            pinnedMessages = [...pinnedMessages, msg];
        } else {
            pinnedMessages = pinnedMessages.filter(p => p.id !== msg.id);
            if (currentPinnedIndex >= pinnedMessages.length && pinnedMessages.length > 0) {
                currentPinnedIndex = pinnedMessages.length - 1;
            }
        }
        activeMessageMenu = null;
    }

    function handleSetReply() {
        const msg = $messages.find(x => x.id === activeMessageMenu);
        replyTo = msg.id;
        activeMessageMenu = null;
    }
    
    function navigatePinned(direction) {
        const len = pinnedMessages.length;
        if (len === 0) return;
        currentPinnedIndex = (currentPinnedIndex + direction + len) % len;
    }

    function autoGrow(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
    
    const offset = 50;
    
    let timeout;
    
    function handleScroll(event) {
        if(timeout) return;
        timeout = setTimeout(async () => {
            const target = event.target;
            const untilTop = target.scrollTop + target.scrollHeight - target.clientHeight
            const isNearTop = untilTop < 400
            console.log(untilTop, isNearTop)
            if(isNearTop && !loading && !all_loaded) await loadHistory()
            timeout = null;
        }, 500)
    }
    
    function handleClickOutside() {
        if (activeMessageMenu) {
            activeMessageMenu = null;
        }
    }
    
    const checkForEncryptionRequest = async (newMessages) => {
        let encryptionRequest = null;
        let encryptionResponse = null;
        
        newMessages.forEach(msg => {
            const dmsg = getDeobfuscatedMessage(msg)
            console.log(dmsg)
            if (dmsg && dmsg.slice(0, 3) === 'idx' && !encryptionRequest) {
                encryptionRequest = { sender: msg.sender, data: dmsg };
            }
            if (dmsg && dmsg.slice(0, 3) === 'idy' && !encryptionResponse) {
                encryptionResponse = { sender: msg.sender, data: dmsg };
            }
        })
        
        console.log(encryptionRequest, encryptionResponse)
        
        if (encryptionRequest && (isFavorites || encryptionRequest.sender !== $currentUser)) {
            const [ _, userId, ed_public, cv_public ] = encryptionRequest.data.split('|')
            
            console.log(chatKeysCached, 'and???')
            if (!chatKeysCached) chatKeysCached = { current: null, keys: [], messages: [] }
            
            const entry = chatKeysCached.keys.find(pairs => pairs.edp === ed_public);
            
            // deny - отклонили
            // eds - уже согласились
            
            if (entry?.deny || entry?.eds || banned) return;
            
            gotSecretChatRequest = {
                userId, edp: ed_public, cvp: cv_public
            }
        }
        else if (encryptionResponse && (isFavorites || encryptionResponse.sender !== $currentUser)) {
            const [ _, userId, ed_public, cv_public ] = encryptionResponse.data.split('|')
            
            if (!chatKeysCached) chatKeysCached = { current: null, keys: [], messages: [] }
            const keyIndex = chatKeysCached.keys.length
            
            chatKeysCached.keys.push({
                eds: startSecretChatRequest.eds,
                cvs: startSecretChatRequest.cvs,
                edp: ed_public,
                cvp: cv_public,
                deny: false,
            })
            
            chatKeysCached.current = keyIndex;
            
            await chatKeysCached.set(chat.cid, chatKeysCached)
        }
    }
    
    async function encryptMessage(text) {
        // TODO multiple participants support
        const otherId = +Object.keys(chat.participants).find(x => x !== $currentUser)
        const keys = chatKeysCached.keys[chatKeysCached.current];
        const otherIdentityPacked = publicIdentityPack(keys, otherId)
        console.log(keys, otherIdentityPacked)
        const envelope = await getEncrypted($currentUser, keys, [ otherIdentityPacked ], text)
        
        console.log(envelope)
        return obfuscate(envelope, 'zh')
    }
    
    function decryptMessage(message, deobfuscated) {
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
    
    function deobfuscate_msg(msg) {
        const dmsg = getDeobfuscatedMessage(msg);
        if (dmsg) return tryDecryptMessage(dmsg);
        else return null;
    }
    
    async function tryDecryptMessage(dmsg) {
        const prefix = dmsg.slice(0, dmsg.indexOf('|'));
        console.log(prefix)
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
    async function handleEnc(action) {
        if (!chatKeysCached) chatKeysCached = { current: null, keys: [], messages: [] }
        
        if (action === 'agree') {
            const identity = await createIdentity($currentUser)
            await sendMyIdentity(identity, 'idy')
            
            const keys = {
                eds: bufToBase64Url(identity.ed25519_sk),
                cvs: bufToBase64Url(identity.curve25519_sk),
                edp: gotSecretChatRequest.edp,
                cvp: gotSecretChatRequest.cvp,
                deny: false,
            }
            
            const keyIndex = chatKeysCached.keys.length
            chatKeysCached.keys.push(keys)
            chatKeysCached.current = keyIndex;
            await chatKeys.set(chat.cid, chatKeys)
        }
        else if (action === 'deny' || action === 'block') {
            chatKeysCached.keys.push({ edp: gotSecretChatRequest.edp, deny: true })
            await chatKeys.set(chat.cid, chatKeys);
            
            if (action === 'block') {
                banned = true;
                // TODO store
            }
        }
        
        gotSecretChatRequest = null
    }
    
    /* нажатие в настройках */
    async function encSwitch() {
        if(!chatKeysCached || chatKeysCached.current === null) {
            const identity = await createIdentity($currentUser)
            
            startSecretChatRequest = {
                eds: bufToBase64Url(identity.ed25519_sk),
                cvs: bufToBase64Url(identity.curve25519_sk),
            }
            
            showSettings = false;
            await new Promise(r => setTimeout(r, 250))
            await sendMyIdentity(identity, 'idx')
        }
        else {
            chatKeysCached.current = null;
            await chatKeys.set(chat.cid, chatKeys);
            
            // TODO signal to stop secret chat
            //newMessage = await encryptMessage('$stop-secret-chat')
            //await sendMessage()
        }
    }
    
    const sendMyIdentity = async (identity, prefix) => {
        const identityTransfer = [
            prefix,
            $currentUser,
            bufToBase64Url(identity.ed25519_pk),
            bufToBase64Url(identity.curve25519_pk),
        ].join('|')
        
        newMessage = await obfuscate(identityTransfer, 'zh') // TODO выбор алфавита
        await sendMessage()
    }

</script>

    <svelte:window/>
<div class="chat-window">
    <header>
        <span class="title">{title}</span>
        <div class="controls">
<button class="icon-button" on:click|stopPropagation={() => showSettings = !showSettings}>
                <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
            </button>
            <button class="icon-button" on:click|stopPropagation={() => dispatch('close')}>
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            </div>
    </header>
    
    {#if showSettings}
        <div class="settings-dropout" on:click|stopPropagation>
            <div class="setting-title">Шифрование: {chatKeysCached?.current ? 'активно' : 'отключено'}</div>
            <p>Когда включено, только вы и получатель сможете прочитать сообщения.</p>
            <button class="settings-button animated-panel" on:click={encSwitch}>
                {chatKeysCached?.current ? 'Отключить' : 'Активировать'}
            </button>
        </div>
    {/if}

    <div on:scroll={handleScroll} class="message-list">
        {#if gotSecretChatRequest}
        <div class="modal-backdrop">
            <div class="modal-content">
                <div class="modal-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <h2>Секретный чат</h2>
                </div>

                <div class="modal-body">
                    <p>Собеседник предлагает защитить переписку с помощью шифрования</p>
                    
                    <div class="warning-box">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        <p><strong>Внимание:</strong> после выхода из аккаунта вы, скорее всего, не сможете прочитать сообщения из этого чата</p>
                    </div>
                </div>

                <div class="modal-actions">
                   <div class="main-actions">
                        <button on:click={() => handleEnc('agree')} class="btn btn-primary">Согласиться</button>
                        <button on:click={() => handleEnc('deny')} class="btn btn-secondary">Отказаться</button>
                   </div>
                    <button on:click={() => handleEnc('block')} class="btn btn-link">Не показывать 10 минут</button>
                </div>
            </div>
        </div>
        {/if}
        {#each $messages as msg (msg.id)}
            <div class="message-clickable-area" on:click|stopPropagation|preventDefault={(e) => toggleMessageMenu(e, msg)}>
                <Message 
                    {msg} 
                    deobfuscated={deobfuscate_msg(msg)}
                />
            </div>
        {/each}
    </div>

    {#if activeMessageMenu}
        <div class="message-actions-dropout" 
             transition:fly="{{ y: -10, duration: 200 }}"
             style="top:{menuPosition.top}px; left:{menuPosition.left}px;" 
             on:click|stopPropagation>
            <button on:click={() => handleSetReply()}>Ответить</button>
            <button on:click={() => handlePinMessage()}>Закрепить</button>
            <button on:click={() => handleDeleteMessage()}>Удалить</button>
            
            <div class="reactions-picker">
                <button on:click={() => handleReaction('👍')}>👍</button>
                <button on:click={() => handleReaction('❤️')}>❤️</button>
                <button on:click={() => handleReaction('😂')}>😂</button>
                <button on:click={() => handleReaction('😮')}>😮</button>
                <button on:click={() => handleReaction('😢')}>😢</button>
                <button on:click={() => handleReaction('🙏')}>🙏</button>
            </div>
        </div>
    {/if}

    <div class="input-area">
        <div class="input-controls">
             <textarea 
                id="textarea-{chat.cid}"
                rows="1" 
                placeholder="Сообщение" 
                bind:value={newMessage} 
                on:keydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                on:input={autoGrow}
            ></textarea>
            <button class="send-button" on:click={sendMessage}>
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
    border-radius: 16px;
    overflow: hidden;
    color: #ccc;
    z-index: 2;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: url("telegram_background.jpg");
    background-size: contain;
  }
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    min-height: 32px;
    user-select: none;
    cursor: grab;
    flex-shrink: 0;
  }
  header:active { cursor: grabbing; }
  .fullscreen header { cursor: default; }
  
  header .title {
    color: white;
    font-weight: 1000;
    font-size: 18px;
    letter-spacing: 1px;
  }

  .controls { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
  }
  .icon-button {
    background: none;
    border: none;
    color: var(--light-text-color);
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }
  .icon-button:hover { background-color: rgba(255,255,255,0.2); }
  .icon-button svg { 
    width: 24px; 
    height: 24px; 
    fill: currentColor; 
  }

  .resize-handle {
    position: absolute;
    z-index: 20;
    background: transparent;
  }
  
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    padding: 15px;
    
    animation: fadeIn 0.3s ease;
  }

  .modal-content {
    background-color: #ffffff;
    color: #333;
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: scaleIn 0.3s ease;
  }

  .modal-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #2c3e50;
  }

  .modal-header svg {
    stroke: #2c3e50;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 22px;
  }

  .modal-body p {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: #555;
  }

  .warning-box {
    background-color: #fffbe6; /* Светло-желтый фон */
    border: 1px solid #ffe58f; /* Желтая рамка */
    border-radius: 8px;
    padding: 12px;
    margin-top: 16px;
    display: flex;
    align-items: center;
    text-align: left;
    gap: 10px;
  }
  .warning-box svg {
    stroke: #faad14;
    flex-shrink: 0;
  }
  .warning-box p {
    font-size: 14px;
    color: #5e4f24;
  }
  .warning-box p strong {
    color: #d46b08;
  }

  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }

  .main-actions {
    display: flex;
    gap: 12px;
  }

  .btn {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  .btn:active {
    transform: translateY(0);
    box-shadow: none;
  }

  .btn.btn-primary {
    background-color: #27ae60; /* зеленый */
    color: white;
  }
  .btn.btn-primary:hover {
    background-color: #2ecc71;
  }

  .btn.btn-secondary {
    background-color: #f1f2f6;
    color: #555;
  }
  .btn.btn-secondary:hover {
    background-color: #dfe4ea;
  }

  .btn.btn-link {
    background: none;
    color: #7f8c8d;
    font-weight: 500;
    font-size: 14px;
    padding: 4px;
  }
  
  .btn.btn-link:hover {
    color: #34495e;
    text-decoration: underline;
    box-shadow: none;
    transform: none;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { 
        opacity: 0;
        transform: scale(0.95);
    }
    to { 
        opacity: 1;
        transform: scale(1);
    }
  }

  
  .message-list {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    min-height: 0;
    flex-direction: column-reverse;
  }
  
  .message-clickable-area {
    position: relative;
    overflow: visible;
  }
  
  .message-actions-dropout {
    position: fixed;
    z-index: 1000;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 150px;
    transition: top 0.1s ease, left 0.1s ease;
  }
  .message-actions-dropout button {
    padding: 10px 15px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    width: 100%;
    font-size: 14px;
  }
  .message-actions-dropout button:hover { background-color: #f0f0f0; }

  .reactions-picker {
    display: flex;
    justify-content: space-around;
    padding: 4px;
    border-top: 1px solid #eee;
  }
  .reactions-picker button {
    font-size: 20px;
    padding: 4px;
    border-radius: 50%;
    line-height: 1;
    transition: transform 0.1s, background-color 0.1s;
    border: none;
    background: none;
    cursor: pointer;
  }
  .reactions-picker button:hover {
    background-color: #f0f0f0;
    transform: scale(1.2);
  }

  .input-area {
    padding: 8px;
    flex-shrink: 0;
    background-color: #242329;
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

  .replying-to {
    background: rgba(0,0,0,0.05);
    padding: 8px 12px;
    margin-bottom: 8px;
    border-radius: 12px;
    font-size: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .settings-dropout {
    position: absolute;
    top: 55px;
    right: 10px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 15px;
    width: 300px;
    z-index: 10;
  }

  .setting-title { 
    font-weight: 500;
    margin-bottom: 8px;
    font-size: 16px;
  }

  .settings-dropout p { 
    font-size: 13px;
    color: #666;
    margin: 0 0 12px 0;
    line-height: 1.5;
  }

  .settings-button {
    width: 100%;
    padding: 8px 12px;
    border: none;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.2s;
  }

  .settings-button:hover { opacity: 0.9; }

  .pinned-messages-container {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0,0,0,0.05);
    flex-shrink: 0;
  }

  .pinned-message-content {
    flex-grow: 1;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pinned-message-content span { 
    opacity: 0.7; 
    margin-left: 5px; 
  }

  .pin-nav {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 0 8px;
  }

  .pin-nav:disabled { 
    opacity: 0.3; 
    cursor: default; 
  }
</style>
