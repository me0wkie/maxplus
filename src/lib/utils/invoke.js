import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { error } from '$lib/stores/logs';
import { get } from 'svelte/store';
import API from '$lib/stores/api';

export const invoke = async (command, args) => {
    try {
        const response = await tauriInvoke(command, args);
        return response;
    } catch (e) {
        console.error(e);
        error(e.toString());

        if (e.toString().includes('Таймаут запроса')) {
            alert('Сервер не отвечает\nПереподключение...')
            await get(API).init();
            return invoke(command, args);
        }
    }

    return null;
}
