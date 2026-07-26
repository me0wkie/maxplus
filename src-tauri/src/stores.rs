use tauri::{AppHandle, Manager};
use crate::state::CryptoSession;
use crate::AppState;
use serde_json::{json, Value};
use argon2::{Argon2, Algorithm, Params, Version};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use sha2::{Digest, Sha256};
use rand::{Rng, RngCore};
use std::{
    fs,
    path::{Path, PathBuf},
};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305,
    Key,
    Nonce,
};


struct Storage {
    key: Option<[u8;32]>
}

impl Storage {
    fn new(
        key: Option<[u8;32]>
    ) -> Self {
        Self { key }
    }

    fn encrypt(
        data:&[u8], key:&[u8;32]
    )->Result<Vec<u8>,String>{
        let cipher = ChaCha20Poly1305::new(
            Key::from_slice(key)
        );

        let mut nonce_bytes = [0u8;12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);

        let nonce = Nonce::from_slice(&nonce_bytes);

        let encrypted = cipher.encrypt(
            nonce,
            data
        ).map_err(|e|e.to_string())?;

        let mut result = Vec::new();

        result.extend_from_slice(b"ENC");
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&encrypted);

        Ok(result)
    }

    fn decrypt(data: &[u8], key: &[u8;32]) -> Result<Vec<u8>, String> {
        if !data.starts_with(b"ENC") {
            return Ok(data.to_vec());
        }

        let cipher = ChaCha20Poly1305::new(
            Key::from_slice(key)
        );

        let nonce = Nonce::from_slice(
            &data[3..15]
        );

        let encrypted = &data[15..];

        cipher.decrypt(nonce, encrypted).map_err(|e|e.to_string())
    }

    fn load(&self, path: impl AsRef<Path>) -> Option<Value> {
        let bytes = fs::read(path).ok()?;

        let bytes = if bytes.starts_with(b"ENC") {
            let key = self.key?;
            Self::decrypt(&bytes, &key).ok()?
        } else {
            bytes
        };

        rmp_serde::from_slice(&bytes).ok()
    }

    fn save(
        &self,
        path: impl AsRef<Path>,
        value:&Value,
    )->Result<(),String>{
        let path = path.as_ref();

        if let Some(parent)=path.parent(){
            fs::create_dir_all(parent)
                .map_err(|e|e.to_string())?;
        }

        let mut bytes = rmp_serde::to_vec(value)
            .map_err(|e|e.to_string())?;

        if let Some(key)=&self.key {
            bytes = Self::encrypt(
                &bytes,
                key
            )?;
        }

        fs::write(path, bytes)
            .map_err(|e|e.to_string())
    }

    fn list(
        dir:impl AsRef<Path>
    )->Vec<PathBuf>{
        let mut result = fs::read_dir(dir)
            .ok()
            .into_iter()
            .flat_map(|x| x.flatten())
            .map(|x| x.path())
            .collect::<Vec<_>>();
            result.sort();
            result
    }

}

fn crypto_key(
    app: &AppHandle,
    account: u64
) -> Option<[u8;32]> {
    app.state::<AppState>()
        .crypto
        .read()
        .unwrap()
        .as_ref()
        .filter(|x|x.account == account)
        .map(|x| x.key)
}

struct Paths {
    root: PathBuf,
}

impl Paths {
    fn new(
        app: &AppHandle,
        account: u64,
    ) -> Self {
        Self {
            root: app.path().app_data_dir().unwrap().join("data").join(account.to_string()),
        }
    }

    fn contacts(&self) -> PathBuf {
        self.root.join("contacts")
    }

    fn contact(
        &self,
        id: u64,
    ) -> PathBuf {
        self.contacts().join(format!("{id}"))
    }

    fn chats(&self) -> PathBuf {
        self.root.join("chats")
    }

    fn chat(
        &self, id: i64,
    ) -> PathBuf {
        self.chats().join(id.to_string())
    }

    fn settings(
        &self, chat: i64,
    ) -> PathBuf {
        self.chat(chat).join("settings")
    }

