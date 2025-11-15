use crate::{errors::ClientResult, MaxClient};
use crate::models::Response;
use serde_json::json;

impl MaxClient {
    /// Шаг 1: Запрос кода по номеру телефона
    pub async fn start_auth(&self, phone: String) -> ClientResult<Response> {
        let payload = json!({ "phone": phone, "type": "START_AUTH", "language": "ru" });
        let resp = self.send_and_wait(17, payload, 0).await?;

        // Автоматически сохраняем temp_token
        if let Some(token) = resp.payload.get("token").and_then(|t| t.as_str()) {
            self.set_temp_token(token.to_string()).await;
        }

        Ok(resp)
    }

    /// Шаг 2: Проверка кода и получение токена
    pub async fn check_code(&self, code: String) -> ClientResult<Response> {
        let state = self.state.lock().await;
        let token = state.temp_token.as_ref().ok_or("No temporary token found".to_string())?;

        let payload = json!({ "token": token, "verifyCode": code, "authTokenType": "CHECK_CODE" });
        
        // Отпускаем лок перед .await
        drop(state);

        let resp = self.send_and_wait(18, payload, 0).await?;

        // Автоматически сохраняем постоянный token
        if let Some(token) = resp
            .payload
            .get("tokenAttrs")
            .and_then(|t| t.get("LOGIN"))
            .and_then(|l| l.get("token"))
            .and_then(|t| t.as_str())
        {
            self.set_token(token.to_string()).await;
        }

        Ok(resp)
    }
    
    /// (Новая функция) Регистрация
    pub async fn register_account(
        &self,
        phone: String,
        first_name: String,
        last_name: Option<String>,
    ) -> ClientResult<Response> {
        let payload = json!({
            "phone": phone,
            "firstName": first_name,
            "lastName": last_name,
            "type": "REGISTER"
        });
        
        // Предполагаемый opcode 15
        self.send_and_wait(15, payload, 0).await
    }
    
    /// (Новая функция) Синхронизация после логина
    pub async fn sync(&self) -> ClientResult<Response> {
        let state = self.state.lock().await;
        let token = state.token.as_ref().ok_or("No token set".to_string())?;
        
        let payload = json!({
            "interactive": true, "token": token,
            "chatsSync": 0, "contactsSync": 0, "presenceSync": 0, "draftsSync": 0, "chatsCount": 40,
        });
        
        // Отпускаем лок перед .await
        drop(state);
        
        self.send_and_wait(19, payload, 0).await
    }
}
