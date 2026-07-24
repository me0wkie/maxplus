use tauri::{AppHandle, Runtime, Manager};
use serde::{Serialize, Deserialize};
use serde_json::Value;
use std::{fs, path::PathBuf};
use rand::Rng;

#[derive(Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub uid: Value,
    pub encryption: Option<Value>,
    pub key: Option<Value>,
}

#[derive(Serialize, Deserialize)]
pub struct AccountsStore {
    pub accounts: Vec<Account>,
    pub current: Option<String>,
}

fn root<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

fn accounts_path<R:Runtime>(app: &AppHandle<R>) -> PathBuf {
    root(app).expect("B").join("accounts")
}

fn data_path<R: Runtime>(
    app: &AppHandle<R>,
    id: &str,
    file: &str
) -> PathBuf {
    let dir = root(app).expect("A").join("data").join(id);
    _ = fs::create_dir_all(&dir);
    dir.join(file)
}

fn read_bin<T:for<'a>Deserialize<'a>>(path: PathBuf) -> Result<T, String>{
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    rmp_serde::from_slice(&bytes).map_err(|e| e.to_string())
}

fn write_bin<T: Serialize>(
    path: PathBuf,
    data: &T
) -> Result<(),String>{
    let bytes = rmp_serde::to_vec(data)
    .map_err(|e| e.to_string())?;

    fs::write(path,bytes)
    .map_err(|e| e.to_string())
}

fn load_accounts<R: Runtime> (
    app: &AppHandle<R>
) -> Result<AccountsStore, String>{

    let path = accounts_path(app);

    if !path.exists(){
        return Ok(AccountsStore{
            accounts: vec![],
            current: None
        })
    }

    read_bin(path)
}

fn save_accounts<R: Runtime> (
    app: &AppHandle<R>,
    data: &AccountsStore
) -> Result<(), String> {
    write_bin(accounts_path(app), data)
}

#[tauri::command]
pub fn accounts_get<R: Runtime> (
    app: AppHandle<R>
) -> Result<Vec<Account>, String> {
    Ok(load_accounts(&app)?.accounts)
}

#[tauri::command]
pub fn accounts_add<R: Runtime> (
    app: AppHandle<R>,
    account: Value,
    token: Value,
    device: Value,
) -> Result<Account, String> {
    let mut store = load_accounts(&app)?;
    let uid = account["id"].clone();

    if store.accounts.iter().any(|x| x.uid == uid) {
        return Err("Account already exists".into())
    }

    let id = loop {
        let id = rand::thread_rng()
        .gen_range(10000000..99999999)
        .to_string();

        if !store.accounts.iter().any(|x| x.id == id) {
            break id
        }
    };

    let entry = Account{
        id: id.clone(),
        uid,
        encryption: None,
        key: None
    };

    fs::create_dir_all(
        root(&app)?.join("data").join(&id)
    ).map_err(|e|e.to_string())?;


    write_bin(
        data_path(&app,&id,"meta"),
              &serde_json::json!({
                  "version": 1,
                  "token": token,
                  "device": device,
                  "added": chrono::Utc::now().timestamp_millis()
              })
    )?;

    write_bin(
        data_path(&app,&id,"self"), &account
    )?;

    store.accounts.push(entry.clone());
    save_accounts(&app,&store)?;
    Ok(entry)
}

#[tauri::command]
pub fn account_get<R: Runtime> (
    app: AppHandle<R>,
    id: String
) -> Result<Value, String> {
    let store = load_accounts(&app)?;

    let acc = store.accounts
    .iter()
    .find(|x| x.id == id)
    .ok_or("Account not found")?;

    let meta: Value = read_bin(data_path(&app, &id, "meta"))?;

    let contact: Value = read_bin(data_path(&app, &id, "self"))?;

    Ok(serde_json::json!({
        "id": acc.id,
        "uid": acc.uid,
        "encryption": acc.encryption,
        "key": acc.key,
        "meta": meta,
        "contact": contact
    }))
}

#[tauri::command]
pub fn account_delete<R: Runtime> (
    app: AppHandle<R>,
    id: String
) -> Result<(), String> {
    let mut store = load_accounts(&app)?;

    let idx = store.accounts
    .iter()
    .position(|x| x.id == id)
    .ok_or("Account not found")?;

    store.accounts.remove(idx);

    if store.current.as_ref()==Some(&id){
        store.current=None;
    }

    save_accounts(&app,&store)?;

    let path = root(&app)?
    .join("data")
    .join(id);


    if path.exists(){
        fs::remove_dir_all(path)
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn account_delete_by_uid<R: Runtime> (
    app: AppHandle<R>,
    uid: Value
) -> Result<(), String> {
    let store = load_accounts(&app)?;

    let id=store.accounts
    .iter()
    .find(|x| x.uid == uid)
    .map(|x| x.id.clone())
    .ok_or("Account not found")?;

    account_delete(app, id)
}

#[tauri::command]
pub fn account_meta<R: Runtime> (
    app: AppHandle<R>,
    id: String
) -> Result<Value, String> {
    read_bin(data_path(&app, &id, "meta"))
}

#[tauri::command]
pub fn account_contact<R: Runtime> (
    app: AppHandle<R>,
    id: String
) -> Result<Value, String>{
    read_bin(data_path(&app, &id, "self"))
}

#[tauri::command]
pub fn current_get<R: Runtime>(
    app: AppHandle<R>
) -> Result<Option<String>, String> {
    Ok(load_accounts(&app)?.current)
}

#[tauri::command]
pub fn current_set<R: Runtime> (
    app: AppHandle<R>,
    id: Option<String>
) -> Result<(), String> {
    let mut store=load_accounts(&app)?;

    if let Some(ref id) = id {
        if !store.accounts.iter().any(|x|&x.id == id){
            return Err("Account not found".into())
        }
    }

    store.current=id;
    save_accounts(&app,&store)
}

#[tauri::command]
pub fn current_account<R: Runtime> (
    app: AppHandle<R>
) -> Result<Option<Value>, String> {
    match current_get(app.clone())? {
        Some(id) => Ok(Some(account_get(app, id)?)),
        None => Ok(None)
    }
}

#[tauri::command]
pub fn current_account_set<R: Runtime> (
    app: AppHandle<R>,
    id: Option<String>
) -> Result<(), String> {
    let mut store = load_accounts(&app)?;

    if let Some(ref id)=id {
        if !store.accounts.iter().any(|x| &x.id == id) {
            return Err("Account not found".into())
        }
    }

    store.current = id;
    save_accounts(&app ,&store)
}

