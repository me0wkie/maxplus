use rumax::MaxClient;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri_plugin_store::Store;
use std::collections::HashMap;

use crate::secure::CryptoManager;

#[derive(Clone)]
pub struct AppState {
    pub client: MaxClient,
    pub crypto: Arc<RwLock<CryptoManager>>,
    pub stores: HashMap<String, Arc<Store<tauri::Wry>>>,
}
