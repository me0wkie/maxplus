import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { error } from '$lib/stores/logs';
import { get } from 'svelte/store';
import API from '$lib/stores/api';

export const invoke = async (command, args) => {
    try {
        const response = await tauriInvoke(command, args);
        return response;
    } catch (e) {
        console.error(command, args)
        console.error(e);
        error(e.toString());

        if (e.toString().includes('Таймаут запроса')) {
            alert('Сервер не отвечает\nПереподключение...')
            await get(API).init();
            return invoke(command, args);
        }
        else if (e.toString().includes('FAIL_LOGIN_TOKEN') || e.toString().includes('FAIL_LOGOUT_ALL')) {
            alert('Выкинуло из аккаунта...');
            return get(API).logout();
        }

        try {
            const error = e.toString().slice(e.toString().indexOf(':') + 2);
            return JSON.parse(error);
        } catch (e) {}
    }

    return null;
}
