<script>
    import { createEventDispatcher } from 'svelte';
    import { invoke } from '@tauri-apps/api/core';
    import { onMount } from 'svelte';
    import { flip } from 'svelte/animate';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    
    import '$lib/styles/AnimatedPanel.css';
    
    import ChatItem from '$components/chats/ChatItem.svelte';
    import FolderTabs from '$components/chats/FolderTabs.svelte';
    import AddContactBtn from '$components/main/AddContactBtn.svelte';
    import Search from '$components/main/Search.svelte';
    
    import API, { currentSessionChats, currentlySyncing, currentUser } from '$lib/stores/api.js';
    import Session from '$lib/stores/session.js';
    
    let activeFolder = null;
    
    const dispatch = createEventDispatcher()
    
    $: sortedChats = ($currentSessionChats || [])
      .sort((a,b) => b.lastEventTime - a.lastEventTime)
      .filter(chat => {
          if (!activeFolder || activeFolder.title === 'Все') return true;
          if (activeFolder.filters?.includes('UNREAD') && !chat.newMessages) return false;
          if (!activeFolder.filters) return false;
          return true; // TODO folder editor
      })
    
    // TODO подгрузка 40+ чатов
    function handleScroll(e) {
        addContactVisible = e.target.scrollTop === 0
    }
    
    async function search(setSearchQuery, setSearchResults, openChat, searchQuery) {
      //TODO
    }
    
    onMount(() => {
        console.log('on mount syncing')
        $API.sync();
    })
    
    currentUser.subscribe(async user => {
        if (user === undefined) return;
        if (Session.get("synced")) return;
        
        console.log(user)
        
        if (user === null) return;
        
        if (!$API.getToken()) {
            await $API.loadToken()
        }
        
        if (!Session.get("connected")) {
            await $API.init()
        }
        
        $API.sync()
    })
</script>

<svelte:window/>
  <div class="chats" on:scroll={handleScroll}>
    <header>
      <div class="row">
        <h3 style="margin-left: 15px;">Чаты</h3>
        
        <div style="margin-right: 15px;" class="flex-end">
         <div class="more top-btn">
         
         </div>
         <AddContactBtn/>
      </div>
      </div>
      <Search search={search} placeholder="Люди, чаты и сообщения"/>
    </header>
    
    <div class="folders">
      <FolderTabs bind:activeFolder/>
    </div>
    
    <div class="chat-list">
        {#each sortedChats as chat (chat.id)}
            <ChatItem {chat} on:open={() => dispatch('chat', chat.id)} />
        {/each}
        {#if $currentlySyncing}<div class="loading">Синхронизация...</div>{/if}
    </div>
  </div>

<style>
  .chats {
    color: #999;
    flex: 1;
    min-height: 0; 
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  header {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 5px 0;
    margin-top: 10px;
    margin-bottom: 5px;
  }

  header h3 {
    margin: 0;
    font-size: 18px;
    color: #ccc;
  }
  
  .row {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  
  .flex-end {
    display: flex;
    gap: 15px;
  }
  
  .more {
    background-color: #2c2d31;
    position: relative;
  }
  
  .more::after {
    content: "...";
    position: absolute;
    bottom: 9px;
    color: #ddd;
  }
  
  .top-btn {
    width: 30px;
    height: 30px;
    border-radius: 11px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }

  @media (max-width: 600px) {
  }

  .folders {
    flex-shrink: 0;
    position: sticky;
    top: 0;
    display: flex;
  }

  .chat-list {
    margin-top: 5px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    flex: 1; 
    
    /* Включаем скролл */
    overflow-y: auto; 
    
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .chat-list > * {
    flex-shrink: 0;
    min-height: 150px;
  }

  .loading { text-align: center; color: #888; padding: 10px; }
</style>

