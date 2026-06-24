<script>
  import Chats from "./chats/+page.svelte";
  import Contacts from "./contacts/+page.svelte";
  import Calls from "./calls/+page.svelte";
  import Settings from "./settings/+page.svelte";
  import Panel from "$components/Panel.svelte";
  import Card from "$components/main/Card.svelte";
  import ChatWindow from "$components/ChatWindow.svelte";

  import * as Caching from "$lib/utils/caching";
  import Session from "$lib/stores/session";
  import { page } from "$app/stores";
  import API, {
    currentSessionChats,
    currentSessionContacts,
    currentlySyncing,
    currentUser,
  } from "$lib/stores/api.js";

  const pages = [
    { name: "Контакты", icon: "contacts", component: Contacts },
    { name: "Звонки", icon: "calls", component: Calls },
    { name: "Чаты", icon: "chats", component: Chats },
    { name: "Настройки", icon: "settings", component: Settings },
  ];

  let active = +$page.url.searchParams.get("card") || 2;

  const openCard = ({ detail }) => {
    active = detail.index;
  };

  async function openChat({ detail }) {
    const { chatId, messageId } = detail;
    const exists = $Session.openedChats.find((id) => id === chatId);
    if (!exists) {
      let chat = $currentSessionChats.find((x) => x.id === chatId);
      if (!chat) {
        console.log("no chat found, requesting:", chat);
        const response = await $API.getChat(chatId);
        console.log(response);
        if (!response.chats.length) {
          return alert("Не удалось получить информацию о чате.");
        }
        Caching.cacheChat(response.chats[0]);
        console.log("Чат кеширован");
      }
      $Session.openedChats = [...$Session.openedChats, chatId];
    }
  }

  function closeChat(chatId) {
    $Session.openedChats = $Session.openedChats.filter((id) => id !== chatId);
  }
</script>

<div class="container">
  {#each pages as page, index}
    <Card {index} {active}>
      <svelte:component this={page.component} on:chat={openChat} />
    </Card>
  {/each}

  {#each $Session.openedChats as chatId}
    <ChatWindow
      {chatId}
      on:close={() => closeChat(chatId)}
      on:chat={openChat}
    />
  {/each}
</div>

<Panel on:open={openCard} {pages} {active} />

<style>
  .container {
    position: relative;
    width: 100vw;
    height: 100vh;
  }
</style>
