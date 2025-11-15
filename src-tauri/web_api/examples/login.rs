use rumax::MaxClient;
use std::io::{self, Write};
use std::fs;
use uuid::Uuid;
use log::{info, error, debug};
use std::sync::Arc;

const DEVICE_ID_FILE: &str = ".device.id";

/// Читает строку из консоли
fn read_line(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().unwrap();
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

/// Получает device_id из файла или создает новый
fn get_device_id() -> String {
    match fs::read_to_string(DEVICE_ID_FILE) {
        Ok(id) if !id.is_empty() => {
            info!("Используем существующий device_id из файла {}", DEVICE_ID_FILE);
            id
        },
        _ => {
            info!("Создаем новый device_id...");
            let new_id = Uuid::new_v4().to_string().replace("-", "");
            fs::write(DEVICE_ID_FILE, &new_id).expect("Не удалось записать .device.id");
            info!("Новый device_id сохранен в {}", DEVICE_ID_FILE);
            new_id
        }
    }
}

#[tokio::main]
async fn main() {
    // Инициализируем логгер.
    // Установите RUST_LOG=debug (или trace) для подробного вывода
    // RUST_LOG=info,max_client_lib=debug покажет info от примера и debug от библиотеки
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info,max_client_lib=debug")
    ).init();

    // 1. Создаем клиента
    // Arc не обязателен, если клиент используется только в main,
    // но это хорошая практика, т.к. клиент рассчитан на Clone
    let client = Arc::new(MaxClient::new());

    // 2. Получаем Device ID
    let device_id = get_device_id();

    // 3. Подключаемся
    info!("Подключение к WebSocket...");
    match client.connect(device_id).await {
        Ok(resp) => {
            info!("Handshake успешен!");
            debug!("Ответ Handshake: {:?}", resp.payload);
        }
        Err(e) => {
            error!("Ошибка подключения: {}", e);
            return;
        }
    }

    // --- Шаг 1: Запрос кода ---
    let phone = read_line("Введите номер телефона (+7...): ");
    info!("Отправляем запрос на номер {}", phone);
    
    match client.start_auth(phone).await {
        Ok(resp) => {
            info!("Запрос кода успешен.");
            debug!("Ответ start_auth: {:?}", resp.payload);
        }
        Err(e) => {
            error!("Ошибка запроса кода: {}", e);
            return;
        }
    }

    // --- Шаг 2: Ввод кода ---
    let code = read_line("Введите код из СМС/звонка: ");
    info!("Проверяем код...");

    match client.check_code(code).await {
        Ok(resp) => {
            info!("Код принят, логин успешен!");
            debug!("Ответ check_code: {:?}", resp.payload);
        }
        Err(e) => {
            error!("Ошибка проверки кода: {}", e);
            return;
        }
    }

    // --- Шаг 3: Синхронизация ---
    info!("Выполняем синхронизацию (sync)...");
    match client.sync().await {
        Ok(sync_resp) => {
            log::info!("Синхронизация успешна. {:?}", sync_resp.payload);
            
            let user_id = sync_resp.payload
                .get("profile")
                .and_then(|s| s.get("contact"))
                .and_then(|s| s.get("id"))
                .and_then(|id| id.as_u64());
                
            log::info!("test {:?}", user_id);

            if let Some(id) = user_id {
                log::info!("Установка user_id: {}", id);
                client.set_user_id(id).await;
                
                log::info!("Запуск фоновой задачи телеметрии...");
                client.spawn_telemetry_task().await;
            } else {
                log::warn!("Не удалось найти user_id в ответе sync. Телеметрия не запущена.");
            }
        }
        Err(e) => {
            log::error!("Ошибка sync: {}", e);
        }
    }

    info!("\n--- ЛОГИН УСПЕШНО ЗАВЕРШЕН ---");

    // --- Шаг 4: Отправка тестового сообщения ---
    let chat_id_str = read_line("Введите Chat ID для тестового сообщения: ");
    
    // Парсим (преобразуем) строку в u64
    let chat_id: u64 = match chat_id_str.parse() {
        Ok(num) => num,
        Err(_) => {
            error!("Это не похоже на число (u64). Выход.");
            return Ok(()); // Выходим из main
        }
    };
    
    let message = read_line("Введите текст сообщения: ");

    info!("Отправляем сообщение в чат {}...", chat_id);
    match client.send_message(chat_id, message, None).await {
        Ok(resp) => {
            info!("Сообщение успешно отправлено!");
            debug!("Ответ send_message: {:?}", resp.payload);
        }
        Err(e) => {
            error!("Ошибка отправки сообщения: {}", e);
            // не выходим, чтобы программа осталась жива
        }
    }

    info!("\nКлиент остается подключенным. Нажмите Enter для выхода.");
    read_line("");
    info!("Завершение работы...");
}
