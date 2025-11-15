<script>
    import { createEventDispatcher } from 'svelte';
    import API, { currentFolders } from '$lib/stores/api'
    
    export let activeFolder;

    const dispatch = createEventDispatcher();

    function selectFolder(name) {
        activeFolder = name;
        dispatch('folderChange', { name });
    }
</script>

<div class="tabs">
  {#each [{id: 0, title: 'Все'}, ...$currentFolders] as folder (folder.id)}
    <button 
      class="tab"
      class:active={folder.title === activeFolder}
      on:click={() => selectFolder(folder.title)}
    >
      <span>{folder.title}</span>
    </button>
  {/each}
</div>
<button class="edit-btn" on:click={() => dispatch('editFolders')}></button>

<style>
  .folder-tabs-container {
      display: flex;
      align-items: center;
      padding: 0 10px;
  }

  .tabs {
      display: flex;
      overflow-x: auto;
      flex-grow: 1;
  }

  .tab {
      position: relative;
      padding: 10px 12px;
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #999;
  }
  
  .tab::before {
      width: 50%;
      content: "";
      position: absolute;
      border-bottom: 3px solid transparent;
      transition: color 0.2s, border-bottom-color 0.2s;
      border-radius: 100px 100px 0px 0px;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
  }
  
  .tab.active::before {
      content: "";
      border-bottom: 3px solid #007afd;
  }
  
  .edit-btn {
      padding: 10px;
      background: none;
      border: none;
      cursor: pointer;
  }
</style>

