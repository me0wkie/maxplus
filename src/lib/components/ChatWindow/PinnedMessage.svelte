<script>
  import { createEventDispatcher } from 'svelte';
  export let message;

  const dispatch = createEventDispatcher();

  function unpin() {
    dispatch('unpin', { id: message.id });
  }
</script>

<div class="pinned-message">
  <div class="pin-icon">📌</div>
  <p>{message.text}</p>
  <button class="unpin-btn" on:click={unpin}>✖</button>
</div>

<style>
.pinned-message {
  display: flex;
  align-items: center;
  background: #fdf3c3;
  padding: 8px 12px;
  border-radius: 12px;
  margin: 5px 10px;
  position: relative;
}

.pin-icon {
  margin-right: 8px;
}

.unpin-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}
</style>

