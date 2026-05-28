use crate::{AppState, secure::{CryptoManager, EncType}};
use tauri::State;

#[tauri::command]
pub async fn migrate_encryption(
    state: State<'_, AppState>,
    old_type: EncType,
    new_type: EncType,
    user: String,
    pin: Option<String>,
) -> Result<(), String> {

    let old_crypto = CryptoManager::init(old_type.clone(), &user, pin.clone());
    let new_crypto = CryptoManager::init(new_type.clone(), &user, pin.clone());

    let keys = state.list_all_keys().await?;

    for key in keys {
        let raw = state.inner_get(&key).await?;

        if raw.is_empty() {
            continue;
        }

        let decrypted = old_crypto.decrypt(&raw)?;
        let reencrypted = new_crypto.encrypt(&decrypted)?;

        state.inner_set(key, reencrypted).await;
    }

    state.set_crypto(new_crypto).await;

    Ok(())
}
