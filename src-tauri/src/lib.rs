mod commands;
mod state;

use serde_json::Value;
use rumax::MaxClient;
use tauri::{AppHandle, Runtime, Emitter, Manager}; // Добавлен Manager
use tauri_plugin_store::{Store, StoreBuilder};
use std::collections::HashMap;
use std::sync::Arc;

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

// --- MessagePack (rmp-serde) Adapters ---

type SerializeFn = fn(&HashMap<String, Value>) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>>;
type DeserializeFn = fn(&[u8]) -> Result<HashMap<String, Value>, Box<dyn std::error::Error + Send + Sync>>;

fn msgpack_serialize(
    cache: &HashMap<String, Value>,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    rmp_serde::to_vec(cache).map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)
}

fn msgpack_deserialize(
    bytes: &[u8],
) -> Result<HashMap<String, Value>, Box<dyn std::error::Error + Send + Sync>> {
    rmp_serde::from_slice(bytes).map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)
}

// ---------------------------

fn setup_custom_stores<R: Runtime>(
    app: &AppHandle<R>, 
    store_names: &[&str]
) -> Result<(), Box<dyn std::error::Error>> {
    
    for name in store_names {
        let path = std::path::PathBuf::from(name);
        
        let _store: Arc<Store<R>> = StoreBuilder::new(app, path.clone())
            .serialize(msgpack_serialize as SerializeFn)
            .deserialize(msgpack_deserialize as DeserializeFn)
            .build()?;
        
        println!("Initialized store: {} with MessagePack serialization.", name);
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // УБРАЛИ block_on отсюда. Инициализация теперь внутри builder.setup

    let custom_stores = &["users.bin", "chats.bin"];
    
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        // .manage(state::AppState { ... }) // УБРАЛИ отсюда, перенесли в setup
        .setup(|app| {
            // 1. Настройка хранилищ
            setup_custom_stores(app.handle(), custom_stores)
                .expect("Failed to setup custom stores");
            
            // 2. Инициализация MaxClient внутри контекста Tauri
            // Теперь block_on безопасен, так как Tauri уже подготовил окружение
            let (client, mut event_stream) = tauri::async_runtime::block_on(async {
                let client = MaxClient::new();
                let stream = client.subscribe();
                (client, stream)
            });

            // 3. Регистрируем состояние (AppState)
            // Важно сделать это здесь, до того как фронтенд начнет слать команды
            app.manage(state::AppState {
                client,
            });

            let handle = app.handle().clone();
            
            // 4. Запускаем слушатель событий в фоне
            tauri::async_runtime::spawn(async move {
                while let Ok(msg) = event_stream.recv().await {
                    if let Err(e) = handle.emit("max", msg) {
                        eprintln!("Failed to emit event: {}", e);
                    }
                }
            });
            
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_stronghold::Builder::new(|_| todo!()).build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::init,
            commands::start_auth,
            commands::check_code,
            commands::sync_client,
            commands::send_message,
            commands::add_reaction,
            commands::remove_reaction,
            commands::set_token,
            commands::fetch_contacts,
            commands::fetch_history,
            commands::get_by_phone,
            commands::add_contact,
            commands::remove_contact,
            fetch_releases
        ]);
    
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        builder = builder
            .plugin(tauri_plugin_biometric::init())
            .plugin(tauri_plugin_barcode_scanner::init())
            .plugin(tauri_plugin_android_fs::init());
    }
    
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