    fn messages(
        &self,
        chat: i64,
    ) -> PathBuf {
        self.chat(chat).join("messages")
    }
}

#[tauri::command]
pub fn get_contact(
    app: AppHandle,
    account: u64,
    contact_id: u64,
) -> Result<Option<Value>, String>{
    let key = crypto_key(&app, account);

    Ok(Storage::new(key)
      .load(
         Paths::new(&app,account)
         .contact(contact_id)
    ))
}

#[tauri::command]
pub fn set_contact(
    app: AppHandle,
    account: u64,
    contact_id: u64,
    data: Value,
) -> Result<(), String>{
    let key = crypto_key(&app,account);

    Storage::new(key).save(
        Paths::new(&app,account)
        .contact(contact_id),
          &data
    )
}

#[tauri::command]
pub fn get_contacts(
    app: AppHandle,
    account: u64,
) -> Result<Vec<Value>, String> {
    let key = crypto_key(&app, account);
    let storage = Storage::new(key);

    Ok(Storage::list(
        Paths::new(&app, account).contacts()
    )
    .into_iter()
    .filter_map(|x| storage.load(x))
    .collect())
}

#[tauri::command]
pub fn get_chat_settings(
    app: AppHandle,
    account: u64,
    chat_id: i64,
) -> Result<Value,String> {
    let key = crypto_key(&app, account);

    Ok(
        Storage::new(key)
        .load(
            Paths::new(&app,account).settings(chat_id)
        )
        .unwrap_or_else(||{
            json!({
                "version":1,
                "keys":{
                    "current":null,
                    "keys":[],
                    "messages":[]
                },
                "password":null,
                "obfs":null,
                "reader":true
            })
        })
    )
}

#[tauri::command]
pub fn set_chat_settings(
    app: AppHandle,
    account: u64,
    chat_id: i64,
    data: Value,
) -> Result<(), String> {
    let key = crypto_key(&app, account);
    let storage = Storage::new(key);
    storage.save(
        Paths::new(&app, account).settings(chat_id), &data
    )
}

#[tauri::command]
pub fn load_messages(
    app: AppHandle,
    account: u64,
    chat_id: i64,
    time: i64,
    amount: usize,
) -> Result<Vec<Value>, String> {
    let key = crypto_key(&app, account);
    let storage = Storage::new(key);
    let dir = Paths::new(&app, account).messages(chat_id);

    let mut files = Storage::list(dir);

    files.retain(|x| {
        x.file_name()
        .and_then(|x| x.to_str())
        .map(|x| x.starts_with("1_"))
        .unwrap_or(false)
    });

    if files.is_empty() {
        return Ok(vec![]);
    }

    let target = format!(
        "1_{}",
        chrono::DateTime::from_timestamp(time / 1000, 0)
        .unwrap()
        .format("%Y-%m-%d")
    );

    let mut index = files.iter().position(|x| {
        x.file_name().unwrap().to_string_lossy().as_ref() >= target.as_str()
    })
    .unwrap_or(files.len());

    if index >= files.len() {
        index = files.len() - 1;
    }
    else if files[index].file_name().unwrap().to_string_lossy() != target {
            if index > 0 {
                index -= 1;
            }
        }

        let mut result: Vec<Value> = Vec::new();

        for file in files[..=index].iter().rev() {
            let data: Vec<Value> = storage.load(file)
                .and_then(|x| x.as_array().cloned())
                .unwrap_or_default();

            let mut left = 0;
            let mut right = data.len();

            while left < right {
                let mid = (left + right) / 2;
                let msg_time = data[mid].get("time").and_then(|x| x.as_i64()).unwrap_or(0);

                if msg_time <= time {
                    left = mid + 1;
                }
                else {
                    right = mid;
                }
            }

            result.splice(
                0..0, data[..left].iter().cloned()
            );

            if result.len() > amount {
                let remove = result.len() - amount;
                result.drain(0..remove);
            }

            if result.len() >= amount {
                break;
            }
        }

        Ok(result)
}

