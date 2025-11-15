<script>
    import { goto } from '$app/navigation';
    import { currentSessionContacts } from '$lib/stores/api';
    import Search from '$lib/components/main/Search.svelte';
    
    import AddContactBtn from '$lib/components/main/AddContactBtn.svelte';
    
    import '$lib/styles/AnimatedPanel.css';
    
    let contacts = []
    
    currentSessionContacts.subscribe(data => {
        contacts = Object.values(data || {}).map((c, id) => ({ id, ...c }))
    })
    
    let visible = contacts;
    
    const search = (setSearchQuery, setSearchResults, openChat, searchQuery) => {
      
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
      <Search search={search} placeholder="Имя, фамилия или ник"/>
    </header>

    <main class="content">
      {#each contacts as contact (contact.id)}
        <div class="contact">
            <img src={ contact.avatar } alt={ contact.names[0].firstName } class="avatar"/>
            <div class="column">
              <div class="name">
                  { contact.names[0].firstName + " " + contact.names[0].lastName }
              </div>
              <a>Был(а) недавно</a>
            </div>
        </div>
      {/each}
    </main>
</div>

<style>
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
    color: #ccc;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
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

  .header {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
  }

  .header h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    margin-left: 16px;
  }

  .back-button {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #1877f2;
    font-size: 16px;
    font-weight: 600;
    padding: 8px;
    border-radius: 50%;
  }
  
  .back-button:hover {
    background-color: #e7f3ff;
  }
  
  .back-button span {
    display: none;
  }
</style>
