<!-- ProfileEdit.svelte -->
<script>
  import { goto } from "$app/navigation";
  import { fade, fly, slide } from "svelte/transition";
  import { page } from "$app/stores";

  import API, { currentUserDetails } from "$lib/stores/api";
  import { formatTimeAgo } from "$lib/utils/time.js";

  let firstName = "";
  let lastName = "";
  let description = "";
  let updated = "";

  currentUserDetails.subscribe((details) => {
    if (!details?.names) return;

    firstName = details.names[0].firstName;
    lastName = details.names[0].lastName;
    description = details.description;
    updated = "Обновлено " + formatTimeAgo(details.updateTime);
  });

  $: from = $page.url.searchParams.get("from") || "/auth/login";

  let loading = false;

  const original = {
    firstName,
    lastName,
    description,
  };

  $: changed =
    firstName !== original.firstName ||
    lastName !== original.lastName ||
    description !== original.description;

  async function save() {
    if (!changed || loading) return;

    loading = true;

    try {
      const descriptionChanged = description !== original.description;

      if (descriptionChanged) {
        await $API.updateProfile(
          firstName.trim(),
          lastName.trim(),
          description.trim(),
        );
      } else {
        await $API.updateProfile(firstName.trim(), lastName.trim());
      }

      original.firstName = firstName;
      original.lastName = lastName;
      original.description = description;
    } catch (e) {
      console.error(e);
      alert("Не удалось обновить профиль");
    } finally {
      loading = false;
    }
  }
</script>

<div class="profile-page">
  <header>
    <h1>Профиль</h1>
    <span class="badge">
      {updated}
    </span>
  </header>

  <div class="content">
    <div class="profile-card" in:fly={{ y: 15, duration: 350, opacity: 0 }}>
      <div class="field">
        <label>Имя</label>

        <input
          bind:value={firstName}
          type="text"
          placeholder="Введите имя"
          maxlength="32"
        />
      </div>

      <div class="field">
        <label>Фамилия</label>

        <input
          bind:value={lastName}
          type="text"
          placeholder="Введите фамилию"
          maxlength="32"
        />
      </div>

      <div class="field">
        <label>Описание профиля</label>

        <textarea
          bind:value={description}
          placeholder="Расскажите о себе"
          maxlength="250"
        />
      </div>
    </div>
  </div>

  <div class="actions-panel">
    <div class="save-wrap">
      {#if changed}
        <button
          class="save-btn"
          on:click={save}
          disabled={loading}
          transition:slide={{ duration: 180 }}
        >
          {#if loading}
            Сохранение...
          {:else}
            Сохранить изменения
          {/if}
        </button>
      {/if}
    </div>

    <button class="back-btn" on:click={() => goto(from)}> Назад </button>
  </div>
</div>

<style>
  .profile-page {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: #1a1a1f;
    color: #ddd;
    box-sizing: border-box;
  }

  header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px 14px 20px;
  }

  h1 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
  }

  .badge {
    font-size: 0.75rem;
    padding: 4px 10px;
    border-radius: 999px;
    background: #2c2c35;
    color: #888;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 20px 16px;
    box-sizing: border-box;
  }

  .content::-webkit-scrollbar {
    width: 4px;
  }

  .content::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 999px;
  }

  .profile-card {
    background: #26262e;
    border-radius: 16px;
    border: 1px solid #333;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-size: 0.78rem;
    color: #7b7b88;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input,
  textarea {
    width: 100%;
    background: #1f1f26;
    border: 1px solid transparent;
    border-radius: 12px;
    color: white;
    padding: 14px;
    box-sizing: border-box;
    font-size: 0.95rem;
    outline: none;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  input:focus,
  textarea:focus {
    border-color: #6366f1;
    background: #20202a;
  }

  textarea {
    min-height: 120px;
    resize: vertical;
    font-family: inherit;
  }

  .actions-panel {
    flex-shrink: 0;
    display: flex;
    gap: 12px;
    padding: 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    background: #1a1a1f;
    border-top: 1px solid #2c2c35;
  }

  .save-wrap {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .save-btn,
  .back-btn {
    height: 40px;
    border: none;
    border-radius: 12px;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.12s,
      opacity 0.15s,
      background 0.15s;
  }

  .save-btn {
    width: 100%;
    background: #3cb371;
    color: white;
  }

  .save-btn:hover {
    background: #35a565;
  }

  .save-btn:active,
  .back-btn:active {
    transform: scale(0.98);
  }

  .save-btn:disabled {
    opacity: 0.7;
  }

  .back-btn {
    min-width: 120px;
    background: #6366f1;
    color: white;
    padding: 0 20px;
  }

  .back-btn:hover {
    background: #4f46e5;
  }

  @media (max-width: 640px) {
    .actions-panel {
      gap: 10px;
    }

    .back-btn {
      min-width: 100px;
      padding: 0 16px;
    }

    .save-btn,
    .back-btn {
      font-size: 0.88rem;
    }
  }
</style>
