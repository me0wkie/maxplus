use crate::state::AppState;
use serde_json::{json, Value};
use std::collections::HashMap;
use tauri::State;

fn p(s: String) -> Result<u64, String> {
    s.parse().map_err(|_| "Invalid ID".into())
}

macro_rules! delegate_cmd {
    ($name:ident($($arg:ident: $ty:ty),*) => $client_method:ident($($pass_arg:expr),*)) => {
        #[tauri::command]
        pub async fn $name(state: State<'_, AppState>, $($arg: $ty),*) -> Result<Value, String> {
            let r = state.client.$client_method($($pass_arg),*).await.map_err(|e| e.to_string())?;
            serde_json::to_value(r.payload).map_err(|e| e.to_string())
        }
    };
}

delegate_cmd!(start_auth(phone: String) => start_auth(phone));
delegate_cmd!(check_code(code: String) => check_code(code));
delegate_cmd!(register(first_name: String) => submit_register(first_name, None));
delegate_cmd!(fetch_contacts(user_ids: Vec<u64>) => fetch_contacts(user_ids));
delegate_cmd!(get_by_phone(phone: String) => get_by_phone(phone));
delegate_cmd!(add_contact(contact_id: u64) => add_contact(contact_id));
delegate_cmd!(remove_contact(contact_id: u64) => delete_contact(contact_id));
delegate_cmd!(public_search(query: String, count: i32, type_: String) => public_search(query, count, type_));
delegate_cmd!(get_chats(chat_ids: Vec<i64>) => get_chats(chat_ids));
delegate_cmd!(get_sessions() => get_sessions());
delegate_cmd!(close_all_sessions() => close_all_sessions());
delegate_cmd!(get_photo_upload(count: i64, profile: bool) => get_photo_upload(count, profile));

delegate_cmd!(add_reaction(chat_id: i64, message_id: String, reaction: String) => add_reaction(chat_id, p(message_id)?, reaction));
delegate_cmd!(remove_reaction(chat_id: i64, message_id: String) => remove_reaction(chat_id, p(message_id)?));
delegate_cmd!(get_video_by_id(chat_id: i64, message_id: String, video_id: i64) => get_video_by_id(chat_id, p(message_id)?, video_id));
delegate_cmd!(get_file_by_id(chat_id: i64, message_id: String, file_id: i64) => get_file_by_id(chat_id, p(message_id)?, file_id));
delegate_cmd!(read_message(chat_id: i64, message_id: String) => read_message(chat_id, p(message_id)?));

delegate_cmd!(send_message(
    chat_id: i64,
    message: String,
    params: Option<HashMap<String, serde_json::Value>>
) => send_message(chat_id, message, params));

#[tauri::command]
pub async fn init(
    state: State<'_, AppState>,
    device_id: String,
    mt_instance: String,
    user_id: Option<u64>,
    token: Option<String>,
) -> Result<Value, String> {
    state.client.disconnect().await;
    if let Some(uid) = user_id {
        state.client.set_user_id(uid).await;
    }
    if let Some(t) = token {
        state.client.set_token(t).await;
    }

    state
        .client
        .connect(device_id, mt_instance, true)
        .await
        .map(|r| json!({ "success": true, "payload": r.payload }))
        .map_err(|e| format!("Ошибка подключения: {}", e))
}

#[tauri::command]
pub async fn sync_client(state: State<'_, AppState>) -> Result<Value, String> {
    let r = state.client.sync().await.map_err(|e| e.to_string())?;

    if let Some(id) = r
        .payload
        .pointer("/profile/contact/id")
        .and_then(|v| v.as_u64())
    {
        state.client.set_user_id(id).await;
        state.client.spawn_telemetry_task().await;
    }
    serde_json::to_value(r.payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_history(
    state: State<'_, AppState>,
    chat_id: i64,
    from_time: Option<u64>,
    amount: Option<u32>,
) -> Result<Value, String> {
    let r = state
        .client
        .fetch_history(chat_id, from_time, 0, amount.unwrap_or(200))
        .await
        .map_err(|e| e.to_string())?;
    serde_json::to_value(r.payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upload_photo(
    state: State<'_, AppState>,
    upload_url: String,
    path: String,
) -> Result<String, String> {
    state
        .client
        .upload_photo(upload_url, path)
        .await
        .ok_or("Upload failed".to_string())
}

#[tauri::command]
pub async fn set_token(state: State<'_, AppState>, token: String) -> Result<String, String> {
    state.client.set_token(token).await;
    Ok("Set".into())
}