#[tauri::command]
pub fn update_messages(
    app: AppHandle,
    account: u64,
    chat_id: i64,
    messages: Vec<Value>,
) -> Result<(), String> {
    let key = crypto_key(&app, account);
    let storage = Storage::new(key);
    let dir = Paths::new(&app, account).messages(chat_id);

    let mut bulks: std::collections::HashMap<String, Vec<Value>> = std::collections::HashMap::new();

    for message in messages {
        let time =  message.get("time").and_then(|x| x.as_i64()).unwrap_or(0);
        let day = chrono::DateTime::from_timestamp(time / 1000, 0).unwrap().format("%Y-%m-%d").to_string();
        bulks.entry(day).or_default().push(message);
    }

    for (day, incoming) in bulks {
        let file = dir.join(format!("1_{}", day));
        let mut saved: Vec<Value> = storage.load(&file)
            .and_then(|x| x.as_array().cloned())
            .unwrap_or_default();

        for message in incoming {
            let id = message.get("id").cloned();

            if let Some(id) = id {
            if let Some(old) =
                saved.iter_mut()
                .find(|x| x.get("id") == Some(&id))
                {
                if let Some(map) = message.as_object()
                {
                for (key,value) in map {
                    let changed = old.get(key) != Some(value);
                    if !changed {
                        continue;
                    }
                    if key == "text" {
                        let at = chrono::Utc::now().timestamp();

                        let old_text = old.get("text").cloned().unwrap_or(Value::Null);

                        if let Some(obj) =
                            old.as_object_mut()
                            {
                                let history = obj.entry("history")
                                .or_insert(
                                    Value::Array(vec![])
                                );

                                if let Value::Array(arr) = history {
                                    arr.push(
                                        json!({
                                            "text": old_text,
                                            "at": at
                                        })
                                    );
                                }
                            }
                    }
                    old.as_object_mut().unwrap().insert(key.clone(), value.clone());
                }
                }
                }
                else {
                    saved.push(message);
                }
            }
        }

        saved.sort_by_key(|x| {
            x.get("time")
            .and_then(|x| x.as_i64())
            .unwrap_or(0)
        });

        storage.save(file, &Value::Array(saved))?;
    }

    Ok(())
}

fn accounts_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("accounts")
}

fn load_accounts(app: &AppHandle) -> Value {
    Storage::new(None)
        .load(accounts_path(app))
        .unwrap_or_else(|| {
            json!({
                "accounts": [],
                "current": null
            })
        })
}

fn save_accounts(
    app:&AppHandle,
    data:&Value,
)->Result<(),String>{
    Storage::new(None).save(accounts_path(app), data)
}

fn get_account_key(
    app: &AppHandle,
    account: u64,
) -> Result<[u8;32], String>{
    app.state::<AppState>()
        .crypto
        .read()
        .unwrap()
        .as_ref()
        .filter(|x|x.account==account)
        .map(|x|x.key)
        .ok_or(
            "Account locked".into()
        )
}

fn account_path(
    app: &AppHandle,
    id: &str,
    file: &str,
) -> PathBuf {
    Paths::new(app, id.parse().unwrap()).root.join(file)
}

#[tauri::command]
pub fn accounts_get(
    app: AppHandle,
) -> Result<Value, String> {
    Ok(load_accounts(&app)["accounts"].clone())
}

#[tauri::command]
pub fn accounts_add(
    app: AppHandle,
    token: Value,
    device: Value,
) -> Result<Value, String> {
    let mut store = load_accounts(&app);

    let id = loop {
        let id = rand::thread_rng().gen_range(10000000..99999999);

        if !store["accounts"].as_array().unwrap().iter().any(|x| x["id"] == id) {
            break id;
        }
    };

    let entry = json!({
        "id": id,
        "encryption": null,
        "key": null
    });

    let account_dir = app
        .path()
        .app_data_dir()
        .unwrap()
        .join("data")
        .join(id.to_string());

    fs::create_dir_all(account_dir).map_err(|e| e.to_string())?;

    let storage = Storage::new(None);

    storage.save(
        account_path(&app, &id.to_string(), "meta"),
        &json!({
            "version": 1,
            "token": token,
            "device": device,
            "added": chrono::Utc::now().timestamp_millis()
        }),
    )?;

    store["accounts"].as_array_mut().unwrap().push(entry.clone());
    save_accounts(&app, &store)?;

    Ok(entry)
}


