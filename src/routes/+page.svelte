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
</script>

<div class="container">
  {#each pages as page, index}
    <Card {index} {active}>
      <svelte:component this={page.component}/>
    </Card>
  {/each}

  {#each $Session.openedChats as chatId}
    <ChatWindow {chatId}/>
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
