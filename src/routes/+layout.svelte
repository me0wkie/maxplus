<script>
  import { onBackButtonPress } from "@tauri-apps/api/app";
  import { invoke } from "@tauri-apps/api/core";
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
    const system = type();

    if (system === "ios") {
      try {
        const [{ inset: top }, { inset: bottom }] = await Promise.all([
          invoke("plugin:safe-area-insets-css|get_top_inset"),
          invoke("plugin:safe-area-insets-css|get_bottom_inset"),
        ]);

        document.documentElement.style.setProperty("--safe-area-top", `${top}px`);
        document.documentElement.style.setProperty("--safe-area-bottom", `${bottom}px`);
        document.documentElement.classList.add("ios-safe-area");
      } catch (error) {
        console.warn("Native safe-area insets are unavailable", error);
      }
    }

    settings = await Settings.keys();

    /*if (!settings.includes("tokenEncType")) {
      goto("/setup/tokens");
    }*/

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
