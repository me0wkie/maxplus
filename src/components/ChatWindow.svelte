<script>
    import { createEventDispatcher, getContext, onMount, onDestroy, tick } from 'svelte';
    import { open } from '@tauri-apps/plugin-dialog';
    import { fade, fly } from 'svelte/transition';
    import { writable, get } from 'svelte/store';

    import Message from '$components/ChatWindow/Message.svelte';
    import Bubbles from '$components/Bubbles.svelte';
    import '$lib/styles/AnimatedPanel.css';
    import API, { currentUser, receivedMessage, chatMessages, chatKeys, currentSessionContacts, currentSessionChats } from '$lib/stores/api'
    import { sendMessage, handleReaction } from '$components/ChatWindow/actions.js'
    import { checkForEncryptionRequest, deobfuscate_msg } from '$components/ChatWindow/e2e.js'
    import * as Caching from '$lib/utils/caching.js'
    import Settings from '$components/ChatWindow/Settings.svelte'
    import E2eModal from '$components/ChatWindow/E2eModal.svelte'
    import Dropout from '$components/ChatWindow/Dropout.svelte'
    import Signature from '$lib/utils/Signature.svelte'
    import MediaViewer from '$components/ChatWindow/MediaViewer.svelte'
    import Avatar from '$components/main/Avatar.svelte';

    export let chat;

    let startSecretChatRequest = null;
    let gotSecretChatRequest = null;
    let chatKeysCached = null;

    let newMessage = '';
    let replyTo = null;
    let attaches = [];
    let elements = [];

    let showSettings = false;
    let dropoutActiveAt;
    let attachesDropout = null;

    let loading = false;
    let all_loaded = false;

    let scrollElement;
    let scrollLoaderTimeout;
    let showScrollDown = false;

    let viewerOpen = false;
    let viewerIndex = 0;

    let clickStartPos = { x: 0, y: 0 };

    $: uiMessages = [...$messages].sort((a, b) => a.time - b.time);

    const dispatch = createEventDispatcher();
    const messages = writable($API.savedMessages[chat.id] || []);
    let initialized = false;

    messages.subscribe(async _messages => {
        if (_messages.length) await chatMessages.set(chat.id, _messages);
    })

    const BATCH_SIZE = 50;

    const avatarUserId = chat.type === 'DIALOG' ? chat.id ^ $currentUser : undefined;
    const onBack = getContext('onBack');

    onBack['chat'] = () => { dispatch('close'); delete onBack['chat']; };

    onDestroy(() => {
        delete onBack['chat'];
        if (onBack.dropout) delete onBack['dropout'];
        if (onBack.chatSettings) delete onBack['chatSettings'];
    });

    onMount(async () => {
        chatKeysCached = await chatKeys.get(chat.id);
        await loadHistory(true);
    });

    let isDragging = false;
    let startY;
    let startScrollTop;

    function startDrag(e) {
        clickStartPos = { x: e.clientX, y: e.clientY };

        if (e.button !== 0) return;

        isDragging = true;
        startY = e.pageY;
        startScrollTop = scrollElement.scrollTop;

        scrollElement.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }

    function stopDrag() {
        isDragging = false;
        if (scrollElement) {
            scrollElement.style.cursor = 'grab';
        }
        document.body.style.userSelect = '';
    }

    function moveDrag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const y = e.pageY;
        const walk = (y - startY) * 1;

        scrollElement.scrollTop = startScrollTop - walk;
    }

    const scrollToBottom = async (smooth = false) => {
        if (!scrollElement) return;
        await tick();
        scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    const loadHistory = async (isInitial = false) => {
        if (loading) return;
        if (all_loaded && !isInitial) return;

        loading = true;
        const oldScrollHeight = scrollElement ? scrollElement.scrollHeight : 0;
        const oldScrollTop = scrollElement ? scrollElement.scrollTop : 0;

        try {
            if (!initialized || isInitial) {
                if (!$messages.length) {
                    const { error, messages: syncedMessages } = await $API.getMessages(chat.id);
                    if (error) throw new Error(error);

                    messages.set(syncedMessages);
                    if (syncedMessages.length < BATCH_SIZE) all_loaded = true;
                    $API.savedMessages[chat.id] = syncedMessages;
                }
                initialized = true;
                if (isInitial) {
                    await tick();
                    scrollToBottom(false);
                }
            } else {
                const oldestMsg = uiMessages[0];
                const fromTime = oldestMsg ? oldestMsg.time : Date.now();

                const { error, messages: syncedMessages } = await $API.getMessages(chat.id, fromTime);

                if (!error && syncedMessages.length > 0) {
                    const currentMsgs = get(messages);
                    const existingIds = new Set(currentMsgs.map(m => m.id));
                    const newUniqueMessages = syncedMessages.filter(m => !existingIds.has(m.id));

                    if (newUniqueMessages.length > 0) {
                        messages.update(msgs => [...msgs, ...newUniqueMessages]);
                        await tick();

                        if (scrollElement) {
                            const newScrollHeight = scrollElement.scrollHeight;
                            const diff = newScrollHeight - oldScrollHeight;
                            scrollElement.scrollTop = oldScrollTop + diff;
                        }
                    }
                }
                if (syncedMessages.length < BATCH_SIZE) {
                    all_loaded = true;
                }
            }
            console.log($messages)
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
            const check = get(messages).slice(0, 5);
            checkForEncryptionRequest(chat, chatKeysCached, check);
        }
    };

    receivedMessage.subscribe(async message => {
        if (!message || message.chatId !== chat.id) return;

        let wasAtBottom = false;
        if (scrollElement) {
             const { scrollTop, scrollHeight, clientHeight } = scrollElement;
             wasAtBottom = (scrollHeight - scrollTop - clientHeight) < 150;
        }

        messages.update(_messages => {
            const idx = _messages.findIndex(x => x.id === message.id)
            if (idx !== -1) _messages[idx] = message;
            else _messages.push(message);
            return _messages;
        })

        if (message.sender === $currentUser || wasAtBottom) {
             await tick();
             scrollToBottom(true);
        }

        checkForEncryptionRequest(chat, chatKeysCached, [ message ])
    })

    function handleScroll(event) {
        const target = event.currentTarget;

        const distanceFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
        showScrollDown = distanceFromBottom > 50;

        if (target.scrollTop < 200 && !loading && !all_loaded) {
             if(scrollLoaderTimeout) return;
             scrollLoaderTimeout = setTimeout(async () => {
                 await loadHistory();
                 scrollLoaderTimeout = null;
             }, 200);
        }
    }

    async function onSend() {
        if (!newMessage.trim() && !attaches.length) return;
        const textToSend = newMessage;
        const tempId = Date.now().toString();

        newMessage = "";

        await tick();
        scrollToBottom(true);

        const _attaches = [];
        const _elements = [];

        for (const attach of attaches) {
            const result = await $API.uploadAttachment(attach);
            if (result) {
                _attaches.push(result);
                attaches.splice(attaches.indexOf(attach), 1)
            }
            else alert("Не удалось загрузить!\n" + JSON.stringify(attach));
        }

        if (!textToSend && !_attaches.length) return;

        try {
            await sendMessage(chat, chatKeysCached, messages, textToSend, replyTo, _attaches, _elements);
        } catch (e) {
            console.error(e);
        }
    }

    $: allMedia = uiMessages.flatMap(m =>
      (m.attaches || [])
        .filter(a => a._type === 'PHOTO' || a._type === 'VIDEO')
        .map(a => ({
            ...a,
            messageId: m.id,
            uid: a.videoId || a.photoId || a.url || a.baseUrl
        }))
    );

    function openMedia(attach) {
        const targetUid = attach.videoId || attach.photoId || attach.url || attach.baseUrl;
        const index = allMedia.findIndex(m => m.uid === targetUid);

        if (index !== -1) {
            viewerIndex = index;
            viewerOpen = true;
        }
    }

    function handleClick(e) {
        if (dropoutActiveAt) {
            const isOutside = !['.message-actions-dropout'].some(x => e.target.closest(x))
            if (isOutside) {
                dropoutActiveAt = null;
                e.stopPropagation();
                if (onBack.dropout) delete onBack['dropout'];
            }
        }
        if (attachesDropout) {
            const isOutside = !e.target.closest('.attaches-dropout') && !e.target.closest('.send-button');
            if (isOutside) {
                attachesDropout = null;
                e.stopPropagation();
            }
        }
        const reactionClicked = ['.reaction'].some(x => e.target.closest(x))
        if (reactionClicked) {
            const reaction = e.target.childNodes[0].nodeValue.trim();
            const msgId = e.target.parentNode.dataset.msgId;
            handleReaction(chat, $messages.find(x => x.id === msgId), reaction);
            messages.update(x => x);
            e.stopPropagation();
        }
    }

    function selectMessage(e, msg) {
        if (e.target.closest('.grid-item')) return;

        const dx = Math.abs(e.clientX - clickStartPos.x);
        const dy = Math.abs(e.clientY - clickStartPos.y);

        if (dx > 5 || dy > 5) return;

        dropoutActiveAt = { e, msg };
    }

    function handleDropout(e) {
        dropoutActiveAt = null;
        if (e.detail?.update) messages.update(x => x);
    }


    const openSettings = () => { showSettings = !showSettings; if (showSettings) onBack.chatSettings = () => showSettings = false; else delete onBack['chatSettings']; }

    let title;

    onMount(async () => {
        if (chat.id === 0) {
            title = "Избранное"
        }
        else {
            if (!chat.type) {
                const response = await $API.getChat(chat.id)

                Caching.cacheChat(response.chats[0])
                chat = $currentSessionChats.find(x => x.id === chat.id)
            }

            if (chat.id < 0) {
                console.log('CHANNEL')

                title = chat.title;
            }
            else {
                title = $currentSessionContacts?.[avatarUserId]?.names?.[0]?.name;
            }
        }
    });

    function toggleAttachesDropout() {
        attachesDropout = attachesDropout ? null : { active: true };
    }

    const filters = {
        PHOTO: [
          {
            name: 'Изображения',
            extensions: ['png', 'jpeg', 'jpg'],
          }
        ],
        VIDEO: [
          {
            name: 'Видео',
            extensions: ['mp4', 'mov', 'avi', 'webm'],
          }
        ]
    }

    async function selectFile(type) {
        const path = await open({
            multiple: false,
            directory: false,
            filters: filters[type],
        });

        console.log('Selected', path)
        if (!path) return;

        attaches.push({
            type,
            path
        })
    }

    let lastDate = null

    function formatMessageDate(unixTime) {
        const date = new Date(unixTime);
        const now = new Date();
        const isCurrentYear = date.getFullYear() === now.getFullYear();

        if (isCurrentYear) {
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long'
            });
        } else {
            const day = date.getDate();
            const month = date.toLocaleString('ru-RU', { month: 'long' });
            const year = date.getFullYear();
            return `${day} ${month}, ${year}`;
        }
    }

    function isNewDay(unixTime) {
        const date = new Date(unixTime);
        if (!lastDate || lastDate.toDateString() !== date.toDateString()) {
            lastDate = date;
            return true;
        }
        return false;
    }

