mod commands;
mod state;

use serde_json::Value;
use rumax::{MaxClient};
use tauri::{Emitter};

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
    let client = MaxClient::new();
    let mut event_stream = client.subscribe();
    
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .manage(state::AppState {
            client,
        })
        .setup(|app| {
            let handle = app.handle().clone();
            
            tokio::spawn(async move {
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
            commands::set_token,
            commands::fetch_contacts,
            commands::fetch_history,
            commands::get_by_phone,
            commands::add_contact,
            fetch_releases
        ]);
    
    // Только для Android/iOS:
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
