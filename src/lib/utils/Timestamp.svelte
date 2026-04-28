<script>
    import { onDestroy, onMount } from 'svelte';
    import { formatTimeAgo } from '$lib/utils/time.js';

    export let unixTime;

    let now = Date.now();
    let interval;

    onMount(() => {
        interval = setInterval(() => {
            now = Date.now();
        }, 1000);
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    $: text = formatTimeAgo(unixTime, now);
</script>
{text}
