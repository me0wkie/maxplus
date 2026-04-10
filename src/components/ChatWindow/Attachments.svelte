<script>
  import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
  import { invoke } from '@tauri-apps/api/core';

  export let getFile;
  export let attaches;
  export let handleMediaClick;

  let downloadingMap = {};

  $: mediaAttaches = (attaches || [])
    .filter(a => a._type === 'PHOTO' || a._type === 'VIDEO' || a._type === 'FILE');

  function isDownloaded(attach) {
    return !!attach.filePath;
  }

  function isDownloading(attach) {
    return downloadingMap[attach.fileId] === true;
  }

  async function handleFileClick(attach) {
    if (isDownloaded(attach)) {
      openFile(attach);
      return;
    }

    if (isDownloading(attach)) return;

    downloadingMap = { ...downloadingMap, [attach.fileId]: true };

    try {
      // TODO скачивание стримом
      console.log(attach)
      const response = await getFile(attach.fileId);
      console.log(response.url);

      const filePath = await invoke('download', { url: response.url, name: attach.name });

      console.log(filePath)

      for (const a of attaches) {
        if (a.fileId === attach.fileId) {
          a.filePath = filePath;
        }
      }

    } catch (err) {
      console.error('Ошибка при загрузке файла:', err);
    } finally {
      downloadingMap = { ...downloadingMap, [attach.fileId]: false };
    }
  }

  function openFile(attach) {
    if (!attach.filePath) return;
    openFile(attach.filePath);
  }
</script>

<div class="media-grid"
     class:grid-single={mediaAttaches.length === 1}
     class:grid-many={mediaAttaches.length > 1}
     style="--cols: {mediaAttaches.length >= 2 ? 2 : 1}">
  {#each mediaAttaches as attach}
  <div class="grid-item" on:click|stopPropagation={() => handleMediaClick(attach)}>
    {#if attach._type === 'PHOTO'}
    <img src={attach.baseUrl} alt="photo" loading="lazy" />
    {:else if attach._type === 'VIDEO'}
    <div class="video-preview">
      <img src={attach.thumbnail} />
      <div class="play-icon">▶</div>
    </div>
    {:else if attach._type === 'FILE'}
    <div class="file-attach" on:click|stopPropagation={() => handleFileClick(attach)}>
      <div class="file-icon">
      {#if isDownloading(attach)}
          <div class="spinner"></div>
      {:else if isDownloaded(attach)}
          📄
      {:else}
          ⬇️
      {/if}
      </div>

      <div class="file-info">
      <div class="file-name">{attach.name}</div>
      <div class="file-size">{(attach.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
    {/if}
  </div>
  {/each}
</div>

{#each attaches.filter(a => a._type !== 'PHOTO' && a._type !== 'VIDEO' && a._type !== 'FILE' && a._type !== 'CONTROL') as attach}
  <div class="unsupported-attach">{attach._type} не поддерживается</div>
{/each}

<style>
  .media-grid {
    display: grid;
    gap: 4px;
    margin-top: 6px;
    border-radius: 10px;
    overflow: hidden;
    width: 100%;
    max-width: 320px;
  }

  .grid-many {
    grid-template-columns: repeat(var(--cols), 1fr);
  }

  .grid-item {
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .grid-item img, .grid-item video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .grid-many .grid-item {
    aspect-ratio: 1 / 1;
  }

  .grid-single .grid-item {
    max-height: 450px;
    border-radius: 8px;
  }

  .video-preview .play-icon {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.6);
    color: white;
    width: 40px; height: 40px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
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
  }

  .file-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
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
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 3px;
  }

</style>
