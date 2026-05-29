use ssh2::{Session, Sftp};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SftpFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub permissions: Option<u32>,
    pub modified_time: u64,
}

// Global active SSH session state
#[allow(dead_code)]
pub struct SshSession {
    pub id: String,
    pub session: Session,
    pub channel: Arc<Mutex<ssh2::Channel>>,
    pub sftp: Arc<Mutex<Sftp>>,
    // We hold tcp so it doesn't drop
    pub _tcp: TcpStream,
}

pub struct AppSshState {
    pub sessions: Arc<Mutex<std::collections::HashMap<String, Arc<SshSession>>>>,
}

impl AppSshState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(std::collections::HashMap::new())),
        }
    }
}

// Established SSH & SFTP backend commands
#[tauri::command]
pub async fn connect_ssh(
    app: AppHandle,
    id: String,
    host: String,
    port: u16,
    username: String,
    auth_method: String,
    key_path: Option<String>,
    passphrase_or_password: Option<String>,
    state: State<'_, AppSshState>,
) -> Result<String, String> {
    let tcp = TcpStream::connect(format!("{}:{}", host, port))
        .map_err(|e| format!("Failed to connect to host: {}", e))?;
    
    let mut sess = Session::new().map_err(|e| format!("Failed to create SSH session: {}", e))?;
    sess.set_tcp_stream(tcp.try_clone().map_err(|e| e.to_string())?);
    sess.handshake().map_err(|e| format!("SSH handshake failed: {}", e))?;

    // Enable TCP keepalive
    sess.set_keepalive(true, 10);

    let mut authenticated = false;

    if auth_method == "agent" {
        // Try system ssh-agent authentication
        if let Err(e) = sess.userauth_agent(&username) {
            println!("ssh-agent auth failed: {}. Falling back.", e);
        } else {
            authenticated = true;
        }
    }

    if !authenticated {
        match auth_method.as_str() {
            "password" => {
                let password = passphrase_or_password.ok_or_else(|| "Password is required for password auth".to_string())?;
                sess.userauth_password(&username, &password)
                    .map_err(|e| format!("Password authentication failed: {}", e))?;
                authenticated = true;
            }
            "key" => {
                let path_str = key_path.ok_or_else(|| "Private key path is required".to_string())?;
                let path = Path::new(&path_str);
                
                // If it fails because of missing passphrase and passphrase wasn't provided, trigger fallback
                let passphrase = passphrase_or_password;
                sess.userauth_pubkey_file(
                    &username,
                    None,
                    path,
                    passphrase.as_deref(),
                ).map_err(|e| format!("Key authentication failed: {}", e))?;
                authenticated = true;
            }
            _ => {
                if !authenticated {
                    return Err("No authentication method succeeded. You may need to provide a passphrase/password.".to_string());
                }
            }
        }
    }

    if !authenticated {
        return Err("Authentication failed: No valid credentials".to_string());
    }

    // Open channel for PTY
    let mut channel = sess.channel_session().map_err(|e| format!("Failed to open channel: {}", e))?;
    channel.request_pty("xterm-256color", None, None).map_err(|e| format!("Failed to request PTY: {}", e))?;
    channel.shell().map_err(|e| format!("Failed to start shell: {}", e))?;

    // Create SFTP channel
    let sftp = sess.sftp().map_err(|e| format!("Failed to initialize SFTP: {}", e))?;

    // Set non-blocking mode on session
    sess.set_blocking(false);

    let channel_arc = Arc::new(Mutex::new(channel));
    let sftp_arc = Arc::new(Mutex::new(sftp));

    // Spawn stdout reader thread
    let app_clone = app.clone();
    let id_clone = id.clone();
    let channel_read = channel_arc.clone();

    thread::spawn(move || {
        let mut buffer = [0u8; 8192];
        loop {
            let read_result = {
                let mut chan = channel_read.lock().unwrap();
                chan.read(&mut buffer)
            };
            
            match read_result {
                Ok(0) => {
                    break;
                }
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = app_clone.emit(&format!("ssh-stdout:{}", id_clone), text);
                }
                Err(e) => {
                    // Check if it's just blocking
                    if e.kind() != std::io::ErrorKind::WouldBlock {
                        break;
                    }
                    thread::sleep(std::time::Duration::from_millis(10));
                }
            }
        }
        let _ = app_clone.emit(&format!("ssh-closed:{}", id_clone), ());
    });

    // Save session globally
    let mut sessions = state.sessions.lock().unwrap();
    sessions.insert(
        id.clone(),
        Arc::new(SshSession {
            id: id.clone(),
            session: sess,
            channel: channel_arc,
            sftp: sftp_arc,
            _tcp: tcp,
        }),
    );

    Ok(id)
}

