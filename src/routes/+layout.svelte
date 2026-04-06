<script>
    import { fade } from 'svelte/transition';
    import API, { currentUser, currentSessionCalls } from '$lib/stores/api.js';
    import FloatingDebugToggle from '$components/main/FloatingDebugToggle.svelte'
    import * as Settings from '$lib/stores/settings.js';
    import Session from '$lib/stores/session.js';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount, setContext } from 'svelte';
    import { onBackButtonPress } from '@tauri-apps/api/app'
    import { type } from '@tauri-apps/plugin-os'
    
    let settings;
    let loaded = false;
    const onBack = {};
    
    setContext('onBack', onBack);

    onMount(async () => {
        settings = await Settings.keys();
        
        if (!settings.includes('tokenEncType')) {
            goto('/setup/tokens');
        }
        
        const system = type();
        
        if (system === 'android' || system === 'ios') {
            await onBackButtonPress((payload) => {
                if (onBack.chatSettings) onBack.chatSettings();
                else if (onBack.dropout) onBack.dropout()
                else if (onBack.chat) onBack.chat();
                else if (onBack.addContact) onBack.addContact();
            });
        }

        setTimeout(() => {
          if (!loaded) loaded = true;
        }, 5000)
    })
    
    currentUser.subscribe(async user => {
      try {
        if (!user) {
          if (user === null && $page.route.id !== '/auth/login' && $page.route.id !== '/auth/register') {
            goto('/auth/login');
          }
        }
        else {
          if (Session.get("sync")) return;

          if (!$API.getToken())
              await $API.loadToken();

          if (!Session.get("connected"))
              await $API.init();

          await $API.sync();
          const calls = await $API.getCalls();
          $currentSessionCalls = calls;
        }
      } catch (e) {
        console.error(e);
        alert(e);
      } finally {
        if (!loaded) loaded = true;
      }
    });
</script>

<style>
  main {
    overflow-x: hidden;
  }

  .loading {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
</style>

<FloatingDebugToggle />

{#if loaded}
  {#key $page.url.pathname}
      <main in:fade={{ delay: 150, duration: 150 }}>
          <slot />
      </main>
  {/key}
{:else}
  <a class="loading">Загрузка...</a>
{/if}
