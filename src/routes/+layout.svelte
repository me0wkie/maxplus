<script>
    import { fade } from 'svelte/transition';
    import API, { currentUser } from '$lib/stores/api.js';
    import * as Settings from '$lib/stores/settings.js';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { checkUpdates } from '$lib/utils/updater.js'
    
    let settings;

    onMount(async () => {
        checkUpdates().then(result => {
            if (result.update) {} // TODO мини-уведомление об обновлении
            else if (result.meta === 'another_platform') {} // TODO мини-уведомление об обнове на другое устройство
        })
        
        settings = await Settings.keys();
        
        if (!settings.includes('tokenEncType')) {
            goto('/setup/tokens');
        }
    })
    
    currentUser.subscribe(user => {
        if (user === null
        && $page.route.id !== '/auth/login' && $page.route.id !== '/auth/register') goto('/auth/login');
    })
</script>

<style>
    
</style>

{#key $page.url.pathname}
    <main in:fade={{ delay: 150, duration: 150 }}>
        <slot />
    </main>
{/key}
