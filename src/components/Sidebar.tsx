import { useState } from "react";
import { Terminal, FolderOpen, Plus, Trash2, Edit2, Power, ChevronDown, ChevronRight } from "lucide-react";
import OSIcon from "./OSIcon";

export interface Host {
  id: String;
  name: string;
  host: string;
  port: number;
  username: string;
  label: string;
  auth_method: string;
  key_path?: string;
  os?: string;
}

interface SidebarProps {
  hosts: Host[];
  activeSessions: { id: string; name: string; type: "terminal" | "sftp"; hostId: string }[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onConnect: (host: Host, type: "terminal" | "sftp") => void;
  onDisconnect: (sessionId: string) => void;
  onAddHost: () => void;
  onEditHost: (host: Host) => void;
  onDeleteHost: (id: string) => void;
}

export default function Sidebar({
  hosts,
  activeSessions,
  activeSessionId,
  onSelectSession,
  onConnect,
  onDisconnect,
  onAddHost,
  onEditHost,
  onDeleteHost,
}: SidebarProps) {
  const [expandedLabels, setExpandedLabels] = useState<Record<string, boolean>>({
    Cloud: true,
    "Home Lab": true,
    Default: true,
  });

  // Group hosts by labels
  const groupedHosts: Record<string, Host[]> = {};
  hosts.forEach((host) => {
    const label = host.label || "Default";
    if (!groupedHosts[label]) {
      groupedHosts[label] = [];
    }
    groupedHosts[label].push(host);
  });

  const toggleLabel = (label: string) => {
    setExpandedLabels((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="w-64 h-full glass-sidebar flex flex-col flex-shrink-0 select-none">
      {/* Titlebar padding for macOS window buttons */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-black/10 select-none drag">
        <span className="font-semibold text-xs tracking-wider text-white/40 uppercase pl-16">WORMHOLE</span>
        <button
          onClick={onAddHost}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white"
          title="Add New Server"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Host Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 select-none">
            REMOTES
          </span>
          <div className="mt-2 space-y-1">
            {Object.keys(groupedHosts).length === 0 ? (
              <div className="text-xs text-white/30 px-2 py-4 text-center border border-white/5 border-dashed rounded-lg">
                No remotes configured. Click '+' to add.
              </div>
            ) : (
              Object.entries(groupedHosts).map(([label, labelHosts]) => (
                <div key={label} className="space-y-0.5">
                  <button
                    onClick={() => toggleLabel(label)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors"
                  >
                    {expandedLabels[label] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span>{label}</span>
                    <span className="ml-auto text-[9px] bg-white/5 px-1.5 py-0.2 rounded-full">
                      {labelHosts.length}
                    </span>
                  </button>

                  {expandedLabels[label] && (
                    <div className="pl-2 space-y-0.5">
                      {labelHosts.map((host) => (
                        <div
                          key={host.id as string}
                          className="group relative flex items-center w-full rounded-md hover:bg-white/5 transition-all text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1 px-2.5 py-1.5 min-w-0">
                            <OSIcon os={host.os} size={13} className="flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-white/80 font-medium truncate">{host.name}</span>
                              <span className="text-[9px] text-white/40 truncate">{host.username}@{host.host}</span>
                            </div>
                          </div>

                          {/* Action overlay */}
                          <div className="absolute right-2 top-1.5 hidden group-hover:flex items-center gap-1 bg-neutral-900/90 backdrop-blur-sm p-0.5 rounded border border-white/10 shadow">
                            <button
                              onClick={() => onConnect(host, "terminal")}
                              className="p-1 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 rounded"
                              title="SSH Terminal"
                            >
                              <Terminal size={11} />
                            </button>
                            <button
                              onClick={() => onConnect(host, "sftp")}
                              className="p-1 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded"
                              title="SFTP Explorer"
                            >
                              <FolderOpen size={11} />
                            </button>
                            <button
                              onClick={() => onEditHost(host)}
                              className="p-1 hover:bg-white/10 text-white/60 hover:text-white rounded"
                              title="Edit"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => onDeleteHost(host.id as string)}
                              className="p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded"
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">
              ACTIVE SESSIONS
            </span>
            <div className="mt-2 space-y-1">
              {activeSessions.map((session) => {
                const host = hosts.find((h) => h.id === session.hostId);
                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                      activeSessionId === session.id
                        ? "bg-purple-500/20 border border-purple-500/30 text-white"
                        : "hover:bg-white/5 text-white/70"
                    }`}
                  >
                    <div className="relative flex items-center justify-center flex-shrink-0 w-3.5 h-3.5">
                      <OSIcon os={host?.os} size={12} className="flex-shrink-0" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black/50 ${
                          session.type === "terminal" ? "bg-purple-500" : "bg-cyan-500"
                        }`}
                        title={session.type === "terminal" ? "Terminal" : "SFTP"}
                      />
                    </div>
                    <span className="truncate flex-1 font-medium">{session.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDisconnect(session.id);
                      }}
                      className="p-0.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      title="Disconnect"
                    >
                      <Power size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 bg-black/10 flex items-center justify-between text-[10px] text-white/30">
        <span>macOS Vault Secured</span>
        <span className="flex items-center gap-1 text-[9px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Connected
        </span>
      </div>
    </aside>
  );
}
