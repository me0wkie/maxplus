<script>
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from "$app/navigation";
  import API, {
    getAccounts
  } from "$lib/stores/api";

  import "$lib/styles/AnimatedPanel.css";
  import OpenDevSettingsButton from "$components/main/dev/OpenButton.svelte";
  import OpenDevicesButton from "$components/main/devices/OpenButton.svelte";

  let phone = "";
  let error = "";

  async function handleLogin() {
    error = "";
    console.log("Запрос на вход:", phone);
    if (!phone.startsWith("+")) phone = "+" + phone;
    const response = await $API.startAuth(phone);
    if (response.success) goto("/auth/verify");
    else error = response.description + ", " + response.title;
  }

  async function showBackButton() {
    return !!(await getAccounts()).length;
  }
</script>

<div class="auth-page">
  <h1>Вход</h1>
  <form on:submit|preventDefault={handleLogin}>
    <div class="error">{error}</div>
    <input
      type="tel"
      bind:value={phone}
      placeholder="Номер телефона"
      required
    />
    <button class="animated-panel" type="submit">Получить код</button>
  </form>
  <a href="/auth/register" class="link">Создать аккаунт</a>
  {#await showBackButton()}
  {:then backButton}
    {#if backButton}
      <div
        class="back"
        on:click={_ => goto("/auth/select")}
      ><a>←</a></div>
    {/if}
  {/await}
</div>

<OpenDevSettingsButton />
<OpenDevicesButton />

<style>
  .auth-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    text-align: center;
    color: #ddd;
  }

  .auth-page h1 {
    margin-bottom: 0px;
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

  .back {
    position: absolute;
    height: 32px;
    width: 32px;
    border-radius: 32px;
    background-color: #fff3;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 50px;
    left: 10px;
    font-weight: 1000;
  }

  .back a {
    position: relative;
    bottom: 1px;
  }
</style>
