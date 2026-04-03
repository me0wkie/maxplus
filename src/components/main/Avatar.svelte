<script>
  import { currentUser, currentSessionContacts } from '$lib/stores/api';

  export let size;
  export let selectionMode;
  export let isSelected;
  export let chat = {};
  export let contact = {};
  export let title;

  if (!size) size = 50;
  if (!contact.id) contact = $currentSessionContacts[$currentUser ^ chat.id] || {};
  if (!title) title = chat.id === 0 ? 'Избранное' : (chat.title || contact?.names?.[0]?.name || 'Без названия');

  $: avatarUrl = chat.avatar || (chat.id === 0 ? 'saved.webp' : contact?.avatar);

  function getAvatarColor(id) {
    const colors = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb'];
    return colors[(id || 0) % colors.length];
  }

  function getInitials(name) {
    if (!name) return '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
</script>

<div class="avatar-wrapper" style="width: {size}px; height: {size}px;">
    {#if selectionMode}
        <div class="selection-overlay" class:checked={isSelected}>
            {#if isSelected}
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" color="white"><polyline points="20 6 9 17 4 12"></polyline></svg>
            {/if}
        </div>
    {/if}

    <div class="avatar-container">
        {#if avatarUrl}
            <img src={avatarUrl} alt={title} class="avatar-img" loading="lazy" />
        {:else}
            <div class="avatar-placeholder" style="background-color: {getAvatarColor(contact.id || chat.id)}">
                {chat.id === 0 ? '⭐' : getInitials(title)}
            </div>
        {/if}

        {#if contact?.online && !selectionMode}
            <span class="online-badge"></span>
        {/if}
    </div>
</div>

<style>
  .avatar-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .avatar-container {
    width: 100%; height: 100%;
  }

  .avatar-img, .avatar-placeholder {
    width: 100%; height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 600; font-size: 18px;
  }

  .selection-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    border-radius: 50%;
    background: rgba(0,0,0,0.4);
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .selection-overlay.checked {
    background: #3b82f6aa;
  }
</style>
