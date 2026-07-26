<script>
  import { getContext, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from "$app/navigation";
  import {
    set as sessionSet,
    get as sessionGet
  } from "$lib/stores/session.js";

  import BackButton from "$components/main/auth/BackButton.svelte";
  import ActionButton from "$components/main/auth/ActionButton.svelte";

  import API, {
    currentUser
  } from "$lib/stores/api";

  let error = "";
  let code = "";
  const name = sessionGet("name");
  const state = !name ? "login" : "register";

  const onBack = getContext("onBack");
  onBack["sms"] = () => {
    goto("/auth/" + state);
  };
  onDestroy(() => delete onBack["sms"]);

  async function verify() {
    console.log("Проверяем код:", code);

    let response;

    if (state === "login") {
      if (code.length !== 6) {
        error = "Длина кода - 6 символов!";
        return;
      }
      response = await $API.login(code);
    }
    else response = await $API.register(code, name);

    if (response.error) {
      error = response.localizedMessage;
      return;
    }

    if (response.passwordChallenge) {
      sessionSet("challenge", response.passwordChallenge);
      goto("/auth/password");
      return;
    }

    goto("/");
  }
</script>

<div class="auth-page">
  <h1>Подтверждение</h1>
  <p>Введите код, отправленный по указанному номеру телефона</p>
  <div class="form">
    <div class="error">{error}</div>
    <input
      type="text"
      bind:value={code}
      placeholder="Код подтверждения"
      required
    />
    <ActionButton text="Подтвердить" action={verify}/>
  </div>
  <BackButton/>
</div>

<style>
  .auth-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    text-align: center;
    color: #ddd;
    max-width: min(300px, 90%);
    margin: 0 auto;
  }

  .auth-page h1 {
    margin: 0;
  }

  .auth-page p {
    margin: 10px 0;
    font-size: 14px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
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

  .error {
    color: red;
    font-size: 15px;
    height: 22px;
    word-break: break-all;
  }
</style>
