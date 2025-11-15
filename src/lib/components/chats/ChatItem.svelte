<script>
  import { createEventDispatcher } from 'svelte';
  import API, { currentUser, currentSessionChats, currentSessionContacts } from '$lib/stores/api'
  
  export let user;
  export let chat;
  
  let title = null;
  // TODO выяснить как ставятся аватары
  const avatarUserId = +Object.keys(chat.participants).find(x => +x !== $currentUser)
  
  $: avatar = $currentSessionContacts?.[avatarUserId]?.avatar;
  const dispatch = createEventDispatcher();
  
  /*chatMessages.subscribe(updatedMessages => {
      const latest = updatedMessages[0]
      if(latest?.chatId === chat.id) text = latest.text
  })*/
  
  /*contacts.subscribe(contacts => {
    console.log(contacts[avatarUserId])
    if(avatar && title || !avatarUserId) return;
    const contact = contacts[avatarUserId]
    if(contact) {
      avatar = contact.avatar;
      title = contact.names[0].name;
    }
  })*/
  
  const text = chat.lastMessage?.text || "";
  const date = chat.lastMessage?.time ? new Date(chat.lastMessage.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : "";
</script>

<div class="chat-item" on:click={() => dispatch('open', chat)}>
  <img src={avatar} alt={title} class="avatar"/>
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
    overflow: hidden;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
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

  .align-right {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
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

