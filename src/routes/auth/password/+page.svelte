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
  let password = "";
  const challenge = sessionGet("challenge");

  const onBack = getContext("onBack");
  onBack["auth"] = () => {
    goto("/auth");
  };
  onDestroy(() => delete onBack["auth"]);

  console.log(challenge)

  async function verify() {
    console.log("Проверяем пароль:", password);

    try {
      const response = await $API.checkPassword(password, challenge.trackId);
      console.log(response);
      if (response.error) {
        error = response.localizedMessage;
      } else {
        goto("/");
      }
    } catch (e) {
      alert(e.toString());
    }
  }
</script>

<div class="page">
  <h1>2FA</h1>
  <p>Ваш аккаунт защищен паролем, помните его?</p>
  <div class="form">
    <div class="error">{error}</div>
    <input
      type="text"
      bind:value={password}
      placeholder={challenge.hint || "Пароль"}
      required
    />
    <ActionButton text="Проверить" action={verify}/>
  </div>
  <BackButton path="/auth/login"/>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    text-align: center;
    color: #ddd;
  }

  .page h1 {
    margin: 0;
  }

  .page p {
    margin: 10px 0;
    font-size: 14px;
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

  .error {
    color: red;
    font-size: 15px;
    height: 22px;
    word-break: break-all;
  }
</style>
