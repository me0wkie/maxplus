use crate::{errors::ClientResult, MaxClient};
use crate::models::Response;
use serde_json::json;
use std::collections::HashMap;
use chrono::Utc;

impl MaxClient {
    pub async fn send_message(
        &self,
        chat_id: u64,
        text: String,
        args: Option<HashMap<String, serde_json::Value>>,
    ) -> ClientResult<Response> {
        let args_map = args.unwrap_or_default();
        let payload = json!({
            "chatId": chat_id,
            "message": {
                "text": text,
                "cid": Utc::now().timestamp_millis(),
                "elements": json!([]),
                "attaches": args_map.get("attaches").cloned().unwrap_or(json!([])),
                "link": args_map.get("replyTo").cloned().map(|id| json!({"type": "REPLY", "messageId": id.to_string()})),
            },
            "notify": args_map.get("notify").cloned().unwrap_or(json!(true)),
        });
        // Используем opcode 64, как в вашем оригинальном коде
        self.send_and_wait(64, payload, 0).await
    }
    
    // ... можете перенести сюда и остальные методы (edit, delete, fetch_history...)
}
