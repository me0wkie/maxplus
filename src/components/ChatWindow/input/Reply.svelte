<script>
  import { getAttachText } from '$components/main/attachs.js';
  import { currentSessionContacts } from '$lib/stores/api';

  export let replyTo;
  export let messages;
  export let chat;

  $: replyToMsg = $messages.find(x => x.id === replyTo);
  $: contact = $currentSessionContacts[replyToMsg.sender] || { names: [{ first_name: "?" }] };
  $: attachText = getAttachText(chat, replyToMsg);
</script>

<div class="reply-preview">
  <div class="reply-line"></div>

  <div class="reply-content">
    <div class="reply-author">
      Ответ <b>{contact.names[0].firstName}</b>
    </div>

    <div class="reply-text">
      <b>{attachText ? (attachText + (replyToMsg.text ? "," : "")) : ""}</b> {replyToMsg.text}
    </div>
  </div>

  <button class="reply-close" on:click={() => replyTo = null}>
    ✕
  </button>
</div>

<style>
  .reply-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #17191d;
    border-radius: 10px;
    padding: 8px 10px;
    margin: 0 8px 6px 8px;
    position: relative;
  }

  .reply-line {
    width: 3px;
    height: 100%;
    background: #4a90e2;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .reply-content {
    flex-grow: 1;
    overflow: hidden;
  }

  .reply-author {
    font-size: 12px;
    color: #4a90e2;
    font-weight: 500;
  }

  .reply-text {
    font-size: 13px;
    color: #ccc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reply-close {
    background: none;
    border: none;
    color: #aaa;
    cursor: pointer;
    font-size: 14px;
    opacity: 0.6;
    transition: 0.2s;
  }

  .reply-close:hover {
    opacity: 1;
  }
</style>
