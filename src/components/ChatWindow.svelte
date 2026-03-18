<script>
    import { createEventDispatcher, getContext, onMount, onDestroy, tick } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { writable, get } from 'svelte/store';

    import Message from '$components/ChatWindow/Message.svelte';
    import Bubbles from '$components/Bubbles.svelte';
    import '$lib/styles/AnimatedPanel.css';
    import API, { currentUser, receivedMessage, chatMessages, chatKeys, currentSessionContacts } from '$lib/stores/api'
    import { sendMessage, handleReaction } from '$components/ChatWindow/actions.js'
    import { checkForEncryptionRequest, deobfuscate_msg } from '$components/ChatWindow/e2e.js'
    import Settings from '$components/ChatWindow/Settings.svelte'
    import E2eModal from '$components/ChatWindow/E2eModal.svelte'
    import Dropout from '$components/ChatWindow/Dropout.svelte'
    import Signature from '$lib/utils/Signature.svelte'

    export let chat;

    let startSecretChatRequest = null;
    let gotSecretChatRequest = null;
    let chatKeysCached = null;
    let newMessage = '';
    let replyTo = null;
    let showSettings = false;
    let dropoutActiveAt;

    let loading = false;
    let all_loaded = false;

    let scrollElement;
    let scrollLoaderTimeout;

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

    const avatarUserId = Object.keys(chat.participants).find(x => +x !== $currentUser)
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
        if (target.scrollTop < 200 && !loading && !all_loaded) {
             if(scrollLoaderTimeout) return;
             scrollLoaderTimeout = setTimeout(async () => {
                 await loadHistory();
                 scrollLoaderTimeout = null;
             }, 200);
        }
    }

    async function onSend() {
        if (!newMessage.trim()) return;
        const textToSend = newMessage;
        const tempId = Date.now().toString();

        const optimisticMessage = {
            id: tempId,
            chatId: chat.id,
            text: textToSend,
            sender: $currentUser,
            time: Date.now(),
            status: 'sending'
        };

        newMessage = "";

        await tick();
        scrollToBottom(true);

        try {
            await sendMessage(chat, chatKeysCached, messages, textToSend, replyTo);
        } catch (e) {
            console.error(e);
        }
    }

    $: allMedia = uiMessages.flatMap(m =>
      (m.attaches || [])
        .filter(a => a._type === 'PHOTO' || a._type === 'VIDEO')
        .map(a => ({
            ...a,
            msgId: m.id,
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

    function handleKeydown(e) {
        if (!viewerOpen) return;
        if (e.key === 'Escape') viewerOpen = false;
        if (e.key === 'ArrowRight' && viewerIndex < allMedia.length - 1) viewerIndex++;
        if (e.key === 'ArrowLeft' && viewerIndex > 0) viewerIndex--;
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
    function handleDropout(e) { dropoutActiveAt = null; if (e.detail?.update) messages.update(x => x); }
    const openSettings = () => { showSettings = !showSettings; if (showSettings) onBack.chatSettings = () => showSettings = false; else delete onBack['chatSettings']; }

    $: title = chat.title || $currentSessionContacts?.[avatarUserId]?.names?.[0]?.name || "Избранное";
    $: avatar = chat.avatar || (chat.id === 0 ? 'saved.webp' : $currentSessionContacts?.[avatarUserId]?.avatar);

</script>

<div class="chat-window" on:click|capture={handleClick}>
    <Bubbles/>

    {#if viewerOpen}
        <div class="media-viewer-overlay" transition:fade={{duration: 150}} on:click|self={() => viewerOpen = false}>

            <div class="viewer-header">
                <div class="counter">{viewerIndex + 1} из {allMedia.length}</div>
                <button class="viewer-icon-btn close" on:click={() => viewerOpen = false}>
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>

            <div class="viewer-content">
                <button class="nav-btn prev" class:hidden={viewerIndex === 0} on:click={() => viewerIndex--}>
                    <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                </button>

                <div class="media-container">
                    {#key viewerIndex} {#if allMedia[viewerIndex]._type === 'PHOTO'}
                            <img src={allMedia[viewerIndex].baseUrl} alt="view" in:fly={{y: 20, duration: 200}} />
                        {:else if allMedia[viewerIndex]._type === 'VIDEO'}
                            <video
                                src={allMedia[viewerIndex].url}
                                poster={allMedia[viewerIndex].thumbnail}
                                controls
                                autoplay
                                playsinline
                                in:fly={{y: 20, duration: 200}}
                            >
                                <track kind="captions">
                            </video>
                        {/if}
                    {/key}
                </div>

                <button class="nav-btn next" class:hidden={viewerIndex === allMedia.length - 1} on:click={() => viewerIndex++}>
                    <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
            </div>
        </div>
    {/if}

    <header>
        <div class="align-left">
            <button class="icon-button" on:click|stopPropagation={() => dispatch('close')}>
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <div on:click={() => dispatch('profile')} class="avatar" style={"background-image: url(" + avatar + ")"}></div>
            <div on:click={() => dispatch('profile')} class="info">
                <a class="title">{ title }</a>
                <a class="presence"><Signature chat={chat} /></a>
            </div>
        </div>
        <div class="align-right">
             <button class="icon-button" on:click|stopPropagation={openSettings}>
                <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
            </button>
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
            <div class="message-wrapper">
                 <div class="message-clickable-area"
                 on:click|stopPropagation={e => selectMessage(e, msg)}>
                    <Message
                        {msg}
                        dropoutActiveAt={dropoutActiveAt}
                        deobfuscated={deobfuscate_msg(msg)}
                        on:openMedia={(e) => openMedia(e.detail.attach)}
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
                <button class="send-button" on:click={onSend}>
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>
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
    background-color: #1e2024;
    z-index: 5;
  }

  header .info { display: flex; flex-direction: column; }
  header .info .presence { font-size: 12px; }
  header .title { color: white; font-size: 16px; width: 25vh; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  header .avatar { width: 36px; height: 36px; border-radius: 100px; background-size: cover; image-rendering: smooth; }
  header .align-left { display: flex; flex-direction: row; align-items: center; gap: 10px; }
  .icon-button { background: none; border: none; color: white; cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; outline: none; }
  .icon-button:hover { background-color: rgba(255,255,255,0.2); }
  .icon-button svg { width: 24px; height: 24px; fill: currentColor; }

  .message-list-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-anchor: auto !important;
  }

  .media-viewer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.96);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    user-select: none;
  }

  .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    color: white;
    z-index: 10;
  }

  .counter {
    font-size: 15px;
    font-weight: 500;
    opacity: 0.8;
  }

  .viewer-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px 40px 10px;
    position: relative;
  }

  .media-container {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .media-container img, .media-container video {
    max-width: 95vw;
    max-height: 80vh;
    object-fit: contain;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  /* Кнопки навигации */
  .nav-btn {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    margin: 0 15px;
  }

  .nav-btn:hover { background: rgba(255, 255, 255, 0.2); }
  .nav-btn svg { width: 36px; height: 36px; fill: currentColor; }
  .nav-btn.hidden { opacity: 0; pointer-events: none; }

  .viewer-icon-btn {
    background: none; border: none; color: white; cursor: pointer; padding: 5px;
  }
  .viewer-icon-btn svg { width: 28px; height: 28px; fill: currentColor; }

  /* Мобильная адаптация */
  @media (max-width: 768px) {
    .nav-btn {
      position: absolute;
      background: transparent;
      width: 80px;
      height: 60%;
    }
    .nav-btn.prev { left: 0; }
    .nav-btn.next { right: 0; }
    .nav-btn:hover { background: transparent; }
    .nav-btn svg { opacity: 0.5; }
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

  .message-wrapper {
    position: relative;
    width: 100%;
  }

  .message-clickable-area {
    position: relative;
    overflow: visible;
  }

  .input-area { padding: 8px; flex-shrink: 0; background-color: #1e2024; z-index: 5; }
  .input-controls { display: flex; align-items: flex-end; gap: 8px; }
  textarea { flex-grow: 1; border-radius: 12px; padding: 10px 15px; background-color: #17191d; color: #ddd; border: none; resize: none; overflow-y: hidden; min-height: 42px; max-height: 120px; font-size: 16px; line-height: 1.4; box-sizing: border-box; outline: none; }
  .send-button { border: none; width: 42px; height: 42px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; background: none; }
  .send-button:active { transform: scale(0.9); }
  .send-button svg { fill: white; width: 24px; height: 24px; }
</style>