#[tauri::command]
pub fn account_get(
    app: AppHandle,
    id: u64,
) -> Result<Value, String> {
    let store = load_accounts(&app);

    let account = store["accounts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|x| x["id"] == id)
        .ok_or("Account not found")?;

    let key = crypto_key(&app, id);
    let storage = Storage::new(key);

    let meta = storage.load(
        account_path(&app, &id.to_string(), "meta")
    ).unwrap_or(Value::Null);

    let contact = storage.load(
        account_path(&app, &id.to_string(), "self")
    ).unwrap_or(Value::Null);

    Ok(json!({
        "id": account["id"],
        "encryption": account["encryption"],
        "meta": meta,
        "contact": contact
    }))
}


#[tauri::command]
pub fn account_delete(
    app: AppHandle,
    id: u64,
) -> Result<(), String> {
    let mut store = load_accounts(&app);

    store["accounts"].as_array_mut().unwrap().retain(|x| x["id"] != id);

    if store["current"] == id {
        store["current"] = Value::Null;
    }

    save_accounts(&app,&store)?;

    let path = app.path().app_data_dir().unwrap().join("data").join(id.to_string());

    if path.exists() {
        fs::remove_dir_all(path)
        .map_err(|e|e.to_string())?;
    }

    Ok(())
}


#[tauri::command]
pub fn account_delete_by_uid(
    app: AppHandle,
    uid: Value,
) -> Result<(), String> {
    let store = load_accounts(&app);

    let id = store["accounts"].as_array().unwrap()
        .iter().find(|x| x["uid"] == uid).and_then(|x| x["id"].as_u64())
        .ok_or("Account not found")?;

    account_delete(app, id)
}


#[tauri::command]
pub fn account_contact(
    app: AppHandle,
    id: u64,
    data: Option<Value>
) -> Result<Value, String> {
    let key = crypto_key(&app, id);

    let storage = Storage::new(key);

    if data.is_some() {
        storage.save(account_path(&app, &id.to_string().as_str(), "self"), &data.unwrap());
    }

    Ok(storage
        .load(account_path(&app, &id.to_string().as_str(), "self"))
        .unwrap_or(Value::Null)
    )
}


#[tauri::command]
pub fn current_get(
    app: AppHandle,
) -> Result<Value, String> {
    Ok(
        load_accounts(&app)["current"].clone()
    )
}


#[tauri::command]
pub fn current_set(
    app: AppHandle,
    id: Option<u64>,
) -> Result<(), String> {
    let mut store = load_accounts(&app);

    if let Some(ref id) = id {
        if !store["accounts"]
            .as_array().unwrap().iter().any(|x| x["id"] == *id){
                return Err("Account not found".into());
            }
    }

    store["current"] = id.map(Value::from).unwrap_or(Value::Null);
    save_accounts(&app, &store)
}


#[tauri::command]
pub fn current_account_meta(
    app: AppHandle,
) -> Result<Value, String> {
    let id = current_get(app.clone())?;

    if id.is_null() {
        return Ok(Value::Null);
    }

    account_get(
        app, id.as_u64().expect("Wrong account id")
    )
}

#[tauri::command]
pub fn current_account(
    app:AppHandle,
)->Result<Value,String>{
    let id = current_get(app.clone())?;

    if id.is_null(){
        return Ok(Value::Null);
    }

    let store = load_accounts(&app);

    let account = store["accounts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|x| x["id"] == id)
        .unwrap();

    Ok(json!({
        "id": account["id"],
        "encryption": account["encryption"]
    }))
}


#[tauri::command]
pub fn current_account_set(
    app: AppHandle,
    id: Option<u64>,
) -> Result<(), String> {
    current_set(app, id)
}

#[tauri::command]
pub fn decrypt_account(
    app: AppHandle,
    account: u64,
    key: String,
) -> Result<(), String> {
    let store = load_accounts(&app);

    let entry = store["accounts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|x| x["id"] == account)
        .ok_or("Account not found")?;

    let encryption = &entry["encryption"];

    if encryption.is_null() {
        return Err(
            "Account not encrypted".into()
        );
    }

    let salt = encryption["salt"]
        .as_str()
        .unwrap();

    let derived =
        derive_key(
            &key,
            salt
        )?;

    if !verify_hash(
        &derived,
        encryption["hash"]
            .as_str()
            .unwrap()
    ) {
        return Err(
            "Wrong key".into()
        );
    }

    *app.state::<AppState>()
        .crypto
        .write()
        .unwrap() = Some(
        CryptoSession{
            account,
            key: derived
        }
    );

    Ok(())
}

fn migrate_encrypt(
    root: &Path,
    key: &[u8;32],
) -> Result<(), String>{
    for entry in walkdir::WalkDir::new(root)
    {
        let entry = entry.map_err(|e|e.to_string())?;

        if !entry.file_type().is_file(){
            continue;
        }

        let path = entry.path();

        let value = Storage::new(None)
            .load(path)
            .ok_or(
                "Cannot read file"
            )?;

        Storage::new(Some(*key)).save(
            path,
            &value
        )?;
    }

    Ok(())
}

fn migrate_decrypt(
    root: &Path,
    key: &[u8;32],
)->Result<(),String>{
    for entry in walkdir::WalkDir::new(root) {
        let entry = entry.map_err(|e|e.to_string())?;

        if !entry.file_type().is_file(){
            continue;
        }

        let path = entry.path();

        let value = Storage::new(Some(*key))
            .load(path)
            .ok_or(
                "Cannot decrypt file"
            )?;

        Storage::new(None).save(
            path,
            &value
        )?;
    }

    Ok(())
}

#[tauri::command]
pub fn set_encryption(
    app: AppHandle,
    account: u64,
    key: String,
    enabled: bool,
) -> Result<(), String>{
    let root = Paths::new(
        &app, account
    ).root;

    let mut store = load_accounts(&app);

    let entry = store["accounts"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|x| x["id"] == account)
        .ok_or("Account not found")?;

    if enabled {
        let salt = generate_salt();

        let derived = derive_key(
            &key, &salt
        )?;

        migrate_encrypt(
            &root, &derived
        )?;

        entry["encryption"] = json!({
            "type": "pin-1",
            "salt": salt,
            "hash": hash_key(&derived)
        });

        save_accounts(
            &app,
            &store
        )?;

        *app.state::<AppState>().crypto.write().unwrap() = Some(
            CryptoSession{
                account,
                key:derived
            }
        );
    } else {
        let encryption = &entry["encryption"];

        let salt = encryption["salt"]
        .as_str()
        .unwrap();

        let derived = derive_key(&key, salt)?;

        if !verify_hash(
            &derived,
            encryption["hash"].as_str().unwrap(),
        ) {
            return Err("Wrong key".into());
        }

        migrate_decrypt(
            &root,
            &derived
        )?;

        entry["encryption"] = Value::Null;

        save_accounts(
            &app,
            &store
        )?;

        *app.state::<AppState>().crypto.write().unwrap() = None;
    }

    Ok(())
}

fn generate_salt() -> String {
    let mut salt = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut salt);
    STANDARD.encode(salt)
}

fn derive_key(password: &str, salt: &str) -> Result<[u8; 32], String> {
    let salt = STANDARD.decode(salt).map_err(|e| e.to_string())?;

    let argon = Argon2::new(
        Algorithm::Argon2id,
        Version::V0x13,
        Params::default(),
    );

    let mut key = [0u8; 32];

    argon
        .hash_password_into(password.as_bytes(), &salt, &mut key)
        .map_err(|e| e.to_string())?;

    Ok(key)
}

fn hash_key(key: &[u8; 32]) -> String {
    let first = Sha256::digest(key);
    let second = Sha256::digest(first);
    STANDARD.encode(second)
}

fn verify_hash(key: &[u8; 32], hash: &str) -> bool {
    hash_key(key) == hash
}
