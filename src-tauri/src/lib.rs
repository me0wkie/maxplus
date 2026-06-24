mod commands;
mod files;
mod secure;
mod state;
mod stores;
mod video;

use crate::secure::{CryptoManager, EncType};
use state::AppState;
use std::sync::Arc;
use stores::setup_custom_stores;
use tauri::{Emitter, Manager};
use tokio::sync::RwLock;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    video::start_video_proxy();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build());

    #[cfg(any(target_os = "android", target_os = "ios"))]
    let builder = builder
        .plugin(tauri_plugin_biometric::init())
        .plugin(tauri_plugin_barcode_scanner::init());

    #[cfg(any(target_os = "android"))]
    let builder = builder.plugin(tauri_plugin_android_fs::init());

    builder
        .setup(|app| {
            let store_names = &["users.bin", "chats.bin"]; // TODO будут инициализироваться при init_user()

            let stores =
                setup_custom_stores(app.handle(), store_names).expect("failed to init stores");

            let crypto = CryptoManager::init(EncType::None, "system", None);

            let (client, mut event_stream) = tauri::async_runtime::block_on(async {
                let client = rumax::MaxClient::new();
                let stream = client.subscribe();
                (client, stream)
            });

            app.manage(AppState {
                crypto: Arc::new(RwLock::new(crypto)),
                client,
                stores,
            });

            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                while let Ok(msg) = event_stream.recv().await {
                    let _ = handle.emit("max", msg);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_video_secret,
            commands::init,
            commands::start_auth,
            commands::check_code,
            commands::check_password,
            commands::sync_client,
            commands::send_message,
            commands::add_reaction,
            commands::remove_reaction,
            commands::pin_message,
            commands::delete_message,
            commands::set_token,
            commands::fetch_contacts,
            commands::fetch_history,
            commands::get_by_phone,
            commands::add_contact,
            commands::remove_contact,
            commands::get_video_by_id,
            commands::get_file_by_id,
            commands::read_message,
            commands::search_public,
            commands::search_msg,
            commands::get_chats,
            commands::get_sessions,
            commands::close_all_sessions,
            commands::get_photo_upload,
            commands::get_video_upload,
            commands::get_file_upload,
            commands::update_profile,
            commands::create_group,
            commands::resolve_channel_by_name,
            commands::join_channel,
            commands::leave_channel,
            commands::leave_group,
            commands::get_calls,
            commands::call,
            files::download,
            files::upload,
            files::pick,
            stores::get,
            stores::set,
            stores::delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
