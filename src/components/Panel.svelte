<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  export let pages;
  export let active;
  
  function handleClick(index) {
    dispatch('open', { index });
  }
  
</script>

<div class="panel">
  {#each pages as page, index}
    <div class="option"
      class:active={index === active}
      on:click={() => handleClick(index)}
      >
      <img src={"icons/" + page.icon + ".svg"}/>
      <a>{ page.name }</a>
    </div>
  {/each}
</div>

<style>
  .panel {
    background-color: #1c1d1f;
    height: 60px;
    width: 100%;
    position: fixed;
    bottom: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    color: #999;
    z-index: 1;
  }
  
  .option {
    display: flex;
    flex-direction: column;
    font-size: 11px;
    gap: 4px;
  }
  
  .option img {
    height: 24px;
    filter: invert(50%);
  }
  
  .option.active a {
    color: #09f;
  }
  
  .option.active img {
    filter: invert(50%) sepia(100%) saturate(5000%) hue-rotate(200deg);
  }
</style>
