use http::header::HeaderValue;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, sync::Arc, time::Duration};
use tauri::{AppHandle, Wry};
use tokio::{sync::oneshot, time::timeout};
use yawc::{CompressionLevel, FrameView, HttpRequestBuilder, Options, WebSocket};
//use once_cell::sync::Lazy;
use chrono::Utc;
use futures_util::{
    //stream::{SplitSink, SplitStream},
    SinkExt,
    StreamExt,
};
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Request {
    pub ver: u8,
    #[serde(default)]
    pub cmd: u8,
    pub seq: u64,
    pub opcode: u16,
    pub payload: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Response {
    ver: u8,
    cmd: u8,
    seq: u64,
    opcode: u16,
    payload: serde_json::Value,
}

// Константы
pub struct Constants;
impl Constants {
    //pub const PHONE_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"^\+?\d{10,15}$").unwrap());
    pub const WEBSOCKET_URI: &'static str = "wss://ws-api.oneme.ru/websocket";
    pub const ORIGIN_HEADER: &'static str = "https://web.max.ru";
    pub const DEFAULT_TIMEOUT: Duration = Duration::from_millis(10000);
}

pub struct MaxClient {
    ws: Option<WebSocket>,
    seq: u64,
    temp_token: Option<String>,
    token: Option<String>,
    pending: Arc<std::sync::Mutex<HashMap<u64, oneshot::Sender<Response>>>>,
}

impl MaxClient {
    pub fn new() -> Self {
        MaxClient {
            ws: None,
            seq: 0,
            temp_token: None,
            token: None,
            pending: Arc::new(std::sync::Mutex::new(HashMap::new())),
        }
    }

    pub fn is_connected(&self) -> bool {
        self.ws.is_some()
    }

    /* Сука тупой ChatGPT и Gemini Pro не могли эту хуйню написать, потратил блять 30 лет */
    pub async fn connect(&mut self, app_handle: AppHandle<Wry>) -> Result<Response, String> {
        println!("1");
        let store = app_handle
            .store("deviceIds.json")
            .map_err(|e| e.to_string())?;

        println!("2");

        println!("3");
        store.delete("default");
        let device_id = match store.get("default") {
            Some(value) => value.as_str().unwrap().to_string(),
            None => {
                let new_uuid = Uuid::new_v4().to_string().replace("-", "");
                store.set("default".to_string(), json!(new_uuid));
                store.save().map_err(|e| e.to_string())?;
                new_uuid
            }
        };

        println!("4 {}", Constants::WEBSOCKET_URI);
        //let ws_url = Url::parse(Constants::WEBSOCKET_URI).map_err(|e| e.to_string())?;
        /*let request = TungsteniteRequest::builder()
        .method("GET")
        .header("Host", "ws-api.oneme.ru")
        .header("Origin", Constants::ORIGIN_HEADER)
        .header("Connection", "keep-alive, Upgrade")
        .header("Accept-Encoding", "gzip, deflate, br, zstd")*/
        //.header("Accept", "*/*")
        /*.header("Cache-Control", "no-cache")
        .header("Upgrade", "websocket")
        .header("Pragma", "no-cache")
        .header("Sec-Fetch-Dest", "empty")
        .header("Sec-Fetch-Mode", "websocket")
        .header("Sec-Fetch-Site", "cross-site")
        .header("Sec-WebSocket-Extensions", "permessage-deflate")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", generate_key())
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0")
        .uri(Constants::WEBSOCKET_URI)
        .body(()).map_err(|e| e.to_string())?;

        let (ws_stream, _) = connect_async(request).await.map_err(|e| e.to_string())?;

        // Разделяем поток на чтение и запись
        let (sender, mut reader) = ws_stream.split();
        self.ws_sender = Some(sender);

        let pending_clone = self.pending.clone();
        let app_handle_clone = app_handle.clone();*/
        let req_builder = HttpRequestBuilder::new()
            .header("Origin", HeaderValue::from_static(Constants::ORIGIN_HEADER))
            .header(
                "User-Agent",
                HeaderValue::from_static(
                    "Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0",
                ),
            );

        let ws = WebSocket::connect(Constants::WEBSOCKET_URI.parse().unwrap())
            .with_options(Options::default().with_compression_level(CompressionLevel::fast()))
            .with_request(req_builder)
            .await
            .map_err(|e| e.to_string())?;

        self.ws = Some(ws);

        println!("deviceId {}", device_id);

        let user_agent = json!({
            "deviceType": "WEB", "locale": "ru", "deviceLocale": "ru", "osVersion": "Linux",
            "deviceName": "Chrome", "headerUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36", "appVersion": "25.8.5",
            "screen": "1080x1920 1.0x", "timezone": "Europe/Moscow",
        });

        let handshake_payload = json!({
            "deviceId": device_id,
            "userAgent": user_agent,
        });

        self.send_and_wait(6, handshake_payload, 0).await
    }

    pub async fn send_and_wait(
        &mut self,
        opcode: u16,
        payload: serde_json::Value,
        cmd: u8,
    ) -> Result<Response, String> {
        self.seq += 1;
        let current_seq = self.seq;

        let request = Request {
            ver: 11,
            cmd,
            seq: current_seq,
            opcode,
            payload,
        };

        if let Some(ws) = &mut self.ws {
            let json = serde_json::to_string(&request).unwrap();
            let send_res = ws.send(FrameView::text(json)).await;
            if let Err(e) = send_res {
                eprintln!("Ошибка при send: {:?}", e);
                return Err("send failed".to_string());
            }

            if let Some(frame) = ws.next().await {
                let body_bytes = &frame.payload;
                let body_str = String::from_utf8_lossy(body_bytes);

                println!("получено: {}", body_str);

                // распарсить JSON
                let resp: Response = serde_json::from_slice(body_bytes)
                    .map_err(|e| format!("JSON parse error: {}", e))?;
                return Ok(resp);
            } else {
                // ws.next().await вернул None — соединение закрыто / нет данных
                return Err("Disconnected".to_string());
            }
        } else {
            return Err("Unitialized".to_string());
        }

        return Err("None".to_string());
    }

    pub async fn start_auth(&mut self, phone: String) -> Result<Response, String> {
        if !self.is_connected() {
            return Err("WebSocket not connected. Call connect() first.".to_string());
        }
        let payload = json!({ "phone": phone, "type": "START_AUTH", "language": "ru" });
        let resp = self.send_and_wait(17, payload, 0).await?;
        self.temp_token = resp
            .payload
            .get("token")
            .and_then(|t| t.as_str())
            .map(|s| s.to_string());
        Ok(resp)
    }

    pub async fn check_code(&mut self, code: String) -> Result<Response, String> {
        let token = self.temp_token.as_ref().ok_or("No temporary token found")?;
        let payload = json!({ "token": token, "verifyCode": code, "authTokenType": "CHECK_CODE" });
        let resp = self.send_and_wait(18, payload, 0).await?;
        self.token = resp
            .payload
            .get("tokenAttrs")
            .and_then(|t| t.get("LOGIN"))
            .and_then(|l| l.get("token"))
            .and_then(|t| t.as_str())
            .map(|s| s.to_string());
        Ok(resp)
    }

    pub async fn send_message(
        &mut self,
        chat_id: String,
        text: String,
        args: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<Response, String> {
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
        self.send_and_wait(64, payload, 0).await
    }

    pub async fn edit_message(
        &mut self,
        chat_id: String,
        message_id: String,
        text: String,
    ) -> Result<Response, String> {
        let payload = json!({ "chatId": chat_id, "messageId": message_id, "text": text, "elements": json!([]), "attaches": json!([]) });
        self.send_and_wait(67, payload, 0).await
    }

    pub async fn delete_message(
        &mut self,
        chat_id: String,
        message_ids: Vec<String>,
        for_me: bool,
    ) -> Result<Response, String> {
        let payload = json!({ "chatId": chat_id, "messageIds": message_ids, "forMe": for_me });
        let resp = self.send_and_wait(66, payload, 0).await?;
        if resp.payload.get("error").is_none() {
            Ok(resp)
        } else {
            Err(format!("Delete message failed: {:?}", resp.payload))
        }
    }

    pub async fn fetch_history(
        &mut self,
        chat_id: String,
        from_time: Option<u64>,
        forward: Option<u32>,
        backward: Option<u32>,
    ) -> Result<Response, String> {
        let from_time = from_time.unwrap_or(Utc::now().timestamp_millis() as u64);
        let forward = forward.unwrap_or(0);
        let backward = backward.unwrap_or(40);
        let payload = json!({ "chatId": chat_id, "from": from_time, "forward": forward, "backward": backward, "getMessages": true });
        self.send_and_wait(49, payload, 0).await
    }

    pub async fn fetch_contacts(&mut self, contact_ids: Vec<String>) -> Result<Response, String> {
        let payload = json!({ "contact_ids": contact_ids });
        self.send_and_wait(49, payload, 0).await
    }

    pub async fn contact_info(&mut self, contact_ids: Vec<String>) -> Result<Response, String> {
        let payload = json!({ "contactIds": contact_ids });
        self.send_and_wait(32, payload, 0).await
    }

    pub async fn fetch_photos(&mut self, contact_ids: Vec<String>) -> Result<Response, String> {
        let payload = json!({ "contact_ids": contact_ids });
        self.send_and_wait(39, payload, 0).await
    }

    pub async fn search(&mut self, query: String) -> Result<Response, String> {
        let payload = json!({ "query": query, "count": 5, "type": "ALL" });
        self.send_and_wait(60, payload, 0).await
    }

    pub async fn create_group(
        &mut self,
        name: String,
        participant_ids: Vec<String>,
        notify: bool,
    ) -> Result<Response, String> {
        let payload = json!({
            "message": {
                "cid": Utc::now().timestamp_millis(),
                "attaches": [{
                    "_type": "CONTROL", "event": "new", "chatType": "CHAT", "title": name, "userIds": participant_ids
                }]
            },
            "notify": notify
        });
        self.send_and_wait(64, payload, 0).await
    }

    pub async fn change_profile(
        &mut self,
        first_name: String,
        last_name: Option<String>,
        description: Option<String>,
    ) -> Result<Response, String> {
        let payload =
            json!({ "firstName": first_name, "lastName": last_name, "description": description });
        self.send_and_wait(16, payload, 0).await
    }

    pub async fn resolve_channel_by_name(&mut self, name: String) -> Result<Response, String> {
        let payload = json!({ "link": format!("https://max.ru/{}", name) });
        self.send_and_wait(89, payload, 0).await
    }

    pub async fn pin_message(
        &mut self,
        chat_id: String,
        message_id: String,
        notify_pin: bool,
    ) -> Result<Response, String> {
        let payload =
            json!({ "chatId": chat_id, "notifyPin": notify_pin, "pinMessageId": message_id });
        self.send_and_wait(55, payload, 0).await
    }

    pub async fn sync(&mut self) -> Result<Response, String> {
        let token = self.token.as_ref().ok_or("No token set")?;
        let payload = json!({
            "interactive": true, "token": token,
            "chatsSync": 0, "contactsSync": 0, "presenceSync": 0, "draftsSync": 0, "chatsCount": 40,
        });
        self.send_and_wait(19, payload, 0).await
    }
}
