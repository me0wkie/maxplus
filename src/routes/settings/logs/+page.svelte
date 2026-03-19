<script>
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import logs, { total } from '$lib/stores/logs';
    import { slide, fly, fade } from 'svelte/transition';
    import { flip } from 'svelte/animate';

    $: from = $page.url.searchParams.get('from') || "/auth/login";

    let expandedId = null;

    const toggleLog = (id) => {
        expandedId = expandedId === id ? null : id;
    };

    const getLogType = (log) => {
        if (log.request) return 'request';
        if (log.response) return 'response';
        return 'generic';
    };
</script>

<div class="logs-page">
    <header>
        <h1>Сетевые логи</h1>
        <span class="count">Всего {$total} запросов</span>
    </header>

    <div class="logs-container">
        {#each $logs as log (log.id)}
            <div
                animate:flip={{ duration: 300 }}
                in:fly={{ x: 30, duration: 400, opacity: 0 }}
                out:fade={{ duration: 200 }}
                class="log-item {log.type}"
                class:expanded={expandedId === log.id}
                on:click={() => toggleLog(log.id)}
            >
                <div class="log-header">
                    <span class="badge">{log.type.toUpperCase()}</span>
                    <span class="preview">{log.timestamp} | {log.preview}...</span>
                </div>

                {#if expandedId === log.id}
                    <div class="log-content" transition:slide={{ duration: 200 }}>
                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                    </div>
                {/if}
            </div>
        {/each}
    </div>

    <div class="footer-panel">
        <button class="back-btn" on:click={() => goto(from)}>
             Вернуться назад
        </button>
    </div>
</div>

<style>
    .logs-page {
        display: flex;
        flex-direction: column;
        height: 100vh;
        color: #ddd;
        padding: 20px;
        box-sizing: border-box;
        overflow-x: hidden;
    }

    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #fff;
    }

    .count {
        font-size: 0.8rem;
        opacity: 0.6;
        background: #333;
        padding: 4px 10px;
        border-radius: 20px;
    }

    .logs-container {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-right: 10px;
    }

    .log-item {
        background: #2b2b33;
        border-radius: 8px;
        border: 1px solid #3a3a42;
        cursor: pointer;
        transition: all 0.2s ease;
        overflow: hidden;
        flex-shrink: 0;
    }

    .log-item:hover {
        background: #32323b;
        border-color: #4a4a55;
        transform: translateX(4px);
    }

    .log-item.expanded {
        border-color: #6366f1;
        background: #2d2d38;
        margin: 10px 0;
        white-space: normal;
        height: auto;
    }

    .log-header {
        display: flex;
        align-items: center;
        padding: 10px 15px;
        gap: 12px;
        font-family: 'Fira Code', monospace;
        font-size: 0.85rem;
    }

    .preview {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0.7;
    }

    .badge {
        font-size: 0.7rem;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 4px;
        min-width: 70px;
        text-align: center;
    }

    .request .badge { background: #3b82f6; color: white; }
    .response .badge { background: #10b981; color: white; }
    .error .badge { background: #f22727; color: white; }
    .generic .badge { background: #6b7280; color: white; }

    .log-content {
        padding: 0 15px 15px 15px;
        border-top: 1px solid #3a3a42;
        background: #1e1e24;
    }

    pre {
        margin: 10px 0 0;
        font-size: 0.85rem;
        color: #a5b4fc;
        overflow-x: auto;
        line-height: 1.4;
    }

    .footer-panel {
        display: flex;
        justify-content: flex-end;
        padding-top: 20px;
    }

    .back-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #6366f1;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
    }

    .back-btn:hover {
        background: #4f46e5;
    }

    .logs-container::-webkit-scrollbar {
        width: 6px;
    }
    .logs-container::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 10px;
    }
</style>
