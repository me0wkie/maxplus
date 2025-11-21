<script>
    import Chats from './chats/+page.svelte';
    import Contacts from './contacts/+page.svelte';
    import Calls from './calls/+page.svelte';
    import Settings from './settings/+page.svelte';
    import Panel from '$components/Panel.svelte';
    import Card from '$components/main/Card.svelte'
    import ChatWindow from '$components/ChatWindow.svelte';
    
    import API, { currentSessionChats, currentlySyncing, currentUser } from '$lib/stores/api.js';
    
    const pages = [
      { name: "Контакты", icon: "contacts", component: Contacts },
      { name: "Звонки", icon: "calls", component: Calls },
      { name: "Чаты", icon: "chats", component: Chats },
      { name: "Настройки", icon: "settings", component: Settings },
    ]
    
    let active = 2;
    
    let openChats = [];
    
    const page = ({ detail }) => {
        console.log(detail)
        active = detail.index;
    }
    
    function openChat({ detail: chatId }) {
        const exists = openChats.find(c => c.id === chatId);
        if (exists) {
            openChats = [...openChats.filter(c => c.id !== chatId), exists];
        } else {
            const chat = $currentSessionChats.find(x => x.id === chatId)
            if (!chat) throw "Can't open chat: id doesn't exist"
            openChats = [...openChats, { ...chat }];
        }
    }
    
    function closeChat(chatId) {
        openChats = openChats.filter(c => c.id !== chatId);
    }
  
</script>

<div class="container">
  {#each pages as page, index}
    <Card
      index={index}
      active={active}
    >
      <svelte:component openChats={openChats} on:chat={openChat} this={page.component} />
    </Card>
  {/each}
  
  {#each openChats as chat (chat.id)}
    <ChatWindow {chat}
      on:close={() => closeChat(chat.id)}
    />
  {/each}
</div>

<Panel on:open={page} pages={pages} active={active} />

<style>
  .container {
    position: relative;
    width: 100vw;
    height: 100vh;
  }
</style>
