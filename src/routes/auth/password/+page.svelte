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

    try {
      const response = await $API.checkPassword(password, challenge.trackId);
      if (response.error) {
        error = response.localizedMessage;
      } else {
        sessionSet("connected", true);
        goto("/");
      }
    } catch (e) {
      alert(e.toString());
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
  <div
    class="back"
    on:click={_ => goto("/auth/login")}
  ><a>←</a></div>
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
    max-width: min(300px, 90%);
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
    font-size: 15px;
    height: 22px;
    word-break: break-all;
  }

  .back {
    position: absolute;
    height: 42px;
    width: 42px;
    border-radius: 32px;
    background-color: #fff3;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 10px;
    left: 10px;
    font-weight: 1000;
    font-size: 20px;
    cursor: pointer;
  }
</style>
