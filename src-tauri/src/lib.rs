mod max_client;

use hex;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio_native_tls::TlsStream;

use std::collections::HashMap;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex as TokioMutex;

use serde_json::Value;

use crate::max_client::{MaxClient, Response};

#[derive(Clone)]
struct SharedConn {
    stream: Arc<TokioMutex<Option<TlsStream<TcpStream>>>>,
}

impl SharedConn {
    fn new() -> Self {
        SharedConn {
            stream: Arc::new(TokioMutex::new(None)),
        }
    }
}

/* Работа hex (ну хуита) */

#[tauri::command]
async fn rawConnect(state: tauri::State<'_, SharedConn>) -> Result<(), String> {
    let connector = native_tls::TlsConnector::new().map_err(|e| e.to_string())?;
    let connector = tokio_native_tls::TlsConnector::from(connector);
    let tcp = TcpStream::connect("api.oneme.ru:443")
        .await
        .map_err(|e| e.to_string())?;
    let tls_stream = connector
        .connect("api.oneme.ru", tcp)
        .await
        .map_err(|e| e.to_string())?;

    let mut guard = state.stream.lock().await;
    *guard = Some(tls_stream);
    Ok(())
}

#[tauri::command]
async fn send_and_get(
    state: tauri::State<'_, SharedConn>,
    data_hex: String,
) -> Result<String, String> {
    let data = hex::decode(data_hex).map_err(|e| e.to_string())?;

    let mut guard = state.stream.lock().await;
    let stream = guard.as_mut().ok_or("Not connected")?;

    stream.write_all(&data).await.map_err(|e| e.to_string())?;

    let mut buf = vec![0u8; 4096];
    let n = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
    buf.truncate(n);

    Ok(hex::encode(buf))
}

/* Работа с браузерными вебсокетами (сойдёт) */

#[tauri::command]
async fn connect(
    app_handle: AppHandle,
    client_state: State<'_, TokioMutex<MaxClient>>,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.connect(app_handle).await
}

#[tauri::command]
async fn start_auth(
    client_state: State<'_, TokioMutex<MaxClient>>,
    phone: String,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.start_auth(phone).await
}

#[tauri::command]
async fn check_code(
    client_state: State<'_, TokioMutex<MaxClient>>,
    code: String,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.check_code(code).await
}

#[tauri::command]
async fn send_message(
    client_state: State<'_, TokioMutex<MaxClient>>,
    chat_id: String,
    text: String,
    args: Option<HashMap<String, serde_json::Value>>,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.send_message(chat_id, text, args).await
}

#[tauri::command]
async fn edit_message(
    client_state: State<'_, TokioMutex<MaxClient>>,
    chat_id: String,
    message_id: String,
    text: String,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.edit_message(chat_id, message_id, text).await
}

#[tauri::command]
async fn delete_message(
    client_state: State<'_, TokioMutex<MaxClient>>,
    chat_id: String,
    message_ids: Vec<String>,
    for_me: bool,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.delete_message(chat_id, message_ids, for_me).await
}

#[tauri::command]
async fn fetch_history(
    client_state: State<'_, TokioMutex<MaxClient>>,
    chat_id: String,
    from_time: Option<u64>,
    forward: Option<u32>,
    backward: Option<u32>,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client
        .fetch_history(chat_id, from_time, forward, backward)
        .await
}

#[tauri::command]
async fn fetch_contacts(
    client_state: State<'_, TokioMutex<MaxClient>>,
    contact_ids: Vec<String>,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.fetch_contacts(contact_ids).await
}

#[tauri::command]
async fn contact_info(
    client_state: State<'_, TokioMutex<MaxClient>>,
    contact_ids: Vec<String>,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.contact_info(contact_ids).await
}

#[tauri::command]
async fn fetch_photos(
    client_state: State<'_, TokioMutex<MaxClient>>,
    contact_ids: Vec<String>,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.fetch_photos(contact_ids).await
}

#[tauri::command]
async fn search(
    client_state: State<'_, TokioMutex<MaxClient>>,
    query: String,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.search(query).await
}

#[tauri::command]
async fn create_group(
    client_state: State<'_, TokioMutex<MaxClient>>,
    name: String,
    participant_ids: Vec<String>,
    notify: bool,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.create_group(name, participant_ids, notify).await
}

#[tauri::command]
async fn change_profile(
    client_state: State<'_, TokioMutex<MaxClient>>,
    first_name: String,
    last_name: Option<String>,
    description: Option<String>,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client
        .change_profile(first_name, last_name, description)
        .await
}

#[tauri::command]
async fn resolve_channel_by_name(
    client_state: State<'_, TokioMutex<MaxClient>>,
    name: String,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.resolve_channel_by_name(name).await
}

#[tauri::command]
async fn pin_message(
    client_state: State<'_, TokioMutex<MaxClient>>,
    chat_id: String,
    message_id: String,
    notify_pin: bool,
) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.pin_message(chat_id, message_id, notify_pin).await
}

#[tauri::command]
async fn sync(client_state: State<'_, TokioMutex<MaxClient>>) -> Result<Response, String> {
    let mut client = client_state.lock().await;
    client.sync().await
}

/*fn download_update(app: tauri::AppHandle) -> tauri_plugin_android_fs::Result<()> {
    let storage = app.android_fs().private_storage();

    // Get the absolute path.
    // Apps can fully manage entries within those directories with 'std::fs'.
    let cache_dir_path: std::path::PathBuf = storage.resolve_path(PrivateDir::Cache)?;
    let data_dir_path: std::path::PathBuf = storage.resolve_path(PrivateDir::Data)?;

    Ok(())
}*/


#[tauri::command]
async fn fetch_releases() -> Result<Value, String> {
    let url = format!("https://api.github.com/repos/me0wkie/maxplus/releases");

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "Tauri-App")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<Value>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(resp)
}





#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared = SharedConn::new();
    let client = TokioMutex::new(MaxClient::new());

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .manage(shared)
        .manage(client)
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_stronghold::Builder::new(|_| todo!()).build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            rawConnect,
            send_and_get,
            connect,
            start_auth,
            check_code,
            send_message,
            edit_message,
            delete_message,
            fetch_history,
            fetch_contacts,
            contact_info,
            fetch_photos,
            search,
            create_group,
            change_profile,
            resolve_channel_by_name,
            pin_message,
            sync,
            fetch_releases
        ]);

    // Только для Android/iOS:
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        builder = builder
            .plugin(tauri_plugin_biometric::init())
            .plugin(tauri_plugin_barcode_scanner::init())
            .plugin(tauri_plugin_keystore::init())
            .plugin(tauri_plugin_android_fs::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
