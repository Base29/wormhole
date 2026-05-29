use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use keyring::Entry;

const SERVICE_NAME: &str = "com.wormhole.app";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Host {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub label: String,          // e.g. "Cloud", "Home Lab"
    pub auth_method: String,    // "agent", "password", "key"
    pub key_path: Option<String>,
    pub os: Option<String>,
}


pub fn get_config_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let mut path = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push("hosts.json");
    Ok(path)
}

pub fn load_hosts(app_handle: &tauri::AppHandle) -> Result<Vec<Host>, String> {
    let path = get_config_dir(app_handle)?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| e.to_string())?;

    if contents.trim().is_empty() {
        return Ok(Vec::new());
    }

    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

pub fn save_hosts(app_handle: &tauri::AppHandle, hosts: &[Host]) -> Result<(), String> {
    let path = get_config_dir(app_handle)?;
    let contents = serde_json::to_string_pretty(hosts).map_err(|e| e.to_string())?;
    let mut file = File::create(path).map_err(|e| e.to_string())?;
    file.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn store_secret(host_id: &str, secret: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, host_id).map_err(|e| e.to_string())?;
    entry.set_password(secret).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn retrieve_secret(host_id: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, host_id).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

pub fn delete_secret(host_id: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, host_id).map_err(|e| e.to_string())?;
    // It's fine if the secret was not stored
    let _ = entry.delete_credential();
    Ok(())
}
