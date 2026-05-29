import React, { useState, useEffect } from "react";
import { Folder, File, ArrowLeft, RefreshCw, Plus, Trash2, Edit2, Download, Upload, HardDrive, Globe } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ask, message } from "@tauri-apps/plugin-dialog";

interface SftpFile {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified_time: number;
}

interface SftpViewProps {
  sessionId: string;
  hostName: string;
}

export default function SftpView({ sessionId, hostName }: SftpViewProps) {
  // Local filesystem states
  const [localPath, setLocalPath] = useState<string>("");
  const [localFiles, setLocalFiles] = useState<SftpFile[]>([]);
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState<boolean>(false);

  // Remote filesystem states
  const [remotePath, setRemotePath] = useState<string>("/");
  const [remoteFiles, setRemoteFiles] = useState<SftpFile[]>([]);
  const [remoteSelected, setRemoteSelected] = useState<string | null>(null);
  const [remoteLoading, setRemoteLoading] = useState<boolean>(false);

  // Modal and naming states
  const [showMkdirModal, setShowMkdirModal] = useState<"local" | "remote" | null>(null);
  const [newDirName, setNewDirName] = useState<string>("");
  const [showRenameModal, setShowRenameModal] = useState<"local" | "remote" | null>(null);
  const [renameTarget, setRenameTarget] = useState<SftpFile | null>(null);
  const [newName, setNewName] = useState<string>("");

  const [draggedFile, setDraggedFile] = useState<{ source: "local" | "remote"; file: SftpFile } | null>(null);

  // Load initial paths
  useEffect(() => {
    loadLocalHome();
    loadRemoteHome();
  }, [sessionId]);

  // Load Local Home directory
  const loadLocalHome = async () => {
    try {
      const home: string = await invoke("local_home_dir");
      setLocalPath(home);
      loadLocalDir(home);
    } catch (err) {
      console.error("Failed to load local home dir:", err);
    }
  };

  // Load Remote Home directory
  const loadRemoteHome = async () => {
    try {
      const home: string = await invoke("sftp_home_dir", { id: sessionId });
      loadRemoteDir(home);
    } catch (err) {
      console.error("Failed to load remote home dir:", err);
      loadRemoteDir("/");
    }
  };

  // Load Local Directory contents
  const loadLocalDir = async (path: string) => {
    setLocalLoading(true);
    try {
      const files: SftpFile[] = await invoke("local_ls", { localPath: path });
      setLocalFiles(files);
      setLocalPath(path);
      setLocalSelected(null);
    } catch (err) {
      message(`Failed to load local directory: ${err}`, { title: "Local Load Error", kind: "error" });
    } finally {
      setLocalLoading(false);
    }
  };

  // Load Remote Directory contents
  const loadRemoteDir = async (path: string) => {
    setRemoteLoading(true);
    try {
      const files: SftpFile[] = await invoke("sftp_ls", { id: sessionId, remotePath: path });
      setRemoteFiles(files);
      setRemotePath(path);
      setRemoteSelected(null);
    } catch (err) {
      message(`Failed to load remote directory: ${err}`, { title: "Remote Load Error", kind: "error" });
    } finally {
      setRemoteLoading(false);
    }
  };

  // Directory navigation helpers
  const handleLocalDbClick = (file: SftpFile) => {
    if (file.is_dir) {
      loadLocalDir(file.path);
    }
  };

  const handleRemoteDbClick = (file: SftpFile) => {
    if (file.is_dir) {
      loadRemoteDir(file.path);
    }
  };

  const localGoUp = () => {
    const parts = localPath.split("/");
    parts.pop();
    const parentPath = parts.join("/") || "/";
    loadLocalDir(parentPath);
  };

  const remoteGoUp = () => {
    const parts = remotePath.split("/");
    parts.pop();
    const parentPath = parts.join("/") || "/";
    loadRemoteDir(parentPath);
  };

  // Handle Mkdir
  const handleCreateDir = async () => {
    if (!newDirName.trim()) return;

    try {
      if (showMkdirModal === "local") {
        // Create local directory could be added here
      } else if (showMkdirModal === "remote") {
        const fullPath = `${remotePath}/${newDirName}`.replace(/\/+/g, "/");
        await invoke("sftp_mkdir", { id: sessionId, remotePath: fullPath });
        loadRemoteDir(remotePath);
      }
    } catch (err) {
      message(`Failed to create directory: ${err}`, { title: "Folder Creation Error", kind: "error" });
    } finally {
      setShowMkdirModal(null);
      setNewDirName("");
    }
  };

  // Handle Rename
  const handleRename = async () => {
    if (!newName.trim() || !renameTarget) return;

    try {
      if (showRenameModal === "local") {
        // Local rename
      } else if (showRenameModal === "remote") {
        const dirParts = renameTarget.path.split("/");
        dirParts.pop();
        const destPath = `${dirParts.join("/")}/${newName}`.replace(/\/+/g, "/");
        await invoke("sftp_rename", { id: sessionId, srcPath: renameTarget.path, destPath });
        loadRemoteDir(remotePath);
      }
    } catch (err) {
      message(`Rename failed: ${err}`, { title: "Rename Error", kind: "error" });
    } finally {
      setShowRenameModal(null);
      setRenameTarget(null);
      setNewName("");
    }
  };

  // Handle Delete
  const handleDelete = async (file: SftpFile, isLocal: boolean) => {
    const yes = await ask(`Are you sure you want to delete ${file.name}?`, {
      title: "Confirm Deletion",
      kind: "warning",
    });
    if (!yes) return;

    try {
      if (isLocal) {
        // Local delete
      } else {
        await invoke("sftp_rm", { id: sessionId, remotePath: file.path, isDir: file.is_dir });
        loadRemoteDir(remotePath);
      }
    } catch (err) {
      await message(`Delete failed: ${err}`, { title: "Error", kind: "error" });
    }
  };

  // Handle Upload
  const handleUpload = async (localFile: SftpFile) => {
    const dest = `${remotePath}/${localFile.name}`.replace(/\/+/g, "/");
    setRemoteLoading(true);
    try {
      await invoke("sftp_upload", { id: sessionId, localPath: localFile.path, remotePath: dest });
      loadRemoteDir(remotePath);
    } catch (err) {
      message(`Upload failed: ${err}`, { title: "Upload Error", kind: "error" });
    } finally {
      setRemoteLoading(false);
    }
  };

  // Handle Download
  const handleDownload = async (remoteFile: SftpFile) => {
    const dest = `${localPath}/${remoteFile.name}`.replace(/\/+/g, "/");
    setLocalLoading(true);
    try {
      await invoke("sftp_download", { id: sessionId, remotePath: remoteFile.path, localPath: dest });
      loadLocalDir(localPath);
    } catch (err) {
      message(`Download failed: ${err}`, { title: "Download Error", kind: "error" });
    } finally {
      setLocalLoading(false);
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, file: SftpFile, source: "local" | "remote") => {
    setDraggedFile({ source, file });
    e.dataTransfer.setData("text/plain", file.name);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, target: "local" | "remote") => {
    e.preventDefault();
    if (!draggedFile) return;

    if (draggedFile.source === "local" && target === "remote") {
      // Upload
      await handleUpload(draggedFile.file);
    } else if (draggedFile.source === "remote" && target === "local") {
      // Download
      await handleDownload(draggedFile.file);
    }
    setDraggedFile(null);
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Format Unix date
  const formatDate = (unix: number) => {
    if (unix === 0) return "-";
    const date = new Date(unix * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-full flex bg-[#1e2233] text-sm overflow-hidden animate-fade-in">
      
      {/* LOCAL PANE */}
      <div 
        className={`flex-1 flex flex-col border-r border-white/5 h-full overflow-hidden ${draggedFile?.source === "remote" ? "bg-cyan-500/5 border-2 border-cyan-500/30" : ""}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, "local")}
      >
        <div className="p-3 bg-black/20 border-b border-white/5 flex items-center gap-2">
          <HardDrive size={15} className="text-purple-400" />
          <span className="font-semibold text-white/90">Local Filesystem</span>
          <button 
            onClick={localGoUp} 
            disabled={localPath === "/"}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent text-white/70 hover:text-white ml-auto"
          >
            <ArrowLeft size={14} />
          </button>
          <button 
            onClick={() => loadLocalDir(localPath)} 
            className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Path breadcrumb */}
        <div className="px-3 py-1 bg-black/10 text-xs text-white/40 truncate border-b border-white/5 font-mono select-text">
          {localPath}
        </div>

        {/* Files list */}
        <div className="flex-1 overflow-y-auto p-2">
          {localLoading ? (
            <div className="h-full flex items-center justify-center text-white/40 text-xs gap-2">
              <RefreshCw size={16} className="animate-spin" /> Loading Local...
            </div>
          ) : (
            <div className="space-y-0.5">
              {localFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={(e) => {
                    if (e.detail === 2) {
                      handleLocalDbClick(file);
                    } else {
                      setLocalSelected(file.path);
                    }
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file, "local")}
                  className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    localSelected === file.path 
                      ? "bg-purple-500/20 text-white border border-purple-500/30" 
                      : "hover:bg-white/5 text-white/80"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {file.is_dir ? (
                      <Folder size={15} className="text-purple-400 flex-shrink-0" />
                    ) : (
                      <File size={15} className="text-white/60 flex-shrink-0" />
                    )}
                    <span className="truncate select-none font-medium text-xs">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-white/40 flex-shrink-0">
                    <span className="w-28 text-right hidden lg:inline">{formatDate(file.modified_time)}</span>
                    <span className="w-16 text-right">{formatSize(file.size)}</span>
                    <div className="w-8 hidden group-hover:flex items-center justify-end">
                      {!file.is_dir && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleUpload(file); }}
                          className="p-1 hover:bg-purple-500/20 text-purple-400 rounded"
                          title="Upload to Remote"
                        >
                          <Upload size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* REMOTE PANE */}
      <div 
        className={`flex-1 flex flex-col h-full overflow-hidden ${draggedFile?.source === "local" ? "bg-purple-500/5 border-2 border-purple-500/30" : ""}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, "remote")}
      >
        <div className="p-3 bg-black/20 border-b border-white/5 flex items-center gap-2">
          <Globe size={15} className="text-cyan-400" />
          <span className="font-semibold text-white/90">Remote: {hostName}</span>
          
          <div className="ml-auto flex items-center gap-1">
            <button 
              onClick={() => {
                setNewDirName("");
                setShowMkdirModal("remote");
              }}
              className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white"
              title="Create Remote Directory"
            >
              <Plus size={14} />
            </button>
            <button 
              onClick={remoteGoUp} 
              disabled={remotePath === "/" || remotePath === ""}
              className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent text-white/70 hover:text-white"
            >
              <ArrowLeft size={14} />
            </button>
            <button 
              onClick={() => loadRemoteDir(remotePath)} 
              className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Path breadcrumb */}
        <div className="px-3 py-1 bg-black/10 text-xs text-white/40 truncate border-b border-white/5 font-mono select-text">
          {remotePath}
        </div>

        {/* Files list */}
        <div className="flex-1 overflow-y-auto p-2">
          {remoteLoading ? (
            <div className="h-full flex items-center justify-center text-white/40 text-xs gap-2">
              <RefreshCw size={16} className="animate-spin" /> Loading Remote...
            </div>
          ) : (
            <div className="space-y-0.5">
              {remoteFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={(e) => {
                    if (e.detail === 2) {
                      handleRemoteDbClick(file);
                    } else {
                      setRemoteSelected(file.path);
                    }
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file, "remote")}
                  className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    remoteSelected === file.path 
                      ? "bg-cyan-500/20 text-white border border-cyan-500/30" 
                      : "hover:bg-white/5 text-white/80"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {file.is_dir ? (
                      <Folder size={15} className="text-cyan-400 flex-shrink-0" />
                    ) : (
                      <File size={15} className="text-white/60 flex-shrink-0" />
                    )}
                    <span className="truncate select-none font-medium text-xs">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-white/40 flex-shrink-0">
                    <span className="w-28 text-right hidden lg:inline">{formatDate(file.modified_time)}</span>
                    <span className="w-16 text-right">{formatSize(file.size)}</span>
                    <div className="w-16 hidden group-hover:flex items-center justify-end gap-1 bg-black/35 px-1 py-0.5 rounded shadow">
                      {!file.is_dir && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                          className="p-0.5 hover:bg-cyan-500/20 text-cyan-400 rounded"
                          title="Download to Local"
                        >
                          <Download size={11} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setRenameTarget(file);
                          setNewName(file.name);
                          setShowRenameModal("remote");
                        }}
                        className="p-0.5 hover:bg-white/10 text-white/60 rounded"
                        title="Rename"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(file, false); }}
                        className="p-0.5 hover:bg-red-500/20 text-red-400 rounded"
                        title="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MKDIR MODAL */}
      {showMkdirModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="w-80 bg-[#282a36] border border-white/10 rounded-lg p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white/90 mb-3">Create New Remote Folder</h3>
            <input
              type="text"
              value={newDirName}
              onChange={(e) => setNewDirName(e.target.value)}
              placeholder="Folder Name"
              className="w-full bg-black/20 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateDir()}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button 
                onClick={() => setShowMkdirModal(null)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateDir}
                className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {showRenameModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="w-80 bg-[#282a36] border border-white/10 rounded-lg p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white/90 mb-3">Rename Item</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New Name"
              className="w-full bg-black/20 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button 
                onClick={() => {
                  setShowRenameModal(null);
                  setRenameTarget(null);
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRename}
                className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
