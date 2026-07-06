use rumax::MaxClient;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::secure::CryptoManager;

#[derive(Clone)]
pub struct AppState {
    pub client: MaxClient,
    pub crypto: Arc<RwLock<CryptoManager>>,
}
