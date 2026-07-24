use tauri::{AppHandle, Manager};
use serde_json::{json, Value};
use rand::Rng;
use std::{
    fs,
    path::{Path, PathBuf},
};

struct Storage;

impl Storage {
    fn load(path: impl AsRef<Path>) -> Option<Value> {
        let bytes = fs::read(path).ok()?;
        rmp_serde::from_slice(&bytes).ok()
    }

    fn save(
        path: impl AsRef<Path>,
        value: &Value,
    ) -> Result<(), String> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let bytes = rmp_serde::to_vec(value).map_err(|e| e.to_string())?;
        fs::write(path, bytes).map_err(|e| e.to_string())
    }

    fn list(dir: impl AsRef<Path>) -> Vec<PathBuf> {
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

struct Paths {
    root: PathBuf,
}

impl Paths {
    fn new(
        app: &AppHandle,
        account: u64,
    ) -> Self {
        Self {
            root: app
                .path()
                .app_data_dir()
                .unwrap()
                .join("data")
                .join(account.to_string()),
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
        &self, id: u64,
    ) -> PathBuf {
        self.chats().join(id.to_string())
    }

    fn settings(
        &self, chat: u64,
    ) -> PathBuf {
        self.chat(chat).join("settings")
    }

    fn messages(
        &self,
        chat: u64,
    ) -> PathBuf {
        self.chat(chat).join("messages")
    }
}

#[tauri::command]
pub fn get_contact(
    app: AppHandle,
    account: u64,
    contact_id: u64,
) -> Option<Value> {
    Storage::load(
        Paths::new(&app, account).contact(contact_id)
    )
}

#[tauri::command]
pub fn set_contact(
    app: AppHandle,
    account: u64,
    contact_id: u64,
    data: Value,
) -> Result<(), String> {
    Storage::save(
        Paths::new(&app, account).contact(contact_id), &data
    )
}

#[tauri::command]
pub fn get_contacts(
    app: AppHandle,
    account: u64,
) -> Vec<Value> {
    Storage::list(Paths::new(&app, account).contacts())
        .into_iter().filter_map(Storage::load).collect()
}

#[tauri::command]
pub fn get_chat_settings(
    app: AppHandle,
    account: u64,
    chat_id: u64,
) -> Value {
    Storage::load(
        Paths::new(&app, account).settings(chat_id)
    )
    .unwrap_or_else(|| {
        json!({
            "version": 1,
            "keys": {
                "current": null,
                "keys": [],
                "messages": []
            },
            "password": null,
            "obfs": null,
            "reader": true
        })

    })
}

#[tauri::command]
pub fn set_chat_settings(
    app: AppHandle,
    account: u64,
    chat_id: u64,
    data: Value,
) -> Result<(), String> {
    Storage::save(
        Paths::new(&app, account).settings(chat_id), &data
    )
}

#[tauri::command]
pub fn load_messages(
    app: AppHandle,
    account: u64,
    chat_id: u64,
    time: i64,
    amount: usize,
) -> Vec<Value> {
    let dir = Paths::new(&app, account).messages(chat_id);

    let mut files = Storage::list(dir);

    files.retain(|x| {
        x.file_name()
        .and_then(|x| x.to_str())
        .map(|x| x.starts_with("1_"))
        .unwrap_or(false)
    });

    if files.is_empty() {
        return vec![];
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
            let data: Vec<Value> = Storage::load(file)
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

        result
}

#[tauri::command]
pub fn update_messages(
    app: AppHandle,
    account: u64,
    chat_id: u64,
    messages: Vec<Value>,
) -> Result<(), String> {
    let dir = Paths::new(&app, account).messages(chat_id);
    let mut bulks: std::collections::HashMap<String, Vec<Value>> = std::collections::HashMap::new();

    for message in messages {
        let time =  message.get("time").and_then(|x| x.as_i64()).unwrap_or(0);
        let day = chrono::DateTime::from_timestamp(time / 1000, 0).unwrap().format("%Y-%m-%d").to_string();
        bulks.entry(day).or_default().push(message);
    }

    for (day, incoming) in bulks {
        let file = dir.join(format!("1_{}", day));
        let mut saved: Vec<Value> = Storage::load(&file)
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

        Storage::save(file, &Value::Array(saved))?;
    }

    Ok(())
}

fn accounts_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("accounts")
}

fn load_accounts(app: &AppHandle) -> Value {
    Storage::load(accounts_path(app))
    .unwrap_or_else(|| {
        json!({
            "accounts": [],
            "current": null
        })
    })
}

fn save_accounts(
    app: &AppHandle,
    data: &Value,
) -> Result<(), String> {
    Storage::save(accounts_path(app), data)
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
    account: Value,
    token: Value,
    device: Value,
) -> Result<Value, String> {
    let mut store = load_accounts(&app);
    let uid = account["id"].clone();

    if store["accounts"].as_array().unwrap().iter().any(|x| x["uid"] == uid) {
        return Err("Account already exists".into());
    }

    let id = loop {
        let id = rand::thread_rng().gen_range(10000000..99999999).to_string();

        if !store["accounts"].as_array().unwrap().iter().any(|x| x["id"] == id) {
            break id;
        }
    };

    let entry = json!({
        "id": id,
        "uid": uid,
        "encryption": null,
        "key": null
    });

    let account_dir = app.path().app_data_dir().unwrap().join("data").join(entry["id"].as_str().unwrap());
    fs::create_dir_all(account_dir).map_err(|e| e.to_string())?;

    Storage::save(
        account_path(&app, entry["id"].as_str().unwrap(), "meta"),
        &json!({
            "version": 1,
            "token": token,
            "device": device,
            "added": chrono::Utc::now().timestamp_millis()
        }),
    )?;

    Storage::save(
        account_path(&app, entry["id"].as_str().unwrap(), "self"),
        &account,
    )?;

    store["accounts"].as_array_mut().unwrap().push(entry.clone());
    save_accounts(&app, &store)?;
    Ok(entry)
}


#[tauri::command]
pub fn account_get(
    app: AppHandle,
    id: String,
) -> Result<Value, String> {
    let store = load_accounts(&app);

    let account = store["accounts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|x| x["id"] == id)
        .ok_or("Account not found")?;

    let meta = Storage::load(
        account_path(&app, &id, "meta")
    ).unwrap_or(Value::Null);

    let contact = Storage::load(
        account_path(&app, &id, "self")
    ).unwrap_or(Value::Null);

    Ok(json!({
        "id": account["id"],
        "uid": account["uid"],
        "encryption": account["encryption"],
        "key": account["key"],
        "meta": meta,
        "contact": contact
    }))
}


#[tauri::command]
pub fn account_delete(
    app: AppHandle,
    id: String,
) -> Result<(), String> {
    let mut store = load_accounts(&app);

    store["accounts"].as_array_mut().unwrap().retain(|x| x["id"] != id);

    if store["current"] == id {
        store["current"] = Value::Null;
    }

    save_accounts(&app,&store)?;

    let path = app.path().app_data_dir().unwrap().join("data").join(id);

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

    let id =store["accounts"].as_array().unwrap()
        .iter().find(|x| x["uid"] == uid).and_then(|x| x["id"].as_str())
        .ok_or("Account not found")?.to_string();

    account_delete(app,id)
}


#[tauri::command]
pub fn account_meta(
    app: AppHandle,
    id: String,
) -> Result<Value, String> {
    Ok(
        Storage::load(
            account_path(&app, &id, "meta")
        )
        .unwrap_or(Value::Null)
    )
}


#[tauri::command]
pub fn account_contact(
    app: AppHandle,
    id: String,
) -> Result<Value, String> {
    Ok(
        Storage::load(
            account_path(&app, &id, "self")
        )
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
    id: Option<String>,
) -> Result<(), String> {
    let mut store = load_accounts(&app);

    if let Some(ref id)=id {
        if !store["accounts"]
            .as_array().unwrap().iter().any(|x| x["id"] == *id){
                return Err("Account not found".into());
            }
    }

    store["current"] =  id.map(Value::String).unwrap_or(Value::Null);
    save_accounts(&app,&store)
}


#[tauri::command]
pub fn current_account(
    app: AppHandle,
) -> Result<Value, String> {
    let id = current_get(app.clone())?;

    if id.is_null() {
        return Ok(Value::Null);
    }

    account_get(
        app,
        id.as_str().unwrap().to_string()
    )
}


#[tauri::command]
pub fn current_account_set(
    app: AppHandle,
    id: Option<String>,
) -> Result<(), String> {
    current_set(app,id)
}
