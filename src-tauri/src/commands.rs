use crate::state::AppState;
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub async fn init(
    state: State<'_, AppState>,
    device_id: String,
    mt_instance: String,
    user_id: Option<u64>,
    token: Option<String>,
) -> Result<Value, String> {
    let client = &state.client;

    client.disconnect().await;

    if let Some(uid) = user_id {
        client.set_user_id(uid).await;
    }

    if let Some(t) = token {
        client.set_token(t).await;
    }

    match client.connect(device_id, mt_instance, true).await {
        Ok(response) => {
            let payload = response.payload;
            Ok(serde_json::json!({
                "success": true,
                "payload": payload
            }))
        },
        Err(e) => {
            client.disconnect().await;
            Err(format!("Ошибка подключения: {}", e))
        }
    }
}

#[tauri::command]
pub async fn start_auth(
    state: State<'_, AppState>,
    phone: String,
) -> Result<Value, String> { // <--- Возвращаем `Value`
    state.client.start_auth(phone)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn check_code(state: State<'_, AppState>, code: String) -> Result<Value, String> {
    state.client.check_code(code)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn register(
    state: State<'_, AppState>,
    first_name: String,
) -> Result<Value, String> { // <--- Возвращаем `Value`
    state.client.submit_register(first_name, Option::None)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn sync_client(state: State<'_, AppState>) -> Result<Value, String> {
    let r = state.client.sync().await.map_err(|e| e.to_string())?;

    if let Some(id) = r.payload
        .get("profile")
        .and_then(|s| s.get("contact"))
        .and_then(|s| s.get("id"))
        .and_then(|id| id.as_u64())
    {
        state.client.set_user_id(id).await;
        state.client.spawn_telemetry_task().await;
    }

    serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
}


#[tauri::command]
pub async fn fetch_contacts(
    state: State<'_, AppState>,
    user_ids: Vec<u64>,
) -> Result<Value, String> {
    state.client.fetch_contacts(user_ids)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}


#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    chat_id: i64,
    message: String,
) -> Result<Value, String> {
    state.client.send_message(chat_id, message, None)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn add_reaction(
    state: State<'_, AppState>,
    chat_id: i64,
    message_id: String,
    reaction: String,
) -> Result<Value, String> {
    let cor: u64 = message_id.parse().unwrap();
    state.client.add_reaction(chat_id, cor, reaction)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn remove_reaction(
    state: State<'_, AppState>,
    chat_id: i64,
    message_id: String,
) -> Result<Value, String> {
    let cor: u64 = message_id.parse().unwrap();
    state.client.remove_reaction(chat_id, cor)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn fetch_history(
    state: State<'_, AppState>,
    chat_id: i64,
    from_time: Option<u64>,
    amount: Option<u32>,
) -> Result<Value, String> {
    state.client.fetch_history(chat_id, from_time, 0, amount.unwrap_or(200))
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn get_by_phone(
    state: State<'_, AppState>,
    phone: String
) -> Result<Value, String> {
    state.client.get_by_phone(phone)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn add_contact(
    state: State<'_, AppState>,
    contact_id: u64
) -> Result<Value, String> {
    state.client.add_contact(contact_id)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
                .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn remove_contact(
    state: State<'_, AppState>,
    contact_id: u64
) -> Result<Value, String> {
    state.client.delete_contact(contact_id)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| {
            serde_json::to_value(r.payload)
            .map_err(|e| e.to_string())
        })
}

#[tauri::command]
pub async fn get_video_by_id(
    state: State<'_, AppState>,
    chat_id: i64,
    message_id: String,
    video_id: i64,
) -> Result<Value, String> {
    let cor: u64 = message_id.parse().unwrap();
    state.client.get_video_by_id(chat_id, cor, video_id)
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| {
        serde_json::to_value(r.payload)
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn get_file_by_id(
    state: State<'_, AppState>,
    chat_id: i64,
    message_id: String,
    file_id: i64,
) -> Result<Value, String> {
    let cor: u64 = message_id.parse().unwrap();
    state.client.get_file_by_id(chat_id, cor, file_id)
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| {
        serde_json::to_value(r.payload)
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn read_message(
    state: State<'_, AppState>,
    chat_id: i64,
    message_id: String,
) -> Result<Value, String> {
    let cor: u64 = message_id.parse().unwrap();
    state.client.read_message(chat_id, cor)
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| {
        serde_json::to_value(r.payload)
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn public_search(
    state: State<'_, AppState>,
    query: String,
    count: i32,
    type_: String,
) -> Result<Value, String> {
    state.client.public_search(query, count, type_)
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| {
        serde_json::to_value(r.payload)
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn get_chats(
    state: State<'_, AppState>,
    chat_ids: Vec<i64>,
) -> Result<Value, String> {
    state.client.get_chats(chat_ids)
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| {
        serde_json::to_value(r.payload)
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn get_sessions(
    state: State<'_, AppState>,
) -> Result<Value, String> {
    state.client.get_sessions()
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| {
        serde_json::to_value(r.payload)
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn close_all_sessions(
    state: State<'_, AppState>,
) -> Result<Value, String> {
    state.client.close_all_sessions()
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| {
        serde_json::to_value(r.payload)
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn set_token(
    state: State<'_, AppState>,
    token: String
) -> Result<String, String> {
    state.client.set_token(token).await;
    Ok("Set".to_string())
}
