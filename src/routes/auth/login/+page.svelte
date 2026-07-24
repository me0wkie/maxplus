<script>
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from "$app/navigation";

  import { getAccounts } from "$lib/stores/accounts";
  import {
    get as sessionGet,
  } from "$lib/stores/session.js";
  import API from "$lib/stores/api";

  import OpenDevSettingsButton from "$components/main/dev/OpenButton.svelte";
  import OpenDevicesButton from "$components/main/devices/OpenButton.svelte";
  import ActionButton from "$components/main/auth/ActionButton.svelte";
  import BackButton from "$components/main/auth/BackButton.svelte";

  let phone = "";
  let error = "";

  async function login() {
    if (phone.length < 7) {
      error = "Это не номер!";
      return;
    }

    if (!sessionGet("device")) return alert("Нажмите на иконку телефона, чтобы настроить данные входа!");

    error = "";
    console.log("Запрос на вход:", phone);
    if (!phone.startsWith("+")) phone = "+" + phone;

    const response = await $API.startAuth(phone);

    if (response.success) goto("/auth/verify");
    else error = response.title || response.message;
  }

  async function showBackButton() {
    return !!(await getAccounts()).length;
  }
</script>

<div class="auth-page">
  <h1>Вход</h1>
  <div class="form">
    <div class="error">{error}</div>
    <input
      type="tel"
      bind:value={phone}
      placeholder="Номер телефона"
      required
    />
    <ActionButton text="Получить код" action={login}/>
  </div>
  <a href="/auth/register" class="link">Создать аккаунт</a>
  <BackButton condition={showBackButton} path="/auth/select"/>
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

  .form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: min(300px, 90%);
  }

  input {
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid #333;
    font-size: 1rem;
    background-color: #26262e;
    color: #ccc;
    outline: none;
  }

  .link {
    margin-top: 20px;
    font-size: 15px;
    color: #4a90e2;
    text-decoration: none;
    transition: transform 0.2s;
  }

  .link:hover {
    transform: scale(1.02);
  }

  .error {
    color: red;
    font-size: 15px;
    height: 18px;
    word-break: break-all;
    white-space: nowrap;
    text-align: center;
  }
</style>
