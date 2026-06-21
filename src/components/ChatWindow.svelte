<script>
  import {
    createEventDispatcher,
    getContext,
    onMount,
    onDestroy,
    tick,
  } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { writable, get } from "svelte/store";

  import Message from "$components/ChatWindow/Message.svelte";
  import PinnedMessage from "$components/ChatWindow/PinnedMessage.svelte";
  import Bubbles from "$components/Bubbles.svelte";
  import "$lib/styles/AnimatedPanel.css";
  import API, {
    currentUser,
    receivedMessage,
    chatMessages,
    chatKeys,
    chatObfs,
    chatPassword,
    currentSessionContacts,
    currentSessionChats,
  } from "$lib/stores/api";
  import Session from "$lib/stores/session";
  import { handleReaction } from "$components/ChatWindow/actions.js";
  import {
    checkForEncryptionRequest,
    decode_msg,
  } from "$components/ChatWindow/e2e.js";
  import { scrollToBottom } from "$lib/utils/scroll.js";
  import * as Caching from "$lib/utils/caching.js";
  import Settings from "$components/ChatWindow/Settings.svelte";
  import E2eModal from "$components/ChatWindow/E2eModal.svelte";
  import Dropout from "$components/ChatWindow/Dropout.svelte";
  import Signature from "$components/main/Signature.svelte";
  import MediaViewer from "$components/ChatWindow/MediaViewer.svelte";
  import DateSeparator from "$components/ChatWindow/DateSeparator.svelte";
  import Input from "$components/ChatWindow/input/Input.svelte";
  import Avatar from "$components/main/Avatar.svelte";

  export let chatId;

  $: chat = $currentSessionChats?.find((c) => c.id === chatId);

  let startSecretChatRequest = null;
  let gotSecretChatRequest = null;
  let chatKeysLoaded = null;
  let chatPasswordLoaded = "";
  let chatObfuscationLoaded = "";

  let replyTo = null;

  let settingsShown = false;
  let dropoutActiveAt;
  let attachesDropout = null;

  let loading = false;
  let all_loaded = false;

  let scrollElement;
  let scrollLoaderTimeout;
  let showScrollDown = false;

  let viewerOpen = false;
  let viewerIndex = 0;

  let lastDate;

  let clickStartPos = { x: 0, y: 0 };

  const messages = writable([]);
  let initialized = false;

  $: uiMessages = ($messages ? [...$messages] : []).sort((a, b) => a.time - b.time);

  const dispatch = createEventDispatcher();

  messages.subscribe(async (_messages) => {
    if (_messages.length && chat?.id) {
      await chatMessages.set(chat.id, _messages);
    }
  });

  const BATCH_SIZE = 50;

  $: avatarUserId = chat?.type === "DIALOG" ? (chat.id ^ $currentUser) : undefined;

  const onBack = getContext("onBack");

  onBack["chat"] = () => {
    dispatch("close");
    delete onBack["chat"];
  };

  onDestroy(() => {
    delete onBack["chat"];
    if (onBack.dropout) delete onBack["dropout"];
    if (onBack.chatSettings) delete onBack["chatSettings"];
    scrollResizeObserver?.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
  });

  const DEFAULT_HEIGHT = 60;
  const OVERSCAN = 1500;

  const messageHeights = writable({});
  let cumulativeHeights = [];
  let innerList;
  let visibleMessages = [];
  let scrollAnchor = { messageId: null, offset: 0 };

  let pendingHeightUpdates = {};

  let resizeObserver = null;
  function setupResizeObserver() {
    if (resizeObserver) return;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const wrapper = el.closest('.message-wrapper');
        if (!wrapper) continue;
        const id = wrapper.id?.replace('m-', '');
        if (!id) continue;
        const height = entry.contentRect.height;
        if (height > 0) {
          pendingHeightUpdates[id] = height;
        }
      }
    });
  }

  function observeResize(node, id) {
    if (resizeObserver) resizeObserver.observe(node);
    return {
      destroy() {
        if (resizeObserver) resizeObserver.unobserve(node);
      }
    };
  }

  function applyPendingHeights() {
    const updates = pendingHeightUpdates;
    pendingHeightUpdates = {};
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    messageHeights.update(h => {
      const newH = { ...h };
      for (const id of keys) newH[id] = updates[id];
      return newH;
    });
    computeCumulativeHeights();
  }

  function computeCumulativeHeights() {
    const heights = [];
    let sum = 0;
    for (const msg of uiMessages) {
      const h = $messageHeights[msg.id] || DEFAULT_HEIGHT;
      sum += h;
      heights.push(sum);
    }
    cumulativeHeights = heights;
  }

  function findIndexByOffset(target) {
    let lo = 0, hi = cumulativeHeights.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (cumulativeHeights[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function captureScrollAnchor() {
    if (!scrollElement || !uiMessages.length) return;
    const st = scrollElement.scrollTop;
    for (let i = 0; i < uiMessages.length; i++) {
      const msg = uiMessages[i];
      const top = i === 0 ? 0 : cumulativeHeights[i - 1];
      const bottom = cumulativeHeights[i];
      if (bottom > st && top < st + scrollElement.clientHeight) {
        scrollAnchor = { messageId: msg.id, offset: st - top };
        return;
      }
    }
    scrollAnchor = { messageId: uiMessages[0]?.id, offset: st };
  }

  function restoreScrollAnchor() {
    if (!scrollAnchor.messageId || !scrollElement) return;
    const idx = uiMessages.findIndex(m => m.id === scrollAnchor.messageId);
    if (idx === -1) return;
    const top = idx === 0 ? 0 : cumulativeHeights[idx - 1];
    scrollElement.scrollTop = top + scrollAnchor.offset;
  }

  async function updateVisibleMessages(skipAnchor = false) {
    if (!scrollElement) return;

    applyPendingHeights();

    if (!skipAnchor) {
      captureScrollAnchor();
    }

    const { scrollTop, clientHeight } = scrollElement;
    const totalHeight = cumulativeHeights.length ? cumulativeHeights[cumulativeHeights.length - 1] : 0;
    if (totalHeight === 0) {
      visibleMessages = [];
      return;
    }

    const isNearBottom = totalHeight - scrollTop - clientHeight < 50;
    let startIdx, endIdx;

    if (isNearBottom) {
      const targetOffset = Math.max(0, totalHeight - clientHeight - OVERSCAN);
      startIdx = findIndexByOffset(targetOffset);
      endIdx = uiMessages.length - 1;
    } else {
      const viewTop = Math.max(0, scrollTop - OVERSCAN);
      const viewBottom = scrollTop + clientHeight + OVERSCAN;
      startIdx = findIndexByOffset(viewTop);
      endIdx = findIndexByOffset(viewBottom);
      endIdx = Math.min(endIdx, uiMessages.length - 1);
      if (startIdx > endIdx) endIdx = startIdx;
    }

    const newVisible = [];
    for (let i = startIdx; i <= endIdx && i < uiMessages.length; i++) {
      newVisible.push(uiMessages[i].id);
    }
    visibleMessages = newVisible;

    if (!skipAnchor) {
      await tick();
      restoreScrollAnchor();
    } else {
      await tick();
    }
  }

  function measureAllHeights() {
    if (!innerList) return;
    const wrappers = innerList.querySelectorAll('.message-wrapper');
    const updates = {};
    for (const wrapper of wrappers) {
      const id = wrapper.id?.replace('m-', '');
      if (!id) continue;
      const content = wrapper.querySelector('.message-clickable-area');
      if (content) {
        const height = content.getBoundingClientRect().height;
        if (height > 0) updates[id] = height;
      }
    }
    if (Object.keys(updates).length) {
      messageHeights.update(h => ({ ...h, ...updates }));
    }
  }

  const decodedMessages = writable({});

  const loadHistory = async (isInitial = false) => {
    if (loading) return;
    if (all_loaded && !isInitial) return;
    if (!chat) return;

    loading = true;
    const oldScrollHeight = scrollElement ? scrollElement.scrollHeight : 0;
    const oldScrollTop = scrollElement ? scrollElement.scrollTop : 0;
    let anchorId = null, anchorOffset = 0;

    if (scrollElement && visibleMessages.length > 0 && !isInitial) {
      const firstVisibleId = visibleMessages[0];
      const idx = uiMessages.findIndex(m => m.id === firstVisibleId);
      if (idx !== -1) {
        anchorId = firstVisibleId;
        const topOffset = idx > 0 ? cumulativeHeights[idx - 1] : 0;
        anchorOffset = oldScrollTop - topOffset;
      }
    }

    try {
      if (!initialized || isInitial) {
        const { error, messages: syncedMessages } = await $API.getMessages(chat.id);
        if (error) throw new Error(error);
        messages.set(syncedMessages);

        const decoded = {};
        await Promise.all(syncedMessages.map(async (msg) => {
          const res = await decode_msg(msg);
          if (res) decoded[msg.id] = res;
        }));
        decodedMessages.set(decoded);

        if (syncedMessages.length < BATCH_SIZE) all_loaded = true;
        $API.savedMessages[chat.id] = syncedMessages;
        initialized = true;
      } else {
        const oldestMsg = uiMessages[0];
        const fromTime = oldestMsg ? oldestMsg.time : Date.now();
        const { error, messages: syncedMessages } = await $API.getMessages(chat.id, fromTime);
        if (!error && syncedMessages.length > 0) {
          const currentMsgs = get(messages);
          const existingIds = new Set(currentMsgs.map(m => m.id));
          const newUnique = syncedMessages.filter(m => !existingIds.has(m.id));
          if (newUnique.length > 0) {
            messages.update(msgs => [...msgs, ...newUnique]);

            const newDecoded = {};
            await Promise.all(newUnique.map(async (msg) => {
              const res = await decode_msg(msg);
              if (res) newDecoded[msg.id] = res;
            }));
            decodedMessages.update(d => ({ ...d, ...newDecoded }));

            if (syncedMessages.length < BATCH_SIZE) all_loaded = true;

            await tick();
            applyPendingHeights();
            computeCumulativeHeights();

            if (scrollElement) {
              if (anchorId) {
                const newIdx = uiMessages.findIndex(m => m.id === anchorId);
                if (newIdx !== -1) {
                  const newTopOffset = newIdx > 0 ? cumulativeHeights[newIdx - 1] : 0;
                  scrollElement.scrollTop = newTopOffset + anchorOffset;
                } else {
                  const diff = scrollElement.scrollHeight - oldScrollHeight;
                  scrollElement.scrollTop = oldScrollTop + diff;
                }
              } else {
                const diff = scrollElement.scrollHeight - oldScrollHeight;
                scrollElement.scrollTop = oldScrollTop + diff;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  };

  let scrollTimeout = null;
  let updateScheduled = false;

  function handleScroll(event) {
    const target = event.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    showScrollDown = distanceFromBottom > 50;

    if (!updateScheduled) {
      updateScheduled = true;
      requestAnimationFrame(async () => {
        await updateVisibleMessages();
        updateScheduled = false;
      });
    }

    if (target.scrollTop <= 50 && !loading && !all_loaded) {
      if (scrollLoaderTimeout) return;
      scrollLoaderTimeout = setTimeout(async () => {
        await loadHistory();
        await updateVisibleMessages();
        setTimeout(() => scrollLoaderTimeout = null, 500);
      }, 200);
    }
  }

  receivedMessage.subscribe(async (message) => {
    if (!message || message.chatId !== chat?.id) return;

    let wasAtBottom = false;
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      wasAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    }

    messages.update((_messages) => {
      const idx = _messages.findIndex((x) => x.id === message.id);
      if (idx !== -1) _messages[idx] = message;
      else return [..._messages, message];
      return _messages;
    });

    const decoded = await decode_msg(message);
    if (decoded) decodedMessages.update(d => ({ ...d, [message.id]: decoded }));

    await tick();
    applyPendingHeights();
    computeCumulativeHeights();

    if (message.sender === $currentUser || wasAtBottom) {
      scrollToBottom(scrollElement, true);
    }

    await updateVisibleMessages(wasAtBottom);
    checkForEncryptionRequest(chat, chatKeysLoaded, [message]);
  });

  let title;
  onMount(async () => {
    if (chat?.id === 0) {
      title = "Избранное";
    } else if (chat) {
      if (chat.id < 0) title = chat.title;
      else title = $currentSessionContacts?.[avatarUserId]?.names?.[0]?.name;
    }

    chatPasswordLoaded = await chatPassword.get(chat?.id);
    chatObfuscationLoaded = await chatObfs.get(chat?.id);
    chatKeysLoaded = await chatKeys.get(chat?.id);



    setupResizeObserver();
    startAutoScrollIfAtBottom();

    await loadHistory(true);
    await tick();

    measureAllHeights();
    computeCumulativeHeights();

    await updateVisibleMessages(true);

    scrollToBottom(scrollElement, false);
  });

  /*
   * drag & message select
   */

  let isDragging = false;
  let startY, startScrollTop;

  function startDrag(e) {
    clickStartPos = { x: e.clientX, y: e.clientY };
    if (e.button !== 0) return;
    isDragging = true;
    startY = e.pageY;
    startScrollTop = scrollElement.scrollTop;
    scrollElement.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }

  function stopDrag() {
    isDragging = false;
    if (scrollElement) scrollElement.style.cursor = "grab";
    document.body.style.userSelect = "";
  }

  function moveDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const y = e.pageY;
    const walk = (y - startY) * 1;
    scrollElement.scrollTop = startScrollTop - walk;
  }

  function handleClick(e) {
    if (e.target.closest(".reply-block") || e.target.closest(".forward-block")) return;
    if (dropoutActiveAt) {
      if (![".message-actions-dropout"].some(x => e.target.closest(x))) {
        dropoutActiveAt = null;
        e.stopPropagation();
        if (onBack.dropout) delete onBack["dropout"];
      }
    }
    if (attachesDropout) {
      if (!e.target.closest(".attaches-dropout") && !e.target.closest(".send-button")) {
        attachesDropout = null;
        e.stopPropagation();
      }
    }
    if (e.target.closest(".reaction")) {
      const reaction = e.target.childNodes[0].nodeValue.trim();
      const msgId = e.target.parentNode.dataset.msgId;
      handleReaction(chat, $messages.find(x => x.id === msgId), reaction);
      messages.update(x => x);
      e.stopPropagation();
    }
  }

  function selectMessage(e, msg) {
    if (e.target.closest(".grid-item") || e.target.closest(".reply-block")) return;
    const dx = Math.abs(e.clientX - clickStartPos.x);
    const dy = Math.abs(e.clientY - clickStartPos.y);
    if (dx > 5 || dy > 5) return;
    dropoutActiveAt = { e, msg };
  }

  function handleDropout(e) {
    dropoutActiveAt = null;
    if (e.detail?.update) {
      messages.set($API.savedMessages[chat.id]);
    }
  }

  const openSettings = () => {
    settingsShown = !settingsShown;
    if (settingsShown) onBack.chatSettings = () => (settingsShown = false);
    else delete onBack["chatSettings"];
  };

  let dateSeparators = {};

  $: if (uiMessages.length) {
    const newSeparators = {};
    let lastDateStr = null;
    for (const msg of uiMessages) {
      const dateStr = new Date(msg.time).toLocaleDateString();
      if (dateStr !== lastDateStr) {
        newSeparators[msg.id] = dateStr;
        lastDateStr = dateStr;
      }
    }
    dateSeparators = newSeparators;
  }

  let scrollResizeObserver;

  function startAutoScrollIfAtBottom() {
    if (!scrollElement) return;

    scrollResizeObserver = new ResizeObserver(() => {
      if (!scrollElement) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (atBottom) {
        scrollToBottom(scrollElement, false);
      }
    });

    scrollResizeObserver.observe(scrollElement);
  }

  async function makeVisible(id) {
    if (!visibleMessages.includes(id)) {
      visibleMessages = [...visibleMessages, id];
      await tick();
    }
  }

</script>

<div class="chat-window" on:click|capture={handleClick}>
  <Bubbles />

  {#if viewerOpen}
    <MediaViewer
      chatId={chat.id}
      bind:index={viewerIndex}
      {allMedia}
      on:close={() => (viewerOpen = false)}
    />
  {/if}

  <header>
    <div class="align-left">
      <button
        class="icon-button"
        on:click|stopPropagation={() => dispatch("close")}
      >
        <img src="icons/arrow.svg" style="transform: scale(-1.5)" />
      </button>
      <div
        class="row"
        on:click={() => {
          if (chat.type === "DIALOG")
            $Session.profile = { userId: $currentUser ^ chat.id };
          else $Session.profile = { chatId: chat.id };
        }}
      >
        <Avatar size={36} {chat} style="margin-left: -8px" />
        <div class="info">
          <a class="title">{title}</a>
          <a class="presence"><Signature {chat} /></a>
        </div>
      </div>
    </div>
    <div class="align-right">
      {#if chat.type !== "CHANNEL"}
        <button class="icon-button" on:click|stopPropagation={openSettings}>
          <img src="icons/params.svg" />
        </button>
      {/if}
    </div>
  </header>

  <Settings
    {chat}
    {chatKeysLoaded}
    {messages}
    bind:password={chatPasswordLoaded}
    bind:obfuscation={chatObfuscationLoaded}
    bind:shown={settingsShown}
  />

  <div
    on:scroll={handleScroll}
    on:mousedown={startDrag}
    on:mouseleave={stopDrag}
    on:mouseup={stopDrag}
    on:mousemove={moveDrag}
    bind:this={scrollElement}
    class="message-list-container grab-scroll"
    id="scroll"
  >
    <E2eModal {gotSecretChatRequest} />

    {#if chat.pinnedMessage}
      <PinnedMessage msg={chat.pinnedMessage} {chat} />
    {/if}

    <div
      class="message-list-inner"
      bind:this={innerList}
    >

    <div style={"flex-shrink: 0; height: " + (chat.pinnedMessage ? "60px" : "10px")}></div>

    {#each uiMessages as msg (msg.id)}
      <div class="message-wrapper" id={"m-" + msg.id}>
        {#if visibleMessages.includes(msg.id) || !$messageHeights[msg.id]}
          <div
            id="clickable-area"
            on:click|stopPropagation={(e) => selectMessage(e, msg)}
          ></div>
          <div
            class="observer-area"
            use:observeResize={msg.id}
          >
            {#if dateSeparators[msg.id]}
              <DateSeparator {msg} />
            {/if}
            <Message
              {msg}
              {chat}
              {dropoutActiveAt}
              {scrollElement}
              makeVisible={makeVisible}
              decoded={$decodedMessages[msg.id]}
              on:openMedia={(e) => openMedia(e.detail.attach)}
              on:openChat={(e) => { dispatch("chat", e.detail); }}
            />
          </div>
        {:else}
          <div class="placeholder" style="width:100%; height:{($messageHeights[msg.id] || DEFAULT_HEIGHT)}px;"></div>
        {/if}
      </div>
    {/each}

    <div style="height: 20px; flex-shrink: 0;"></div>
    </div>
  </div>

  <Dropout
    activeAt={dropoutActiveAt}
    {chat}
    on:reply={(e) => (replyTo = e.detail.id)}
    on:close={handleDropout}
  />

  {#if chat.type !== "CHANNEL"}
    <Input
      bind:replyTo
      {scrollElement}
      {chat}
      {messages}
      {chatObfuscationLoaded}
      {chatKeysLoaded}
    />
  {/if}

  {#if showScrollDown}
    <button
      in:fade={{ duration: 100 }}
      out:fade={{ duration: 100 }}
      class="scroll-down-btn"
      class:nije={chat.type === "CHANNEL"}
      on:click={() => scrollToBottom(scrollElement, true)}
    >
      <svg viewBox="0 0 640 640"
        ><path
          fill="#777"
          d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"
        /></svg
      >
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
    padding: 11px 0;
    height: 32px;
    cursor: grab;
    flex-shrink: 0;
    background-color: #1e2024;
    z-index: 5;
  }

  .row {
    display: flex;
    gap: 12px;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    padding-left: 15px;
  }

  header .info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  header .info .presence {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    min-width: 0;
  }

  header .title {
    color: white;
    font-size: 16px;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  header .align-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    min-width: 0;
  }

  header .align-right {
    flex: 0 0 auto;
    margin-left: auto;
    display: flex;
    align-items: center;
  }

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
    flex: 1;
    overflow-y: auto;
    display: block;
    flex-direction: column;
    overflow-anchor: none;
    overflow-x: clip
  }

  .message-list-inner {
    width: min(500px, 100%);
    display: flex;
    gap: 8px;
    flex-direction: column;
  }

  @media screen and (min-width: 500px) {
    .message-list-container {
      margin-left: 0;
    }
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
    transition: background 0.3s;
  }

  #clickable-area {
    position: absolute;
    width: 100vw;
    height: 100%;
    transition: background 1s;
  }

  .observable-area {
    position: relative;
  }
</style>
