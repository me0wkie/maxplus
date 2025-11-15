// Включаем логгирование
use log::{debug, error, info, trace, warn};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex}, // std::sync::Mutex здесь безопасен, т.к. он внутри tokio::sync::Mutex
};

use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use http::header::HeaderValue;
use serde_json::json;
use tokio::{
    sync::{broadcast, oneshot, Mutex as TokioMutex},
    time::timeout,
};
use yawc::{CompressionLevel, FrameView, HttpRequestBuilder, Options, WebSocket};
use uuid::Uuid;

// Подключаем наши модули
pub mod api;
pub mod constants;
pub mod errors;
pub mod models;
pub mod navigation;

use constants::Constants;
use errors::{ClientResult, Error};
use models::{Request, Response};

/// Внутреннее состояние клиента, защищенное Asynk Mutex
struct ClientState {
    writer: Option<SplitSink<WebSocket, FrameView>>,
    seq: u64,
    temp_token: Option<String>,
    token: Option<String>,
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<ClientResult<Response>>>>>,
    shutdown_tx: Option<broadcast::Sender<()>>,
    
    user_id: Option<u64>,
    action_id: u64,
    session_id: String,
    current_screen: String,
}

/// MaxClient - наш главный клиентский API.
/// Он потокобезопасен и может быть клонирован (Clone) для
/// использования в разных задачах (например, в UI и в ping-task).
#[derive(Clone)]
pub struct MaxClient {
    state: Arc<TokioMutex<ClientState>>,
}

impl MaxClient {
    pub fn new() -> Self {
        let (shutdown_tx, _) = broadcast::channel(1);
        MaxClient {
            state: Arc::new(TokioMutex::new(ClientState {
                writer: None,
                seq: 0,
                temp_token: None,
                token: None,
                pending: Arc::new(Mutex::new(HashMap::new())),
                shutdown_tx: Some(shutdown_tx),
                
                user_id: None,
                action_id: 0,
                session_id: Uuid::new_v4().to_string().replace("-", ""),
                current_screen: "chats_list_tab".to_string(),
            })),
        }
    }

    /// Проверяет, активно ли соединение
    pub async fn is_connected(&self) -> bool {
        self.state.lock().await.writer.is_some()
    }
    
    pub async fn set_user_id(&self, user_id: u64) {
        self.state.lock().await.user_id = Some(user_id);
    }
    
    pub async fn get_token(&self) -> Option<String> {
        self.state.lock().await.token.clone()
    }

    /// Основная функция подключения
    pub async fn connect(&self, device_id: String) -> ClientResult<Response> {
        info!("Подключение к WebSocket...");

        let req_builder = HttpRequestBuilder::new()
            .header("Origin", HeaderValue::from_static(Constants::ORIGIN_HEADER))
            .header("User-Agent", HeaderValue::from_static(Constants::USER_AGENT));

        let ws = WebSocket::connect(Constants::WEBSOCKET_URI.parse().unwrap())
            .with_options(Options::default().with_compression_level(CompressionLevel::fast()))
            .with_request(req_builder)
            .await
            .map_err(|e| Error::ConnectionFailed(e.to_string()))?;

        info!("WebSocket подключен. Разделение потоков...");
        let (writer, reader) = ws.split();

        // Получаем необходимые клоны для задач
        let state_clone = Arc::clone(&self.state);
        let mut state_lock = state_clone.lock().await;

        let pending_clone = Arc::clone(&state_lock.pending);
        let (shutdown_tx, shutdown_rx_read) = broadcast::channel(1);
        let shutdown_rx_ping = shutdown_tx.subscribe();

        // Запускаем задачу чтения
        tokio::spawn(Self::read_task(reader, pending_clone, shutdown_rx_read));
        debug!("Задача чтения (read_task) запущена.");

        // Запускаем задачу пинга
        let ping_client = self.clone();
        tokio::spawn(Self::ping_task(ping_client, shutdown_rx_ping));
        debug!("Задача пинга (ping_task) запущена.");

        // Сохраняем writer и shutdown_tx в состояние
        state_lock.writer = Some(writer);
        state_lock.shutdown_tx = Some(shutdown_tx);

        // Отпускаем лок перед .await
        drop(state_lock);

        // --- Отправка Handshake ---
        debug!("Отправка Handshake с deviceId: {}", device_id);
        let user_agent = json!({
            "deviceType": "WEB", "locale": "ru", "deviceLocale": "ru", "osVersion": "Linux",
            "deviceName": "Chrome", "headerUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36", "appVersion": "25.8.5",
            "screen": "1080x1920 1.0x", "timezone": "Europe/Moscow",
        });

        let handshake_payload = json!({
            "deviceId": device_id,
            "userAgent": user_agent,
        });

        // Отправляем и ждем handshake
        self.send_and_wait(6, handshake_payload, 0).await
    }

