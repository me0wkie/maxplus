<script>
  import { createEventDispatcher } from 'svelte';
  import API, { currentUser, currentSessionContacts } from '$lib/stores/api';
  import Avatar from '$components/main/Avatar.svelte';
  import Reactions from './Reactions.svelte';

  const dispatch = createEventDispatcher();

  export let deobfuscated;
  export let dropoutActiveAt;
  export let msg;
  export let avatar;
  export let chat;

  $: isMe = msg.sender === $currentUser;
  $: isSystem = msg.attaches?.[0]?._type === 'CONTROL';
  $: lines = msg.text?.split("\n");

  $: mediaAttaches = (msg.attaches || []).filter(a => a._type === 'PHOTO' || a._type === 'VIDEO');

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

  $: hasForward = msg.link && msg.link.type === 'FORWARD';
  $: forwardMsg = msg.link?.message;
  $: forwardLines = forwardMsg?.text?.split("\n");
  $: forwardMediaAttaches = (forwardMsg?.attaches || []).filter(a => a._type === 'PHOTO' || a._type === 'VIDEO');
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

                    {#if forwardMediaAttaches.length > 0}
                      <div class="media-grid forward-media"
                           class:grid-single={forwardMediaAttaches.length === 1}
                           class:grid-many={forwardMediaAttaches.length > 1}
                           style="--cols: {forwardMediaAttaches.length >= 2 ? 2 : 1}">
                        {#each forwardMediaAttaches as attach}
                          <div class="grid-item" on:click|stopPropagation={() => handleMediaClick(attach)}>
                            {#if attach._type === 'PHOTO'}
                              <img src={attach.baseUrl} alt="photo" loading="lazy" />
                            {:else if attach._type === 'VIDEO'}
                              <div class="video-preview">
                                 <img src={attach.thumbnail} />
                                 <div class="play-icon">▶</div>
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>
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

                  {#if mediaAttaches.length > 0}
                    <div class="media-grid"
                         class:grid-single={mediaAttaches.length === 1}
                         class:grid-many={mediaAttaches.length > 1}
                         style="--cols: {mediaAttaches.length >= 2 ? 2 : 1}">
                      {#each mediaAttaches as attach}
                        <div class="grid-item" on:click|stopPropagation={() => handleMediaClick(attach)}>
                          {#if attach._type === 'PHOTO'}
                            <img src={attach.baseUrl} alt="photo" loading="lazy" />
                          {:else if attach._type === 'VIDEO'}
                            <div class="video-preview">
                               <img src={attach.thumbnail} />
                               <div class="play-icon">▶</div>
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}

                  {#if msg.attaches}
                    {#each msg.attaches.filter(a => a._type !== 'PHOTO' && a._type !== 'VIDEO' && a._type !== 'CONTROL') as attach}
                      <div class="unsupported-attach">📎 {attach._type} (не поддерживается)</div>
                    {/each}
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

    /* медиа */
    .media-grid {
        display: grid;
        gap: 4px;
        margin-top: 6px;
        border-radius: 10px;
        overflow: hidden;
        width: 100%;
        max-width: 320px;
    }
    .grid-many { grid-template-columns: repeat(var(--cols), 1fr); }
    .grid-item { cursor: pointer; position: relative; background: #000; overflow: hidden; }
    .grid-item img, .grid-item video { width: 100%; height: 100%; object-fit: cover; display: block; }

    .grid-many .grid-item { aspect-ratio: 1 / 1; }
    .grid-single .grid-item { max-height: 450px; border-radius: 8px; }

    .video-preview .play-icon {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.6);
      color: white;
      width: 40px; height: 40px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      pointer-events: none;
    }

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

    .forward-content-text {
        font-size: 12px;
        color: #ddd;
        display: -webkit-box;
        -webkit-line-clamp: 3; /* Ограничиваем текст репоста 3 строками */
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.3;
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

    .unsupported-attach { font-size: 11px; opacity: 0.5; margin-top: 5px; font-style: italic; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 3px; }
    .line {
      margin: 0;
      line-height: 1.4;
      word-break: break-word;
      pointer-events: none;
    }
</style>
