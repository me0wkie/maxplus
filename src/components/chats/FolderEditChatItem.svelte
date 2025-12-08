<script>
    import { currentUser, currentSessionContacts } from '$lib/stores/api';

    export let includedChats;
    export let toggleChat;
    export let chat;

    $: peerId = chat.type === 'private' || !chat.title
      ? +Object.keys(chat.participants || {}).find(id => +id !== $currentUser)
      : null;

    $: contact = peerId ? $currentSessionContacts?.[peerId] : null;

    $: title = chat.id === 0
      ? 'Избранное'
      : (chat.title || contact?.names?.[0]?.name || 'Без названия');
</script>

<div class="chat-row" on:click={() => toggleChat(chat.id)}>
    <div class="checkbox" class:checked={includedChats.includes(chat.id)}>
        {#if includedChats.includes(chat.id)}✓{/if}
    </div>
    <div class="chat-info">
        <span class="chat-name">{title || 'Без названия'}</span>
    </div>
</div>

<style>
    .chat-row {
        display: flex; align-items: center; padding: 8px 10px;
        cursor: pointer; border-bottom: 1px solid #2a2a2a;
    }
    .chat-row:last-child { border-bottom: none; }
    .chat-row:hover { background: #2a2a2a; }

    .checkbox {
        width: 20px; height: 20px; border-radius: 50%; border: 2px solid #555;
        margin-right: 10px; display: flex; align-items: center; justify-content: center;
        font-size: 12px; color: #fff; transition: 0.2s;
    }
    .checkbox.checked { background: #007afd; border-color: #007afd; }
</style>