    /// Отправляет фрейм и не ждет ответа (fire-and-forget)
    async fn send_frame(&self, request: Request) -> ClientResult<()> {
        let mut state = self.state.lock().await;
        if let Some(writer) = &mut state.writer {
            let json = serde_json::to_string(&request)?;
            trace!("Отправка (seq: {}): {}", request.seq, json);
            writer
                .send(FrameView::text(json))
                .await
                .map_err(|e| Error::SendFailed(e.to_string()))
        } else {
            error!("Попытка отправки без подключения (seq: {})", request.seq);
            Err(Error::NotConnected)
        }
    }

    /// Главная функция: отправляет запрос, регистрирует ожидание и ждет ответа
    pub async fn send_and_wait(
        &self,
        opcode: u16,
        payload: serde_json::Value,
        cmd: u8,
    ) -> ClientResult<Response> {
        let (tx, rx) = oneshot::channel();
        
        let request = {
            let mut state = self.state.lock().await;
            state.seq += 1;
            let current_seq = state.seq;

            state.pending.lock().unwrap().insert(current_seq, tx);
            
            Request {
                ver: 11,
                cmd,
                seq: current_seq,
                opcode,
                payload,
            }
        };

        // Отправляем фрейм (лок уже отпущен)
        self.send_frame(request.clone()).await?;

        // Асинхронно ждем ответа с таймаутом
        match timeout(Constants::DEFAULT_TIMEOUT, rx).await {
            Ok(Ok(Ok(response))) => {
                // Успешный ответ
                trace!("Получен ответ для seq: {}", response.seq);
                // Проверяем, не вернуло ли API ошибку
                if response.payload.get("error").is_some() {
                    Err(Error::ApiResponse(response.payload))
                } else {
                    Ok(response)
                }
            }
            Ok(Ok(Err(e))) => Err(e), // Ошибка пришла из read_task
            Ok(Err(e)) => {
                // oneshot::Sender был дропнут (вероятно, read_task упала)
                error!("Ошибка получения ответа (канал закрыт) для seq: {}", request.seq);
                Err(e.into())
            }
            Err(_) => {
                warn!("Таймаут запроса для seq: {}", request.seq);
                // Удаляем зависший sender
                self.state.lock().await.pending.lock().unwrap().remove(&request.seq);
                Err(Error::RequestTimeout(Constants::DEFAULT_TIMEOUT))
            }
        }
    }
    
    async fn read_task(
        mut reader: SplitStream<WebSocket>,
        pending: Arc<Mutex<HashMap<u64, oneshot::Sender<ClientResult<Response>>>>>,
        mut shutdown_rx: broadcast::Receiver<()>,
    ) {
        info!("Read task started");
        loop {
            tokio::select! {
                frame_result = reader.next() => {
                    match frame_result {
                        Some(frame) => {
                            let body_bytes = &frame.payload;
                            let body_str = String::from_utf8_lossy(body_bytes);
                            trace!("Получено сообщение: {}", body_str);

                            match serde_json::from_slice::<Response>(body_bytes) {
                                Ok(resp) => {
                                    let seq = resp.seq; // <--- Сохраняем seq (u64) здесь
                                    if let Some(sender) = pending.lock().unwrap().remove(&seq) { // <--- Используем seq
                                        if let Err(_) = sender.send(Ok(resp)) { // <-- resp ПЕРЕМЕЩЕН здесь
                                            warn!("Не удалось отправить ответ (seq: {}) ...", seq); // <--- Используем сохраненный seq
                                        }
                                    } else {
                                        debug!("Получено незапрошенное сообщение (opcode: {}): {:?}", resp.opcode, resp.payload);
                                    }
                                }
                                Err(e) => {
                                    error!("Ошибка парсинга JSON: {} | Тело: {}", e, body_str);
                                }
                            }
                        }
                        None => {
                            info!("WebSocket соединение закрыто (reader.next() == None)");
                            break;
                        }
                    }
                }
                _ = shutdown_rx.recv() => {
                    info!("Получен сигнал завершения для read_task.");
                    break;
                }
            }
        }
        info!("Read task finished");
        
        let mut pending_lock = pending.lock().unwrap();
        for (_, sender) in pending_lock.drain() {
            let _ = sender.send(Err(Error::NotConnected));
        }
    }
    
    async fn ping_task(
        client: MaxClient,
        mut shutdown_rx: broadcast::Receiver<()>,
    ) {
        info!("Ping task started");
        let mut interval = tokio::time::interval(Constants::PING_INTERVAL);

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    debug!("Отправка Ping...");
                    match client.send_and_wait(1, json!({ "interactive": true }), 0).await {
                        Ok(_) => {
                            info!("Pong получен");
                        }
                        Err(e) => {
                            error!("Ошибка Ping: {}. Остановка ping_task.", e);
                            break;
                        }
                    }
                }
                _ = shutdown_rx.recv() => {
                    info!("Получен сигнал завершения для ping_task.");
                    break;
                }
            }
        }
        info!("Ping task finished");
    }
    
    pub async fn set_token(&self, token: String) {
        self.state.lock().await.token = Some(token);
    }
    
    pub async fn set_temp_token(&self, token: String) {
        self.state.lock().await.temp_token = Some(token);
    }
}
