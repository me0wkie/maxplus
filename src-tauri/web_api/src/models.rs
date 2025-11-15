use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Request {
    pub ver: u8,
    #[serde(default)]
    pub cmd: u8,
    pub seq: u64,
    pub opcode: u16,
    pub payload: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Response {
    pub ver: u8,
    pub cmd: u8,
    pub seq: u64,
    pub opcode: u16,
    pub payload: serde_json::Value,
}
