mod commands;
mod state;

use rumax::MaxClient;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_store::{Store, StoreBuilder};
use reqwest::header::{CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, RANGE};
use std::time::Duration;
use tiny_http::{Header, Response, Server};

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

type SerializeFn =
    fn(&HashMap<String, Value>) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>>;
type DeserializeFn =
    fn(&[u8]) -> Result<HashMap<String, Value>, Box<dyn std::error::Error + Send + Sync>>;

fn msgpack_serialize(
    cache: &HashMap<String, Value>,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    rmp_serde::to_vec(cache).map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)
}

fn msgpack_deserialize(
    bytes: &[u8],
) -> Result<HashMap<String, Value>, Box<dyn std::error::Error + Send + Sync>> {
    rmp_serde::from_slice(bytes)
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)
}

// ---------------------------

fn setup_custom_stores<R: Runtime>(
    app: &AppHandle<R>,
    store_names: &[&str],
) -> Result<(), Box<dyn std::error::Error>> {
    for name in store_names {
        let path = std::path::PathBuf::from(name);

        let _store: Arc<Store<R>> = StoreBuilder::new(app, path.clone())
            .serialize(msgpack_serialize as SerializeFn)
            .deserialize(msgpack_deserialize as DeserializeFn)
            .build()?;

        println!(
            "Initialized store: {} with MessagePack serialization.",
            name
        );
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let custom_stores = &["users.bin", "chats.bin"];

    thread::spawn(move || {
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap();

        let server = Server::http("127.0.0.1:11447").unwrap();

        for request in server.incoming_requests() {
            let raw_url = &request.url()[1..];
            let url = match urlencoding::decode(raw_url) {
                Ok(u) => u.into_owned(),
                Err(_) => continue,
            };

            let range_header = request
                .headers()
                .iter()
                .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("Range"))
                .map(|h| h.value.as_str().to_string());

            let mut rb = client.get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .header("Referer", "https://max.ru/");

            if let Some(ref r) = range_header {
                rb = rb.header(RANGE, r);
            }

            let res = match rb.send() {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("Ошибка запроса к источнику: {}", e);
                    let _ = request.respond(Response::from_string("Error").with_status_code(502));
                    continue;
                }
            };

            let status = res.status().as_u16();

            let content_length_val = res
                .headers()
                .get(CONTENT_LENGTH)
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<usize>().ok());

            let content_type = res
                .headers()
                .get(CONTENT_TYPE)
                .map(|h| h.to_str().unwrap_or("video/mp4"))
                .unwrap_or("video/mp4");

            let mut headers = vec![
                Header::from_bytes(&b"Content-Type"[..], content_type.as_bytes()).unwrap(),
                Header::from_bytes(&b"Access-Control-Allow-Origin"[..], b"*").unwrap(),
                Header::from_bytes(&b"Accept-Ranges"[..], b"bytes").unwrap(),
            ];

            if let Some(cl) = res.headers().get(CONTENT_LENGTH) {
                headers.push(Header::from_bytes(&b"Content-Length"[..], cl.as_bytes()).unwrap());
            }

            if let Some(cr) = res.headers().get(CONTENT_RANGE) {
                headers.push(Header::from_bytes(&b"Content-Range"[..], cr.as_bytes()).unwrap());
            }

            let response = Response::new(status.into(), headers, res, content_length_val, None);

            if let Err(e) = request.respond(response) {
                eprintln!("Ошибка отправки ответа: {}", e);
            }
        }
    });

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            setup_custom_stores(app.handle(), custom_stores)
                .expect("Failed to setup custom stores");

            let (client, mut event_stream) = tauri::async_runtime::block_on(async {
                let client = MaxClient::new();
                let stream = client.subscribe();
                (client, stream)
            });

            app.manage(state::AppState { client });

            let handle = app.handle().clone();

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
            commands::get_video_by_id,
            commands::get_file_by_id,
            commands::read_message,
            commands::public_search,
            commands::get_chats,
            commands::get_sessions,
            commands::close_all_sessions,
            commands::get_photo_upload,
            commands::get_video_upload,
            commands::get_file_upload,
            commands::upload_attachment,
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
