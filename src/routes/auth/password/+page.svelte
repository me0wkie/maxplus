<script>
  import { getContext, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from "$app/navigation";
  import { set as sessionSet, get as sessionGet } from "$lib/stores/session.js";

  import "$lib/styles/AnimatedPanel.css";

  import API, { currentUser } from "$lib/stores/api";

  let error = "";
  let password = "";
  const challenge = sessionGet("challenge");

  const onBack = getContext("onBack");
  onBack["auth"] = () => {
    goto("/auth");
  };
  onDestroy(() => delete onBack["auth"]);

  console.log(challenge)

  async function handleVerify() {
    error = "Ожидайте...";
    console.log("Проверяем пароль:", password);

    const response = await $API.checkPassword(password, challenge.trackId);
    if (response.error) {
      error = response.localizedMessage;
    } else {
      sessionSet("connected", true);
      goto("/");
    }
  }
</script>

<div class="auth-page">
  <h1>2FA</h1>
  <p>Ваш аккаунт защищен паролем, помните его?</p>
  <form on:submit|preventDefault={handleVerify}>
    <div class="error">{error}</div>
    <input
      type="text"
      bind:value={password}
      placeholder={challenge.hint || "Пароль"}
      required
    />
    <button class="animated-panel" type="submit">Проверить</button>
  </form>
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
  }

  .auth-page h1 {
    margin: 0;
  }

  .auth-page p {
    margin: 10px 0;
    font-size: 14px;
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

  .error {
    color: red;
    font-size: 0.9rem;
    height: auto;
    word-break: break-all;
  }
</style>
