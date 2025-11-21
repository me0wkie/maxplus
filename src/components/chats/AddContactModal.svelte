<script>
    import { fade } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    import API, { currentSessionChats, currentlySyncing } from '$lib/stores/api.js';
    
    const dispatch = createEventDispatcher();
    
    let addContactName = "";
    let addContactPhone = "+7";
    let addContactNameWrong = false;
    let addContactPhoneWrong = false;
    
    const addContactHandler = async () => {
        addContactNameWrong = !addContactName || addContactName.length < 1 || addContactName.length > 30;
        addContactPhoneWrong = addContactPhone[0] !== '+' || addContactPhone.length <= 2
        
        if (addContactNameWrong || addContactPhoneWrong) return;
        
        const response = await $API.addContact(addContactName, addContactPhone)
        
        console.log(response)
        
        addContactName = "";
        addContactPhone = "+7";
        dispatch('close');
    }
    
    const handleClickOutsideContactModal = event => {
        const isOutside = !['.add-contact-modal'].some(x => event.target.closest(x))
		    if (isOutside) dispatch('close');
    }
</script>

<div class="add-contact-modal-bg"
     transition:fade={{ duration: 100 }}
     on:click={ handleClickOutsideContactModal }>
  <div class="add-contact-modal">
      <a class="title">Добавление контакта</a>
      <div class="center">
          <div class="row">
              <a>Имя</a>
              <input class:error={addContactNameWrong}
                     on:click={() => { addContactNameWrong = false }}
                     bind:value={addContactName} placeholder="Необязательно"/>
          </div>
          <div class="row">
              <a>Номер телефона</a>
              <input class:error={addContactPhoneWrong}
                     on:click={() => { addContactPhoneWrong = false }}
                     bind:value={addContactPhone}/>
          </div>
      </div>
      <div on:click={addContactHandler} class="btn animated-panel">
          <a>Добавить</a>
      </div>
  </div>
</div>

<style>
  .add-contact-modal-bg {
    position: absolute;
    top: 0;
    left: 0;
    background-color: #ffffff06;
    width: 100vw;
    height: 100vh;
    z-index: 50;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .add-contact-modal {
    height: 170px;
    width: 300px;
    background-color: #1c1d1f;
    color: #ccc;
    border-radius: 12px;
    border: 2px solid #6663;
    display: flex;
    flex-direction: column;
    padding: 20px 30px;
  }
  
  @media (max-width: 400px) {
    .add-contact-modal {
      border-right-style: none;
      border-left-style: none;
      border-radius: 0;
      width: 100%;
    }
    
  }
  
  .add-contact-modal .title {
    margin: 10px 0 0 10px;
    font-weight: 1000;
    font-size: 16px;
  }
  
  .add-contact-modal .center {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  .add-contact-modal .row {
    display: flex;
    align-items: center;
    height: 40px;
    width: 100%;
    font-size: 13px;
  }
  
  .add-contact-modal .row a {
    width: 80px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    text-align: center;
  }
  
  .add-contact-modal .row input {
    height: 25px;
    flex: 1;
    text-indent: 10px;
    border-radius: 100px;
    border: 1px solid #0003;
    transition: outline 0.1s;
    color: #ccc;
    background-color: #2c2d31;
    outline: 1px solid #4c4d61;
    outline-offset: -0.5px; # фиксация (не прыгает)
  }
  
  .add-contact-modal .row input:focus {
    outline: 1px solid #6f9;
  }
  
  .add-contact-modal .row input.error {
    outline: 1px solid #f69;
  }
  
  .add-contact-modal .btn {
    width: 120px;
    height: 45px;
    border-radius: 20px;
    border: 3px solid #1111;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: flex-end;
    opacity: 0.8;
  }
</style>
