use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use argon2::{Argon2, Params};
use base64::{engine::general_purpose, Engine as _};
use keyring::Entry;
use rand::RngCore;

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
pub enum EncType {
    None,
    Keystore,
    Pin,
}

pub struct CryptoManager {
    enc_type: EncType,
    master_key: Vec<u8>,
}

// AES-GCM
fn encrypt_aes(key: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);

    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, data).map_err(|e| e.to_string())?;

    let mut out = nonce_bytes.to_vec();
    out.extend(ciphertext);

    Ok(out)
}

fn decrypt_aes(key: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() < 12 {
        return Err("invalid ciphertext".into());
    }

    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;

    let (nonce, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce);

    cipher.decrypt(nonce, ciphertext).map_err(|e| e.to_string())
}

// PIN KDF (slow ~100ms)
fn derive_pin_key(pin: &str, salt: &[u8]) -> Vec<u8> {
    let params = Params::new(65536, 3, 1, None).unwrap();

    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

    let mut out = vec![0u8; 32];

    argon2
        .hash_password_into(pin.as_bytes(), salt, &mut out)
        .expect("argon2 failed");

    out
}

fn get_or_create_keystore_key(user: &str) -> Vec<u8> {
    let entry = Entry::new("maxplus", user).expect("keyring init failed");

    if let Ok(key) = entry.get_password() {
        return general_purpose::STANDARD
            .decode(key)
            .unwrap_or_else(|_| vec![0u8; 32]);
    }

    let mut key = vec![0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut key);

    let encoded = general_purpose::STANDARD.encode(&key);
    entry.set_password(&encoded).expect("keyring write failed");

    key
}

impl CryptoManager {
    pub fn init(enc_type: EncType, user: &str, pin: Option<String>) -> Self {
        let master_key = match enc_type {
            EncType::None => vec![0u8; 32],

            EncType::Keystore => get_or_create_keystore_key(user),

            EncType::Pin => {
                let pin = pin.expect("PIN required");
                derive_pin_key(&pin, user.as_bytes())
            }
        };

        Self {
            enc_type,
            master_key,
        }
    }

    pub fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        match self.enc_type {
            EncType::None => Ok(data.to_vec()),
            _ => encrypt_aes(&self.master_key, data),
        }
    }

    pub fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        match self.enc_type {
            EncType::None => Ok(data.to_vec()),
            _ => decrypt_aes(&self.master_key, data),
        }
    }
}
