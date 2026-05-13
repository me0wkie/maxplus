<script>
  import { getAttachText } from "./attachs.js";

  export let chat;
  export let msg;
  export let cut = false;

  const attachText = getAttachText(chat, msg);

  const previewText = cut ? (msg.text?.slice(0, 20) ?? "") : msg.text;
  const isLong = cut && (msg.text?.length ?? 0) > 20;
</script>

<div class="message">
  {#if attachText}
    <b>{attachText}{msg.text ? "," : ""}</b>
  {/if}

  {previewText}{#if isLong}...{/if}
</div>
