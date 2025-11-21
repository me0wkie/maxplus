<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import API, { currentUser, currentSessionContacts } from '$lib/stores/api';
  import { isObfuscated } from '$lib/crypto/messages.js';
  
  export let deobfuscated;
  
  export let msg;
  
  const dispatch = createEventDispatcher();
  
  $: isMe = msg.sender === $currentUser;
  $: isSystem = msg.attaches?.[0]?._type === 'CONTROL'
  
  $: lines = msg.text?.split("\n")
  
  function displaySystemMessage() {
    const event = msg.attaches?.[0]?.event
    if (event === 'botStarted') return "Вы запустили бота!"
    else if (event === 'new') return "Чат " + msg.attaches[0].title + " создан"
    else if (event === 'icon') return "Фото чата изменено"
    else return event;
  }
  
</script>

<div class="message-row" class:is-me={isMe} class:is-system={isSystem} class:is-deleted={msg.deleted}>
    {#if !isMe}
        <img src={ $currentSessionContacts[msg.sender]?.avatar } alt={name} class="avatar"/>
    {/if}

    <div class="message-content">
        <div class="message-bubble">
            {#if isSystem}
              <p class="line allow-selection">{ displaySystemMessage() }</p>
            {:else if deobfuscated}
              {#await deobfuscated}
                <p class="line">Загрузка...</p>s
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
                  <img src={`/stickers/${msg.stickerId}.webp`} alt="sticker" class="sticker"/>
              {/if}
            {/if}

            <div class="bubble-footer">
                
                <div class="message-status">
                        {#if deobfuscated}
                            <svg class="status-icon" title="Сквозное шифрование" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>
                        {/if}
                        
                        {#if isMe}
                          {#if msg.status === 'sending'}
                              <svg class="status-icon" title="Отправка..." viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                          {:else if msg.status === 'sent'}
                              <svg class="status-icon" title="Отправлено" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                          {:else if msg.status === 'delivered' || msg.status === 'read'}
                              <svg class="status-icon" class:is-read={msg.status === 'read'} title={msg.status === 'read' ? 'Прочитано' : 'Доставлено'} viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                          {/if}
                        {/if}
                 </div>
                 <span class="timestamp">{new Date(msg.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
    </div>
</div>

<style>
    .message-row {
        display: flex;
        align-items: flex-end;
        margin-bottom: 8px;
        width: 100%;
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

    .message-content {
        min-width: 32vw;
        display: flex;
        flex-direction: column;
        max-width: 100%;
        font-size: 13px;
    }

    .message-bubble { 
        background-color: #3e3859;
        color: #fff;
        padding: 8px 12px;
        border-radius: 18px; 
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    
    @keyframes gradientFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    .message-row.is-me .message-bubble {
        background: linear-gradient(270deg, #2b72d6, #7b4cd6), #3498db;
        background-size: 400% 400%;
        animation: gradientFlow 16s ease infinite;
    }
    
    .message-row.is-system .message-bubble { 
        background: linear-gradient(270deg, #2b72d6, #7b4cd6), #3498db;
        background-size: 400% 400%;
        animation: gradientFlow 16s ease infinite;
        margin: 5px 0;
        text-align: center;
        padding: 5px;
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

    .message-bubble .line {
        margin: 0;
    }
    
    

    .bubble-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        float: right;
        clear: both;
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
        align-items: center;
    }

    .status-icon {
        margin-right: 2px;
        width: 16px;
        height: 16px;
        fill: #0907;
    }

    .status-icon.is-read {
        fill: #34b7f1;
    }

    p.allow-selection { user-select: text; }
    .sticker { max-width: 150px; }
</style>
