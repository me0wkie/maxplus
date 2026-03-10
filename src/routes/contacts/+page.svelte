<script>
    import { createEventDispatcher } from 'svelte';
    import { goto } from '$app/navigation';
    import { currentSessionContacts, currentUser } from '$lib/stores/api';
    import Search from '$components/main/Search.svelte';
    import ConfirmModal from '$components/main/ConfirmModal.svelte';
    
    import API from '$lib/stores/api';
    
    import AddContactBtn from '$components/main/AddContactBtn.svelte';
    
    import '$lib/styles/AnimatedPanel.css';
    
    const dispatch = createEventDispatcher()

    let grouped = {};
    let filter = "";
    let showAll = false;
    let showDeleteConfirm = false;

    $: hasRealContacts = Object.values($currentSessionContacts || {}).some(x => x.options?.length);

    $: grouped = (() => {
        if (!$currentSessionContacts) return {};

        const rawData = Object.entries($currentSessionContacts).map(([id, c]) => ({ id, ...c }));

        const contacts = rawData.filter(x =>
            x.id !== $currentUser
            && (!filter || x.names[0].name.match(new RegExp(filter, 'i')))
            && (showAll || x.options?.includes("TT") && x.status !== "REMOVED")
        );

        contacts.sort((a, b) => (a.names?.[0]?.name || '').localeCompare(b.names?.[0]?.name || '', 'ru'));

        return contacts.reduce((acc, c) => {
            const letter = (c.names?.[0]?.name || '').charAt(0).toUpperCase();
            if (!acc[letter]) acc[letter] = [];
            acc[letter].push(c);
            return acc;
        }, {});
    })();

    async function removeContact(id) {
        const result = await $API.removeContact(id);
        currentSessionContacts.update(contacts => {
            if (contacts[id]) delete contacts[id]['options']; 
            return contacts;
        });
    }

    const search = query => {
        filter = query; 
    }

    const filterSwap = event => {
        showAll = event?.target?.checked || false;
    }

    const open = (e, contact) => {
        const toDelete = ['.delete'].some(x => e.target.closest(x));
        if (toDelete) {
            removeContact(contact.id);
        } else {
            dispatch('profile', contact.id);
        }
    }
    
    function deleteSelected() {
        if (selectedChats.size === 0) return;
        showDeleteConfirm = true;
    }

    async function onConfirmDelete() {
        await $API.removeContact(id);
        console.log(`Удалено ${selectedChats.size} чат(ов)`);

        clearSelection();
        showDeleteConfirm = false;
    }

</script>

<div class="container">
    <header>
      <div class="row">
        <h3 style="margin-left: 15px;">Контакты</h3>
        <div style="margin-right: 15px;" class="flex-end">
         <AddContactBtn/>
      </div>
      </div>
      <Search input={search} placeholder="Имя, фамилия или ник"/>
    </header>
    
    {#if showDeleteConfirm}
        <ConfirmModal
            title="Удалить чаты?"
            message={`Вы точно хотите удалить выбранные чаты (${selectedChats.size})? Это действие нельзя отменить.`}
            confirmText="Удалить"
            isDangerous={true}
            on:cancel={() => showDeleteConfirm = false}
            on:confirm={onConfirmDelete}
        />
    {/if}

    <label class="showAll" style="margin-left: -15px;">
      <input
        type="checkbox"
        id="only-added"
        name="only-added"
        on:click={filterSwap}
      />
      <span class="checkmark"></span>
      Отобразить полный кеш
    </label>

    <main class="content">
      {#each Object.keys(grouped) as letter}
        <a>{ letter }</a>
        {#each grouped[letter] as contact}
        <div class="contact"
             on:click={e => open(e, contact)}
             >
            <img src={ contact.avatar || contact.baseUrl } alt={ contact.names[0].firstName } class="avatar"/>
            <div class="column">
              <div class="name">
                  { contact.names[0].name }
              </div>
              <a>Был(а) недавно</a>
            </div>
            <div class="action">
                {#if contact.options?.includes("TT") && contact.status !== "REMOVED"}
                  <a class="delete">Удалить</a>
                {:else}
                  <a>Не контакт</a>
                {/if}
            </div>
        </div>
        {/each}
      {/each}
      {#if Object.keys(grouped).length === 0}
        <a style="font-size:14px">Ничего не найдено!</a>
      {/if}
    </main>
</div>

<style>
  .container {
    overflow: hidden;
  }
  
  header {
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 5px 0;
    margin-top: 10px;
    margin-bottom: 5px;
  }

  header h3 {
    margin: 0;
    font-size: 18px;
    color: #ccc;
  }
  
  .row {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  
  .flex-end {
    display: flex;
    gap: 15px;
  }
  
  .showAll {
    color: #999;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
  }

  .showAll input {
    display: none;
  }

  .checkmark {
    width: 18px;
    height: 18px;
    border: 2px solid #ccc;
    border-radius: 6px;
    position: relative;
    transition: all 0.2s ease;
  }

  .checkmark::after {
    content: "";
    position: absolute;
    left: 7px;
    top: 2px;
    width: 4px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) scale(0);
    transition: transform 0.1s ease;
  }

  .showAll input:checked + .checkmark {
    background-color: #4f46e5;
    border-color: #4f46e5;
  }

  .showAll input:checked + .checkmark::after {
    transform: rotate(45deg) scale(1);
  }

  .showAll:hover .checkmark {
    border-color: #4f46e5;
  }

  

  .content {
    height: calc(100% - 140px);
    color: #ccc;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: scroll;
    overflow-x: hidden;
  }
  
  .contact {
    position: relative;
    height: 40px;
    width: 100%;
    display: flex;
    flex-direction: row;
    cursor: pointer;
  }
  
  .contact .name {
    font-size: 14px;
    display: flex;
  }
  
  .contact a {
    font-size: 12px;
    color: #999;
    position: relative;
    bottom: 3px;
  }
  
  .contact .delete {
    color: #f88;
  }
  
  .contact .action {
    position: absolute;
    right: 10px;
    margin-bottom: 10px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 15px;
    flex-shrink: 0;
  }
</style>
