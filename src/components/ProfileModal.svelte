<script>
  import { fly, fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import ConfirmModal from '$components/main/ConfirmModal.svelte';
  import API, { currentUser, currentSessionContacts, currentSessionChats, currentPresence } from '$lib/stores/api';
  import Session from '$lib/stores/session';
  import Signature from '$lib/utils/Signature.svelte';
  import { formatMs } from '$lib/utils/time.js';

  let { userId, chatId } = $Session.profile;

  if (!userId) userId = $currentUser ^ chatId;
  if (!chatId) chatId = $currentUser ^ userId;

  const peer = userId ? $currentSessionContacts[userId] || {} : {};
  const chat = $currentSessionChats.find(x => x.id === chatId);

  const dispatch = createEventDispatcher();

  let showMenu = false;
  let showBlockConfirm = false;

  //let participants = Object.keys(chat.participants).filter(x => x !== $currentUser);

  $: title = (() => {
    if (peer.id) return peer?.names?.[0]?.firstName;
    else return chat.title;
  })();
  $: avatar = peer.avatar || chat.avatar;

  $: infoFields = [
    chat.link && { icon: 'info', label: 'Тэг', value: chat.link.replace('https://max.ru/','') },
    chat.description && { icon: 'info', label: 'Описание', value: chat.description },
    peer.description && { icon: 'info', label: 'Описание', value: peer.description },
    chat.phone && { icon: 'phone', label: 'Мобильный', value: chat.phone },
    chat.created && { icon: 'info', label: 'Дата создания', value: formatMs(chat.created) },
    peer.registrationTime && { icon: 'info', label: 'Дата регистрации', value: formatMs(peer.registrationTime) },
  ].filter(Boolean);

  function toggleMenu() { showMenu = !showMenu; }

  function handleAction(action) {
    showMenu = false;
    if (action === 'block') showBlockConfirm = true;
    else if (action === 'delete') dispatch('delete', peer.id);
  }

  function confirmBlock() {
    showBlockConfirm = false;
    dispatch('block', peer.id);
    dispatch('close');
  }

  function handleWindowClick(e) {
    if (showMenu && !e.target.closest('.menu-container')) showMenu = false;
  }

  function getGradient(id) {
    const colors = [['#f093fb', '#f5576c'], ['#5ee7df', '#b490ca'], ['#667eea', '#764ba2']];
    const c = colors[(id || 0) % colors.length];
    return `linear-gradient(135deg, ${c[0]} 0%, ${c[1]} 100%)`;
  }

  function openChat() {
    goto('/?card=2');
    $Session.profile = null;

    let _chatId = chatId ? chatId : $currentUser ^ userId;

    const exists = $Session.openedChats.find(c => c.id === _chatId);
    if (exists) {
      $Session.openedChats = [...$Session.openedChats.filter(c => c.id !== _chatId), exists];
    } else {
      let chat = $currentSessionChats.find(x => x.id === _chatId)
      if (!chat) {
        const participants = {}
        participants[$currentUser] = Date.now()
        participants[_chatId] = Date.now()
        chat = {
          id: _chatId,
          participants
        }
      }
      $Session.openedChats = [...$Session.openedChats, { ...chat }];
    }
  }

  function formatId(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="profile-backdrop" transition:fade={{ duration: 300 }} on:click|self={() => dispatch('close')}>

  <div
    class="profile-panel"
    transition:fly={{ x: 380, duration: 300, opacity: 1, easing: cubicOut }}
  >
    <div class="peer-id">
      ID { formatId(peer.id || chat.id) }
    </div>

    <div class="header-controls">
      <button class="icon-btn" on:click={() => dispatch('close')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      </button>

      <div class="menu-container">
        <button class="icon-btn" on:click|stopPropagation={toggleMenu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
        </button>

        {#if showMenu}
          <div class="dropdown" transition:scale={{ duration: 150, start: 0.9 }}>
            <div class="menu-item" on:click={() => handleAction('edit')}>Изменить</div>
            {#if peer}
              <div class="menu-item danger" on:click={() => handleAction('block')}>Заблокировать</div>
              <div class="menu-item danger" on:click={() => handleAction('delete')}>Удалить контакт</div>
            {:else}
              <div class="menu-item danger" on:click={() => handleAction('leave')}>Покинуть</div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="hero">
      <div class="avatar-large">
        {#if avatar}
          <img src={avatar} alt={title} />
        {:else}
          <div class="avatar-placeholder" style="background: {getGradient(peer.id || chat.id)}">
            {title.charAt(0).toUpperCase()}
          </div>
        {/if}
      </div>
      <div class="hero-info">
        <h2>{title}</h2>
        <a
          class:online={ $currentPresence[peer?.id]?.on === "ON" }
          class="status">
          {#if chat.type === "CHANNEL"}
            { chat.participantsCount } участников
          {:else if peer !== undefined}
            <Signature contact={peer} />
          {/if}
        </a>
      </div>
    </div>

    <div class="info-list">
      <!--<div class="info-item hoverable">
        <div class="icon-wrap">🔔</div> <div class="info-content">
          <span class="label">Уведомления</span>
          <span class="value">Включены</span>
        </div>
        <div class="toggle-switch checked"><div class="knob"></div></div>
      </div>
      <div class="divider"></div>-->
      <div
      class="info-item hoverable"
      on:click={() => openChat()}
      >
        <div class="icon-wrap">💭</div> <div class="button">
          <span class="label">{
            chat.type === 'CHANNEL' ? 'Перейти в канал' : 'Открыть чат'
          }</span>
        </div>
      </div>
      <hr>
      {#each infoFields as field}
        <div class="info-item">
          <div class="icon-wrap">ℹ️</div> <div class="info-content">
            <span class="value selectable">{field.value}</span>
            <span class="label">{field.label}</span>
          </div>
        </div>
      {/each}
    </div>

  </div>
</div>

{#if showBlockConfirm}
  <ConfirmModal
    title="Заблокировать?"
    message="Вы уверены?"
    confirmText="Блок"
    on:confirm={confirmBlock}
    on:cancel={() => showBlockConfirm = false}
  />
{/if}

<style>
  .profile-backdrop {
    position: fixed; top: 0; right: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 100;
    display: flex; justify-content: flex-end;
    will-change: opacity;
  }

  .profile-panel {
    width: 100%; max-width: 380px; height: 100%;
    background: #1c1c1c;
    border-left: 1px solid #333;
    display: flex; flex-direction: column;
    overflow-y: auto;
    position: relative;
    box-shadow: -5px 0 30px rgba(0,0,0,0.5);

    will-change: transform;
    transform: translate3d(0,0,0);
  }

  hr {
    color: #3333;
  }

  .peer-id {
    position: absolute;
    width: 100%;
    display: flex;
    justify-content: center;
    top: 22px;
    color: #fff2;
    font-size: 14px;
    font-weight: 1000;
  }

  .hero { padding: 80px 20px 30px; display: flex; flex-direction: column; align-items: center; background: linear-gradient(to bottom, #2a2a2a, #1c1c1c); border-bottom: 1px solid #333; }
  .avatar-large { width: 120px; height: 120px; margin-bottom: 20px; border-radius: 50%; overflow: hidden; }
  .avatar-large img, .avatar-placeholder { width: 100%; height: 100%; object-fit: cover; }
  .avatar-placeholder { display: flex; align-items: center; justify-content: center; font-size: 48px; color: #fff; }
  .hero-info { text-align: center; }
  .hero-info h2 { margin: 0; color: #fff; font-size: 22px; }
  .status { color: #666; font-size: 14px; } .status.online { color: #4ade80; }

  .info-list { background: #1c1c1c; padding: 10px 0; }
  .info-item {
    display: flex;
    padding: 15px 20px;
    gap: 20px;
    word-break: break-word;
    white-space: pre-line;
  }
  .info-content { flex: 1; display: flex; flex-direction: column; }
  .info-content .value { color: #eee; } .info-content .label { color: #777; font-size: 13px; }
  .info-item .button {
    color: white;
  }

  .hoverable {
    cursor: pointer;
  }

  .menu-container { position: relative; }
  .dropdown { position: absolute; top: 40px; right: 0; background: #252525; width: 180px; border-radius: 12px; padding: 5px; box-shadow: 0 5px 20px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 2px; z-index: 20; border: 1px solid #333; }
  .menu-item { padding: 10px; color: #eee; font-size: 14px; cursor: pointer; border-radius: 6px; }
  .menu-item:hover { background: #333; }
  .menu-item.danger { color: #ff4b4b; }
  .header-controls { position: absolute; top: 0; left: 0; width: 100%; padding: 15px; display: flex; justify-content: space-between; z-index: 10; box-sizing: border-box;}
  .icon-btn { background: rgba(0,0,0,0.2); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px); }
</style>
