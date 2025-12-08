<script>
  import { createEventDispatcher } from 'svelte';
  import API, { currentUser, currentSessionContacts } from '$lib/stores/api';
  // Убрали импорт isObfuscated, если он не использовался напрямую в шаблоне
  
  const dispatch = createEventDispatcher()
  
  export let deobfuscated;
  export let dropoutActiveAt;
  export let msg;
  
  $: isMe = msg.sender === $currentUser;
  $: isSystem = msg.attaches?.[0]?._type === 'CONTROL'
  $: lines = msg.text?.split("\n")
  
  function displaySystemMessage() {
    const event = msg.attaches?.[0]?.event
    if (event === 'botStarted') return "Вы запустили бота!"
    else if (event === 'new') return "Чат " + msg.attaches[0].title + " создан"
    else if (event === 'icon') return "Фото чата изменено"
    else if (event === 'system') return msg.attaches[0].message;
    else return event;
  }
</script>

<div class="message-row"
  class:is-me={isMe} 
  class:is-system={isSystem}
  class:is-deleted={msg.deleted}
  class:inactive={dropoutActiveAt && dropoutActiveAt?.msg?.id !== msg.id}
  style="box-sizing: border-box;" 
  >
    {#if !isMe}
        <img src={ $currentSessionContacts[msg.sender]?.avatar } alt="avatar" class="avatar"/>
    {/if}
      
        <div class="message-bubble">
            <div class="row">
                <div class="text">
                    {#if isSystem}
                      <p class="line allow-selection">{ displaySystemMessage() }</p>
                    {:else if deobfuscated}
                      {#await deobfuscated}
                        <p class="line">Загрузка...</p>
                      {:then text}
                        <p class="line allow-selection">{@html text }</p>
                      {:catch err}
                        <p class="line">Ошибка!</p>
                      {/await}
                    {:else}
                      {#if lines}
                          {#each lines as line}
                            <p class="line allow-selection">{line}</p>
                          {/each}
                      {:else if msg.attaches.length}
                          <img src={`TODO/${msg.stickerId}.webp`} alt="sticker" class="sticker"/>
                      {/if}
                    {/if}
                    
                    {#if msg.reactionInfo?.counters}
                      <div class="reactions" data-msg-id={msg.id}>
                        {#each msg.reactionInfo.counters as entry}
                          <div class="reaction"
                            class:your={msg.reactionInfo.yourReaction === entry.reaction}
                          >
                            { entry.reaction }
                            <a class="amount">{ entry.count }</a>
                          </div>
                        {/each}
                      </div>
                    {/if}
                </div>

                <div class="message-status">
                          {#if isMe}
                            {#if msg.status === 0}
                                <svg class="status-icon" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            {:else if msg.status === 1}
                                <svg class="status-icon" viewBox="0 0 24 13"><path d="M6 12.025L0 6L1.5 4.5L6 9.52502L15.05 0L16.45 1.425L6 12.025Z"/></svg>
                            {:else if msg.status === 2 || msg.status === 3}
                                <svg class="status-icon" class:is-read={msg.status === 3} viewBox="0 0 22 13"><path d="M11 12.025L5 6L6.5 4.5L11 9.52502L20.05 0L21.45 1.425L11 12.025ZM4.9999 12.025L0 7L1.5 5.50002L4.9999 9.5L14.375 0.025L15.8 1.425L4.9999 12.025Z"/></svg>
                            {/if}
                            
                            {#if deobfuscated}
                              <svg class="status-icon" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>
                            {/if}
                          {/if}
                     <span class="timestamp">{new Date(msg.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
                </div>
            </div>
</div>

<style>
    /* Все стили остались без изменений, они корректно работают внутри position: absolute */
    .message-row {
        display: flex;
        align-items: flex-end;
        margin-bottom: 8px; /* Этот марджин будет учтен measureElement */
        width: 100%;
        /* Важно: padding для виртуализации, чтобы сообщения не прилипали к краям контейнера */
        padding-left: 4px;
        padding-right: 4px;
    }

    .message-row.is-me {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .message-row.is-system {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #7b92a5;
        margin-right: 8px;
        flex-shrink: 0;
    }
    
    .message-bubble { 
        background: linear-gradient(90deg, #3e3859, #3a3c55);
        color: #fff;
        padding: 8px 12px;
        border-radius: 18px; 
        transition: opacity 0.1s;
        display: flex;
        flex-direction: column;
        min-width: 32vw;
        max-width: 80%;
        font-size: 13px;
    }
    
    @media (min-width: 600px) {
      .message-bubble {
        max-width: 70%;
      }
    }
    
    .message-bubble .row {
        display: flex;
        flex-direction: row;
    }
    
    .message-bubble .text {
        flex: 1;
        word-break: break-word;
    }
    
    .message-row.is-me .message-bubble {
        background: #7b4cd6;
    }
    
    .message-row.is-system .message-bubble { 
        background: linear-gradient(270deg, #2b72d6, #7b4cd6), #3498db;
        background-size: 400% 400%;
        animation: gradientFlow 16s ease infinite;
        margin: 5px 0;
        text-align: center;
        padding: 5px 20px;
        display: flex;
        justify-content: center;
    }

    .message-row.is-deleted .message-bubble {
        background-color: #c99;
        opacity: 0.5;
        transition: opacity 0.1s;
    }

    .message-row.is-deleted .message-bubble:hover {
        opacity: 1;
    }

    .message-bubble .text .line {
        margin: 0;
    }
    
    .message-row.inactive .message-bubble {
        opacity: 0.4;
    }
    
    
    .timestamp { 
        font-size: 11px; 
        color: #999; 
    }

    .message-row.is-system .timestamp {
        position: absolute;
        right: 5px;
        color: white;
    }

    .message-status {
        display: flex;
        align-items: flex-end;
        margin: 0 0 0 10px;
    }
    
    .status-icon {
        margin-right: 2px;
        width: 16px;
        height: 16px;
        fill: #7f7;
    }
    
    .status-icon.is-read {
        fill: #34b7f1;
    }
    
    .reactions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }
    
    .reactions .reaction {
      background-color: #fff3;
      border-radius: 20px;
      min-width: 40px;
      height: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 14px;
      color: white;
      gap: 3px;
      padding: 3px;
      cursor: pointer;
    }
    
    .reactions .your {
      background-color: #afa5;
    }
    
    .reactions .reaction a {
      pointer-events: none;
    }

    p.allow-selection { user-select: text; }
    .sticker { max-width: 150px; }
    
    @keyframes gradientFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
</style>
