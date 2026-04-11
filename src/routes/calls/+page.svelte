<script>
  import { onMount } from 'svelte';
  import API, { currentSessionCalls, currentUser, currentSessionContacts, currentSessionChats } from '$lib/stores/api';

  $: callsWithInfo = $currentSessionCalls?.history.map(call => {
    const attach = call.message.attaches[0];
    const duration = formatSeconds(attach.duration);

    if (call.chatType === "CHAT") {
      const chat = $currentSessionChats.find(x => x.id === call.chatId);
      return {
        avatar: chat.avatar || chat.baseUrl,
        name: chat.title,
        duration,
      }
    } else if (call.chatType === "DIALOG") {
      const cid = call.chatId ^ $currentUser;
      const contact = $currentSessionContacts[cid] || {};
      const type = attach.callType === "AUDIO" ? "Аудиозвонок " : "Видеозвонок ";
      return {
        avatar: contact.avatar,
        name: type + contact.names[0].firstName,
        duration,
      }
    }
  });

  function formatSeconds(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
</script>

<div class="calls">
  <p class="title">Звонки</p>

  <div class="container">
    {#each callsWithInfo as call}
      <div class="call">
        {#if call.avatar}
          <img class="avatar" src="{call.avatar}"/>
        {:else}
          <div class="avatar"></div>
        {/if}

        <a>{ call.name }</a>

        <a class="duration">{ call.duration }</a>
      </div>
    {/each}
  </div>

  <div
  on:click={() => alert("В разработке!\nСледи за новостями:\nt.me/CatBestSoft")}
  class="placeholder-call animated-panel">
    <img src="icons/call.svg"/>
  </div>
</div>

<style>
  .calls {
    color: #999;
    height: 90vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    margin: 15px;
    overflow-y: auto;
    position: relative;
  }

  .calls .title {
    margin: 0;
    margin-bottom: 10px;
    color: #eee;
    font-size: 20px;
    font-weight: 700;
  }

  .container {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-grow: 1;
    min-height: 0;
    flex: 1;
    padding-bottom: 20px;
    margin-left: 5px;
  }

  .call {
    width: 100%;
    min-height: 64px;
    max-height: 64px;
    position: relative;
    display: flex;
    gap: 30px;
    align-items: center;
    color: #ddd;
    font-size: 14px;
  }

  .call::after {
    content: "";
    height: 1px;
    width: 6px;
    background: #333;
    margin-top: 64px;
    margin-left: 58px;
    position: absolute;
  }

  .call::before {
    content: "";
    height: 64px;
    width: 1px;
    background: #333;
    margin-left: 58px;
    position: absolute;
  }

  .call .avatar {
    min-width: 46px;
    min-height: 46px;
    max-width: 46px;
    max-height: 46px;
    border-radius: 32px;
    background-color: #222
  }

  .call .duration {
    font-size: 13px;
    font-weight: 600;
    color: #555;
    margin-left: auto;
    margin-right: 30px;
  }

  .placeholder-call {
    position: absolute;
    height: 50px;
    width: 50px;
    bottom: 0;
    right: 20px;
    border-radius: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-bottom: env(safe-area-inset-bottom, 20px);
  }

  .placeholder-call img {
    width: 20px;
  }
</style>
