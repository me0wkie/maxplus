<script>
  import { fetch } from '@tauri-apps/plugin-http';
  import { convertFileSrc } from '@tauri-apps/api/core';

  import {
    getCachedImage,
    setCachedImage
  } from "$lib/stores/cache";

  let { src, alt = "", ...props } = $props();

  let localUrl = $state(null);
  let error = $state(false);

  $effect(() => {
    let cancelled = false;
    let url = null;

    async function load() {
      error = false;
      localUrl = null;

      if (!src) return;

      try {
        let path = await getCachedImage(src);

        if (!path) {
          const response = await fetch(src, {
            method: "GET"
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();
          path = await setCachedImage(src, blob);
        }

        url = convertFileSrc(path);

        if (!cancelled) {
          localUrl = url;
        }
      } catch (e) {
        console.error(e);

        if (!cancelled) {
          error = true;
        }
      }
    }

    load();

    return () => {
      cancelled = true;

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  });
</script>

{#if localUrl}
  <img src={localUrl} {alt} {...props} />
{:else if error}
  <img src="missing.jpg" class="missing" {...props} />
{/if}

<style>
  .missing {
    image-rendering: pixelated;
  }
</style>
