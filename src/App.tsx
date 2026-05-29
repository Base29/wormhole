import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Sidebar, { Host } from "./components/Sidebar";
import TerminalView from "./components/TerminalView";
import SftpView from "./components/SftpView";
import PassphrasePrompt from "./components/PassphrasePrompt";
import OSIcon from "./components/OSIcon";
import { X, Server, Eye, EyeOff, Loader2, ChevronDown } from "lucide-react";
import { open, ask, message } from "@tauri-apps/plugin-dialog";

function detectOsFromOutput(output: string): string {
  const lower = output.toLowerCase();
  
  if (lower.includes("raspbian") || lower.includes("raspberry")) {
    return "raspbian";
  }
  if (lower.includes("ubuntu")) {
    return "ubuntu";
  }
  if (lower.includes("debian")) {
    return "debian";
  }
  if (lower.includes("fedora")) {
    return "fedora";
  }
  if (lower.includes("centos") || lower.includes("rhel") || lower.includes("red hat")) {
    return "redhat";
  }
  if (lower.includes("arch")) {
    return "arch";
  }
  if (lower.includes("alpine")) {
    return "alpine";
  }
  if (lower.includes("darwin") || lower.includes("macos") || lower.includes("apple")) {
    return "macos";
  }
  if (lower.includes("linux")) {
    return "linux";
  }
  return "unknown";
}

interface ActiveSession {
  id: string;
  name: string;
  type: "terminal" | "sftp";
  hostId: string;
}

