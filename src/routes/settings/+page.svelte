<script>
    import { goto } from '$app/navigation';
    import { clearMessages, clearContacts, clearKeys } from '$lib/stores/api';
    import Settings from '$lib/stores/settings';
    import API, { currentUser } from '$lib/stores/api';
    
    let user;
    let phone;
    let name;
    
    currentUser.subscribe(userId => {
        user = $API.getUserDetails();
        if (!user) return;
        phone = user.phone ? ("+ " + user.phone.toString()[0] + ' ' + user.phone.toString().slice(1, 4) + " *** ** " + user.phone.toString().slice(-2, user.phone.toString().length)) : "";
        name = user.names[0].firstName + ' ' + user.names[0].lastName
    })
    
    const buttons = [
      [
        { icon: "", text: "Настройки шифрования", action: () => {} },
      ],
      [
        { icon: "", text: "Выйти из аккаунта", action: handleLogout },
        { icon: "", text: "О приложении", action: () => {} }
      ]
    ]
    
    function clearCache() {
        clearMessages();
        clearContacts();
        alert('Кэш успешно очищен.');
    }
    
    function clearAllKeys() {
        clearKeys();
    }
    
    function handleLogout() {
      $API.logout();
      goto('/auth/login');
    }
</script>

<div class="settings">
    <div class="top">
      <a>QR</a>
      <a>Edit</a>
    </div>
    
    <div class="info">
      <img src={user?.baseUrl || '/default-avatar.jpg'} alt="avatar" class="avatar"/>
      <a class="name">{ name }</a>
      <a class="phone">{ phone }</a>
    </div>
    
    <div class="buttons">
      {#each buttons as group}
        <div class="group">
          {#each group as btn}
            <div on:click={ btn.action } class="button">
              <img src={ btn.icon } class="icon"/>
              <a>{ btn.text }</a>
              <svg width="40" height="20" viewBox="0 0 40 20" xmlns="http://www.w3.org/2000/svg">
                <polyline points="30,3 38,10 30,17" stroke="#999" fill="none" stroke-width="3"/>
              </svg>
            </div>
          {/each}
        </div>
      {/each}
    </div>
</div>

<style>
  .settings {
    width: 100vw;
    color: #bbb;
  }
  
  .top {
    position: absolute;
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
  
  .info {
    margin-top: 10px;
    top: 0;
    width: 100vw;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .info img {
    height: 85px;
    border-radius: 85px;
  }
  
  .info .name {
    margin-top: 15px;
    font-size: 20px;
    font-weight: 800;
    color: #bbb;
  }
  
  .info .phone {
    color: #3ff;
    font-size: 13px;
  }
  
  .buttons {
    margin: 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-size: 14px;
  }
  
  .buttons .group {
    background-color: #26262e;
    border-radius: 15px;
  }
  
  .buttons .group .button {
    padding: 14px 19px;
    display: flex;
    flex-direction: row;
    cursor: pointer;
  }
  
  .buttons .group .icon {
    width: 20px;
    height: 20px;
    margin-right: 19px;
  }
  
  .buttons .group .button svg {
    margin-left: auto;
  }
</style>
