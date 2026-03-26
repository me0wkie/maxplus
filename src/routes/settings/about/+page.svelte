<script>
    import { platform, version as getVersion } from '@tauri-apps/plugin-os';
    import { openUrl } from '@tauri-apps/plugin-opener';
    import { goto } from '$app/navigation';
    import Settings from '$lib/stores/settings';
    import { onMount } from 'svelte';
    import { app } from '@tauri-apps/api'
    import { page } from '$app/stores';

    let autoCheck = true;
    let version = "неизвестно";
    let environment = "...";

    $: from = $page.url.searchParams.get('from') || "/auth/login";

    async function checkUpdates() {
        const response = await fetch("https://api.github.com/repos/me0wkie/maxplus/releases/latest");
        const data = await response.json();
        if (!data.tag_name) alert("Не удалось узнать последнюю версию!");
        else {
            if (data.tag_name !== version) openUrl(data.html_url);
            else alert("Установлена последняя версия!");
        }
    }

    function toggleAutoCheck() {
        autoCheck = !autoCheck;
    }

    onMount(async () => {
        version = await app.getVersion();
        const _platform = await platform();
        environment = _platform[0].toUpperCase() + _platform.slice(1) + ' ' + await getVersion();
    })
</script>

<div class="about-page">
    <div class="center">
        <h1>Max+</h1>
        <p>Разработчик: me0wkie</p>
    </div>
    <p><a href="https://github.com/me0wkie/maxplus" target="_blank">Репозиторий GitHub</a></p>

    <div class="center">
        <p>Версия приложения: {version}</p>
        <p>{environment}</p>
    </div>

    <div class="actions-panel">
        <button class="btn" on:click={checkUpdates}>
            Проверить обновления
        </button>
        <!--<label class="auto-check">
            <input type="checkbox" bind:checked={autoCheck} on:change={toggleAutoCheck}/>
            Автоматически проверять обновления
        </label>-->
        <button class="btn" on:click={() => goto(from)}>
            Вернуться
        </button>
    </div>
</div>

<style>
    .about-page {
        color: #bbb;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
    }

    h1 {
        color: #6366f1;
        font-size: 28px;
        margin-bottom: 5px;
    }

    a {
        color: #3ff;
        text-decoration: underline;
    }

    .center {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
    }

    .center p {
        margin: 0;
    }

    .actions-panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        max-width: 300px;
        justify-content: flex-end;
        position: fixed;
        bottom: 20px;
    }

    .btn {
        display: flex;
        justify-content: center;
        background: #6366f1;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
    }

    .btn:hover {
        background: #4f46e5;
    }

    .auto-check {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #bbb;
        font-size: 14px;
    }
</style>