</script>

<div class="chat-window" on:click|capture={handleClick}>
    <Bubbles/>

    {#if viewerOpen}
        <MediaViewer
        chatId={chat.id}
        bind:index={viewerIndex}
        allMedia={allMedia}
        on:close={() => viewerOpen = false}
        />
    {/if}

    <header>
        <div class="align-left">
            <button class="icon-button" on:click|stopPropagation={() => dispatch('close')}>
                <img src="icons/arrow.svg" style="transform: scale(-1.5)" class="icon"/>
            </button>
            <Avatar size={36} chat={chat} style="margin-left: -8px"/>
            <div on:click={() => dispatch('profile')} class="info">
                <a class="title">{ title }</a>
                <a class="presence"><Signature chat={chat} /></a>
            </div>
        </div>
        <div class="align-right">
            {#if chat.type !== "CHANNEL"}
             <button class="icon-button" on:click|stopPropagation={openSettings}>
                <img src="icons/params.svg" class="icon"/>
            </button>
            {/if}
        </div>
    </header>

    {#if chat.type !== "CHANNEL"}
    <Settings chat={chat} chatKeysCached={chatKeysCached} messages={messages} showSettings={showSettings}/>
    {/if}

    <div
        bind:this={scrollElement}
        on:scroll={handleScroll}
        on:mousedown={startDrag}
        on:mouseleave={stopDrag}
        on:mouseup={stopDrag}
        on:mousemove={moveDrag}
        class="message-list-container grab-scroll"
    >
        <E2eModal gotSecretChatRequest={gotSecretChatRequest}/>

        {#each uiMessages as msg (msg.id)}
            {#if isNewDay(msg.time)}
                <div class="date-separator">
                    <a>{formatMessageDate(msg.time)}</a>
                </div>
            {/if}

            <div class="message-wrapper">
                <div class="message-clickable-area"
                    on:click|stopPropagation={e => selectMessage(e, msg)}>
                    <Message
                        {msg}
                        dropoutActiveAt={dropoutActiveAt}
                        deobfuscated={deobfuscate_msg(msg)}
                        chat={chat}
                        on:openMedia={(e) => openMedia(e.detail.attach)}
                        on:openChat={(e) => {
                          dispatch('chat', e.detail)
                        }}
                    />
                </div>
            </div>
        {/each}

        <div style="height: 20px; flex-shrink: 0;"></div>
    </div>

    <Dropout activeAt={dropoutActiveAt} chat={chat} on:close={handleDropout}/>

    {#if chat.type !== "CHANNEL"}
        <div class="input-area">
          <div class="input-controls">
              <button class="send-button" on:click={toggleAttachesDropout}>
                  <img src="icons/attachment.png" style="transform: scale(0.6) rotate(70deg)" class="icon"/>
              </button>

              {#if attachesDropout}
                  <div class="attaches-dropout">
                      <button on:click={() => selectFile("PHOTO")}>Изображение</button>
                      <button on:click={() => selectFile("VIDEO")}>Видео</button>
                      <button on:click={() => selectFile("FILE")}>Файл</button>
                  </div>
              {/if}

              <div class="input-container">
                  <textarea
                      id="textarea-{chat.id}"
                      rows="1"
                      placeholder="Сообщение"
                      bind:value={newMessage}
                      on:keydown={async (e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              await onSend();
                          }
                      }}
                  ></textarea>

                  <button class="emoji-btn" type="button" on:click={() => {}}>
                      <img src="icons/smile.svg" alt="smile" />
                  </button>
              </div>

              {#if newMessage.length}
                  <button class="send-button" on:click={onSend}>
                      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
              {:else}
                  <button class="send-button">
                      <img src="icons/voice.svg" style="transform: scale(1.15, 1)" class="icon"/>
                  </button>
              {/if}
          </div>
      </div>
    {/if}

    {#if showScrollDown}
      <button
        in:fade={{ duration: 100 }}
        out:fade ={{ duration: 100 }}
        class="scroll-down-btn"
        class:nije={ chat.type === 'CHANNEL' }
        on:click={() => scrollToBottom(true)}>
        <svg viewBox="0 0 640 640"><path fill="#777" d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"/></svg>
      </button>
    {/if}
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
    height: 100svh;
    background-color: #161621;
    padding-top: env(safe-area-inset-top, 10px);
    padding-bottom: env(safe-area-inset-bottom, 20px);
  }

  header {
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    align-items: center;
    padding: 10px 0;
    height: 32px;
    cursor: grab;
    flex-shrink: 0;
    background-color: #1e2024;
    z-index: 5;
  }

  header .info { display: flex; flex-direction: column; min-width: 0; }
  header .info .presence { font-size: 12px; }
  header .title { color: white; font-size: 16px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  header .align-left { display: flex; flex-direction: row; align-items: center; gap: 10px; }
  .icon-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    height: 48px;
    width: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    outline: none;
  }

  .scroll-down-btn {
    position: fixed;
    bottom: 80px;
    right: 10px;
    background: #1e2024;
    opacity: 0.9;
    color: white;
    border: none;
    border-radius: 50%;
    width: 55px;
    height: 55px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.1s;
  }

  .scroll-down-btn:hover {
    opacity: 1;
  }

  .scroll-down-btn svg {
    width: 36px;
  }

  .scroll-down-btn.nije {
    bottom: 20px;
  }

  .message-list-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-anchor: auto !important;
  }

  .message-list-container::-webkit-scrollbar {
    width: 4px;
    display: block;
  }
  .message-list-container::-webkit-scrollbar-track {
    background: transparent;
  }
  .message-list-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  .message-list-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .grab-scroll {
    cursor: grab;
  }
  .grab-scroll:active {
    cursor: grabbing;
  }

  .date-separator {
    text-align: center;
    margin: 8px 0 16px 0;
    color: #aaa;
    position: relative;
  }

  .date-separator a {
    padding: 4px 16px;
    border-radius: 100px;
    background-color: #fff2;
    font-size: 13px;
    font-weight: 500;
  }

  .message-wrapper {
    position: relative;
    width: 100%;
  }

  .message-clickable-area {
    position: relative;
    overflow: visible;
  }

  .input-area { padding: 8px; flex-shrink: 0; background-color: #1e2024; z-index: 5; }

  .input-controls {
    display: flex;
    align-items: flex-end;
    gap: 4px;
  }

  .input-container {
    display: flex;
    align-items: flex-end;
    background-color: #17191d;
    border-radius: 12px;
    flex-grow: 1;
    min-height: 42px;
    box-sizing: border-box;
    border: 1px solid transparent;
  }

  .attaches-dropout {
    position: absolute;
    bottom: 60px;
    left: 0px;
    background-color: #17191d;
    border: 1px solid #333;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    z-index: 10;
  }

  .attaches-dropout button {
    background: none;
    border: none;
    color: #fff;
    padding: 16px 32px;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
  }

  .attaches-dropout button:hover {
    background-color: #2a2c31;
  }

  textarea {
    flex-grow: 1;
    background-color: transparent;
    color: #ddd;
    border: none;
    resize: none;
    overflow-y: hidden;
    min-height: 42px;
    max-height: 120px;
    font-size: 16px;
    line-height: 1.4;
    padding: 10px 12px;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
  }

  textarea::placeholder {
    color: #555;
  }

  .emoji-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
    transition: opacity 0.2s, transform 0.2s;
    flex-shrink: 0;
  }

  .emoji-btn img {
    width: 22px;
    height: 22px;
    transform: scale(1.2);
    margin-right: 2px;
  }

  .emoji-btn:active {
    transform: scale(0.9);
  }

  .send-button { border: none; width: 42px; height: 42px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; background: none; opacity: 0.6; }
  .send-button:active { transform: scale(0.9); }
  .send-button svg { fill: white; width: 24px; height: 24px; }
</style>
