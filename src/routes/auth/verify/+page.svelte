<script>
    import { getContext, onDestroy } from 'svelte';
    import { invoke } from '@tauri-apps/api/core';
    import { goto } from '$app/navigation';
    import { set as sessionSet, get as sessionGet } from '$lib/stores/session.js';
    
    import '$lib/styles/AnimatedPanel.css';
    
    import API, { currentUser } from '$lib/stores/api';
    
    let error = '';
    let code = '';
    const name = sessionGet('name');
    const token = sessionGet('token');
    const state = !name ? "login" : "register";


    const onBack = getContext('onBack');
    onBack['sms'] = () => { goto("/auth/" + state); }
    onDestroy(() => delete onBack['sms']);
    

    async function handleVerify() {
        error = "Ожидайте..."
        console.log('Проверяем код:', code);
        
        /* Логин */
        if (state === "login") {
            if (code.length !== 6) {
                error = "Длина кода - 6 символов!"
            }
            else {
                const response = await $API.login(code)
                if(response.error) {
                    error = response.localizedMessage
                }
                else {
                    sessionSet("connected", true)

                    const id = response.payload.profile.contact.id;
                    currentUser.set(id);

                    goto('/');
                }
            }
        }
        /* Регистрация */
        else {
            const response = await $API.register(code, name)
            if (response.error) {
                error = response.localizedMessage
            }
            else {
                sessionSet("connected", true)
                error = "Успешно! Перезапустите приложение и авторизуйтесь"
            }
        }
    }
</script>

<div class="auth-page">
    <h1>Подтверждение</h1>
    <p>Введите код, отправленный на номер телефона</p>
    <form on:submit|preventDefault={handleVerify}>
        <div class="error">{error}</div>
        <input 
            type="text" 
            bind:value={code} 
            placeholder="Код подтверждения" 
            required 
        >
        <button class="animated-panel" type="submit">Подтвердить</button>
    </form>
</div>

<style>
    .auth-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        text-align: center;
        color: #ddd;
    }
    
    .auth-page h1 {
        margin: 0;
    }
    
    .auth-page p {
        margin: 10px 0;
        font-size: 12px;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
        max-width: 300px;
    }

    input, button {
        padding: 0.75rem;
        border-radius: 8px;
        border: 1px solid #333;
        font-size: 1rem;
        background-color: #26262e;
        color: #ccc;
        outline: none;
    }

    button {
        color: white;
        border: none;
        cursor: pointer;
    }
    
    .error {
        color: red;
        font-size: 0.9rem;
        height: auto;
        word-break: break-all;
    }
</style>

