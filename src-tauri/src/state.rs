use rumax::MaxClient;
use std::sync::{Arc, RwLock};

#[derive(Clone)]
pub struct CryptoSession {
    pub account: u64,
    pub key: [u8;32],
}

#[derive(Clone)]
pub struct AppState {
    pub client: MaxClient,
    pub crypto: Arc<RwLock<Option<CryptoSession>>>,
}
