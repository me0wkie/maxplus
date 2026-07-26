<script>
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import API, { currentUser } from "$lib/stores/api";
  import {
    getAccounts,
    getAccount,
    setCurrentAccount
  } from "$lib/stores/accounts";

  import "$lib/styles/AnimatedPanel.css";
  import Avatar from "$components/main/Avatar.svelte";
  import OpenDevSettingsButton from "$components/main/dev/OpenButton.svelte";

  let accountsPromise;
  onMount(() => {
    accountsPromise = updateAccounts();
  });

  async function updateAccounts() {
    const encrypted = await getAccounts();
    console.log(encrypted)
    return await Promise.all(encrypted.map(entry => getAccount(entry.id)));
  }

  async function select(selected) {
    // TODO pincode
    console.log('Selecting', selected.uid, 'current', $currentUser)
    const account = await getAccount(selected.id);
    console.log('Selected data', account);

    if (account.encryption && !account.contact) {
      await setCurrentAccount(account.id);
      return goto("/auth/lock")
    }

    if ($currentUser !== account.contact.id || !$currentUser) {
      await setCurrentAccount(account.id);
      await currentUser.set(account.contact.id);
      await $API.init(true);
    }

    return goto("/")
  }

  async function logout(e, account) {
    e.stopPropagation();
    console.log('Logging out', account.id, 'current', $currentUser)

    await $API.logout(account.uid, false);
    await updateAccounts();

    if (!accountsPromise.length) {
      goto("/auth/login")
    }
  }

  async function addNew(e) {
    await $API.disconnect();
    goto("/auth/login");
  }
</script>

<div class="auth-page">
  <h1>Выберите аккаунт</h1>

  <div class="accounts">
    {#await accountsPromise}
    {:then accounts}
      {#each accounts as account}
        <div on:click={_ => select(account)} class="account">
          <Avatar contactId={account.contact?.id} seed={account.id} size=72/>
          <a>{ account.contact?.names[0]?.firstName || "Зашифр." }</a>
          <div on:click={e => logout(e, account)} class="logout"><a>✕</a></div>
        </div>
      {/each}
    {/await}
    <div on:click={addNew} class="account">
      <div class="avatar"><a>+</a></div>
      <a>Новый</a>
    </div>
  </div>
</div>

<OpenDevSettingsButton />

<style>
  .auth-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 98vh;
    text-align: center;
    color: #ddd;
    gap: 25px;
  }

  .auth-page h1 {
    margin-bottom: 0px;
    font-size: 23px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 300px;
  }

  input,
  button {
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid #333;
    font-size: 1rem;
    background-color: #26262e;
    color: #ccc;
    outline: none;
  }

  button {
    color: white;
    border: none;
    cursor: pointer;
  }

  .accounts {
    display: flex;
    gap: 20px;
    width: 100%;
    justify-content: center;
    overflow-y: scroll;
  }

  .account {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: white;
    font-weight: 300;
    opacity: 0.8;
    transition: opacity 0.1s;
    position: relative;
  }

  .account:hover {
    opacity: 1;
  }

  .account .avatar {
    background-color: #777;
    border-radius: 100px;
    width: 72px;
    height: 72px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .account .avatar * {
    font-size: 64px;
    font-weight: 500;
    position: relative;
    bottom: 9px;
    left: 1px;
  }

  .account .logout {
    position: absolute;
    right: 0;
    top: 0;
    width: 24px;
    height: 24px;
    border-radius: 32px;
    background-color: #f33;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .account .logout a {
    position: relative;
    font-size: 12px;
    font-weight: 1000;
  }

  .link {
    margin-top: 2rem;
    font-size: 0.9rem;
    color: #4a90e2;
    text-decoration: none;
  }

  .link:hover {
    text-decoration: underline;
  }

  .error {
    color: red;
    font-size: 0.9rem;
    height: auto;
    word-break: break-all;
    white-space: nowrap;
    text-align: center;
  }
</style>
