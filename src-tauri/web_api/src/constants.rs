use std::time::Duration;

pub struct Constants;
impl Constants {
    pub const WEBSOCKET_URI: &'static str = "wss://ws-api.oneme.ru/websocket";
    pub const ORIGIN_HEADER: &'static str = "https://web.max.ru";
    pub const DEFAULT_TIMEOUT: Duration = Duration::from_millis(10000);
    pub const PING_INTERVAL: Duration = Duration::from_secs(30);
    pub const USER_AGENT: &'static str =
        "Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0";
}
