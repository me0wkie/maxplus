<script>
  import { switchEnc } from '$components/ChatWindow/e2e.js'
  
  export let showSettings;
  export let chatKeysCached;
  export let chat;
  export let messages;
  
</script>

{#if showSettings}
    <div class="settings-dropout" on:click|stopPropagation>
        <div class="setting-title">β Шифрование: {chatKeysCached?.current ? 'активно' : 'отключено'}</div>
        <p>Когда включено, только вы и получатель сможете прочитать сообщения.</p>
        <button class="settings-button animated-panel" on:click={() => switchEnc(chat, chatKeysCached, messages)}>
            {chatKeysCached?.current ? 'Отключить' : 'Активировать'}
        </button>
    </div>
{/if}

<style>
  .settings-dropout {
    position: absolute;
    top: 55px;
    right: 10px;
    margin-left: 10px;
    background: #1e2024;
    border-radius: 8px;
    padding: 15px;
    max-width: 300px;
    z-index: 10;
  }

  .setting-title { 
    font-weight: 500;
    margin-bottom: 8px;
    font-size: 16px;
  }

  .settings-dropout p { 
    font-size: 13px;
    color: #666;
    margin: 0 0 12px 0;
    line-height: 1.5;
  }

  .settings-button {
    width: 100%;
    padding: 8px 12px;
    border: none;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.2s;
  }

  .settings-button:hover { opacity: 0.9; }
</style>
