import { useState } from "react";
import { Terminal, FolderOpen, Plus, Trash2, Edit2, Power, ChevronDown, ChevronRight, PanelLeftClose } from "lucide-react";
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
  collapsed: boolean;
  onToggleSidebar: () => void;
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
  collapsed,
  onToggleSidebar,
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
    <aside 
      className={`h-full glass-sidebar flex flex-col flex-shrink-0 select-none transition-all duration-300 ease-in-out ${
        collapsed ? "w-0 opacity-0 pointer-events-none" : "w-64"
      }`}
      style={{ borderRight: collapsed ? "none" : "" }}
    >
      {/* Titlebar padding for macOS window buttons */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-black/10 select-none drag">
        <span className="font-semibold text-xs tracking-wider text-white/40 uppercase pl-16">WORMHOLE</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddHost}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white cursor-pointer"
            title="Add New Server"
          >
            <Plus size={15} />
          </button>
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white cursor-pointer"
            title="Collapse Sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>

      {/* Host Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-none">
        <div>
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-2 select-none">
            WORMHOLES
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
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-white/60 hover:text-white/90 transition-colors cursor-pointer"
                  >
                    {expandedLabels[label] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span>{label}</span>
                    <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full font-medium">
                      {labelHosts.length}
                    </span>
                  </button>

                  {expandedLabels[label] && (
                    <div className="pl-1.5 space-y-1">
                      {labelHosts.map((host) => (
                        <div
                          key={host.id as string}
                          onClick={() => onConnect(host, "terminal")}
                          className="group relative flex items-center w-full rounded-lg hover:bg-white/5 cursor-pointer transition-all duration-150 border border-transparent hover:border-white/5 select-none"
                        >
                          <div className="flex items-center gap-2.5 flex-1 px-3 py-2 min-w-0">
                            <OSIcon os={host.os} size={15} className="flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13.5px] font-semibold text-white/90 truncate leading-snug">{host.name}</span>
                              <span className="text-[11px] text-white/45 truncate leading-normal">{host.username}@{host.host}</span>
                            </div>
                          </div>

                          {/* Action overlay */}
                          <div 
                            className="absolute right-2 flex items-center gap-1 bg-[#181a24]/95 backdrop-blur-md p-1 rounded-lg border border-white/10 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onConnect(host, "terminal");
                              }}
                              className="p-1.5 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 rounded-md transition-colors cursor-pointer"
                              title="SSH Terminal"
                            >
                              <Terminal size={13.5} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onConnect(host, "sftp");
                              }}
                              className="p-1.5 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded-md transition-colors cursor-pointer"
                              title="SFTP Explorer"
                            >
                              <FolderOpen size={13.5} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditHost(host);
                              }}
                              className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-md transition-colors cursor-pointer"
                              title="Edit Host"
                            >
                              <Edit2 size={13.5} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteHost(host.id as string);
                              }}
                              className="p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-md transition-colors cursor-pointer"
                              title="Delete Host"
                            >
                              <Trash2 size={13.5} />
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
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-2 select-none">
              ACTIVE SESSIONS
            </span>
            <div className="mt-2 space-y-1">
              {activeSessions.map((session) => {
                const host = hosts.find((h) => h.id === session.hostId);
                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 text-[13px] border border-transparent select-none ${
                      activeSessionId === session.id
                        ? "bg-purple-500/20 border border-purple-500/30 text-white font-semibold"
                        : "hover:bg-white/5 text-white/70"
                    }`}
                  >
                    <div className="relative flex items-center justify-center flex-shrink-0 w-4 h-4">
                      <OSIcon os={host?.os} size={14} className="flex-shrink-0" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black/50 ${
                          session.type === "terminal" ? "bg-purple-500" : "bg-cyan-500"
                        }`}
                        title={session.type === "terminal" ? "Terminal" : "SFTP"}
                      />
                    </div>
                    <span className="truncate flex-1 leading-snug">{session.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDisconnect(session.id);
                      }}
                      className="p-1 rounded-md hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                      title="Disconnect"
                    >
                      <Power size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 bg-black/10 flex items-center justify-between text-[10px] text-white/30 select-none">
        <span>macOS Vault Secured</span>
        <span className="flex items-center gap-1 text-[9px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Connected
        </span>
      </div>
    </aside>
  );
}
