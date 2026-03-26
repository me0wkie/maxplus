<script>
    import { fade } from 'svelte/transition';
    import API, { currentUser } from '$lib/stores/api.js';
    import * as Settings from '$lib/stores/settings.js';
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
        
        loaded = true;
    })
    
    currentUser.subscribe(user => {
        if (user === null
        && $page.route.id !== '/auth/login' && $page.route.id !== '/auth/register') goto('/auth/login');
    })
</script>

<style>
  main {
    overflow-x: hidden;
  }
</style>

{#if loaded}
  {#key $page.url.pathname}
      <main in:fade={{ delay: 150, duration: 150 }}>
          <slot />
      </main>
  {/key}
{:else}
  <a>Загрузка...</a>
{/if}
