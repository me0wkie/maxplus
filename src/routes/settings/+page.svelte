<script>
  import { clearMessages, clearContacts, clearKeys } from '$lib/stores/api';
  import { scan, Format, checkPermissions, requestPermissions, openAppSettings } from '@tauri-apps/plugin-barcode-scanner';
  import { set as sessionSet } from '$lib/stores/session'
  import { platform as getPlatform } from '@tauri-apps/plugin-os';
  import { readFile } from '@tauri-apps/plugin-fs';
  import API, { currentUser } from '$lib/stores/api';
  import { open } from '@tauri-apps/plugin-dialog';
  import Settings from '$lib/stores/settings';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import jsQR from "jsqr";

  let platform;

  let user;
  let phone;
  let name;

  currentUser.subscribe(userId => {
    user = $API.getUserDetails();
    if (!user) return;
    phone = user.phone ? ("+ " + user.phone.toString()[0] + ' ' + user.phone.toString().slice(1, 4) + " *** ** " + user.phone.toString().slice(-2, user.phone.toString().length)) : "";
    name = user.names[0].firstName + ' ' + user.names[0].lastName
  })

  const buttons = [
    [
      { icon: "crypto.svg", text: "Настройки шифрования", action: () => goto("setup/tokens?from=/?card=3") }, // card 3 is settings
    ],
    [
      { icon: "logs.svg", text: "Сетевые логи", action: () => goto("settings/logs?from=/?card=3") },
      { icon: "settings.svg", text: "Настройки отладки", action: () => sessionSet('devSettings', true) },
      { icon: "about.svg", text: "О приложении", action: () => goto("settings/about?from=/?card=3") }
    ],
    [
      { icon: "devices.png", text: "Активные сессии", action: () => goto("settings/sessions?from=/?card=3") },
      { icon: "logout.svg", text: "Выйти из аккаунта", action: handleLogout },
    ]
  ]

  function clearCache() {
    clearMessages();
    clearContacts();
    alert('Кэш успешно очищен.');
  }

  function clearAllKeys() {
    clearKeys();
  }

  function handleLogout() {
    $API.logout();
    goto('/auth/login');
  }

  async function scanner() {
    let content = "";

    if (/android|ios/.test(platform)) {
      let cameraAllowed = await checkPermissions();

      if (cameraAllowed.includes("prompt")) await requestPermissions();
      else if (cameraAllowed === "denied") {
        alert("Для сканирования QR нужно разрешение камеры."
        + "\nА зачем ещё вы это используете?")
        await openAppSettings();
      }

      if (await checkPermissions() !== "granted") return;

      const scanned = await scan({ formats: [Format.QRCode] });
      if (!scanned.content) return;
      content = scanned.content;
    } else {
      const image = await open({
        multiple: false,
        directory: false,
        filters: [{
          name: 'Изображения',
          extensions: ['png', 'jpeg', 'jpg'],
        }],
      });

      if (!image) return;

      const data = await readQRCode(image);

      if (!data) return alert("QR-код не найден!");

      content = data;
    }

    if (content.includes(":auth")) {
      $API.call(1, { "interactive": true }); // ping
      $API.call(96, {});                     // get smth
      const response = await $API.call(290, { "qrLink": content });
      if (response.error) alert(response.title);
    }
    else alert(content);
  }

  async function readQRCode(filePath) {
    const data = await readFile(filePath);
    const blob = new Blob([new Uint8Array(data)], { type: 'image/png' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.src = url;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code?.data || null;
  }

  onMount(async () => {
      platform = await getPlatform();
  });

  /*
  <div class="top">
    <img src={ "icons/qr.svg" }/>
    <img src={ "icons/edit.svg" }/>
  </div>
  */
</script>

<div class="settings">
  <img on:click={scanner} src={ "icons/qr.svg" } class="scanner-icon icon"/>

  <div class="info">
    <img src={user?.baseUrl || '/default-avatar.jpg'} alt="avatar" class="avatar"/>
    <a class="name">{ name }</a>
    <a class="phone">{ phone }</a>
  </div>

  <div class="buttons">
    {#each buttons as group}
      <div class="group">
        {#each group as btn}
          <div on:click={ btn.action } class="button">
            <img src={ "icons/" + btn.icon } class="icon"/>
            <a>{ btn.text }</a>
            <svg width="40" height="20" viewBox="0 0 40 20" xmlns="http://www.w3.org/2000/svg">
              <polyline points="30,3 38,10 30,17" stroke="#999" fill="none" stroke-width="3"/>
            </svg>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .settings {
    width: 100vw;
    color: #bbb;
  }
  
  .info {
    margin-top: 20px;
    top: 0;
    width: 100vw;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .info img {
    height: 85px;
    border-radius: 85px;
  }
  
  .info .name {
    margin-top: 15px;
    font-size: 20px;
    font-weight: 800;
    color: #bbb;
  }
  
  .info .phone {
    color: #3ff;
    font-size: 13px;
  }
  
  .buttons {
    margin: 20px 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-size: 14px;
  }
  
  .buttons .group {
    background-color: #26262e;
    border-radius: 15px;
  }
  
  .buttons .group .button {
    padding: 12px 15px;
    display: flex;
    flex-direction: row;
    cursor: pointer;
    align-items: center;
  }
  
  .buttons .group .icon {
    width: 24px;
    height: 24px;
    margin-right: 15px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }
  
  .buttons .group .button a {
    line-height: 1;
    letter-spacing: 0.5px;
  }
  
  .buttons .group .button svg {
    margin-left: auto;
  }

  .scanner-icon {
    position: absolute;
    width: 45px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.1s;
  }

  .scanner-icon:hover {
    opacity: 1;
  }
</style>
