<script>
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { set } from '$lib/stores/settings'
    
    import '$lib/styles/AnimatedPanel.css';
    
    $: from = $page.url.searchParams.get('from');
    
    async function selectProtection(method) {
        await set('tokenEncType', method);

        // Здесь можно выполнить дополнительные настройки для каждого метода
        switch (method) {
            case 'keystore':
                console.log('Аппаратный Keystore выбран');
                break;
            case 'pin':
                console.log('Пин-код приложения выбран');
                break;
            case 'none':
                console.log('Без шифрования');
                break;
        }
        
        if (from === 'settings') goto('/settings')
        else goto('/auth/login');
    }
</script>

<div class="auth-page">
    <h1>Как вы хотите защитить данные авторизации?</h1>
    <div class="buttons">
        <!--<button class="animated-panel" on:click={() => selectProtection('keystore')}>Аппаратный Keystore</button>
        --><button class="animated-panel" on:click={() => selectProtection('none')}>Без шифрования</button>
        <button class="inactive">Keystore (в разработке)</button>
        <button class="inactive">Пин-код (в разработке)</button>
    </div>
</div>

<style>
    .auth-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: calc(100vh - 50px);
        gap: 1.5rem;
        text-align: center;
        color: #ddd;
    }

    h1 {
        font-size: 1.5rem;
        max-width: 400px;
    }

    .buttons {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
        max-width: 300px;
    }

    button {
        padding: 0.75rem;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        color: white;
        opacity: 0.9;
        transition: opacity 0.1s;
        border: none;
    }
    
    button:hover {
        opacity: 1;
    }
    
    button.inactive {
        background: #6664;
    }
</style>

