<script>
  import Chats from './chats/+page.svelte';
  import Contacts from './contacts/+page.svelte';
  import Calls from './calls/+page.svelte';
  import Settings from './settings/+page.svelte';
  import Panel from '$components/Panel.svelte';
  import Card from '$components/main/Card.svelte'
  import ChatWindow from '$components/ChatWindow.svelte';

  import Session from '$lib/stores/session';
  import { page } from '$app/stores';
  import API, { currentSessionChats, currentSessionContacts, currentlySyncing, currentUser } from '$lib/stores/api.js';

  const pages = [
    { name: "Контакты", icon: "contacts", component: Contacts },
    { name: "Звонки", icon: "calls", component: Calls },
    { name: "Чаты", icon: "chats", component: Chats },
    { name: "Настройки", icon: "settings", component: Settings },
  ]

  let active = +$page.url.searchParams.get('card') || 2;

  const openCard = ({ detail }) => {
    active = detail.index;
  }

  function openChat({ detail }) {
    const { chatId, messageId } = detail;
    const exists = $Session.openedChats.find(c => c.id === chatId);
    if (exists) {
      $Session.openedChats = [...$Session.openedChats.filter(c => c.id !== chatId), exists];
    } else {
      let chat = $currentSessionChats.find(x => x.id === chatId)
      if (!chat) {
        const participants = {}
        participants[$currentUser] = Date.now()
        participants[chatId] = Date.now()
        chat = {
          id: chatId,
          participants
        }
      }
      $Session.openedChats = [...$Session.openedChats, { ...chat }];
    }
  }

  function closeChat(chatId) {
    $Session.openedChats = $Session.openedChats.filter(c => c.id !== chatId);
  }
</script>

<div class="container">
  {#each pages as page, index}
    <Card
      index={index}
      active={active}
    >
      <svelte:component on:chat={openChat} this={page.component} />
    </Card>
  {/each}
  
  {#each $Session.openedChats as chat (chat.id)}
    <ChatWindow {chat}
      on:close={() => closeChat(chat.id)}
      on:chat={openChat}
    />
  {/each}
</div>

<Panel on:open={openCard} pages={pages} active={active} />

<style>
  .container {
    position: relative;
    width: 100vw;
    height: 100vh;
  }
</style>