export default function App() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Connection states
  const [connecting, setConnecting] = useState<boolean>(false);
  const [pendingHost, setPendingHost] = useState<{ host: Host; type: "terminal" | "sftp" } | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  // Form states for Add/Edit
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formHost, setFormHost] = useState<string>("");
  const [formPort, setFormPort] = useState<number>(22);
  const [formUsername, setFormUsername] = useState<string>("");
  const [formLabel, setFormLabel] = useState<string>("Cloud");
  const [formAuthMethod, setFormAuthMethod] = useState<string>("agent");
  const [formKeyPath, setFormKeyPath] = useState<string>("");
  const [formSecret, setFormSecret] = useState<string>("");
  const [showSecretInput, setShowSecretInput] = useState<boolean>(false);

  // Load all hosts on mount
  useEffect(() => {
    loadHosts();
  }, []);

  const loadHosts = async () => {
    try {
      const allHosts: Host[] = await invoke("get_hosts");
      setHosts(allHosts);
    } catch (err) {
      console.error("Failed to load hosts:", err);
    }
  };

  // Connection process
  const handleConnect = async (host: Host, type: "terminal" | "sftp", secret?: string) => {
    setConnecting(true);
    const sessionId = `${host.id}-${type}`;

    // Avoid duplicating session
    if (activeSessions.some((s) => s.id === sessionId)) {
      setActiveSessionId(sessionId);
      setConnecting(false);
      return;
    }

    try {
      await invoke("connect_ssh", {
        id: sessionId,
        host: host.host,
        port: host.port,
        username: host.username,
        authMethod: host.auth_method,
        keyPath: host.key_path || null,
        passphraseOrPassword: secret || null,
      });

      // Successful connection! Add session
      const newSession: ActiveSession = {
        id: sessionId,
        name: `${host.name} (${type === "terminal" ? "SSH" : "SFTP"})`,
        type,
        hostId: host.id as string,
      };

      setActiveSessions((prev) => [...prev, newSession]);
      setActiveSessionId(sessionId);
      setShowPrompt(false);
      setPendingHost(null);

      // Asynchronously trigger remote OS detection in the background
      setTimeout(async () => {
        try {
          const osInfo: string = await invoke("ssh_exec_command", {
            id: sessionId,
            command: "cat /etc/os-release /proc/device-tree/model 2>/dev/null || uname -s",
          });
          const detectedOs = detectOsFromOutput(osInfo);
          if (detectedOs && detectedOs !== "unknown" && host.os !== detectedOs) {
            const updatedHost: Host = { ...host, os: detectedOs };
            await invoke("update_host", {
              host: updatedHost,
              secret: null,
            });
            loadHosts();
          }
        } catch (err) {
          console.warn("Failed to detect remote OS or execute background command:", err);
        }
      }, 300);
    } catch (err: any) {
      console.warn("First connection attempt failed:", err);
      const errStr = String(err).toLowerCase();
      const needsPassphrase = errStr.includes("passphrase") || 
                              errStr.includes("encrypted") || 
                              errStr.includes("decrypt") || 
                              errStr.includes("callback");
      const shouldPrompt = !secret && (
        host.auth_method === "password" || 
        (host.auth_method === "key" && needsPassphrase)
      );

      if (shouldPrompt) {
        setPendingHost({ host, type });
        setShowPrompt(true);
      } else {
        await message(`Connection failed: ${err}`, { title: "Connection Error", kind: "error" });
      }
    } finally {
      setConnecting(false);
    }
  };

  const handlePromptSubmit = async (secret: string, saveInKeychain: boolean) => {
    if (!pendingHost) return;
    const { host, type } = pendingHost;

    if (saveInKeychain) {
      // Proactively save secret in the macOS Keychain via our backend
      try {
        await invoke("update_host", {
          host,
          secret,
        });
      } catch (err) {
        console.error("Failed to update secret in vault:", err);
      }
    }

    // Connect with the provided secret
    handleConnect(host, type, secret);
  };

  const handleDisconnect = async (sessionId: string) => {
    try {
      await invoke("disconnect_ssh", { id: sessionId });
    } catch (err) {
      console.error("Failed to disconnect cleanly:", err);
    }

    setActiveSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  };

  const handleSelectKeyFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
      });
      if (selected && typeof selected === "string") {
        setFormKeyPath(selected);
      }
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
  };

  // CRUD handlers
  const openAddModal = () => {
    setEditingHost(null);
    setFormName("");
    setFormHost("");
    setFormPort(22);
    setFormUsername("");
    setFormLabel("Cloud");
    setFormAuthMethod("agent");
    setFormKeyPath("");
    setFormSecret("");
    setShowFormModal(true);
  };

  const openEditModal = async (host: Host) => {
    setEditingHost(host);
    setFormName(host.name);
    setFormHost(host.host);
    setFormPort(host.port);
    setFormUsername(host.username);
    setFormLabel(host.label);
    setFormAuthMethod(host.auth_method);
    setFormKeyPath(host.key_path || "");
    setFormSecret(""); // Keep secret blank to represent "no change"
    setShowFormModal(true);
  };

  const handleDeleteHost = async (id: string) => {
    const yes = await ask("Delete this host and all stored credentials from the macOS Keychain?", {
      title: "Confirm Deletion",
      kind: "warning",
    });
    if (yes) {
      try {
        await invoke("delete_host", { id });
        loadHosts();
      } catch (err) {
        await message(`Failed to delete host: ${err}`, { title: "Error", kind: "error" });
      }
    }
  };

  const handleSaveHost = async (e: React.FormEvent) => {
    e.preventDefault();

    const hostData: Host = {
      id: editingHost ? editingHost.id : `host-${Date.now()}`,
      name: formName,
      host: formHost,
      port: Number(formPort),
      username: formUsername,
      label: formLabel,
      auth_method: formAuthMethod,
      key_path: formAuthMethod === "key" ? formKeyPath : undefined,
    };

    try {
      if (editingHost) {
        await invoke("update_host", {
          host: hostData,
          secret: formSecret || null,
        });
      } else {
        await invoke("add_host", {
          host: hostData,
          secret: formSecret || null,
        });
      }
      setShowFormModal(false);
      loadHosts();
    } catch (err) {
      await message(`Failed to save host: ${err}`, { title: "Error", kind: "error" });
    }
  };
  return (
    <div className="flex w-full h-full glass-panel overflow-hidden relative">
      
      {/* Sidebar Navigation */}
      <Sidebar
        hosts={hosts}
        activeSessions={activeSessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onAddHost={openAddModal}
        onEditHost={openEditModal}
        onDeleteHost={handleDeleteHost}
      />

      {/* Main Canvas Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#12131a]/40">
        
        {/* Title bar / Tab bar */}
        <div className="h-12 border-b border-white/5 bg-black/20 flex items-center px-4 overflow-x-auto select-none drag scrollbar-none gap-2">
          {activeSessions.length === 0 ? (
            <div className="text-xs text-white/30 font-medium pl-4 py-3">No active sessions. Connect to a server from the sidebar.</div>
          ) : (
            activeSessions.map((session) => {
              const host = hosts.find((h) => h.id === session.hostId);
              return (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 text-xs border ${
                    activeSessionId === session.id
                      ? "bg-purple-500/10 border-purple-500/30 text-white font-medium shadow shadow-purple-500/5"
                      : "hover:bg-white/5 border-transparent text-white/60 hover:text-white"
                  }`}
                >
                  <div className="relative flex items-center justify-center flex-shrink-0 w-3.5 h-3.5">
                    <OSIcon os={host?.os} size={11} className="flex-shrink-0" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black/50 ${
                        session.type === "terminal" ? "bg-purple-500" : "bg-cyan-500"
                      }`}
                      title={session.type === "terminal" ? "Terminal" : "SFTP"}
                    />
                  </div>
                  <span>{session.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDisconnect(session.id);
                    }}
                    className="p-0.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Tab Canvas Content */}
        <div className="flex-1 min-h-0 w-full relative">
          {activeSessions.map((session) => (
            <div
              key={session.id}
              className="w-full h-full"
              style={{ display: activeSessionId === session.id ? "block" : "none" }}
            >
              {session.type === "terminal" ? (
                <TerminalView
                  sessionId={session.id}
                  onClose={() => handleDisconnect(session.id)}
                />
              ) : (
                <SftpView
                  sessionId={session.id}
                  hostName={hosts.find((h) => h.id === session.hostId)?.name || "Remote"}
                />
              )}
            </div>
          ))}

          {activeSessions.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
              <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl text-purple-400 mb-4 shadow shadow-purple-500/5">
                <Server size={36} className="animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Welcome to Wormhole</h2>
              <p className="text-xs text-white/40 max-w-sm leading-relaxed">
                Connect to a saved server from the sidebar or click <strong className="text-purple-400 cursor-pointer hover:underline" onClick={openAddModal}>"+"</strong> to register a new remote SSH credentials vault.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* CONNECTING LOADER SPINNER */}
      {connecting && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#282a36] border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col items-center space-y-3">
            <Loader2 className="animate-spin text-purple-400" size={32} />
            <span className="text-xs text-white/80 font-medium">Establishing secure SSH tunnel...</span>
          </div>
        </div>
      )}

      {/* CREDENTIALS/PASSPHRASE PROMPT FALLBACK */}
      {showPrompt && pendingHost && (
        <PassphrasePrompt
          hostName={pendingHost.host.name}
          authMethod={pendingHost.host.auth_method}
          onCancel={() => {
            setShowPrompt(false);
            setPendingHost(null);
          }}
          onSubmit={handlePromptSubmit}
        />
      )}

      {/* ADD/EDIT HOST FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-40 animate-fade-in">
          <div className="w-[450px] bg-[#282a36] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-white/90">
              {editingHost ? `Edit Remote: ${editingHost.name}` : "Register New SSH Server"}
            </h3>

            <form onSubmit={handleSaveHost} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Home Lab"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Group Label</label>
                  <div className="relative">
                    <select
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      className="w-full bg-[#1e2233] border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-xs text-white appearance-none focus:outline-none focus:border-purple-400"
                    >
                      <option value="Cloud">Cloud</option>
                      <option value="Home Lab">Home Lab</option>
                      <option value="Development">Development</option>
                      <option value="Default">Default</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white/40">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Host IP / Domain</label>
                  <input
                    type="text"
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    placeholder="192.168.1.10"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Port</label>
                  <input
                    type="number"
                    value={formPort}
                    onChange={(e) => setFormPort(Number(e.target.value))}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="root"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Authentication Method</label>
                <div className="relative">
                  <select
                    value={formAuthMethod}
                    onChange={(e) => setFormAuthMethod(e.target.value)}
                    className="w-full bg-[#1e2233] border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-xs text-white appearance-none focus:outline-none focus:border-purple-400"
                  >
                    <option value="agent">System ssh-agent (Recommended)</option>
                    <option value="password">Password</option>
                    <option value="key">Private Key File</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white/40">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {formAuthMethod === "key" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Private Key Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formKeyPath}
                      onChange={(e) => setFormKeyPath(e.target.value)}
                      placeholder="/Users/username/.ssh/id_rsa"
                      className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSelectKeyFile}
                      className="px-3.5 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 rounded-lg text-xs font-semibold hover:text-purple-300 transition-colors flex-shrink-0"
                    >
                      Browse...
                    </button>
                  </div>
                </div>
              )}

              {formAuthMethod !== "agent" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    {formAuthMethod === "key" ? "Key Passphrase (Optional)" : "Password (Optional)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretInput ? "text" : "password"}
                      value={formSecret}
                      onChange={(e) => setFormSecret(e.target.value)}
                      placeholder={editingHost ? "•••••••• (Leave blank to keep unchanged)" : "Enter secret..."}
                      className="w-full bg-black/20 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretInput(!showSecretInput)}
                      className="absolute right-3 top-2.5 text-white/40 hover:text-white/70"
                    >
                      {showSecretInput ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <span className="text-[9px] text-white/30 block mt-0.5 leading-normal">
                    Secrets will be stored in the native macOS Keychain via security services.
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 text-xs pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium shadow-lg shadow-purple-500/10 transition-colors"
                >
                  Save Remote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
