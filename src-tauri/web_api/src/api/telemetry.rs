// src/api/telemetry.rs

use crate::{
    navigation, MaxClient,
};
use chrono::Utc;
use log::{debug, error, info, warn};
use rand::{
    distributions::{Distribution, WeightedIndex},
    Rng,
};
use serde::Serialize;
use std::time::Duration;
use tokio::time::sleep;

// --- Структуры для Payload ---

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct NavigationEventParams {
    action_id: u64,
    screen_to: u32,
    screen_from: u32,
    source_id: u32,
    session_id: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct NavigationEventPayload {
    event: &'static str,
    time: i64, // JS timestamp (ms)
    user_id: u64,
    r#type: String,
    params: NavigationEventParams,
}

#[derive(Serialize, Debug)]
struct NavigationPayload {
    events: Vec<NavigationEventPayload>,
}

// --- Реализация Telemetry ---

impl MaxClient {
    /// Приватный метод для отправки ивентов навигации (Opcode 5)
    async fn send_navigation_event_internal(&self, events: Vec<NavigationEventPayload>) {
        let payload = NavigationPayload { events };
        // Оборачиваем в json!(), чтобы соответствовать send_and_wait
        let payload_json = match serde_json::to_value(payload) {
            Ok(val) => val,
            Err(e) => {
                error!("Ошибка сериализации NavigationPayload: {}", e);
                return;
            }
        };

        match self.send_and_wait(5, payload_json, 0).await {
            Ok(data) => {
                if let Some(error) = data.payload.get("error") {
                    error!("API телеметрии вернуло ошибку: {}", error);
                } else {
                    debug!("Событие телеметрии успешно отправлено");
                }
            }
            Err(e) => {
                warn!("Ошибка отправки события телеметрии: {}", e);
            }
        }
    }

    async fn send_cold_start_internal(&self) {
        let mut state = self.state.lock().await;
        
        // Было: let Some(user_id) = &state.user_id else { ... };
        // Стало (с .clone()):
        let Some(user_id) = state.user_id.clone() else {
            error!("Не могу отправить COLD_START, user_id не установлен");
            return;
        };

        let params = NavigationEventParams {
            action_id: state.action_id,
            screen_to: navigation::get_screen_id("chats_list_tab"),
            screen_from: 1, 
            source_id: 1,   
            session_id: state.session_id.clone(), // Также клонируем session_id
        };

        let payload = NavigationEventPayload {
            event: "COLD_START",
            time: Utc::now().timestamp_millis(),
            r#type: "NAV".to_string(),
            user_id: user_id, // `user_id` теперь `String`, а не `&String`
            params,
        };

        state.action_id += 1; // <-- Теперь это безопасно
        drop(state); // Отпускаем лок перед .await

        self.send_navigation_event_internal(vec![payload]).await;
    }

    /// Отправляет случайное событие "NAV"
    async fn send_random_navigation_internal(&self) {
        // (Этот код был переписан в прошлый раз для исправления E0502)
        let (payload, screen_to_name) = {
            // --- Блокировка начинается ---
            let mut state = self.state.lock().await;

            // .clone() просто скопирует u64 (это очень быстрая операция)
            let Some(user_id) = state.user_id.clone() else {
                error!("Не могу отправить NAV, user_id не установлен");
                return; // Выходим из функции, Mutex автоматически разблокируется
            };

            let session_id = state.session_id.clone();
            let screen_from_name = state.current_screen.clone();

            state.action_id += 1;
            let action_id = state.action_id;

            let screen_to_name = navigation::get_random_navigation(&screen_from_name);
            let screen_from_id = navigation::get_screen_id(&screen_from_name);
            let screen_to_id = navigation::get_screen_id(screen_to_name);

            state.current_screen = screen_to_name.to_string();

            // Собираем параметры
            let params = NavigationEventParams {
                action_id, 
                screen_from: screen_from_id,
                screen_to: screen_to_id,
                source_id: 1, 
                session_id,  
            };

            // Собираем итоговый payload
            let payload = NavigationEventPayload {
                event: "NAV",
                r#type: "NAV".to_string(),
                time: Utc::now().timestamp_millis(),
                user_id: user_id, // <-- Теперь это u64
                params,
            };
            
            info!("Sent nav {:?}", payload);
            
            // Возвращаем payload и имя экрана из блока
            (payload, screen_to_name.to_string())
            // --- Блокировка автоматически снимается здесь ---
        };
        
        // --- Вызов .await происходит ПОСЛЕ снятия блокировки ---
        debug!("Телеметрия: переход на экран {}", screen_to_name);
        self.send_navigation_event_internal(vec![payload]).await;
    }

    /// Вычисляет случайное время для сна
    fn get_random_sleep_time(&self) -> Duration {
        // (min, max) в секундах
        let sleep_options: [(u64, u64); 5] = [
            (1000, 3000),
            (300, 1000),
            (60, 300),
            (5, 60),
            (5, 20),
        ];
        let weights: [f64; 5] = [0.05, 0.10, 0.15, 0.20, 0.50];
        
        let dist = WeightedIndex::new(&weights).expect("Неверные веса для get_random_sleep_time");
        let mut rng = rand::thread_rng();
        
        let (low, high) = sleep_options[dist.sample(&mut rng)];
        let sleep_secs = rng.gen_range(low..=high);
        
        Duration::from_secs(sleep_secs)
    }

    /// Запускает фоновую задачу (task) для отправки телеметрии
    /// Эту функцию нужно вызвать ОДИН РАЗ после успешного логина
    pub async fn spawn_telemetry_task(&self) {
        let client = self.clone(); // Клонируем Arc<MaxClient>
        
        // Получаем приемник сигнала о завершении
        let mut shutdown_rx = match self.state.lock().await.shutdown_tx.as_ref() {
            Some(tx) => tx.subscribe(),
            None => {
                error!("Не могу запустить телеметрию: shutdown_tx не инициализирован");
                return;
            }
        };

        tokio::spawn(async move {
            info!("Задача телеметрии ожидает подключения...");
            
            // Ждем, пока клиент подключится и получит user_id
            loop {
                let has_user_id = client.state.lock().await.user_id.is_some();
                if client.is_connected().await && has_user_id {
                    break;
                }
                tokio::select! {
                    _ = sleep(Duration::from_secs(1)) => {},
                    _ = shutdown_rx.recv() => {
                        info!("Задача телеметрии отменена (до старта)");
                        return;
                    }
                }
            }

            // 1. Отправляем COLD_START
            info!("Отправка COLD_START...");
            client.send_cold_start_internal().await;

            // 2. Запускаем цикл случайной навигации
            info!("Задача телеметрии запущена в фоновом режиме.");
            loop {
                let sleep_duration = client.get_random_sleep_time();
                debug!("Телеметрия: сон на {:?}", sleep_duration);

                tokio::select! {
                    // Ждем случайное время
                    _ = sleep(sleep_duration) => {
                        if !client.is_connected().await {
                            warn!("Телеметрия: клиент отключен, остановка цикла.");
                            break;
                        }
                        // Отправляем "NAV"
                        client.send_random_navigation_internal().await;
                    }
                    // Слушаем сигнал завершения
                    _ = shutdown_rx.recv() => {
                        info!("Телеметрия: получен сигнал завершения, остановка цикла.");
                        break;
                    }
                }
            }
            info!("Задача телеметрии завершена.");
        });
    }
}
