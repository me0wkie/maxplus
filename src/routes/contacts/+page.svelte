<script>
    import { createEventDispatcher } from 'svelte';
    import { goto } from '$app/navigation';
    import { currentSessionContacts, currentUser } from '$lib/stores/api';
    import Search from '$components/main/Search.svelte';
    
    import API from '$lib/stores/api';
    
    import AddContactBtn from '$components/main/AddContactBtn.svelte';
    
    import '$lib/styles/AnimatedPanel.css';
    
    const dispatch = createEventDispatcher()
    
    // TODO check if this window selected (optimize)
    
    let grouped = {};
    let filter = "";
    let onlyRealChecked = false;

    $: hasRealContacts = Object.values($currentSessionContacts || {}).some(x => x.options?.length);

    $: grouped = (() => {
        if (!$currentSessionContacts) return {};

        const rawData = Object.values($currentSessionContacts).map((c, id) => ({ id, ...c }));
        
        const contacts = rawData.filter(x => 
            x.id !== $currentUser 
            && (!filter || x.names[0].name.match(new RegExp(filter, 'i')))
            && (!onlyRealChecked || x.options?.includes("TT"))
        );

        contacts.sort((a, b) => {
          const nameA = a.names?.[0]?.name || '';
          const nameB = b.names?.[0]?.name || '';
          return nameA.localeCompare(nameB, 'ru');
        });

        return contacts.reduce((acc, c) => {
          const name = c.names?.[0]?.name || '';
          const letter = name.charAt(0).toUpperCase();

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
        onlyRealChecked = event?.target?.checked || false;
    }

    const open = (e, contact) => {
        const toDelete = ['.delete'].some(x => e.target.closest(x));
        if (toDelete) {
            removeContact(contact.id);
        } else {
            const chatId = $currentUser ^ contact.id;
            dispatch('chat', chatId);
        }
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
    
    <div class="onlyReal">
      <input type="checkbox" id="only-added" name="only-added" on:click={filterSwap}/>
      <label for="only-added">Только добавленные контакты</label>
      <span class="checkmark"></span>
    </div>

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
                {#if contact.options}
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
  
  .onlyReal {
    color: #999;
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    font-size: 14px;
    margin-left: -10px;
    position: relative;
  }

  .onlyReal input {
      width: 16px;
      height: 16px;
      cursor: pointer;
  }

  

  .content {
    height: calc(100% - 140px);
    color: #ccc;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
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
