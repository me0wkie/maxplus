<script>
    import { createEventDispatcher } from 'svelte';
    import { currentUser, currentSessionContacts } from '$lib/stores/api';
    import Avatar from '$components/main/Avatar.svelte';

    export let chat;
    export let isSelected = false;    // Выбран ли этот чат
    export let selectionMode = false; // Включен ли вообще режим выбора

    const dispatch = createEventDispatcher();

    $: peerId = chat.type === 'private' || !chat.title
        ? +Object.keys(chat.participants || {}).find(id => +id !== $currentUser)
        : null;

    $: contact = peerId ? $currentSessionContacts[peerId] : {};

    $: title = chat.id === 0
        ? 'Избранное'
        : (chat.title || contact?.names?.[0]?.name || 'Без названия');

    $: lastMsg = chat.lastMessage;

    console.log(chat.lastMessage);

    $: attaches = has("PHOTO") ? "Изображение" :
                  has("VIDEO") ? "Видео" :
                  has("FILE") ? "Файл" :
                  has("INLINE_KEYBOARD") ? "Клавиатура" :
                  has("CONTROL") ? lastMsg?.attaches?.find(x => x._type === "CONTROL")?.shortMessage :
                  lastMsg?.link ? "Пересланное сообщение" : null;

    function has(type) {
      return lastMsg?.attaches?.find(x => x._type === type);
    }

    $: timeDisplay = (() => {
        if (!lastMsg?.time) return '';
        const msgDate = new Date(lastMsg.time);
        const now = new Date();
        const isToday = msgDate.getDate() === now.getDate() &&
                        msgDate.getMonth() === now.getMonth() &&
                        msgDate.getFullYear() === now.getFullYear();
        if (isToday) return msgDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (msgDate.getDate() === yesterday.getDate()) return 'Вчера';
        return msgDate.toLocaleDateString([], {day: '2-digit', month: '2-digit'});
    })();

    $: isMe = lastMsg?.sender === $currentUser;
    $: isRead = lastMsg?.read;

    let pressTimer;
    let isLongPress = false;

    function handleStart() {
        isLongPress = false;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            dispatch('longpress', chat);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 250);
    }

    function handleEnd() {
        clearTimeout(pressTimer);
    }

    function handleMove() {
        clearTimeout(pressTimer);
    }

    function handleClick() {
        if (isLongPress) return;

        if (selectionMode) {
            dispatch('toggle', chat);
        } else {
            dispatch('open', chat);
        }
    }
</script>

<div
    class="chat-item"
    class:selected={isSelected}
    on:mousedown={handleStart}
    on:touchstart|passive={handleStart}
    on:mouseup={handleEnd}
    on:touchend={handleEnd}
    on:touchmove|passive={handleMove}
    on:click={handleClick}
    on:contextmenu|preventDefault={() => dispatch('longpress', chat)}
>

    <Avatar chat={chat} selectionMode={selectionMode} isSelected={isSelected}/>

    <div class="content">
        <div class="row top">
            <span class="name">{title}</span>
            <div class="meta">
                {#if isMe}
                    <span class="status-icon" class:read={isRead}>
                        {isRead ? '✓✓' : '✓'}
                    </span>
                {/if}
                <span class="time">{timeDisplay}</span>
            </div>
        </div>

        <div class="row bottom">
            <p class="preview">
                {#if isMe}<span class="you-prefix">Вы:</span>{/if}
                {#if attaches}
                    <b>{ attaches }</b>{#if lastMsg?.text}, {/if}
                {/if}
                {lastMsg?.text}
            </p>
            {#if chat.newMessages > 0}
                <div class="badge" style="{chat.newMessages >= 99 ? 'width: 26px;' : ''}">
                    {chat.newMessages > 99 ? '99+' : chat.newMessages}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .chat-item {
        display: flex;
        padding: 8px 10px;
        cursor: pointer;
        transition: background-color 0.2s;
        gap: 12px;
        user-select: none;
        position: relative;
    }

    .chat-item:hover { background-color: rgba(255,255,255, 0.03); }
    .chat-item.selected { background-color: rgba(59, 130, 246, 0.15); }

    .online-badge {
        position: absolute; bottom: 2px; right: 2px;
        width: 12px; height: 12px;
        background-color: #4ade80;
        border: 2px solid #1e1e1e;
        border-radius: 50%;
        z-index: 1;
    }

    .content {
        flex: 1; display: flex; flex-direction: column;
        justify-content: center; min-width: 0; gap: 4px;
    }
    .row { display: flex; justify-content: space-between; align-items: center; }

    .name { font-weight: 500; font-size: 16px; color: #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
    .time { font-size: 12px; color: #888; }

    .status-icon { font-size: 12px; color: #888; }
    .status-icon.read { color: #4ade80; }

    .preview { margin: 0; font-size: 14px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .you-prefix { color: #fff; margin-right: 4px; }

    .badge {
        background-color: #3b82f6; color: white;
        font-size: 11px; font-weight: bold;
        width: 20px; height: 20px;
        border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        margin-left: 8px; flex-shrink: 0;
    }
</style>
