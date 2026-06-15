import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { error } from "$lib/stores/logs";
import { get } from "svelte/store";
import API from "$lib/stores/api";

export const invoke = async (command, args) => {
  try {
    const response = await tauriInvoke(command, args);
    return response;
  } catch (e) {
    console.error(command, args);
    console.error(e);

    const str = e.toString();
    error(str);

    if (str.includes("Таймаут запроса"))
      return restart("Сервер не отвечает!\nПереподключение...", command, args);
    if (str.includes("proto.state"))
      return restart("Сломалась сессия!\nПереподключение...", command, args);
    if (str.includes("TCP Error"))
      return restart("Откис интернет!\nПереподключение...", command, args);

    if (str.includes("login.token")) {
      alert("Выкинуло из аккаунта!");
      return get(API).logout();
    }

    try {
      const error = e.toString().slice(e.toString().indexOf(":") + 2);
      return JSON.parse(error);
    } catch (e) {}
  }

  return null;
};

let recentAlert = 0;

async function restart(text, command, args) {
  if (recentAlert < Date.now() - 5000) {
    alert(text);
  }
  recentAlert = Date.now();
  await new Promise(r => setTimeout(r, 3000));
  await get(API).init(true);
  return invoke(command, args);
}
