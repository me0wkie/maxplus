<script>
  export let info;
  export let msgId;
  export let isMe;
</script>

{#if info?.counters}
  <div class="reactions" data-msg-id={msgId}>
    {#each info.counters as entry}
      <div class="reaction"
          class:your={info.yourReaction === entry.reaction}>
        { entry.reaction }
        <span class="amount">{ entry.count }</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .reactions .reaction {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 2px 8px;
    display: flex;
    align-items: center;
    font-size: 12px;
    gap: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.2s;
  }

  .reactions .reaction:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .reactions .your {
    background-color: rgba(123, 76, 214, 0.3);
    border-color: rgba(123, 76, 214, 0.5);
  }

  .reactions .amount {
    font-size: 11px;
    opacity: 0.8;
  }
</style>
