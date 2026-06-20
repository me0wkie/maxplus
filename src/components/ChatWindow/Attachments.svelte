<script>
  import { onDestroy } from 'svelte';

  export let getFile;
  export let attaches;
  export let handleMediaClick;

  let downloadingMap = {};

  $: mediaAttaches = (attaches || []).filter(
    (a) => a._type === "PHOTO" || a._type === "VIDEO" || a._type === "FILE",
  );
  $: mediaItems = mediaAttaches.filter(a => a._type === "PHOTO" || a._type === "VIDEO");

  let placeholderUrls = {};
  function getPlaceholderUrl(previewData) {
    if (!previewData) return null;
    if (placeholderUrls[previewData]) return placeholderUrls[previewData];
    try {
      const bytes = Uint8Array.from(previewData, c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'image/webp' });
      const url = URL.createObjectURL(blob);
      placeholderUrls[previewData] = url;
      return url;
    } catch (e) {
      console.warn('Failed to create placeholder URL', e);
      return null;
    }
  }

  onDestroy(() => {
    Object.values(placeholderUrls).forEach(url => URL.revokeObjectURL(url));
  });

  function lazyLoad(node, src) {
    let observer;
    function load() {
      if (node.src !== src) node.src = src;
    }
    if (IntersectionObserver) {
      observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          load();
          observer.disconnect();
        }
      });
      observer.observe(node);
    } else {
      load();
    }
    return {
      destroy() {
        if (observer) observer.disconnect();
      }
    };
  }

  function computeLayout(items) {
    const n = items.length;
    if (n === 0) return { gridTemplateColumns: '', gridTemplateRows: '', items: [] };

    if (n === 1) {
      const item = items[0];
      const w = item.width || 1;
      const h = item.height || 1;
      const maxWidth = 320;
      const maxHeight = 450;

      const computedHeight = Math.min((maxWidth / (w / h)), maxHeight);
      return {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto',
        items: [{ style: `height: ${computedHeight}px;` }]
      };
    }

    if (n === 2) {
      return {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '200px',
        items: [{}, {}]
      };
    }

    if (n === 3) {
      return {
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '150px 150px',
        items: [
          { gridColumn: '1 / 2', gridRow: '1 / 3' },
          { gridColumn: '2 / 3', gridRow: '1 / 2' },
          { gridColumn: '2 / 3', gridRow: '2 / 3' }
        ]
      };
    }

    if (n === 4) {
      return {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '150px 150px',
        items: [
          { gridColumn: '1 / 2', gridRow: '1 / 2' },
          { gridColumn: '2 / 3', gridRow: '1 / 2' },
          { gridColumn: '1 / 2', gridRow: '2 / 3' },
          { gridColumn: '2 / 3', gridRow: '2 / 3' }
        ]
      };
    }

    const cols = 3;
    const rows = Math.ceil(n / cols);
    const height = 150;
    const itemsLayout = [];
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      itemsLayout.push({
        gridColumn: `${col + 1} / ${col + 2}`,
        gridRow: `${row + 1} / ${row + 2}`
      });
    }
    return {
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, ${height}px)`,
      items: itemsLayout
    };
  }

  $: layout = computeLayout(mediaItems);

  function isDownloaded(attach) { return !!attach.filePath; }
  function isDownloading(attach) { return downloadingMap[attach.fileId] === true; }
  async function handleFileClick(attach) {
    if (isDownloaded(attach)) { openFile(attach); return; }
    if (isDownloading(attach)) return;
    downloadingMap = { ...downloadingMap, [attach.fileId]: true };
    try {
      const response = await getFile(attach.fileId);
      const filePath = await invoke("download", { url: response.url, name: attach.name });
      for (const a of attaches) {
        if (a.fileId === attach.fileId) a.filePath = filePath;
      }
    } catch (err) {
      console.error("Ошибка при загрузке файла:", err);
    } finally {
      downloadingMap = { ...downloadingMap, [attach.fileId]: false };
    }
  }
  function openFile(attach) {
    if (!attach.filePath) return;
    // openFile(attach.filePath);
  }
</script>

<div
  class="media-grid"
  style="grid-template-columns: {layout.gridTemplateColumns}; grid-template-rows: {layout.gridTemplateRows};"
>
  {#each mediaItems as attach, i}
    <div
      class="grid-item"
      style="grid-column: {layout.items[i]?.gridColumn || 'auto'}; grid-row: {layout.items[i]?.gridRow || 'auto'}; {layout.items[i]?.style || ''}"
      on:click|stopPropagation={() => handleMediaClick(attach)}
    >
      {#if attach._type === "PHOTO"}
        <img
          use:lazyLoad={attach.baseUrl}
          src={getPlaceholderUrl(attach.previewData) || ''}
          alt="photo"
          loading="lazy"
          decoding="async"
          width={attach.width}
          height={attach.height}
        />
      {:else if attach._type === "VIDEO"}
        <div class="video-preview">
          <img
            use:lazyLoad={attach.thumbnail || attach.baseUrl}
            src={getPlaceholderUrl(attach.previewData) || ''}
            alt="video"
            loading="lazy"
            decoding="async"
            width={attach.width}
            height={attach.height}
          />
          <div class="play-icon">▶</div>
        </div>
      {/if}
    </div>
  {/each}
</div>

{#each mediaAttaches.filter(a => a._type === "FILE") as attach}
  <div class="file-attach" on:click|stopPropagation={() => handleFileClick(attach)}>
    <div class="file-icon">
      {#if isDownloading(attach)}<div class="spinner"></div>
      {:else if isDownloaded(attach)}📄{:else}⬇️{/if}
    </div>
    <div class="file-info">
      <div class="file-name">{attach.name}</div>
      <div class="file-size">{(attach.size / 1024).toFixed(1)} KB</div>
    </div>
  </div>
{/each}

{#each attaches.filter(a =>
  a._type !== "PHOTO" &&
  a._type !== "VIDEO" &&
  a._type !== "FILE" &&
  a._type !== "CONTROL") as attach}
  <div class="unsupported-attach">{attach._type} не поддерживается</div>
{/each}

<style>
  .media-grid {
    display: grid;
    gap: 4px;
    margin-top: 6px;
    margin-right: 8px;
    border-radius: 10px;
    overflow: hidden;
    width: 100%;
    max-width: 320px;
  }

  .grid-item {
    cursor: pointer;
    position: relative;
    overflow: hidden;
    background: rgba(255,255,255,0.05);
  }

  .grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .video-preview {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .video-preview .play-icon {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.6);
    color: white;
    width: 40px; height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    pointer-events: none;
  }

  .file-attach {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 10px;
    cursor: pointer;
    background-color: #0002;
    min-width: 130px;
    margin-right: 10px;
    margin-top: 4px;
  }

  .file-icon {
    min-width: 36px;
    max-width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .file-name {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-size {
    font-size: 11px;
    opacity: 0.6;
  }

  .unsupported-attach {
    font-size: 11px;
    opacity: 0.5;
    margin-top: 5px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 3px;
  }

  img {
    transform: translateZ(0);
  }
</style>
