<script>
    import { invoke } from '@tauri-apps/api/core';
    import { goto } from '$app/navigation';
    import API from '$lib/stores/api';
    
    import '$lib/styles/AnimatedPanel.css';
    
    let phone = '';
    let error = '';
    
    async function handleLogin() {
        error = '';
        console.log('Запрос на вход:', phone);
        if(!phone.startsWith('+')) {
            error = "Начните номер с +"
        }
        else {
            const response = await $API.startAuth(phone)
            console.log(response)
            if(response.success) goto('/auth/verify');
            else error = "Не удалось выполнить запрос!"
        }
    }
</script>

<div class="auth-page">
    <h1>Вход</h1>
    <form on:submit|preventDefault={handleLogin}>
        <div class="error">{error}</div>
        <input 
            type="tel" 
            bind:value={phone} 
            placeholder="Номер телефона" 
            required
        >
        <button class="animated-panel" type="submit">Получить код</button>
    </form>
    <a href="/auth/register" class="link">Создать аккаунт</a>
</div>

<style>
    .auth-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        text-align: center;
        color: #ddd;
    }
    
    .auth-page h1 {
        margin-bottom: 0px;
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

    .link {
        margin-top: 2rem;
        font-size: 0.9rem;
        color: #4a90e2;
        text-decoration: none;
    }

    .link:hover {
        text-decoration: underline;
    }

    .error {
        color: red;
        font-size: 0.9rem;
        height: auto;
        word-break: break-all;
    }
</style>
