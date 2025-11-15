use rumax::{MaxClient, models::Response};
use std::io::{self, Write};
use std::fs;
use std::sync::Arc;
use uuid::Uuid;
use log::{info, error, debug, warn};

const DEVICE_ID_FILE: &str = ".device.id";
const TOKEN_FILE: &str = ".session.token"; // <-- Файл для токена

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
            info!("Используем существующий device_id из {}", DEVICE_ID_FILE);
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

// --- Новые функции для токена ---

/// Загружает токен из файла
fn load_token() -> Option<String> {
    match fs::read_to_string(TOKEN_FILE) {
        Ok(token) if !token.is_empty() => {
            info!("Токен сессии загружен из {}", TOKEN_FILE);
            Some(token)
        }
        _ => {
            info!("Файл токена {} не найден.", TOKEN_FILE);
            None
        }
    }
}

/// Сохраняет токен в файл
fn save_token(token: &str) {
    if let Err(e) = fs::write(TOKEN_FILE, token) {
        error!("Не удалось сохранить токен в {}: {}", TOKEN_FILE, e);
    } else {
        info!("Токен сессии сохранен в {}", TOKEN_FILE);
    }
}

/// Удаляет файл токена (если он истек)
fn delete_token() {
    if fs::remove_file(TOKEN_FILE).is_ok() {
        info!("Файл токена {} удален.", TOKEN_FILE);
    }
}

/// Хелпер для запуска телеметрии (чтобы не дублировать код)
async fn set_user_id_and_spawn_telemetry(client: &MaxClient, sync_resp: &Response) {
    // Используем ваш путь к ID
    info!("{:#?}", sync_resp.payload);
    
    let user_id = sync_resp.payload
        .get("profile")
        .and_then(|s| s.get("contact"))
        .and_then(|s| s.get("id"))
        .and_then(|id| id.as_u64());
        
    log::info!("test {:?}", user_id);

    if let Some(id) = user_id {
        info!("Установка user_id: {}", id);
        client.set_user_id(id).await;
        
        info!("Запуск фоновой задачи телеметрии...");
        client.spawn_telemetry_task().await;
    } else {
        warn!("Не удалось найти user_id в ответе sync. Телеметрия не запущена.");
    }
}


#[tokio::main]
async fn main() -> Result<(), rumax::errors::Error> {
    // Инициализируем логгер
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info,max_client_lib=debug")
    ).init();

    let client = Arc::new(MaxClient::new());
    let device_id = get_device_id();

    // 1. Подключаемся к WebSocket
    info!("Подключение к WebSocket...");
    match client.connect(device_id).await {
        Ok(resp) => {
            info!("Handshake успешен!");
            debug!("Ответ Handshake: {:?}", resp.payload);
        }
        Err(e) => {
            error!("Ошибка подключения: {}", e);
            return Err(e.into());
        }
    }

    // 2. Пытаемся загрузить токен
    if let Some(token) = load_token() {
        // --- ПУТЬ A: ВХОД ПО ТОКЕНУ ---
        info!("Попытка входа по сохраненному токену...");
        
        // 2a. Устанавливаем токен в клиент
        client.set_token(token).await;

        // 2b. Сразу делаем sync
        match client.sync().await {
            Ok(sync_resp) => {
                info!("Вход по токену успешен!");
                set_user_id_and_spawn_telemetry(&client, &sync_resp).await;
            }
            Err(e) => {
                warn!("Ошибка входа по токену (возможно, истек): {}. Удаляем токен.", e);
                delete_token();
                info!("Перезапустите скрипт для входа по номеру телефона.");
                return Ok(()); // Выходим, чтобы пользователь перезапустил
            }
        }
    } else {
        // --- ПУТЬ B: ВХОД ПО КОДУ И ТЕЛЕФОНУ ---
        info!("Токен не найден, запуск входа по номеру телефона...");
        
        // 2a. Запрос кода
        let phone = read_line("Введите номер телефона (+7...): ");
        if let Err(e) = client.start_auth(phone).await {
            error!("Ошибка запроса кода: {}", e);
            return Err(e.into());
        }

        // 2b. Проверка кода
        let code = read_line("Введите код из СМС/звонка: ");
        if let Err(e) = client.check_code(code).await {
            error!("Ошибка проверки кода: {}", e);
            return Err(e.into());
        }

        // 2c. Синхронизация
        match client.sync().await {
            Ok(sync_resp) => {
                info!("Вход по коду и телефону успешен.");
                
                // 2d. !!! СОХРАНЯЕМ ТОКЕН !!!
                if let Some(new_token) = client.get_token().await {
                    save_token(&new_token);
                } else {
                    warn!("Не удалось получить токен из клиента для сохранения.");
                }

                // 2e. Запускаем телеметрию
                set_user_id_and_spawn_telemetry(&client, &sync_resp).await;
            }
            Err(e) => {
                error!("Ошибка синхронизации: {}", e);
                return Err(e.into());
            }
        }
    }

    // --- Клиент вошел в систему (либо по токену, либо по коду) ---
    
    info!("\n--- ЛОГИН УСПЕШНО ЗАВЕРШЕН ---");

    // Пример отправки сообщения
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

    match client.send_message(chat_id, message, None).await {
        Ok(resp) => {
            info!("Сообщение успешно отправлено!");
            debug!("Ответ send_message: {:?}", resp.payload);
        }
        Err(e) => {
            error!("Ошибка отправки сообщения: {}", e);
        }
    }

    info!("\nКлиент остается подключенным. Нажмите Enter для выхода.");
    read_line("");
    info!("Завершение работы...");

    Ok(())
}