#[tauri::command]
pub async fn resize_ssh_pty(
    id: String,
    cols: u32,
    rows: u32,
    state: State<'_, AppSshState>,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    let mut channel = session.channel.lock().unwrap();
    channel.request_pty_size(cols, rows, None, None).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn write_ssh_input(
    id: String,
    data: String,
    state: State<'_, AppSshState>,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    // Lock channel FIRST to prevent reader thread from doing concurrent blocking read
    let mut channel = session.channel.lock().unwrap();
    let _ = session.session.set_blocking(true);
    
    let res = channel.write_all(data.as_bytes())
        .and_then(|_| channel.flush());
        
    // Restore non-blocking mode
    let _ = session.session.set_blocking(false);
    
    res.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect_ssh(
    id: String,
    state: State<'_, AppSshState>,
) -> Result<(), String> {
    let session_opt = {
        let mut sessions = state.sessions.lock().unwrap();
        sessions.remove(&id)
    };
    if let Some(session) = session_opt {
        let mut channel = session.channel.lock().unwrap();
        let _ = channel.close();
        let _ = session.session.disconnect(None, "User disconnected", None);
    }
    Ok(())
}

#[tauri::command]
pub async fn sftp_home_dir(
    id: String,
    state: State<'_, AppSshState>,
) -> Result<String, String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    let _channel = session.channel.lock().unwrap();
    let _ = session.session.set_blocking(true);
    
    let home_res = {
        let sftp = session.sftp.lock().unwrap();
        sftp.realpath(Path::new("."))
    };
    
    let _ = session.session.set_blocking(false);
    
    let home_path = home_res.map_err(|e| format!("Failed to resolve remote home directory: {}", e))?;
    Ok(home_path.to_string_lossy().to_string())
}

// SFTP Commands
#[tauri::command]
pub async fn sftp_ls(
    id: String,
    remote_path: String,
    state: State<'_, AppSshState>,
) -> Result<Vec<SftpFile>, String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    // Lock channel first to pause the reader thread's lock loop
    let _channel = session.channel.lock().unwrap();
    
    // Temporarily set to blocking for SFTP round-trips
    let _ = session.session.set_blocking(true);
    
    let readdir_res = {
        let sftp = session.sftp.lock().unwrap();
        let path = Path::new(&remote_path);
        sftp.readdir(path)
    };
    
    // Restore non-blocking
    let _ = session.session.set_blocking(false);
    
    let readdir_results = readdir_res.map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();
    for (path_buf, file_stat) in readdir_results {
        let name = path_buf.file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "".to_string());
        if name == "." || name == ".." {
            continue;
        }

        files.push(SftpFile {
            name,
            path: path_buf.to_string_lossy().to_string(),
            is_dir: file_stat.is_dir(),
            size: file_stat.size.unwrap_or(0),
            permissions: file_stat.perm,
            modified_time: file_stat.mtime.unwrap_or(0),
        });
    }

    // Sort: directories first, then alphabetical
    files.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(files)
}

