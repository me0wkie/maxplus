<script>
  import { onBackButtonPress } from "@tauri-apps/api/app";
  import { onMount, setContext } from "svelte";
  import { fade } from "svelte/transition";
  import { page } from "$app/stores";
  import { type } from "@tauri-apps/plugin-os";

  import Loading from "$components/effects/Loading.svelte";
  import ProfileModal from "$components/ProfileModal.svelte";
  import DevSettings from "$components/main/dev/Settings.svelte";
  import AddContactModal from "$components/main/AddContactModal.svelte";
  import DevicesSettings from "$components/main/devices/Settings.svelte";

  import Session from "$lib/stores/session.js";
  import * as Settings from "$lib/stores/settings.js";

  let settings;
  const onBack = {};

  setContext("onBack", onBack);

  onMount(async () => {
    settings = await Settings.keys();

    /*if (!settings.includes("tokenEncType")) {
      goto("/setup/tokens");
    }*/

    const system = type();

    if (system === "android" || system === "ios") {
      await onBackButtonPress((payload) => {
        if (onBack.chatSettings) onBack.chatSettings();
        else if (onBack.dropout) onBack.dropout();
        else if (onBack.chat) onBack.chat();
        else if (onBack.addContact) onBack.addContact();
      });
    }
  });
</script>

{#if $Session.devSettings}
  <DevSettings />
{/if}

{#if $Session.devicesPage}
  <DevicesSettings />
{/if}

{#if $Session.profile}
  <ProfileModal on:close={() => ($Session.profile = null)} />
{/if}

{#if $Session.contactModal}
  <AddContactModal on:close={() => ($Session.contactModal = false)} />
{/if}

{#if $Session.loaded}
  {#key $page.url.pathname}
    <main in:fade={{ duration: 150 }}>
      <slot />
    </main>
  {/key}
{:else}
  <Loading/>
{/if}

<style>
  main {
    overflow: hidden;
  }
</style>
