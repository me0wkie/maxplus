use tauri::{AppHandle, Runtime, State};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;

use crate::AppState;

type SerializeFn =
    fn(&HashMap<String, Value>) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>>;

type DeserializeFn =
    fn(&[u8]) -> Result<HashMap<String, Value>, Box<dyn std::error::Error + Send + Sync>>;

fn msgpack_serialize(
    cache: &HashMap<String, Value>,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    rmp_serde::to_vec(cache).map_err(|e| Box::new(e) as _)
}

fn msgpack_deserialize(
    bytes: &[u8],
) -> Result<HashMap<String, Value>, Box<dyn std::error::Error + Send + Sync>> {
    rmp_serde::from_slice(bytes).map_err(|e| Box::new(e) as _)
}

pub fn setup_custom_stores<R: Runtime>(
    app: &AppHandle<R>,
    store_names: &[&str],
) -> Result<HashMap<String, Arc<tauri_plugin_store::Store<R>>>, Box<dyn std::error::Error>> {

    let mut map = HashMap::new();

    for name in store_names {
        let path = std::path::PathBuf::from(name);

        let store = tauri_plugin_store::StoreBuilder::new(app, path)
            .serialize(msgpack_serialize as SerializeFn)
            .deserialize(msgpack_deserialize as DeserializeFn)
            .build()?;

        map.insert(name.to_string(), store);
    }

    Ok(map)
}

fn shard(chat_id: u64) -> usize {
    (chat_id % 10) as usize
}

fn msg_store_name(shard: usize) -> String {
    format!("msg_{}.bin", shard)
}

fn resolve_store(key: &str, chat_id: Option<u64>) -> String {
    if key.starts_with("msg:") {
        let id = chat_id.unwrap_or(0);
        return msg_store_name(shard(id));
    }

    if key.starts_with("keys:") {
        return "keys.bin".into();
    }

    "chats.bin".into()
}

#[tauri::command]
pub fn get(
    state: State<'_, AppState>,
    key: String,
) -> Result<Value, String> {
    let crypto = state.crypto.blocking_read();

    let (store_name, real_key) = if key.starts_with("msg:") {
        let shard = key.split(':').last().unwrap_or("0");
        (format!("msg_{}.bin", shard), key)
    } else if key.starts_with("keys:") {
        ("keys.bin".into(), key)
    } else {
        ("chats.bin".into(), key)
    };

    let store = state.stores.get(&store_name).ok_or("store not found")?;;

    let raw = store.get(&real_key);

    let raw = match raw {
        Some(v) => v,
        None => return Ok(Value::Null),
    };

    let bytes = serde_json::to_vec(&raw)
        .map_err(|e| e.to_string())?;

    let decrypted = crypto
        .decrypt(&bytes)
        .map_err(|e| e.to_string())?;

    rmp_serde::from_slice(&decrypted)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set(
    state: State<'_, AppState>,
    key: String,
    value: Value,
) -> Result<(), String> {
    let crypto = state.crypto.blocking_read();

    let (store_name, real_key) = if key.starts_with("msg:") {
        let shard = key.split(':').last().unwrap_or("0");
        (format!("msg_{}.bin", shard), key)
    } else if key.starts_with("keys:") {
        ("keys.bin".into(), key)
    } else {
        ("chats.bin".into(), key)
    };

    let store = state.stores.get(&store_name).ok_or("store not found")?;;

    let bytes = rmp_serde::to_vec(&value)
        .map_err(|e| e.to_string())?;

    let encrypted = crypto
        .encrypt(&bytes)
        .map_err(|e| e.to_string())?;

    let json = serde_json::to_value(encrypted)
        .map_err(|e| e.to_string())?;

    store.set(real_key, json);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete(
    state: State<'_, AppState>,
    key: String,
) -> Result<(), String> {
    let (store_name, real_key) = if key.starts_with("msg:") {
        let shard = key.split(':').last().unwrap_or("0");
        (format!("msg_{}.bin", shard), key)
    } else if key.starts_with("keys:") {
        ("keys.bin".into(), key)
    } else {
        ("chats.bin".into(), key)
    };

    let store = state.stores.get(&store_name).ok_or("store not found")?;;

    store.delete(&real_key);
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}
