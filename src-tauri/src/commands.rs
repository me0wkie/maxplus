use crate::state::AppState;
use serde_json::{json, Value};
use std::collections::HashMap;
use rumax::models::{Identity, FetchHistoryOptions};
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
delegate_cmd!(check_password(password: String, track_id: String) => check_password(password, track_id));
delegate_cmd!(register(first_name: String) => submit_register(first_name, None));
delegate_cmd!(fetch_contacts(user_ids: Vec<u64>) => fetch_contacts(user_ids));
delegate_cmd!(get_by_phone(phone: String) => get_by_phone(phone));
delegate_cmd!(add_contact(contact_id: u64, first_name: String) => add_contact(contact_id, first_name));
delegate_cmd!(remove_contact(contact_id: u64) => delete_contact(contact_id));
delegate_cmd!(search_public(query: String, count: i32, type_: String) => search_public(query, count, type_));
delegate_cmd!(search_msg(query: String, count: i32, marker: Option<String>) => search_msg(query, count, marker));
delegate_cmd!(get_chats(chat_ids: Vec<i64>) => get_chats(chat_ids));
delegate_cmd!(get_sessions() => get_sessions());
delegate_cmd!(close_all_sessions() => close_all_sessions());
delegate_cmd!(get_photo_upload(count: i64, profile: bool) => get_photo_upload(count, profile));
delegate_cmd!(get_video_upload(count: i64, profile: bool) => get_video_upload(count, profile));
delegate_cmd!(get_file_upload(count: i64, profile: bool) => get_file_upload(count, profile));
delegate_cmd!(update_profile(first_name: String, last_name: String, description: Option<String>, avatar_token: Option<String>) =>
    update_profile(first_name, last_name, description, avatar_token));
delegate_cmd!(get_calls(count: i64, forward: bool) => get_calls(forward, count));
delegate_cmd!(call(action_id: u16, payload: Value) => call(action_id, payload));
delegate_cmd!(create_group(title: String, participant_ids: Option<Vec<i64>>, notify: Option<bool>) => create_group(title, participant_ids, notify));
delegate_cmd!(delete_chat(chat_id: i64, last_event_time: Option<i64>, for_all: Option<bool>) => delete_chat(chat_id, last_event_time, for_all));
delegate_cmd!(resolve_channel_by_name(link: String) => resolve_channel_by_name(link));
delegate_cmd!(join_channel(link: String) => join_channel(link));
delegate_cmd!(leave_channel(channel_id: i64) => leave_channel(channel_id));
delegate_cmd!(leave_group(chat_id: i64) => leave_group(chat_id));
delegate_cmd!(change_group_profile(chat_id: i64, title: Option<String>, description: Option<String>) => change_group_profile(chat_id, title, description));
delegate_cmd!(fetch_history(chat_id: i64, options: Option<FetchHistoryOptions>) => fetch_history(chat_id, options));

delegate_cmd!(add_reaction(chat_id: i64, message_id: String, reaction: String) => add_reaction(chat_id, p(message_id)?, reaction));
delegate_cmd!(remove_reaction(chat_id: i64, message_id: String) => remove_reaction(chat_id, p(message_id)?));
delegate_cmd!(read_message(chat_id: i64, message_id: String) => read_message(chat_id, p(message_id)?));
delegate_cmd!(pin_message(chat_id: i64, message_id: String, notify: bool) => pin_message(chat_id, p(message_id)?, notify));
delegate_cmd!(delete_message(chat_id: i64, message_id: String, for_me: bool) => delete_message(chat_id, p(message_id)?, for_me));
delegate_cmd!(get_video_by_id(chat_id: i64, message_id: String, video_id: i64) => get_video_by_id(chat_id, p(message_id)?, video_id));
delegate_cmd!(get_file_by_id(chat_id: i64, message_id: String, file_id: i64) => get_file_by_id(chat_id, p(message_id)?, file_id));

delegate_cmd!(send_message(
    chat_id: i64,
    message: String,
    params: Option<HashMap<String, serde_json::Value>>
) => send_message(chat_id, message, params));

#[tauri::command]
pub async fn init(
    state: State<'_, AppState>,
    identity: Identity,
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
        .connect(identity, true)
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
pub async fn set_token(state: State<'_, AppState>, token: String) -> Result<String, String> {
    state.client.set_token(token).await;
    Ok("Set".into())
}

#[tauri::command]
pub async fn get_video_secret(secret: tauri::State<'_, String>) -> Result<String, String> {
    Ok(secret.inner().clone())
}
