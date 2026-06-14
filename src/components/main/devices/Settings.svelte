<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { set as sessionSet } from "$lib/stores/session";
  import API from "$lib/stores/api";

  onMount(() => {
    $API.checkDevice().then(device => {
      const { deviceId, mtInstance, userAgent } = device;
      console.log('Device', device);
      setValue('deviceId', deviceId);
      setValue('mtInstance', mtInstance);
      Object.keys(userAgent).forEach(k => setValue(k, userAgent[k]));
    })
  });

  const setValue = (key, value) => {
    const element = document.getElementById(key);
    console.log(element)
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
</script>

<div class="overlay" in:fade={{ duration: 100 }} out:fade={{ duration: 100 }}>
  <div class="modal">
    <div class="header">
      <div class="title">Устройство</div>

      <button class="close" on:click={() => sessionSet("devicesPage", false)}>
        ✕
      </button>
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
    width: min(900px, 95vw);
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

  .close {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    cursor: pointer;

    background: transparent;
    color: #aaa;
    font-size: 16px;
  }

  .close:hover {
    color: white;
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
