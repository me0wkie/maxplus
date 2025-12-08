<script>
    import { createEventDispatcher } from 'svelte';
    import ChatItem from '$components/chats/ChatItem.svelte';
    import FolderEditChatItem from '$components/chats/FolderEditChatItem.svelte'

    export let folder;
    export let allChats = [];

    const dispatch = createEventDispatcher();

    let title = folder.title;
    let filters = [...(folder.filters || [])];
    let includedChats = [...(folder.includedChats || [])];

    const filterOptions = [
        { id: 'UNREAD', label: 'Непрочитанные' },
        { id: 'CONTACTS', label: 'Контакты' },
        { id: 'GROUPS', label: 'Группы' },
        { id: 'BOTS', label: 'Боты' }
    ];

    function toggleFilter(filterId) {
        if (filters.includes(filterId)) {
            filters = filters.filter(f => f !== filterId);
        } else {
            filters = [...filters, filterId];
        }
    }

    function toggleChat(chatId) {
        if (includedChats.includes(chatId)) {
            includedChats = includedChats.filter(id => id !== chatId);
        } else {
            includedChats = [...includedChats, chatId];
        }
    }

    function save() {
        dispatch('save', {
            ...folder,
            title,
            filters,
            includedChats
        });
    }

    function close() {
        dispatch('close');
    }
</script>
<div class="modal-backdrop" on:click={close}>
    <div class="modal" on:click|stopPropagation>
        <div class="header">
            <h3>Редактирование папки</h3>
            <button class="close-btn" on:click={close}>&times;</button>
        </div>

        <div class="content">
            <div class="form-group">
                <label>Название папки</label>
                <input type="text" bind:value={title} placeholder="Например: Работа" />
            </div>

            <div class="form-group">
                <label>Фильтры</label>
                <div class="filters-grid">
                    {#each filterOptions as opt}
                        <button
                            class="filter-chip"
                            class:active={filters.includes(opt.id)}
                            on:click={() => toggleFilter(opt.id)}
                        >
                            {opt.label}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="form-group">
                <label>Включенные чаты ({includedChats.length})</label>
                <div class="chats-list">
                    {#each allChats as chat (chat.id)}
                        <FolderEditChatItem includedChats={includedChats}
                                            toggleChat={toggleChat}
                                            chat={chat}/>
                    {/each}
                </div>
            </div>
        </div>

        <div class="footer">
            <button class="btn cancel" on:click={close}>Отмена</button>
            <button class="btn save" on:click={save}>Сохранить</button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6);
        z-index: 1000;
        display: flex; justify-content: center; align-items: center;
    }
    .modal {
        background: #252525; width: 90%; max-width: 400px; max-height: 90%;
        border-radius: 12px; display: flex; flex-direction: column;
        color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .header { padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
    .header h3 { margin: 0; font-size: 18px; }
    .close-btn { background: none; border: none; color: #999; font-size: 24px; cursor: pointer; }

    .content { padding: 15px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }

    .form-group label { display: block; margin-bottom: 8px; color: #aaa; font-size: 14px; }
    input[type="text"] {
        width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #444;
        background: #1a1a1a; color: #fff; box-sizing: border-box;
    }
    input[type="text"]:focus { outline: none; border-color: #007afd; }

    .filters-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .filter-chip {
        background: #333; border: none; color: #ccc; padding: 6px 12px;
        border-radius: 20px; cursor: pointer; transition: 0.2s;
    }
    .filter-chip.active { background: #007afd; color: #fff; }

    .chats-list {
        background: #1a1a1a; border-radius: 8px; border: 1px solid #333;
        max-height: 200px; overflow-y: auto;
    }

    .footer { padding: 15px; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px; }
    .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; }
    .btn.cancel { background: transparent; color: #aaa; }
    .btn.cancel:hover { color: #fff; }
    .btn.save { background: #007afd; color: #fff; }
</style>
