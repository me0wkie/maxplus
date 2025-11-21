<script>
  import { createEventDispatcher } from 'svelte';
  import { get, writable } from 'svelte/store';
  import API, { currentUser, currentSessionChats, currentSessionContacts, receivedMessage } from '$lib/stores/api'
  
  export let chat;
  
  let title = null;
  // TODO выяснить как ставятся аватары
  const avatarUserId = +Object.keys(chat.participants).find(x => +x !== $currentUser)
  
  const avatar = writable(null);
  const dispatch = createEventDispatcher();
  
  receivedMessage.subscribe(message => {
      if (!message || message.chatId !== chat.id) return;
      text = message.text;
      date = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  })
  
  currentSessionContacts.subscribe(contacts => {
    if (!contacts) return;
    if (get(avatar) && title || isNaN(avatarUserId)) return;
    const contact = contacts[avatarUserId]
    if (contact && get(avatar) !== contact.avatar) {
      avatar.set(contact.avatar);
      title = contact.names[0].name;
    }
  })
  
  let text = chat.lastMessage?.text || "";
  let date = chat.lastMessage?.time ? new Date(chat.lastMessage.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : "";
</script>

<div class="chat-item" on:click={() => dispatch('open', chat)}>
  <div style={($avatar ? `background-image: url(${$avatar})` : "background: #556;")} class="avatar"></div>
  <div class="chat-details">
    <div class="align-left">
      <div class="header">
        <span class="name">{chat.id === 0 ? 'Избранное' : chat.title || title}</span>
        <span class="time">{date}</span>
      </div>
      <div class="message-preview">
        <p class="ellipsis">{text}</p>
        {#if chat.newMessages > 0}
          <span class="unread-badge">{chat.newMessages}</span>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .chat-item {
    display: flex;
    cursor: pointer;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
    background-size: cover;
    background-position: center;
  }

  .chat-details { 
    display: flex;
    flex: 1;
    min-width: 0;
    position: relative;
    bottom: 3px;
  }

  .align-left {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .header { 
    display: flex;
    justify-content: space-between;
    color: #ccc;
  }

  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 15px;
  }

  .message-preview { 
    display: flex;
    max-width: 100%;
    color: #888;
  }

  .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1 1 0;
  }

  .message-preview p { 
    margin: 0;
    font-size: 14px;
  }

  .time { 
    font-size: 12px;
    color: #888; 
  }

  .unread-badge { 
    background-color: #fff;
    color: white;
    border-radius: 50%;
    height: 20px;
    width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
</style>

