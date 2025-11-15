<script>
    import { goto } from '$app/navigation';
    import Session from '$lib/stores/session.js';
    import { startAuth } from '$lib/max/raw.js';
    
    import '$lib/styles/AnimatedPanel.css';

    let error = '';
    let phone = '';
    let name = '';
    
    /*
    reg is different
    */

    async function handleRegister() {
        error = "Ожидайте..."
        console.log('Запрос на регистрацию:', { phone, name });
        const response = await startAuth(phone)
        console.log(response)
        if(!response.token) {
            error = "Ошибка!"
        } else {
            Session.set('token', response.token)
            Session.set('name', name)
            goto('/auth/verify');
        }
    }
</script>

<div class="auth-page">
    <h1>Создание аккаунта</h1>
    <form on:submit|preventDefault={handleRegister}>
        <div class="error">{error}</div>
        <input 
            type="text" 
            bind:value={name} 
            placeholder="Псевдоним" 
            required
        >
        <input 
            type="tel" 
            bind:value={phone} 
            placeholder="Номер телефона" 
            required
        >
        <button class="animated-panel" type="submit">Получить код</button>
    </form>
    <a href="/auth/login" class="link">Уже есть аккаунт? Войти</a>
</div>

<style>
    .auth-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        gap: 1rem;
        text-align: center;
        color: #ddd;
    }
    
    .auth-page h1 {
        margin: 0;
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
        margin-top: 1rem;
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

