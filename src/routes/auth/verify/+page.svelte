<script>
    import { invoke } from '@tauri-apps/api/core';
    import { goto } from '$app/navigation';
    import Session from '$lib/stores/session.js';
    
    import '$lib/styles/AnimatedPanel.css';
    
    import API from '$lib/stores/api';
    import { register } from '$lib/max/raw.js';
    
    let error = '';
    let code = '';
    const name = Session.get('name')
    const token = Session.get('token')
    
    async function handleVerify() {
        error = "Ожидайте..."
        console.log('Проверяем код:', code);
        
        /* Логин */
        if (!name) {
            if (code.length !== 6) {
                error = "Длина кода - 6 символов!"
            }
            else {
                const response = await $API.verifyLogin(code)
                console.log(response)
                if(response.payload.error) {
                    error = "Ошибка проверки"
                }
                else {
                    goto('/');
                }
            }
        }
        /* Регистрация */
        else {
            const response = await register(token, code, name)
            console.log(response)
            if (!response.success) {
                error = response.error || "Ошибка проверки!";
            }
            else {
                error = "Успешно! Теперь перезайдите и авторизуйтесь"
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

