<script>
  import { handleEnc } from '$components/ChatWindow/e2e.js'
  
  export let gotSecretChatRequest;
</script>

{#if gotSecretChatRequest}
    <div class="modal-backdrop">
        <div class="modal-content">
            <div class="modal-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <h2>Секретный чат</h2>
            </div>

            <div class="modal-body">
                <p>Собеседник предлагает защитить переписку с помощью шифрования</p>
                
                <div class="warning-box">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <p><strong>Внимание:</strong> после выхода из аккаунта вы, скорее всего, не сможете прочесть сообщения из этого чата</p>
                </div>
            </div>

            <div class="modal-actions">
               <div class="main-actions">
                    <button on:click={() => handleEnc('agree')} class="btn btn-primary">Согласиться</button>
                    <button on:click={() => handleEnc('deny')} class="btn btn-secondary">Отказаться</button>
               </div>
                <button on:click={() => handleEnc('block')} class="btn btn-link">Не показывать 10 минут</button>
            </div>
        </div>
    </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    padding: 15px;
    
    animation: fadeIn 0.3s ease;
  }

  .modal-content {
    background-color: #ffffff;
    color: #333;
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 400px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: scaleIn 0.3s ease;
  }

  .modal-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #2c3e50;
  }

  .modal-header svg {
    stroke: #2c3e50;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 22px;
  }

  .modal-body p {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: #555;
  }

  .warning-box {
    background-color: #fffbe6; /* Светло-желтый фон */
    border: 1px solid #ffe58f; /* Желтая рамка */
    border-radius: 8px;
    padding: 12px;
    margin-top: 16px;
    display: flex;
    align-items: center;
    text-align: left;
    gap: 10px;
  }
  .warning-box svg {
    stroke: #faad14;
    flex-shrink: 0;
  }
  .warning-box p {
    font-size: 14px;
    color: #5e4f24;
  }
  .warning-box p strong {
    color: #d46b08;
  }

  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }

  .main-actions {
    display: flex;
    gap: 12px;
  }

  .btn {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .btn:hover {
    transform: translateY(-2px);
  }
  .btn:active {
    transform: translateY(0);
    box-shadow: none;
  }

  .btn.btn-primary {
    background-color: #27ae60; /* зеленый */
    color: white;
  }
  .btn.btn-primary:hover {
    background-color: #2ecc71;
  }

  .btn.btn-secondary {
    background-color: #f1f2f6;
    color: #555;
  }
  .btn.btn-secondary:hover {
    background-color: #dfe4ea;
  }

  .btn.btn-link {
    background: none;
    color: #7f8c8d;
    font-weight: 500;
    font-size: 14px;
    padding: 4px;
  }
  
  .btn.btn-link:hover {
    color: #34495e;
    text-decoration: underline;
    box-shadow: none;
    transform: none;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { 
        opacity: 0;
        transform: scale(0.95);
    }
    to { 
        opacity: 1;
        transform: scale(1);
    }
  }
</style>
