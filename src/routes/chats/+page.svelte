<script>
    import { invoke } from '@tauri-apps/api/core';
    import { onMount } from 'svelte';
    import { flip } from 'svelte/animate';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    
    import '$lib/styles/AnimatedPanel.css';
    
    import ChatItem from '$lib/components/chats/ChatItem.svelte';
    import FolderTabs from '$lib/components/chats/FolderTabs.svelte';
    import ChatWindow from '$lib/components/ChatWindow.svelte';
    import AddContactBtn from '$lib/components/main/AddContactBtn.svelte';
    import Search from '$lib/components/main/Search.svelte';
    
    import API, { currentSessionChats, currentlySyncing } from '$lib/stores/api.js';
    
    import { appDataDir } from '@tauri-apps/api/path';
import { join } from '@tauri-apps/api/path';

async function getStorePath(storeFileName) {
  // Получаем директорию приложения для хранения данных
  const dir = await appDataDir();
  // Полный путь к файлу стора
  const storePath = await join(dir, storeFileName);
  console.log('Store file path:', storePath);
  return storePath;
}

// Использование
getStorePath('users.json');
    
    
    let activeFolder = 'Все';
    let openChats = [];
    
    let isMenuOpen = false;
    
    /*function messageHandler(payload) {
        console.log('New Message', payload.message.text)
        // TODO уже сортируется по времени, maybe вставка по prevMessageId бессмысленна
        if($chatMessages[$currentUserId].find(x => x.id === payload.message.id)) return console.warn("Дубликат")
        const idx = $chatMessages[$currentUserId].find(x => x.id === payload.prevMessageId)
        if(idx !== -1) {
            console.log('adding', payload.message.text)
            chatMessages.update(object => {
                object[$currentUserId].splice(idx, 0, { chatId: payload.chatId, ...payload.message });
                return array;
            })
        }
        else console.error('Не удалось найти индекс для размещения')
    }*/
    
    function openChat(chat) {
        const exists = openChats.find(c => c.id === chat.id);
        if (exists) {
            openChats = [...openChats.filter(c => c.id !== chat.id), exists];
        } else {
            openChats = [...openChats, { ...chat, minimized: false, x: 50, y: 50 }];
        }
    }
    
    function closeChat(chatId) { openChats = openChats.filter(c => c.id !== chatId); }
    function minimizeChat(chatId) { openChats = openChats.map(c => c.id === chatId ? { ...c, minimized: true } : c); }
    function restoreChat(chatId) { openChats = openChats.map(c => c.id === chatId ? { ...c, minimized: false } : c); }
    function updateChatPosition(chatId, x, y) { openChats = openChats.map(c => c.id === chatId ? { ...c, x, y } : c); }
    
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
        {#each $currentSessionChats as chat (chat.id)}
            <ChatItem {chat} on:open={() => openChat(chat)} />
        {/each}
        {#if $currentlySyncing}<div class="loading">Синхронизация...</div>{/if}
    </div>
  </div>

  {#each openChats as chat (chat.id)}
    <ChatWindow {chat}
      on:close={() => closeChat(chat.id)}
      on:minimize={() => minimizeChat(chat.id)}
      on:restore={() => restoreChat(chat.id)}
      on:updatePosition={(e) => updateChatPosition(chat.id, e.detail.x, e.detail.y)}
    />
  {/each}

<style>
  .chats {
    overflow-y: auto;
    color: #999;
  }

  header {
    z-index: 10;
    display: flex;
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

  .column {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: calc(100%);
    gap: 10px;
  }

  @media (max-width: 600px) {
  }

  .folders {
    position: sticky;
    top: 0;
    display: flex;
  }

  .menu-btn {
    position: absolute;
    font-size: 24px; background:none; border:none; color:white; cursor:pointer;
  }

  .chat-list {
    margin-top: 5px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .loading { text-align: center; color: #888; padding: 10px; }
</style>

