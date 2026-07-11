<script>
  import { goto } from "$app/navigation";

  export let condition;
  export let path;

  const _condition = condition || (() => {});
</script>

{#await _condition()}
{:then display}
  {#if display}
      <div
      class="back"
      on:click={_ => goto(path)}
      ><a>←</a></div>
  {/if}
{/await}

<style>
  .back {
    position: absolute;
    height: 32px;
    width: 32px;
    border-radius: 32px;
    background-color: #fff3;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 75px;
    left: 10px;
    font-weight: 1000;
  }

  .back a {
    line-height: 0;
    position: relative;
    bottom: 1px;
  }
</style>
