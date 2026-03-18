<script>
    import Chats from './chats/+page.svelte';
    import Contacts from './contacts/+page.svelte';
    import Calls from './calls/+page.svelte';
    import Settings from './settings/+page.svelte';
    import Panel from '$components/Panel.svelte';
    import Card from '$components/main/Card.svelte'
    import ChatWindow from '$components/ChatWindow.svelte';

    import ProfileModal from '$components/ProfileModal.svelte';
    
    import { page } from '$app/stores';
    import API, { currentSessionChats, currentSessionContacts, currentlySyncing, currentUser } from '$lib/stores/api.js';
    
    const pages = [
      { name: "Контакты", icon: "contacts", component: Contacts },
      { name: "Звонки", icon: "calls", component: Calls },
      { name: "Чаты", icon: "chats", component: Chats },
      { name: "Настройки", icon: "settings", component: Settings },
    ]
    
    let active = +$page.url.searchParams.get('card') || 2;

    let openChats = [];
    
    const openCard = ({ detail }) => {
        active = detail.index;
    }
    
    function openChat({ detail }) {
        const { chatId, messageId } = detail;
        const exists = openChats.find(c => c.id === chatId);
        if (exists) {
            openChats = [...openChats.filter(c => c.id !== chatId), exists];
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
            openChats = [...openChats, { ...chat }];
        }
    }
    
    function closeChat(chatId) {
        openChats = openChats.filter(c => c.id !== chatId);
    }

    function swap() {

    }

    /* TODO перенести отсюда нахуй */
    let profileData = null;
    let profileType = 'user';

    function openProfile({ detail: userId }) {
        const user = $currentSessionContacts[userId];
        //const chat = $currentSessionChats.find(c => c.id === chatId);
        profileData = user;
        profileType = 'user';

        //profileType = chat.type === 'private' ? 'user' : (chat.type === 'group' ? 'group' : 'channel');

        // const contact = $currentSessionContacts[chat.id];
        // if (contact) profileData = { ...chat, ...contact };
    }

    function handleBlockUser(event) {
        const userId = event.detail;
        // $API.blockUser(userId);
    }
  
</script>

<div class="container">
  {#each pages as page, index}
    <Card
      index={index}
      active={active}
    >
      <svelte:component openChats={openChats} on:profile={openProfile} on:chat={openChat} this={page.component} />
    </Card>
  {/each}
  
  {#each openChats as chat (chat.id)}
    <ChatWindow {chat}
      on:close={() => closeChat(chat.id)}
      on:chat={openChat}
    />
  {/each}
</div>

<Panel on:open={openCard} pages={pages} active={active} />

{#if profileData}
    <ProfileModal
        peer={profileData}
        type={profileType}
        on:close={() => profileData = null}
        on:block={handleBlockUser}
        on:chat={() => { active = 2; openChat({ detail: { chatId: $currentUser ^ profileData.id } }); profileData = null; }}
    />
{/if}

<style>
  .container {
    position: relative;
    width: 100vw;
    height: 100vh;
  }
</style>
