mod vault;
mod ssh;

use vault::Host;
use ssh::AppSshState;
use tauri::{AppHandle, Manager};
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Vault commands wrapping vault.rs logic
#[tauri::command]
fn get_hosts(app_handle: AppHandle) -> Result<Vec<Host>, String> {
    vault::load_hosts(&app_handle)
}

#[tauri::command]
fn add_host(app_handle: AppHandle, host: Host, secret: Option<String>) -> Result<(), String> {
    let mut hosts = vault::load_hosts(&app_handle)?;
    
    // Check if ID already exists
    if hosts.iter().any(|h| h.id == host.id) {
        return Err("Host ID already exists".to_string());
    }

    // Securely store the secret in keychain
    if let Some(sec) = secret {
        if !sec.is_empty() {
            vault::store_secret(&host.id, &sec)?;
        }
    }

    hosts.push(host);
    vault::save_hosts(&app_handle, &hosts)?;
    Ok(())
}

#[tauri::command]
fn update_host(app_handle: AppHandle, host: Host, secret: Option<String>) -> Result<(), String> {
    let mut hosts = vault::load_hosts(&app_handle)?;
    let index = hosts.iter().position(|h| h.id == host.id)
        .ok_or_else(|| "Host not found".to_string())?;

    // Securely update the secret in keychain
    if let Some(sec) = secret {
        if !sec.is_empty() {
            vault::store_secret(&host.id, &sec)?;
        }
    }

    hosts[index] = host;
    vault::save_hosts(&app_handle, &hosts)?;
    Ok(())
}

#[tauri::command]
fn delete_host(app_handle: AppHandle, id: String) -> Result<(), String> {
    let mut hosts = vault::load_hosts(&app_handle)?;
    let index = hosts.iter().position(|h| h.id == id)
        .ok_or_else(|| "Host not found".to_string())?;

    // Delete secret from keychain
    let _ = vault::delete_secret(&id);

    hosts.remove(index);
    vault::save_hosts(&app_handle, &hosts)?;
    Ok(())
}

#[tauri::command]
fn get_host_secret(id: String) -> Result<String, String> {
    // Standard command to get the password/passphrase from macOS Keychain
    vault::retrieve_secret(&id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppSshState::new()) // Register active SSH state manager
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // Set macOS translucency vibrancy
            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::WindowBackground, None, None)
                .expect("Failed to apply vibrancy to main window");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_hosts,
            add_host,
            update_host,
            delete_host,
            get_host_secret,
            ssh::connect_ssh,
            ssh::resize_ssh_pty,
            ssh::write_ssh_input,
            ssh::disconnect_ssh,
            ssh::sftp_home_dir,
            ssh::sftp_ls,
            ssh::sftp_mkdir,
            ssh::sftp_rm,
            ssh::sftp_rename,
            ssh::sftp_download,
            ssh::sftp_upload,
            ssh::local_ls,
            ssh::local_home_dir,
            ssh::ssh_exec_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
