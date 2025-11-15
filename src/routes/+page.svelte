<script>
  import Chats from './chats/+page.svelte';
  import Contacts from './contacts/+page.svelte';
  import Calls from './calls/+page.svelte';
  import Settings from './settings/+page.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import Card from '$lib/components/main/Card.svelte'
  
  const pages = [
    { name: "Контакты", icon: "contacts", component: Contacts },
    { name: "Звонки", icon: "calls", component: Calls },
    { name: "Чаты", icon: "chats", component: Chats },
    { name: "Настройки", icon: "settings", component: Settings },
  ]
  
  let active = 2;
  
  const page = ({ detail }) => {
    console.log(detail)
    active = detail.index;
  }
  
</script>

<div class="container">
  {#each pages as page, index}
    <Card
      index={index}
      active={active}
    >
      <svelte:component this={page.component} />
    </Card>
  {/each}
</div>

<Panel on:open={page} pages={pages} active={active} />

<style>
  .container {
    position: relative;
    width: 100vw;
  }
</style>
