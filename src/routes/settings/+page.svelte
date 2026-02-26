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
        { icon: "crypto.svg", text: "Настройки шифрования", action: () => goto("setup/tokens?from=/?card=3") }, // card 3 is settings
      ],
      [
        { icon: "logout.svg", text: "Выйти из аккаунта", action: handleLogout },
        { icon: "logs.svg", text: "Сетевые логи", action: () => goto("settings/logs?from=/?card=3") },
        { icon: "about.svg", text: "О приложении", action: () => {} }
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

    /*
    <div class="top">
      <img src={ "icons/qr.svg" }/>
      <img src={ "icons/edit.svg" }/>
    </div>
    */
</script>

<div class="settings">
    
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
              <img src={ "icons/" + btn.icon } class="icon"/>
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
  
  .top img {
    height: 35px;
    width: 35px;
    padding: 6px;
    opacity: 0.7;
  }
  
  .info {
    margin-top: 20px;
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
    margin: 20px 10px;
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
    padding: 12px 15px;
    display: flex;
    flex-direction: row;
    cursor: pointer;
    align-items: center;
  }
  
  .buttons .group .icon {
    width: 24px;
    height: 24px;
    margin-right: 15px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }
  
  .buttons .group .button a {
    line-height: 1;
    letter-spacing: 0.5px;
  }
  
  .buttons .group .button svg {
    margin-left: auto;
  }
</style>
