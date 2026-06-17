<script>
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { set as sessionSet } from "$lib/stores/session";
  import { open, save } from "@tauri-apps/plugin-dialog";
  import { readFile, writeFile } from "@tauri-apps/plugin-fs";
  import API from "$lib/stores/api";

  onMount(() => $API.checkDevice().then(update));

  function update(device) {
    console.log('Device', device);
    const { deviceId, mtInstance, userAgent } = device;
    setValue('deviceId', deviceId);
    setValue('mtInstance', mtInstance);
    Object.keys(userAgent).forEach(k => setValue(k, userAgent[k]));
  }

  const setValue = (key, value) => {
    const element = document.getElementById(key);
    if (element) element.value = value;
  }

  const fields = [
    ["Тип устройства", "deviceType"],
    ["Версия приложения", "appVersion"],
    ["Версия OS", "osVersion"],
    ["Часовой пояс", "timezone"],
    ["Размер экрана", "screen"],
    ["Архитектура процессора", "arch"],
    ["Язык", "locale"],
    ["Версия сборки", "buildNumber"],
    ["Название устройства", "deviceName"],
    ["Язык устройства", "deviceLocale"],
    ["Release", "release"],
    ["User-Agent", "headerUserAgent"],
    ["Тип уведомлений", "pushDeviceType"],
    ["deviceId", "deviceId"],
    ["mt_instanceid", "mtInstance"]
  ];

  async function exportDevice() {
    const device = await $API.checkDevice();

    if (!device.deviceId) return alert("Текущий конфиг сломан!");

    const dataToSave = {
      version: 1,
      type: "device",
      ...device
    };

    const path = await save({
      defaultPath: "device.json",
      filters: [
        {
          name: "Конфиг девайса (.json)",
          extensions: ["json"],
        },
      ],
    });

    if (!path) return;

    const json = JSON.stringify(dataToSave, null, 2);
    const bytes = new TextEncoder().encode(json);

    await writeFile(path, new Uint8Array(bytes));
  }

  async function importDevice() {
    const path = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Конфиг девайса (.json)",
          extensions: ["json"],
        },
      ],
    });

    if (!path) return;

    const data = await readFile(path);
    const text = new TextDecoder("utf-8").decode(data);

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return alert("JSON-файл содержит ошибки!")
    }

    if (!json.version || json.type !== "device") return alert("Неверный файл - это не конфиг девайса!");

    if (json.version === 1) {
      const { version, type, ...cut } = json;
      await $API.setDevice(cut);
      update(cut);
    } else {
      return alert("Это конфиг для более новой версии Max+!")
    }
  }

  async function rerollDevice() {
    const device = $API.generateDevice();
    await $API.setDevice(device);
    update(device);
  }
</script>

<div class="overlay" in:fade={{ duration: 100 }} out:fade={{ duration: 100 }}>
  <div class="modal">
    <div class="header">
      <div class="title">Устройство</div>

      <div class="buttons">
        <button class="reroll" on:click={rerollDevice}>
          ⟳
        </button>
        <button class="export" on:click={exportDevice}>
          <img src="/icons/export.svg">
        </button>
        <button class="import" on:click={importDevice}>
          <img src="/icons/import.svg">
        </button>
        <button class="close" on:click={() => sessionSet("devicesPage", false)}>
          ✕
        </button>
      </div>
    </div>

    <div class="list">
      {#each fields as [label, id]}
        <div class="row">
          <div class="label">{label}</div>

          <input id={id} class="value" />
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);

    display: flex;
    justify-content: center;
    align-items: center;

    z-index: 200;
  }

  .modal {
    width: min(420px, 80%);
    max-width: 95%;
    max-height: 90vh;
    overflow-y: auto;

    background: #1f1f23;
    border-radius: 14px 14px 0 0;

    margin-top: auto;
    padding: 18px 20px;
    color: white;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .title {
    font-size: 16px;
    font-weight: 600;
  }

  .buttons {
    display: flex;
    gap: 5px;
  }

  .buttons button {
    width: 32px;
    height: 32px;
    border: none;

    background: transparent;
    color: #aaa;
    font-size: 20px;

    display: flex;
    align-items: center;
    justify-content: center;

    transition: color 0.1s;
  }

  .buttons img {
    height: 18px;
    opacity: 0.7;
  }

  .buttons .import img {
    height: 20px;
  }

  .buttons .reroll {
    font-size: 30px;
    font-weight: 1000;
    position: relative;
    bottom: 2px;
  }

  .buttons *:hover {
    color: white;
    opacity: 1;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .label {
    font-size: 12px;
    color: #9ca3af;
    flex: 1;
  }

  .value {
    flex: 1;
    text-align: right;

    background: transparent;
    border: none;
    outline: none;

    color: white;
    font-size: 13px;
    padding: 0;
  }

  .value:focus {
    color: #a5b4fc;
  }
</style>
