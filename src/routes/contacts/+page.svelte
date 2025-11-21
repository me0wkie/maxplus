<script>
    import { createEventDispatcher } from 'svelte';
    import { goto } from '$app/navigation';
    import { currentSessionContacts, currentUser } from '$lib/stores/api';
    import Search from '$components/main/Search.svelte';
    
    import AddContactBtn from '$components/main/AddContactBtn.svelte';
    
    import '$lib/styles/AnimatedPanel.css';
    
    const dispatch = createEventDispatcher()
    
    $: data = Object.values($currentSessionContacts || {}).map((c, id) => ({ id, ...c }));
    let grouped = []
    let filter = ""
    
    currentSessionContacts.subscribe(data => {
        updateGroups(); // TODO optimize(?)
    })
    
    function updateGroups() {
        if (!data) return;
        
        const contacts = data.filter(x => x.id !== $currentUser 
                         && (!filter?.length || x.names[0].name.match(new RegExp(filter, 'i'))))
        
        contacts.sort((a, b) => {
          const nameA = a.names?.[0]?.name || '';
          const nameB = b.names?.[0]?.name || '';
          return nameA.localeCompare(nameB, 'ru');
        });
        
        grouped = contacts.reduce((acc, c) => {
          const name = c.names?.[0]?.name || '';
          const letter = name.charAt(0).toUpperCase();

          if (!acc[letter]) acc[letter] = [];
          acc[letter].push(c);

          return acc;
        }, {});
    }
    
    const search = query => {
        console.log('set', query)
        filter = query;
        updateGroups();
    }
    
    const open = contact => {
        const chatId = $currentUser ^ contact.id;
        console.log("Opening chat " + chatId)
        console.log(chatId);
        dispatch('chat', chatId);
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

    <main class="content">
      {#each Object.keys(grouped) as letter}
        <a>{ letter }</a>
        {#each grouped[letter] as contact}
        <div class="contact"
             on:click={() => open(contact)}
             >
            <img src={ contact.avatar } alt={ contact.names[0].firstName } class="avatar"/>
            <div class="column">
              <div class="name">
                  { contact.names[0].name }
              </div>
              <a>Был(а) недавно</a>
            </div>
        </div>
        {/each}
      {/each}
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
  

  .content {
    height: calc(100% - 120px);
    color: #ccc;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: scroll;
    overflow-x: hidden;
  }
  
  .contact {
    height: 40px;
    width: 100%;
    display: flex;
    flex-direction: row;
    cursor: pointer;
    transition: margin 0.3s;
  }
  
  .contact:hover {
    margin-left: 10px;
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

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 15px;
    flex-shrink: 0;
  }
</style>
