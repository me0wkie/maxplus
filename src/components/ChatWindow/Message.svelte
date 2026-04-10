<script>
  import { createEventDispatcher } from 'svelte';
  import API, { currentUser, currentSessionContacts } from '$lib/stores/api';
  import { openPath } from '@tauri-apps/plugin-opener';
  import Avatar from '$components/main/Avatar.svelte';
  import Reactions from './Reactions.svelte';
  import Attachments from '$components/ChatWindow/Attachments.svelte';

  const dispatch = createEventDispatcher();

  export let deobfuscated;
  export let dropoutActiveAt;
  export let msg;
  export let avatar;
  export let chat;

  $: isMe = msg.sender === $currentUser;
  $: isSystem = msg.attaches?.[0]?._type === 'CONTROL';
  $: lines = msg.text?.split("\n");

  function handleMediaClick(attach) {
    dispatch('openMedia', { attach });
  }

  function displaySystemMessage() {
    const event = msg.attaches?.[0]?.event;
    if (event === 'botStarted') return "Вы запустили бота!";
    const first = msg.attaches?.[0];
    if (event === 'new') return "Чат " + first.title + " создан";
    if (event === 'icon') return "Фото чата изменено";
    if (event === 'joinByLink') return "Вы вступили по ссылке";
    if (event === 'system') return first.message;
    return event;
  }

  function handleForwardHeaderClick() {
    if (msg.link?.chatId) {
      dispatch('openChat', { chatId: msg.link.chatId, messageId: msg.link.message.id });
    }
  }

  function getFile(fileId) {
    return $API.getFileById(chat.id, msg.id, fileId);
  }



  $: hasForward = msg.link && msg.link.type === 'FORWARD';
  $: forwardMsg = msg.link?.message;
  $: forwardLines = forwardMsg?.text?.split("\n");
</script>

<div class="message-row"
     class:is-me={isMe}
     class:is-system={isSystem}
     class:is-deleted={msg.deleted}
     class:inactive={dropoutActiveAt && dropoutActiveAt?.msg?.id !== msg.id}>

    {#if chat.type !== "CHANNEL" && !isMe && !isSystem}
        <Avatar size={32} chat={chat}/>
    {/if}

    <div class="message-bubble">
        <div class="row">
            <div class="text">

                {#if hasForward}
                  <div class="forward-block">
                    <div class="forward-header" on:click|stopPropagation={handleForwardHeaderClick}>
                      {#if msg.link.chatIconUrl}
                        <img src={msg.link.chatIconUrl} alt="" class="forward-avatar" />
                      {/if}
                      <div class="forward-info">
                        <span class="forward-name">{msg.link.chatName}</span>
                        <span class="forward-label">Пересланное сообщение</span>
                      </div>
                      <svg class="forward-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </div>

                    {#if forwardLines}
                      <div class="forward-content">
                        {#each forwardLines as fLine}
                          <p class="line allow-selection">{fLine}</p>
                        {/each}
                      </div>
                    {/if}

                    {#if forwardMsg.attaches}
                      <Attachments
                      getFile={getFile}
                      attaches={forwardMsg.attaches}
                      handleMediaClick={handleMediaClick}/>
                    {/if}
                  </div>
                {/if}

                {#if isSystem}
                  <p class="line system">{ displaySystemMessage() }</p>
                {:else}
                  {#if deobfuscated}
                    {#await deobfuscated}
                      <p class="line">Загрузка...</p>
                    {:then text}<p class="line">{@html text }</p>
                    {/await}
                  {:else if lines}
                     {#each lines as line}<p class="line">{line}</p>{/each}
                  {/if}

                  {#if msg.attaches}
                    <Attachments
                    getFile={getFile}
                    attaches={msg.attaches}
                    handleMediaClick={handleMediaClick}/>
                  {/if}
                {/if}
            </div>

            <div class="message-status">
                <div class="status-meta">
                  {#if msg.stats?.views}
                    <span class="views">
                      <svg viewBox="0 0 24 24" class="views-icon"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                      {msg.stats.views}
                    </span>
                  {/if}
                  <span class="timestamp">{new Date(msg.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                {#if isMe && !isSystem}
                  <div class="status-ticks">
                      {#if msg.status === 3}
                        <svg class="status-icon is-read" viewBox="0 0 22 13"><path d="M11 12.025L5 6L6.5 4.5L11 9.52502L20.05 0L21.45 1.425L11 12.025ZM4.9999 12.025L0 7L1.5 5.50002L4.9999 9.5L14.375 0.025L15.8 1.425L4.9999 12.025Z"/></svg>
                      {:else}
                        <svg class="status-icon" viewBox="0 0 24 13"><path d="M6 12.025L0 6L1.5 4.5L6 9.52502L15.05 0L16.45 1.425L6 12.025Z"/></svg>
                      {/if}
                  </div>
                {/if}
            </div>
        </div>
      <Reactions info={msg.reactionInfo} msgId={msg.id} isMe={isMe}/>
    </div>
</div>

<style>
  .message-row {
    display: flex;
    align-items: flex-end;
    margin-bottom: 8px;
    width: 100%;
    transition: opacity 0.2s;
    gap: 8px;
  }

  .message-row.inactive { opacity: 0.5; }
  .message-row.is-me { flex-direction: column; }
  .message-row.is-system { align-items: center; flex-direction: column; }

  .message-bubble {
    background: #3a3c55;
    color: #fff;
    padding: 8px 12px;
    border-radius: 18px;
    min-width: 100px;
    max-width: 80%;
    font-size: 13px;
    position: relative;
  }
  .message-row.is-me .message-bubble { background: #7b4cd6; }
  .message-row.is-system .message-bubble { background: linear-gradient(90deg,rgba(33, 133, 124, .3) 0%, rgba(117, 66, 107, .3) 100%); }
  .message-row.is-deleted .message-bubble { background-color: #c99; }

  /* ссылки или репосты чё это */
  .forward-block {
    border-left: 2px solid #34b7f1;
    padding-left: 8px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px 12px 12px 4px;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .forward-header {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    margin-bottom: 4px;
  }

  .forward-avatar {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    object-fit: cover;
  }

  .forward-name {
    font-weight: 600;
    color: #34b7f1;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .forward-arrow {
    width: 14px;
    height: 14px;
    fill: #34b7f1;
  }

  .forward-badge {
    font-size: 10px;
    opacity: 0.5;
    margin-top: 2px;
  }

  .message-status { display: flex; flex-direction: row; gap: 10px; justify-content: end; }
  .status-meta { display: flex; gap: 5px; align-items: center; }
  .views { display: flex; align-items: center; gap: 2px; font-size: 10px; opacity: 0.6; }
  .views-icon { width: 12px; fill: currentColor; }
  .timestamp { font-size: 11px; opacity: 0.5; white-space: nowrap; }
  .status-icon { width: 15px; fill: #7f7; margin-top: 2px; }
  .status-icon.is-read { fill: #34b7f1; }

  .line {
    margin: 0;
    line-height: 1.4;
    word-break: break-word;
    pointer-events: none;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
