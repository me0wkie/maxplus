<script>
  import { switchEnc } from "$components/ChatWindow/e2e.js";
  import { fade, fly, scale } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  export let chatKeysLoaded;
  export let chat;
  export let messages;
  export let shown;

  let chatPassword = "";
  let showPassword = false;

  function close() {
    shown = false;
  }
</script>

{#if shown}
<div
  class="settings-overlay"
  on:click={close}
  in:fly={{
    y: 40,
    duration: 260
  }}

  out:fly={{
    y: 40,
    duration: 200
  }}
>
  <div
    class="settings-modal"
    on:click|stopPropagation
  >

    <div
      class="settings-grabber"
    ></div>

    <div class="settings-header">
      <div
        class="settings-title"
      >
        Настройки
      </div>

      <button class="close-btn" on:click={close}>
        ✕
      </button>
    </div>

    <div
      class="settings-group"
      in:fade={{ delay: 120, duration: 220 }}
    >

      <div class="settings-row">
        <div class="row-left">
          <div class="row-title">
            β Шифрование
          </div>

          <div class="row-subtitle">
            End-to-end защита сообщений
          </div>
        </div>

        <button
          class="row-action"
          on:click={() => switchEnc(chat, chatKeysLoaded, messages)}
        >
          Новая сессия
        </button>
      </div>

      <div class="settings-row">
        <div class="row-title">
          Статус
        </div>

        <div class="row-value">
          {
            chatKeysLoaded?.current ? "Активно"
          : chatKeysLoaded?.some(x => x.edp === null) ? "Предложение отправлено"
          : "Отключено"}
        </div>
      </div>

    </div>

    <div
      class="settings-footer"
      in:fade={{ delay: 160, duration: 220 }}
    >
      Когда включено, только вы и собеседник сможете читать сообщения.
      <br />
      <span class="warning">
        Работает только между пользователями Max+.
      </span>
    </div>

    <div
      class="settings-group"
      in:fade={{ delay: 200, duration: 220 }}
    >

      <div class="settings-row">
        <div class="row-title">
          Пароль чата (скоро)
        </div>
      </div>

      <div class="settings-row password-row">

        <input
          type={showPassword ? "text" : "password"}
          bind:value={chatPassword}
          class="settings-input"
          placeholder="Введите пароль"
        />

        <button
          class="password-toggle"
          on:click={() => (showPassword = !showPassword)}
        >
          {showPassword ? "🙈" : "👁"}
        </button>

      </div>

    </div>

    <div
      class="settings-footer"
      in:fade={{ delay: 240, duration: 220 }}
    >
      Используется для симметричного шифрования сообщений.
    </div>

    <div
      class="settings-group"
      in:fade={{ delay: 280, duration: 220 }}
    >

      <div class="settings-row">
        <div class="row-title">
          Выключить нечиталку
        </div>

        <button class="row-action disabled" disabled>
          Скоро
        </button>
      </div>

      <div class="settings-row">
        <div class="row-title">
          Сохранить чат
        </div>

        <button class="row-action disabled" disabled>
          Скоро
        </button>
      </div>

    </div>

  </div>
</div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    inset: 0;

    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(18px);

    display: flex;
    align-items: flex-end;
    justify-content: center;

    z-index: 100;
  }

  .settings-modal {
    width: 100%;
    max-width: 520px;

    background: #111214;

    border-radius: 28px 28px 0 0;

    padding:
      10px
      14px
      calc(24px + env(safe-area-inset-bottom));

    box-sizing: border-box;

    max-height: 92vh;
    overflow-y: auto;
  }

  .settings-grabber {
    width: 38px;
    height: 5px;

    border-radius: 999px;
    background: #3a3a3c;

    margin: 0 auto 18px auto;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin-bottom: 22px;
    padding: 0 4px;
  }

  .settings-title {
    color: white;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }

  .close-btn {
    width: 34px;
    height: 34px;

    border: none;
    border-radius: 999px;

    background: #2c2c2e;
    color: #f2f2f7;

    font-size: 16px;

    display: flex;
    align-items: center;
    justify-content: center;

    cursor: pointer;

    transition:
      transform 0.15s,
      background 0.15s;
  }

  .close-btn:active {
    transform: scale(0.92);
    background: #3a3a3c;
  }

  .settings-group {
    background: #1c1c1e;
    border-radius: 16px;

    overflow: hidden;
    margin-bottom: 26px;
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    min-height: 54px;

    padding: 0 16px;

    border-bottom: 1px solid #2c2c2e;
  }

  .settings-row:last-child {
    border-bottom: none;
  }

  .row-left {
    display: flex;
    flex-direction: column;
  }

  .row-title {
    color: white;
    font-size: 16px;
    font-weight: 500;
  }

  .row-subtitle {
    color: #8e8e93;
    font-size: 13px;
  }

  .row-value {
    color: #8e8e93;
    font-size: 15px;
  }

  .row-action {
    border: none;
    background: none;

    color: #0a84ff;

    font-size: 16px;
    font-weight: 500;

    cursor: pointer;

    transition:
      opacity 0.15s,
      transform 0.12s;
  }

  .row-action:active {
    transform: scale(0.95);
    opacity: 0.7;
  }

  .row-action.disabled {
    color: #636366;
    cursor: not-allowed;
  }

  .password-row {
    gap: 10px;
  }

  .settings-input {
    width: 100%;

    background: transparent;
    border: none;

    color: white;
    font-size: 16px;

    outline: none;
  }

  .password-toggle {
    border: none;
    background: transparent;

    color: #8e8e93;

    font-size: 18px;

    cursor: pointer;

    padding: 0;

    transition:
      transform 0.12s,
      opacity 0.15s;
  }

  .password-toggle:active {
    transform: scale(0.9);
    opacity: 0.7;
  }

  .settings-footer {
    color: #8e8e93;
    font-size: 13px;
    line-height: 1.45;

    padding: 0 6px;
    margin-top: -14px;
    margin-bottom: 22px;
  }

  .warning {
    color: #ff7b7b;
  }

</style>
