<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { slide, fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { page } from '$app/stores';
  import API from '$lib/stores/api';

  let sessions = [];
  let loading = true;
  let expandedId = null;

  $: from = $page.url.searchParams.get('from') || "/auth/login";

  onMount(async () => {
    sessions = [];
    try {
      const res = await $API.getSessions();
      sessions = res?.sessions || res || [];
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  const toggleSession = (id) => {
    expandedId = expandedId === id ? null : id;
  };

  async function handleTerminateAll() {
    if (confirm("Вы уверены, что хотите завершить все остальные сессии?")) {
      try {
        await $API.closeAllSessions();
        const res = await $API.getSessions();
        sessions = res?.sessions || res || [];
      } catch (e) {
        alert("Ошибка при завершении сессий.");
      }
    }
  }

  function formatDate(ms) {
    if (!ms) return "";
    const date = new Date(ms);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="sessions-page">
  <header>
    <h1>Активные сессии</h1>
    <span class="count">{sessions.length}</span>
  </header>

  <div class="sessions-container">
    {#if loading}
        <div class="status-msg">Загрузка данных...</div>
    {:else if sessions.length === 0}
        <div class="status-msg">Список сессий пуст</div>
    {:else}
        {#each sessions as session, i (session.time + i)}
          <div
            animate:flip={{ duration: 300 }}
            in:fly={{ x: 20, duration: 400, opacity: 0 }}
            class="session-card"
            class:expanded={expandedId === session.time}
            on:click={() => toggleSession(session.time)}
          >
          <div class="session-header">
            <div class="main-info">
              <span class="client-name">{session.client || 'Unknown Client'}</span>
              <span class="location-brief">
                {session.location ? session.location.split(',').slice(0, 2).join(',') : 'Unknown Location'}
              </span>
            </div>
            <div class="time-badge">{formatDate(session.time).split(' ')[0]}</div>
          </div>

          {#if expandedId === session.time}
            <div class="session-details" transition:slide={{ duration: 200 }}>
                <div class="detail-row">
                  <span class="label">Информация:</span>
                  <span class="val">{session.info}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Локация и IP:</span>
                  <span class="val">{session.location}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Дата входа:</span>
                  <span class="val">{formatDate(session.time)}</span>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
  </div>

  <div class="actions-panel">
      <button class="terminate-btn" on:click={handleTerminateAll}>
          Завершить все сессии
      </button>
      <button class="back-btn" on:click={() => goto(from)}>
            Назад
      </button>
  </div>
</div>

<style>
  .sessions-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #1a1a1f;
    color: #ddd;
    box-sizing: border-box;
    overflow: hidden;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    flex-shrink: 0;
  }

  h1 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
  }

  .count {
    font-size: 0.75rem;
    background: #333;
    padding: 2px 8px;
    border-radius: 10px;
    color: #bbb;
  }

  .sessions-container {
    flex: 1;
    overflow-y: auto;
    padding: 10px 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .session-card {
    background: #26262e;
    border-radius: 12px;
    border: 1px solid #333;
    cursor: pointer;
    transition: border-color 0.2s;
    flex-shrink: 0;
  }

  .session-card.expanded {
    border-color: #3ff;
  }

  .session-header {
    padding: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .main-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .client-name {
    font-weight: 700;
    color: #fff;
    font-size: 1rem;
  }

  .location-brief {
    font-size: 0.8rem;
    color: #888;
  }

  .time-badge {
    font-size: 0.75rem;
    color: #666;
  }

  .session-details {
    padding: 0 14px 14px 14px;
    border-top: 1px solid #333;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #212129;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    padding-top: 8px;
  }

  .label {
    font-size: 0.7rem;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .val {
    font-size: 0.85rem;
    color: #bbb;
    line-height: 1.3;
    word-break: break-all;
  }

  .status-msg {
    text-align: center;
    margin-top: 40px;
    color: #666;
  }

  .actions-panel {
    padding: 20px;
    flex-shrink: 0;
    display: flex;
    gap: 20px;
    height: 40px;
  }

  .terminate-btn {
    width: 100%;
    background: #f22727;
    color: #fff;
    border: none;
    padding: 12px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #6366f1;
    color: white;
    border: none;
    padding: 10px 40px;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .back-btn:hover {
    background: #4f46e5;
  }

  .sessions-container::-webkit-scrollbar {
    width: 4px;
  }
  .sessions-container::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 10px;
  }
</style>
