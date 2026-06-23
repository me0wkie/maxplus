<script>
  import { onDestroy, onMount } from "svelte";
  import {
    currentPresence,
    currentSessionChats,
    currentSessionContacts,
    currentUser,
  } from "$lib/stores/api";

  import Timestamp from "$components/main/Timestamp.svelte";

  export let contact;
  export let chat;

  if (!contact && Object.keys(chat.participants).length === 2)
    contact =
      $currentSessionContacts[
        Object.keys(chat.participants).find((x) => +x !== $currentUser)
      ];

  if (!chat) chat = $currentSessionChats.find(x => x.id === ($currentUser ^ contact.id));
</script>

{#if chat?.type === "DIALOG"}
  {#if contact}
    {#if $currentPresence[contact.id]?.seen !== undefined}
      {contact.gender === 2 ? "Была" : "Был"}
      <Timestamp
        gender={contact.gender || 1}
        unixTime={$currentPresence[contact.id]?.seen}
      />
    {:else if contact.options}
      {(() => {
        const list = [];
        const opts = contact.options;
        if (opts.includes("SERVICE_ACCOUNT")) list.push("сервисный аккаунт");
        if (opts.includes("BOT")) list.push("бот");
        if (opts.includes("OFFICIAL")) list.push("официальный");
        const joined = list.join(", ");
        return joined.charAt(0).toUpperCase() + joined.slice(1);
      })()}
    {:else}
      fdsfds
    {/if}
  {:else}
    Личный чат
  {/if}
{:else if chat?.type === "CHANNEL"}
  {chat.participantsCount} подписчиков
{:else if chat?.type === "CHAT"}
  Групповой чат
{:else}
  Это вообще чё?
{/if}