#[tauri::command]
pub async fn sftp_mkdir(
    id: String,
    remote_path: String,
    state: State<'_, AppSshState>,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    let _channel = session.channel.lock().unwrap();
    let _ = session.session.set_blocking(true);
    let res = {
        let sftp = session.sftp.lock().unwrap();
        sftp.mkdir(Path::new(&remote_path), 0o755)
    };
    let _ = session.session.set_blocking(false);
    
    res.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sftp_rm(
    id: String,
    remote_path: String,
    is_dir: bool,
    state: State<'_, AppSshState>,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    let _channel = session.channel.lock().unwrap();
    let _ = session.session.set_blocking(true);
    let res = {
        let sftp = session.sftp.lock().unwrap();
        let path = Path::new(&remote_path);
        if is_dir {
            sftp.rmdir(path)
        } else {
            sftp.unlink(path)
        }
    };
    let _ = session.session.set_blocking(false);
    
    res.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sftp_rename(
    id: String,
    src_path: String,
    dest_path: String,
    state: State<'_, AppSshState>,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    let _channel = session.channel.lock().unwrap();
    let _ = session.session.set_blocking(true);
    let res = {
        let sftp = session.sftp.lock().unwrap();
        sftp.rename(Path::new(&src_path), Path::new(&dest_path), None)
    };
    let _ = session.session.set_blocking(false);
    
    res.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sftp_download(
    id: String,
    remote_path: String,
    local_path: String,
    state: State<'_, AppSshState>,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    let _channel = session.channel.lock().unwrap();
    let _ = session.session.set_blocking(true);
    
    let res = {
        let sftp = session.sftp.lock().unwrap();
        let remote_file = sftp.open(Path::new(&remote_path)).map_err(|e| format!("Failed to open remote file: {}", e));
        match remote_file {
            Err(e) => Err(e),
            Ok(mut remote_file) => {
                let local_file = std::fs::File::create(Path::new(&local_path)).map_err(|e| format!("Failed to create local file: {}", e));
                match local_file {
                    Err(e) => Err(e),
                    Ok(mut local_file) => {
                        let mut buffer = [0u8; 16384];
                        let mut read_res = Ok(());
                        loop {
                            match remote_file.read(&mut buffer) {
                                Ok(0) => break,
                                Ok(bytes_read) => {
                                    if let Err(e) = local_file.write_all(&buffer[..bytes_read]) {
                                        read_res = Err(format!("Failed to write local file: {}", e));
                                        break;
                                    }
                                }
                                Err(e) => {
                                    read_res = Err(format!("Failed to read remote file: {}", e));
                                    break;
                                }
                            }
                        }
                        read_res
                    }
                }
            }
        }
    };
    
    let _ = session.session.set_blocking(false);
    res
}

#[tauri::command]
pub async fn sftp_upload(
    id: String,
    local_path: String,
    remote_path: String,
    state: State<'_, AppSshState>,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    let _channel = session.channel.lock().unwrap();
    let _ = session.session.set_blocking(true);
    
    let res = {
        let sftp = session.sftp.lock().unwrap();
        let local_file = std::fs::File::open(Path::new(&local_path)).map_err(|e| format!("Failed to open local file: {}", e));
        match local_file {
            Err(e) => Err(e),
            Ok(mut local_file) => {
                let remote_file = sftp.create(Path::new(&remote_path)).map_err(|e| format!("Failed to create remote file: {}", e));
                match remote_file {
                    Err(e) => Err(e),
                    Ok(mut remote_file) => {
                        let mut buffer = [0u8; 16384];
                        let mut write_res = Ok(());
                        loop {
                            match local_file.read(&mut buffer) {
                                Ok(0) => break,
                                Ok(bytes_read) => {
                                    if let Err(e) = remote_file.write_all(&buffer[..bytes_read]) {
                                        write_res = Err(format!("Failed to write remote file: {}", e));
                                        break;
                                    }
                                }
                                Err(e) => {
                                    write_res = Err(format!("Failed to read local file: {}", e));
                                    break;
                                }
                            }
                        }
                        write_res
                    }
                }
            }
        }
    };
    
    let _ = session.session.set_blocking(false);
    res
}

// Local filesystem helpers for dual-pane
#[tauri::command]
pub async fn local_ls(local_path: String) -> Result<Vec<SftpFile>, String> {
    let path = Path::new(&local_path);
    let entries = std::fs::read_dir(path).map_err(|e| format!("Failed to read local path: {}", e))?;

    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') && name != ".config" { // Allow common .config but hide other dots unless explicitly queried
                continue;
            }

            let modified_time = metadata.modified()
                .map(|t| t.duration_since(std::time::SystemTime::UNIX_EPOCH).unwrap_or_default().as_secs())
                .unwrap_or(0);

            files.push(SftpFile {
                name,
                path: entry.path().to_string_lossy().to_string(),
                is_dir: metadata.is_dir(),
                size: metadata.len(),
                permissions: None,
                modified_time,
            });
        }
    }

    files.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(files)
}

#[tauri::command]
pub async fn local_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not find home directory".to_string())
}

#[tauri::command]
pub async fn ssh_exec_command(
    id: String,
    command: String,
    state: State<'_, AppSshState>,
) -> Result<String, String> {
    let session = {
        let sessions = state.sessions.lock().unwrap();
        sessions.get(&id).cloned()
    }.ok_or_else(|| "Session not found".to_string())?;
    
    // Lock the primary PTY channel first to pause the reader loop
    let _channel_lock = session.channel.lock().unwrap();
    
    // Temporarily set to blocking for synchronous exec round-trip
    let _ = session.session.set_blocking(true);
    
    let res = {
        let mut exec_channel = session.session.channel_session()
            .map_err(|e| format!("Failed to open SSH channel: {}", e))?;
            
        exec_channel.exec(&command)
            .map_err(|e| format!("Failed to execute command: {}", e))?;
            
        let mut output = String::new();
        exec_channel.read_to_string(&mut output)
            .map_err(|e| format!("Failed to read command output: {}", e))?;
            
        let _ = exec_channel.close();
        let _ = exec_channel.wait_close();
        
        Ok(output)
    };
    
    // Restore non-blocking
    let _ = session.session.set_blocking(false);
    
    res
}
