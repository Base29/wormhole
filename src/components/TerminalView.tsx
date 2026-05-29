import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { 
  Sparkles, X, RotateCw, Search, Play, Square, Trash2, 
  HardDrive, Cpu, FileText 
} from "lucide-react";
import "@xterm/xterm/css/xterm.css";

// Dracula Theme definition
const draculaTheme = {
  background: "#282a36",
  foreground: "#f8f8f2",
  cursor: "#bd93f9",
  cursorAccent: "#282a36",
  selectionBackground: "rgba(68, 71, 90, 0.5)",
  black: "#21222c",
  red: "#ff5555",
  green: "#50fa7b",
  yellow: "#f1fa8c",
  blue: "#bd93f9",
  magenta: "#ff79c6",
  cyan: "#8be9fd",
  white: "#f8f8f2",
  brightBlack: "#6272a4",
  brightRed: "#ff6e6e",
  brightGreen: "#69ff94",
  brightYellow: "#ffffa5",
  brightBlue: "#d6acff",
  brightMiddle: "#bd93f9",
  brightMagenta: "#ff92df",
  brightCyan: "#a4ffff",
  brightWhite: "#ffffff",
};

interface TerminalViewProps {
  sessionId: string;
  onClose?: () => void;
}

interface Container {
  ID: string;
  Names: string;
  Image: string;
  Status: string;
  Ports: string;
  Created: string;
}

interface DockerImage {
  ID: string;
  Repository: string;
  Tag: string;
  Size: string;
  Created: string;
}

interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  avail: string;
  usePercent: number;
  mountedOn: string;
}

interface MemoryInfo {
  memTotal: number;
  memUsed: number;
  memFree: number;
  memShared: number;
  memBuff: number;
  memAvail: number;
  swapTotal: number;
  swapUsed: number;
  swapFree: number;
}

interface ServiceInfo {
  name: string;
  load: string;
  active: string;
  sub: string;
  desc: string;
}

interface ProcessInfo {
  user: string;
  pid: string;
  cpu: number;
  mem: number;
  vsz: string;
  rss: string;
  tty: string;
  stat: string;
  start: string;
  time: string;
  command: string;
}

// ==========================================
//   Terminal-inline ANSI Formatters
// ==========================================

function formatDockerPsToAnsi(raw: string): string {
  try {
    const lines = raw.trim().split("\n").filter(Boolean);
    const containers: Container[] = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter((c): c is Container => c !== null);

    if (containers.length === 0) {
      return "  \x1b[1;33mNo Docker containers running on this remote host.\x1b[0m\r\n";
    }

    const colWidths = { id: 12, name: 18, image: 20, status: 22, ports: 18 };
    
    // Draw top border
    let out = "\x1b[38;5;239m┌" + "─".repeat(colWidths.id + 2) + "┬" + 
              "─".repeat(colWidths.name + 2) + "┬" + 
              "─".repeat(colWidths.image + 2) + "┬" + 
              "─".repeat(colWidths.status + 2) + "┬" + 
              "─".repeat(colWidths.ports + 2) + "┐\x1b[0m\r\n";
              
    // Draw headers
    out += `\x1b[38;5;239m│\x1b[0m \x1b[1;36m${"CONTAINER ID".padEnd(colWidths.id)}\x1b[0m \x1b[38;5;239m│\x1b[0m \x1b[1;36m${"NAME".padEnd(colWidths.name)}\x1b[0m \x1b[38;5;239m│\x1b[0m \x1b[1;36m${"IMAGE".padEnd(colWidths.image)}\x1b[0m \x1b[38;5;239m│\x1b[0m \x1b[1;36m${"STATUS".padEnd(colWidths.status)}\x1b[0m \x1b[38;5;239m│\x1b[0m \x1b[1;36m${"PORTS".padEnd(colWidths.ports)}\x1b[0m \x1b[38;5;239m│\x1b[0m\r\n`;
    
    // Draw separator
    out += "\x1b[38;5;239m├" + "─".repeat(colWidths.id + 2) + "┼" + 
              "─".repeat(colWidths.name + 2) + "┼" + 
              "─".repeat(colWidths.image + 2) + "┼" + 
              "─".repeat(colWidths.status + 2) + "┼" + 
              "─".repeat(colWidths.ports + 2) + "┤\x1b[0m\r\n";

    // Draw rows
    for (const c of containers) {
      const idStr = c.ID.slice(0, colWidths.id).padEnd(colWidths.id);
      
      const nameVal = c.Names.length > colWidths.name ? c.Names.slice(0, colWidths.name - 3) + "..." : c.Names;
      const nameStr = nameVal.padEnd(colWidths.name);
      
      const imgVal = c.Image.length > colWidths.image ? c.Image.slice(0, colWidths.image - 3) + "..." : c.Image;
      const imgStr = imgVal.padEnd(colWidths.image);
      
      const isUp = c.Status.toLowerCase().startsWith("up");
      const statVal = isUp ? `\x1b[1;32m●\x1b[0m \x1b[32m${c.Status}\x1b[0m` : `\x1b[1;31m■\x1b[0m \x1b[31m${c.Status}\x1b[0m`;
      
      const rawStatusLength = c.Status.length + 2;
      const statPad = rawStatusLength > colWidths.status ? "" : " ".repeat(colWidths.status - rawStatusLength);
      const statStr = (rawStatusLength > colWidths.status ? c.Status.slice(0, colWidths.status - 3) + "..." : statVal) + statPad;
      
      const portVal = c.Ports.length > colWidths.ports ? c.Ports.slice(0, colWidths.ports - 3) + "..." : c.Ports;
      const portStr = portVal.padEnd(colWidths.ports);
      
      out += `\x1b[38;5;239m│\x1b[0m \x1b[33m${idStr}\x1b[0m \x1b[38;5;239m│\x1b[0m \x1b[1;37m${nameStr}\x1b[0m \x1b[38;5;239m│\x1b[0m \x1b[38;5;141m${imgStr}\x1b[0m \x1b[38;5;239m│\x1b[0m ${statStr} \x1b[38;5;239m│\x1b[0m \x1b[36m${portStr}\x1b[0m \x1b[38;5;239m│\x1b[0m\r\n`;
    }
    
    // Draw bottom border
    out += "\x1b[38;5;239m└" + "─".repeat(colWidths.id + 2) + "┴" + 
              "─".repeat(colWidths.name + 2) + "┴" + 
              "─".repeat(colWidths.image + 2) + "┴" + 
              "─".repeat(colWidths.status + 2) + "┴" + 
              "─".repeat(colWidths.ports + 2) + "┘\x1b[0m\r\n";
    return out;
  } catch (err) {
    return "  \x1b[31mError formatting docker ps to ANSI: " + String(err) + "\x1b[0m\r\n" + raw.replace(/\n/g, "\r\n");
  }
}


function formatDfToAnsi(raw: string): string {
  try {
    const lines = raw.trim().split("\n");
    let out = "  \x1b[1;35m💾 Remote Filesystems Disk Space Summary\x1b[0m\r\n\r\n";
    
    // Headers
    out += `  \x1b[1;36m${"Mounted on".padEnd(20)} ${"Used / Total".padEnd(18)}  ${"Usage % & Visual Progress Bar".padEnd(30)}\x1b[0m\r\n`;
    out += `  \x1b[38;5;239m${"─".repeat(72)}\x1b[0m\r\n`;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 6) continue;
      
      const fs = parts[0];
      const size = parts[1];
      const used = parts[2];
      const usePercentStr = parts[4];
      const usePercent = parseInt(usePercentStr.replace("%", "")) || 0;
      const mount = parts[5];
      
      // Filter loop & system mounts
      if (fs.startsWith("tmpfs") || fs.startsWith("udev") || fs.startsWith("devtmpfs") || fs.startsWith("loop")) {
        continue;
      }
      
      const barWidth = 15;
      const filledChars = Math.round((usePercent / 100) * barWidth);
      const emptyChars = barWidth - filledChars;
      
      let barColor = "\x1b[32m";
      if (usePercent > 90) barColor = "\x1b[31m";
      else if (usePercent > 70) barColor = "\x1b[33m";
      
      const barStr = `${barColor}${"█".repeat(filledChars)}\x1b[30;1m${"░".repeat(emptyChars)}\x1b[0m`;
      
      out += `  \x1b[1;37m${mount.slice(0, 20).padEnd(20)}\x1b[0m \x1b[38;5;244m${(used + " / " + size).padEnd(18)}\x1b[0m  ${barStr} \x1b[1m${usePercentStr.padStart(4)}\x1b[0m\r\n`;
    }
    
    return out;
  } catch (err) {
    return raw.replace(/\n/g, "\r\n");
  }
}

function formatFreeToAnsi(raw: string): string {
  try {
    const lines = raw.trim().split("\n");
    let memTotal = 0, memUsed = 0, memFree = 0, memBuff = 0, memAvail = 0;
    let swapTotal = 0, swapUsed = 0, swapFree = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("Mem:")) {
        const parts = trimmed.split(/\s+/);
        memTotal = parseInt(parts[1]) || 0;
        memUsed = parseInt(parts[2]) || 0;
        memFree = parseInt(parts[3]) || 0;
        memBuff = parseInt(parts[5]) || 0;
        memAvail = parseInt(parts[6]) || 0;
      } else if (trimmed.startsWith("Swap:")) {
        const parts = trimmed.split(/\s+/);
        swapTotal = parseInt(parts[1]) || 0;
        swapUsed = parseInt(parts[2]) || 0;
        swapFree = parseInt(parts[3]) || 0;
      }
    }
    
    let out = "  \x1b[1;35m💾 Remote System Memory Usage (RAM / Swap)\x1b[0m\r\n\r\n";
    
    // RAM progress bar
    const ramPercent = Math.round((memUsed / memTotal) * 100) || 0;
    const ramBarWidth = 20;
    const ramFilled = Math.round((ramPercent / 100) * ramBarWidth);
    const ramEmpty = ramBarWidth - ramFilled;
    const ramBarStr = `\x1b[35m${"█".repeat(ramFilled)}\x1b[30;1m${"░".repeat(ramEmpty)}\x1b[0m`;
    
    out += `  \x1b[1;36mPhysical RAM:\x1b[0m\r\n`;
    out += `  ${ramBarStr} \x1b[1;37m${ramPercent}%\x1b[0m  \x1b[38;5;244m(${memUsed} MB used / ${memTotal} MB total)\x1b[0m\r\n`;
    out += `  \x1b[30;1mFree: ${memFree} MB  │  Buffer/Cache: ${memBuff} MB  │  Available: ${memAvail} MB\x1b[0m\r\n\r\n`;
    
    // Swap progress bar
    if (swapTotal > 0) {
      const swapPercent = Math.round((swapUsed / swapTotal) * 100) || 0;
      const swapBarWidth = 20;
      const swapFilled = Math.round((swapPercent / 100) * swapBarWidth);
      const swapEmpty = swapBarWidth - swapFilled;
      const swapBarStr = `\x1b[36m${"█".repeat(swapFilled)}\x1b[30;1m${"░".repeat(swapEmpty)}\x1b[0m`;
      
      out += `  \x1b[1;36mSwap Partition:\x1b[0m\r\n`;
      out += `  ${swapBarStr} \x1b[1;37m${swapPercent}%\x1b[0m  \x1b[38;5;244m(${swapUsed} MB used / ${swapTotal} MB total)\x1b[0m\r\n`;
      out += `  \x1b[30;1mFree: ${swapFree} MB\x1b[0m\r\n`;
    } else {
      out += `  \x1b[1;36mSwap Partition:\x1b[0m \x1b[30;1mDisabled / Not Allocated\x1b[0m\r\n`;
    }
    
    return out;
  } catch (err) {
    return raw.replace(/\n/g, "\r\n");
  }
}

export default function TerminalView({ sessionId, onClose }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);

  // --- UI Layout States ---
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"docker" | "resources" | "services" | "processes">("docker");
  const [activeDockerSubTab, setActiveDockerSubTab] = useState<"containers" | "images">("containers");
  const [activeResourcesSubTab, setActiveResourcesSubTab] = useState<"disk" | "memory">("disk");

  // --- Data Loading States ---
  const [loading, setLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // --- Data States ---
  const [dockerContainers, setDockerContainers] = useState<Container[]>([]);
  const [dockerImages, setDockerImages] = useState<DockerImage[]>([]);
  const [diskUsage, setDiskUsage] = useState<DiskInfo[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<MemoryInfo | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);

  // --- Filter & Search States ---
  const [dockerSearch, setDockerSearch] = useState<string>("");
  const [servicesSearch, setServicesSearch] = useState<string>("");
  const [processesSearch, setProcessesSearch] = useState<string>("");
  const [showSystemMounts, setShowSystemMounts] = useState<boolean>(false);
  const [processesSortField, setProcessesSortField] = useState<"cpu" | "mem">("cpu");

  // --- Logs Viewer Modal State ---
  const [activeLogsContainerId, setActiveLogsContainerId] = useState<string | null>(null);
  const [containerLogs, setContainerLogs] = useState<string>("");
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logsSearch, setLogsSearch] = useState<string>("");

  // Clean Command Execution Utility
  const runRemoteCommand = async (command: string): Promise<string> => {
    return await invoke<string>("ssh_exec_command", { id: sessionId, command });
  };

  // --- Keyboard Command Interception ---
  const handleCommandIntercept = (command: string) => {
    const cmd = command.toLowerCase().trim();
    if (cmd === "docker ps" || cmd.startsWith("docker ps ")) {
      setActiveTab("docker");
      setActiveDockerSubTab("containers");
    } else if (cmd === "docker images" || cmd.startsWith("docker images ")) {
      setActiveTab("docker");
      setActiveDockerSubTab("images");
    } else if (cmd === "df -h" || cmd.startsWith("df -h ")) {
      setActiveTab("resources");
      setActiveResourcesSubTab("disk");
    } else if (cmd === "free" || cmd === "free -m" || cmd === "free -h" || cmd.startsWith("free ")) {
      setActiveTab("resources");
      setActiveResourcesSubTab("memory");
    } else if (cmd.startsWith("systemctl")) {
      setActiveTab("services");
    } else if (cmd === "ps aux" || cmd.startsWith("ps aux ") || cmd === "ps -ef" || cmd.startsWith("ps -ef ")) {
      setActiveTab("processes");
    }
  };

  // --- Inline Beautification Command Executor ---
  const handleInlineBeautify = async (command: string) => {
    const term = terminalInstance.current;
    if (!term) return;

    // Show loading spinner
    term.write("\x1b[?25l"); // Hide cursor
    let spinnerIndex = 0;
    const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    
    const spinnerInterval = setInterval(() => {
      term.write(`\r\x1b[2K\x1b[1;35m${spinners[spinnerIndex]}\x1b[0m \x1b[38;5;244mFormatting remote response...\x1b[0m`);
      spinnerIndex = (spinnerIndex + 1) % spinners.length;
    }, 80);

    try {
      let cmdToRun = command;
      
      // Override commands to get clean structure where possible
      if (command.startsWith("docker ps")) {
        cmdToRun = "docker ps -a --format '{\"ID\":\"{{.ID}}\",\"Image\":\"{{.Image}}\",\"Names\":\"{{.Names}}\",\"Status\":\"{{.Status}}\",\"Ports\":\"{{.Ports}}\",\"Created\":\"{{.RunningFor}}\"}'";
      }
      
      const rawText = await runRemoteCommand(cmdToRun);
      
      clearInterval(spinnerInterval);
      term.write("\r\x1b[2K"); // Clear loading spinner line
      
      let formatted = "";
      if (command.startsWith("docker ps")) {
        formatted = formatDockerPsToAnsi(rawText);
      } else if (command.startsWith("df -h")) {
        formatted = formatDfToAnsi(rawText);
      } else if (command.startsWith("free")) {
        formatted = formatFreeToAnsi(rawText);
      } else {
        formatted = rawText.replace(/\n/g, "\r\n"); // fallback
      }
      
      term.write(formatted);
      term.write("\r\n");
      
    } catch (err) {
      clearInterval(spinnerInterval);
      term.write("\r\x1b[2K");
      term.write(`  \x1b[31m⚠️ Beautification failed: ${err}\x1b[0m\r\n`);
    } finally {
      term.write("\x1b[?25h"); // Show cursor
      
      // Send a single carriage return to remote PTY to draw a fresh prompt on the screen!
      setTimeout(() => {
        invoke("write_ssh_input", { id: sessionId, data: "\r" }).catch(console.error);
      }, 50);
    }
  };

  // --- Data Loaders ---
  const loadDockerContainers = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const raw = await runRemoteCommand("docker ps -a --format '{\"ID\":\"{{.ID}}\",\"Image\":\"{{.Image}}\",\"Names\":\"{{.Names}}\",\"Status\":\"{{.Status}}\",\"Ports\":\"{{.Ports}}\",\"Created\":\"{{.RunningFor}}\"}'");
      const lines = raw.trim().split("\n").filter(Boolean);
      const parsed = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      setDockerContainers(parsed);
    } catch (err) {
      console.warn("Docker command failed:", err);
      setErrorState("Docker is not running or not installed on this remote machine.");
    } finally {
      setLoading(false);
    }
  };

  const loadDockerImages = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const raw = await runRemoteCommand("docker images --format '{\"ID\":\"{{.ID}}\",\"Repository\":\"{{.Repository}}\",\"Tag\":\"{{.Tag}}\",\"Size\":\"{{.Size}}\",\"Created\":\"{{.CreatedSince}}\"}'");
      const lines = raw.trim().split("\n").filter(Boolean);
      const parsed = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      setDockerImages(parsed);
    } catch (err) {
      console.warn("Docker images command failed:", err);
      setErrorState("Docker is not running or not installed on this remote machine.");
    } finally {
      setLoading(false);
    }
  };

  const loadDiskUsage = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const raw = await runRemoteCommand("df -h");
      const lines = raw.trim().split("\n");
      const parsed: DiskInfo[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          parsed.push({
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            avail: parts[3],
            usePercent: parseInt(parts[4].replace("%", "")) || 0,
            mountedOn: parts[5]
          });
        }
      }
      setDiskUsage(parsed);
    } catch (err) {
      setErrorState(`Failed to read disk usage: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMemoryUsage = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const raw = await runRemoteCommand("free -m");
      const lines = raw.trim().split("\n");
      let memTotal = 0, memUsed = 0, memFree = 0, memShared = 0, memBuff = 0, memAvail = 0;
      let swapTotal = 0, swapUsed = 0, swapFree = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Mem:")) {
          const parts = trimmed.split(/\s+/);
          memTotal = parseInt(parts[1]) || 0;
          memUsed = parseInt(parts[2]) || 0;
          memFree = parseInt(parts[3]) || 0;
          memShared = parseInt(parts[4]) || 0;
          memBuff = parseInt(parts[5]) || 0;
          memAvail = parseInt(parts[6]) || 0;
        } else if (trimmed.startsWith("Swap:")) {
          const parts = trimmed.split(/\s+/);
          swapTotal = parseInt(parts[1]) || 0;
          swapUsed = parseInt(parts[2]) || 0;
          swapFree = parseInt(parts[3]) || 0;
        }
      }
      setMemoryUsage({
        memTotal, memUsed, memFree, memShared, memBuff, memAvail,
        swapTotal, swapUsed, swapFree
      });
    } catch (err) {
      setErrorState(`Failed to fetch memory statistics: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const raw = await runRemoteCommand("systemctl list-units --type=service --all --no-pager");
      const lines = raw.trim().split("\n");
      const parsed: ServiceInfo[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("LOAD") || trimmed.startsWith("UNIT") || trimmed.includes("loaded units listed")) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4 && parts[0].endsWith(".service")) {
          const name = parts[0];
          const load = parts[1];
          const active = parts[2];
          const sub = parts[3];
          const desc = parts.slice(4).join(" ");
          parsed.push({ name, load, active, sub, desc });
        }
      }
      setServices(parsed);
    } catch (err) {
      setErrorState(`Failed to retrieve system services: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProcesses = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const raw = await runRemoteCommand("ps aux");
      const lines = raw.trim().split("\n");
      const parsed: ProcessInfo[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 11) {
          parsed.push({
            user: parts[0],
            pid: parts[1],
            cpu: parseFloat(parts[2]) || 0,
            mem: parseFloat(parts[3]) || 0,
            vsz: parts[4],
            rss: parts[5],
            tty: parts[6],
            stat: parts[7],
            start: parts[8],
            time: parts[9],
            command: parts.slice(10).join(" ")
          });
        }
      }
      setProcesses(parsed);
    } catch (err) {
      setErrorState(`Failed to list running processes: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const reloadActiveData = () => {
    if (activeTab === "docker") {
      if (activeDockerSubTab === "containers") loadDockerContainers();
      else loadDockerImages();
    } else if (activeTab === "resources") {
      if (activeResourcesSubTab === "disk") loadDiskUsage();
      else loadMemoryUsage();
    } else if (activeTab === "services") {
      loadServices();
    } else if (activeTab === "processes") {
      loadProcesses();
    }
  };

  // Trigger reloading on Tab switch or console opening
  useEffect(() => {
    if (showConsole) {
      reloadActiveData();
    }
  }, [showConsole, activeTab, activeDockerSubTab, activeResourcesSubTab]);

  // --- Terminal Setup and Initialization ---
  useEffect(() => {
    if (!containerRef.current) return;

    // Create terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
      theme: draculaTheme,
      allowProposedApi: true,
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    // Open terminal inside div
    term.open(containerRef.current);
    fitAddon.fit();

    terminalInstance.current = term;
    fitAddonInstance.current = fitAddon;

    // Send initial size resize command to backend
    const dims = fitAddon.proposeDimensions();
    if (dims) {
      invoke("resize_ssh_pty", { id: sessionId, cols: dims.cols, rows: dims.rows }).catch((err) => {
        console.error("Failed to set initial PTY size:", err);
      });
    }

    let cmdBuffer = "";

    // Write input data to SSH session & intercept beautifiable commands
    const dataListener = term.onData((data) => {
      // Check for Enter key intercept
      if (data === "\r" || data === "\n") {
        const trimmed = cmdBuffer.trim();
        const beautifiableCommands = ["docker ps", "df -h", "free", "free -m", "free -h"];
        const isBeautified = beautifiableCommands.some(c => trimmed === c || trimmed.startsWith(c + " "));

        if (isBeautified) {
          // Clear current typed line on remote PTY command buffer using Ctrl+U (\x15)
          invoke("write_ssh_input", { id: sessionId, data: "\x15" }).catch((err) => {
            console.error("Failed to clear remote PTY command buffer:", err);
          });
          
          // Clear line on xterm visually, print command header in bold green, move to next line
          term.write("\r\x1b[2K\x1b[1;32m$ " + trimmed + "\x1b[0m\r\n");
          
          // Sync GUI active tab state in background
          handleCommandIntercept(trimmed);
          
          // Trigger the inline beautification formatting process
          handleInlineBeautify(trimmed);
          
          cmdBuffer = "";
          return; // Skip writing carriage return directly to PTY!
        }
        
        cmdBuffer = "";
      }

      // Default: write typed key directly to SSH session input
      invoke("write_ssh_input", { id: sessionId, data }).catch((err) => {
        console.error("Failed to write to SSH input:", err);
      });

      // Character buffer monitoring for typing
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        if (char === "\r" || char === "\n") {
          cmdBuffer = "";
        } else if (char === "\x7f" || char === "\x08") {
          // Backspace
          cmdBuffer = cmdBuffer.slice(0, -1);
        } else if (char === "\x1b") {
          // ESC or arrows sequence
          cmdBuffer = "";
          break;
        } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
          cmdBuffer += char;
        }
      }
    });

    // Listen to SSH output events from backend
    let unsubscribeStdout: () => void = () => {};
    let unsubscribeClosed: () => void = () => {};

    const setupListeners = async () => {
      unsubscribeStdout = await listen<string>(`ssh-stdout:${sessionId}`, (event) => {
        term.write(event.payload);
      });

      unsubscribeClosed = await listen<void>(`ssh-closed:${sessionId}`, () => {
        term.write("\r\n\x1b[31;1mConnection closed by remote host.\x1b[0m\r\n");
        if (onClose) {
          onClose();
        }
      });
    };

    setupListeners();

    // Listen to resize events
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonInstance.current && terminalInstance.current) {
        try {
          fitAddonInstance.current.fit();
          const proposed = fitAddonInstance.current.proposeDimensions();
          if (proposed) {
            invoke("resize_ssh_pty", {
              id: sessionId,
              cols: proposed.cols,
              rows: proposed.rows,
            }).catch(err => console.error("PTY resize failed:", err));
          }
        } catch (e) {
          // Ignore early resize errors before xterm is fully initialized
        }
      }
    });
    
    resizeObserver.observe(containerRef.current);

    // Clean up
    return () => {
      resizeObserver.disconnect();
      dataListener.dispose();
      term.dispose();
      unsubscribeStdout();
      unsubscribeClosed();
    };
  }, [sessionId]);

  // Adjust PTY layout size when console drawer opens/closes
  useEffect(() => {
    setTimeout(() => {
      if (fitAddonInstance.current && terminalInstance.current) {
        try {
          fitAddonInstance.current.fit();
          const proposed = fitAddonInstance.current.proposeDimensions();
          if (proposed) {
            invoke("resize_ssh_pty", {
              id: sessionId,
              cols: proposed.cols,
              rows: proposed.rows,
            }).catch(err => console.error("PTY resize failed:", err));
          }
        } catch (e) {}
      }
    }, 350); // wait for flex transition/render
  }, [showConsole]);

  // --- Dynamic Operations ---
  const handleDockerAction = async (action: string, id: string) => {
    setLoading(true);
    try {
      await runRemoteCommand(`docker ${action} ${id}`);
      await loadDockerContainers();
    } catch (err) {
      alert(`Operation Failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDockerImageDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Docker Image?")) return;
    setLoading(true);
    try {
      await runRemoteCommand(`docker rmi ${id}`);
      await loadDockerImages();
    } catch (err) {
      alert(`Failed to delete image: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAction = async (action: string, name: string) => {
    setLoading(true);
    try {
      await runRemoteCommand(`systemctl ${action} ${name}`);
      await loadServices();
    } catch (err) {
      alert(`Failed to ${action} service: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKillProcess = async (pid: string) => {
    if (!confirm(`Kill process with PID ${pid}?`)) return;
    setLoading(true);
    try {
      await runRemoteCommand(`kill -9 ${pid}`);
      await loadProcesses();
    } catch (err) {
      alert(`Failed to kill process: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogs = async (id: string) => {
    setActiveLogsContainerId(id);
    setLoadingLogs(true);
    setContainerLogs("");
    try {
      const res = await runRemoteCommand(`docker logs --tail 250 ${id}`);
      setContainerLogs(res);
    } catch (err) {
      setContainerLogs(`Error pulling logs: ${err}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  // --- Filtering computations ---
  const filteredContainers = dockerContainers.filter(c => 
    c.Names.toLowerCase().includes(dockerSearch.toLowerCase()) ||
    c.Image.toLowerCase().includes(dockerSearch.toLowerCase()) ||
    c.Status.toLowerCase().includes(dockerSearch.toLowerCase())
  );

  const filteredDockerImages = dockerImages.filter(img => 
    img.Repository.toLowerCase().includes(dockerSearch.toLowerCase()) ||
    img.Tag.toLowerCase().includes(dockerSearch.toLowerCase()) ||
    img.ID.toLowerCase().includes(dockerSearch.toLowerCase())
  );

  const filteredDiskUsage = diskUsage.filter(d => 
    showSystemMounts || 
    (!d.filesystem.startsWith("tmpfs") && 
     !d.filesystem.startsWith("udev") && 
     !d.filesystem.startsWith("devtmpfs") &&
     !d.filesystem.startsWith("loop"))
  );

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(servicesSearch.toLowerCase()) ||
    s.desc.toLowerCase().includes(servicesSearch.toLowerCase()) ||
    s.active.toLowerCase().includes(servicesSearch.toLowerCase())
  );

  const sortedProcesses = [...processes]
    .filter(p => 
      p.command.toLowerCase().includes(processesSearch.toLowerCase()) ||
      p.user.toLowerCase().includes(processesSearch.toLowerCase()) ||
      p.pid.includes(processesSearch)
    )
    .sort((a, b) => b[processesSortField] - a[processesSortField])
    .slice(0, 100);

  const filteredLogs = containerLogs
    .split("\n")
    .filter(line => line.toLowerCase().includes(logsSearch.toLowerCase()))
    .join("\n");

  return (
    <div className="w-full h-full flex flex-row bg-[#12131a] relative overflow-hidden">
      
      {/* Left Pane: Terminal Emulator */}
      <div className={`h-full flex flex-col transition-all duration-300 relative ${showConsole ? "w-1/2 border-r border-white/5" : "w-full"}`}>
        
        {/* Discrete Tiny Sparkle Trigger Icon */}
        {!showConsole && (
          <div className="absolute top-3 right-4 z-10">
            <button
              onClick={() => setShowConsole(true)}
              className="p-1 rounded-md hover:bg-white/5 border border-transparent hover:border-white/10 text-purple-400/40 hover:text-purple-400 transition-all duration-200 cursor-pointer"
              title="Open Wormhole Console"
            >
              <Sparkles size={14} className="animate-pulse" />
            </button>
          </div>
        )}

        {/* Terminal Container wrapper */}
        <div className="w-full h-full bg-[#282a36] p-2">
          <div 
            ref={containerRef} 
            className="w-full h-full min-h-0 flex-1 overflow-hidden" 
          />
        </div>
      </div>

      {/* Right Pane: Wormhole Console Drawer (Slide-out Glassmorphic Panel) */}
      {showConsole && (
        <div className="w-1/2 h-full flex flex-col bg-[#14151f]/95 backdrop-blur-md border-l border-white/5 relative z-20 text-[#f8f8f2] font-sans overflow-hidden">
          
          {/* Console Header */}
          <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-black/35 select-none">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-400 animate-pulse" size={16} />
              <span className="text-sm font-semibold tracking-wide bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">WORMHOLE GUI CONSOLE</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={reloadActiveData}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 text-white/60 hover:text-white transition-all cursor-pointer disabled:opacity-30"
                title="Refresh Metrics"
              >
                <RotateCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setShowConsole(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="flex bg-black/15 border-b border-white/5 px-4 select-none">
            {[
              { id: "docker", label: "🐳 Docker" },
              { id: "resources", label: "💾 Resources" },
              { id: "services", label: "⚙️ Services" },
              { id: "processes", label: "🖥️ Processes" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setErrorState(null);
                }}
                className={`px-4 py-3 text-xs font-semibold relative transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "text-purple-400 font-bold"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 shadow-md shadow-purple-500/20" />
                )}
              </button>
            ))}
          </div>

          {/* Console Body Area */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-[#0c0d12]/20">
            {errorState && (
              <div className="p-5 border border-red-500/20 bg-red-500/5 rounded-xl text-center space-y-3 my-4">
                <span className="text-xs text-red-300 font-medium block">{errorState}</span>
                <button 
                  onClick={reloadActiveData}
                  className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  Retry Execution
                </button>
              </div>
            )}

            {!errorState && loading && (
              <div className="h-48 flex flex-col items-center justify-center space-y-3">
                <RotateCw className="animate-spin text-purple-400" size={24} />
                <span className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Querying remote system...</span>
              </div>
            )}

            {!errorState && !loading && (
              <div className="w-full h-full animate-fade-in">
                
                {/* DOCKER TAB */}
                {activeTab === "docker" && (
                  <div className="space-y-4">
                    {/* Sub tabs and Search */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex bg-[#1d1e2b] rounded-lg p-0.5 border border-white/5 select-none self-start">
                        <button
                          onClick={() => setActiveDockerSubTab("containers")}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            activeDockerSubTab === "containers"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                              : "text-white/45 hover:text-white/80 border border-transparent"
                          }`}
                        >
                          Containers ({dockerContainers.length})
                        </button>
                        <button
                          onClick={() => setActiveDockerSubTab("images")}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            activeDockerSubTab === "images"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                              : "text-white/45 hover:text-white/80 border border-transparent"
                          }`}
                        >
                          Images ({dockerImages.length})
                        </button>
                      </div>
                      
                      {/* Search Bar */}
                      <div className="relative w-full sm:w-48 self-stretch">
                        <Search className="absolute left-2.5 top-2 text-white/30" size={12} />
                        <input
                          type="text"
                          value={dockerSearch}
                          onChange={(e) => setDockerSearch(e.target.value)}
                          placeholder="Filter list..."
                          className="w-full bg-black/25 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40"
                        />
                      </div>
                    </div>

                    {/* Containers Table */}
                    {activeDockerSubTab === "containers" && (
                      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#171822]/40">
                        {filteredContainers.length === 0 ? (
                          <div className="p-8 text-center text-xs text-white/35">No containers matching filter.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-black/30 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                                  <th className="p-3 pl-4">Name / ID</th>
                                  <th className="p-3">Image</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3">Ports</th>
                                  <th className="p-3 text-right pr-4">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredContainers.map(c => {
                                  const isRunning = c.Status.toLowerCase().startsWith("up");
                                  return (
                                    <tr key={c.ID} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                      <td className="p-3 pl-4">
                                        <div className="font-semibold text-white/90">{c.Names}</div>
                                        <div className="text-[10px] font-mono text-white/30">{c.ID}</div>
                                      </td>
                                      <td className="p-3 truncate max-w-[120px]" title={c.Image}>
                                        <span className="font-mono text-purple-300/80">{c.Image}</span>
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? "bg-green-400 animate-pulse shadow-md shadow-green-400/20" : "bg-red-400"}`} />
                                          <span className={`text-[10px] font-medium ${isRunning ? "text-green-300" : "text-red-300"}`}>{c.Status}</span>
                                        </div>
                                        <div className="text-[9px] text-white/35 mt-0.5">{c.Created}</div>
                                      </td>
                                      <td className="p-3 truncate max-w-[100px] text-white/60 font-mono text-[10px]" title={c.Ports}>
                                        {c.Ports || "-"}
                                      </td>
                                      <td className="p-3 text-right pr-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {isRunning ? (
                                            <button
                                              onClick={() => handleDockerAction("stop", c.ID)}
                                              className="p-1 rounded bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-400 transition-colors cursor-pointer"
                                              title="Stop Container"
                                            >
                                              <Square size={10} fill="currentColor" />
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => handleDockerAction("start", c.ID)}
                                              className="p-1 rounded bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-green-400 transition-colors cursor-pointer"
                                              title="Start Container"
                                            >
                                              <Play size={10} fill="currentColor" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleOpenLogs(c.ID)}
                                            className="p-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-400 transition-colors cursor-pointer"
                                            title="View Logs"
                                          >
                                            <FileText size={10} />
                                          </button>
                                          <button
                                            onClick={() => handleDockerAction("rm -f", c.ID)}
                                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 transition-colors cursor-pointer"
                                            title="Remove Forcefully"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Images Table */}
                    {activeDockerSubTab === "images" && (
                      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#171822]/40">
                        {filteredDockerImages.length === 0 ? (
                          <div className="p-8 text-center text-xs text-white/35">No images matching filter.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-black/30 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                                  <th className="p-3 pl-4">Repository</th>
                                  <th className="p-3">Tag</th>
                                  <th className="p-3">Image ID</th>
                                  <th className="p-3">Size / Created</th>
                                  <th className="p-3 text-right pr-4">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredDockerImages.map(img => (
                                  <tr key={img.ID} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                    <td className="p-3 pl-4 font-semibold text-white/90">{img.Repository}</td>
                                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-white/5 font-mono text-[10px] text-white/70 border border-white/5">{img.Tag}</span></td>
                                    <td className="p-3 font-mono text-purple-300/80">{img.ID}</td>
                                    <td className="p-3">
                                      <div className="font-semibold text-white/80">{img.Size}</div>
                                      <div className="text-[10px] text-white/30">{img.Created}</div>
                                    </td>
                                    <td className="p-3 text-right pr-4">
                                      <button
                                        onClick={() => handleDockerImageDelete(img.ID)}
                                        className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 transition-colors cursor-pointer"
                                        title="Delete Image"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* RESOURCES TAB */}
                {activeTab === "resources" && (
                  <div className="space-y-6">
                    {/* Sub navigations */}
                    <div className="flex bg-[#1d1e2b] rounded-lg p-0.5 border border-white/5 self-start inline-flex select-none">
                      <button
                        onClick={() => setActiveResourcesSubTab("disk")}
                        className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          activeResourcesSubTab === "disk"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                            : "text-white/45 hover:text-white/80 border border-transparent"
                        }`}
                      >
                        Disk Usage ({diskUsage.length})
                      </button>
                      <button
                        onClick={() => setActiveResourcesSubTab("memory")}
                        className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          activeResourcesSubTab === "memory"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                            : "text-white/45 hover:text-white/80 border border-transparent"
                        }`}
                      >
                        Memory (RAM / Swap)
                      </button>
                    </div>

                    {/* Disk usage content */}
                    {activeResourcesSubTab === "disk" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center select-none pb-2 border-b border-white/5">
                          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">File Systems mounted</span>
                          <label className="flex items-center gap-2 text-[10px] text-white/50 cursor-pointer hover:text-white font-medium select-none">
                            <input
                              type="checkbox"
                              checked={showSystemMounts}
                              onChange={(e) => setShowSystemMounts(e.target.checked)}
                              className="accent-purple-500 cursor-pointer"
                            />
                            Show System Mounts (tmpfs)
                          </label>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5">
                          {filteredDiskUsage.map(d => {
                            const isHigh = d.usePercent > 90;
                            const isMedium = d.usePercent > 70 && d.usePercent <= 90;
                            let barColor = "bg-green-400";
                            let glowColor = "shadow-green-400/20";
                            if (isHigh) {
                              barColor = "bg-red-400";
                              glowColor = "shadow-red-400/20";
                            } else if (isMedium) {
                              barColor = "bg-yellow-400";
                              glowColor = "shadow-yellow-400/20";
                            }

                            return (
                              <div key={d.mountedOn} className="bg-[#171822]/40 border border-white/5 rounded-xl p-4 space-y-2 hover:border-white/10 transition-all">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="text-xs font-semibold text-white/95">{d.mountedOn}</h4>
                                    <span className="text-[9px] font-mono text-white/30">{d.filesystem}</span>
                                  </div>
                                  <div className="text-right text-xs">
                                    <span className="font-bold text-white/85">{d.used}</span>
                                    <span className="text-white/30 font-medium"> / {d.size} ({d.avail} avail)</span>
                                  </div>
                                </div>

                                {/* Custom Progress Bar */}
                                <div className="space-y-1">
                                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 shadow-md ${barColor} ${glowColor}`} 
                                      style={{ width: `${d.usePercent}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] font-bold text-white/30">
                                    <span>0%</span>
                                    <span className={isHigh ? "text-red-300" : isMedium ? "text-yellow-300" : "text-green-300"}>{d.usePercent}% USED</span>
                                    <span>100%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Memory usage content */}
                    {activeResourcesSubTab === "memory" && memoryUsage && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Physical RAM Card */}
                        <div className="bg-[#171822]/40 border border-white/5 rounded-xl p-5 space-y-4 hover:border-white/10 transition-all flex flex-col justify-between">
                          <div className="flex items-center justify-between select-none">
                            <div className="flex items-center gap-2">
                              <Cpu className="text-purple-400" size={16} />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">System RAM</h3>
                            </div>
                            <span className="text-[10px] text-white/30 font-mono font-bold">{memoryUsage.memTotal} MB Total</span>
                          </div>

                          <div className="flex flex-col items-center py-4 select-none relative">
                            {/* Visual Circular Gauge */}
                            <svg className="w-28 h-28 transform -rotate-90">
                              <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.04)" strokeWidth="6" fill="transparent" />
                              <circle 
                                cx="56" 
                                cy="56" 
                                r="48" 
                                stroke="#bd93f9" 
                                strokeWidth="8" 
                                fill="transparent" 
                                strokeDasharray={301.6}
                                strokeDashoffset={301.6 - (301.6 * (memoryUsage.memUsed / memoryUsage.memTotal))}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                              />
                            </svg>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                              <span className="text-lg font-extrabold text-white">{Math.round((memoryUsage.memUsed / memoryUsage.memTotal) * 100)}%</span>
                              <span className="text-[9px] font-bold text-white/30 block uppercase">Used</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/5 pt-4">
                            <div>
                              <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider block">Used Memory</span>
                              <span className="font-bold text-white/90">{memoryUsage.memUsed} MB</span>
                            </div>
                            <div>
                              <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider block">Free Memory</span>
                              <span className="font-bold text-white/90">{memoryUsage.memFree} MB</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider block">Buffer / Cache</span>
                              <span className="font-bold text-purple-300">{memoryUsage.memBuff} MB</span>
                            </div>
                          </div>
                        </div>

                        {/* Swap Space Card */}
                        <div className="bg-[#171822]/40 border border-white/5 rounded-xl p-5 space-y-4 hover:border-white/10 transition-all flex flex-col justify-between">
                          <div className="flex items-center justify-between select-none">
                            <div className="flex items-center gap-2">
                              <HardDrive className="text-cyan-400" size={16} />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Swap Partition</h3>
                            </div>
                            <span className="text-[10px] text-white/30 font-mono font-bold">{memoryUsage.swapTotal} MB Total</span>
                          </div>

                          {memoryUsage.swapTotal === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
                              <span className="text-xs text-white/20 font-bold uppercase">Disabled</span>
                              <span className="text-[9px] text-white/15 block mt-1">No remote swap space found.</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col items-center py-4 select-none relative">
                                <svg className="w-28 h-28 transform -rotate-90">
                                  <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.04)" strokeWidth="6" fill="transparent" />
                                  <circle 
                                    cx="56" 
                                    cy="56" 
                                    r="48" 
                                    stroke="#8be9fd" 
                                    strokeWidth="8" 
                                    fill="transparent" 
                                    strokeDasharray={301.6}
                                    strokeDashoffset={301.6 - (301.6 * (memoryUsage.swapUsed / memoryUsage.swapTotal))}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                  />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                  <span className="text-lg font-extrabold text-white">{Math.round((memoryUsage.swapUsed / memoryUsage.swapTotal) * 100)}%</span>
                                  <span className="text-[9px] font-bold text-white/30 block uppercase">Used</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/5 pt-4">
                                <div>
                                  <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider block">Swap Used</span>
                                  <span className="font-bold text-white/90">{memoryUsage.swapUsed} MB</span>
                                </div>
                                <div>
                                  <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider block">Swap Free</span>
                                  <span className="font-bold text-white/90">{memoryUsage.swapFree} MB</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* SERVICES TAB */}
                {activeTab === "services" && (
                  <div className="space-y-4">
                    {/* Header and Search */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 self-start">Active Systemd services ({filteredServices.length})</span>
                      <div className="relative w-full sm:w-48 self-stretch">
                        <Search className="absolute left-2.5 top-2 text-white/30" size={12} />
                        <input
                          type="text"
                          value={servicesSearch}
                          onChange={(e) => setServicesSearch(e.target.value)}
                          placeholder="Filter services..."
                          className="w-full bg-black/25 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40"
                        />
                      </div>
                    </div>

                    {/* Services Cards */}
                    <div className="space-y-3.5 select-none">
                      {filteredServices.length === 0 ? (
                        <div className="p-8 text-center text-xs text-white/35">No services match filter.</div>
                      ) : (
                        filteredServices.map(s => {
                          const isActive = s.active.toLowerCase() === "active";
                          const isFailed = s.sub.toLowerCase() === "failed" || s.active.toLowerCase() === "failed";
                          
                          return (
                            <div key={s.name} className="bg-[#171822]/40 border border-white/5 hover:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all">
                              <div className="space-y-1 max-w-[70%]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-semibold text-white/90">{s.name}</h4>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-400" : isFailed ? "bg-red-400" : "bg-white/20"}`} />
                                    <span className={`text-[9px] font-bold uppercase ${isActive ? "text-green-300" : isFailed ? "text-red-300" : "text-white/40"}`}>{s.sub}</span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-white/40 font-medium leading-relaxed truncate" title={s.desc}>{s.desc}</p>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                {isActive ? (
                                  <>
                                    <button
                                      onClick={() => handleServiceAction("stop", s.name)}
                                      className="p-1 rounded bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-400 transition-colors text-[10px] font-bold px-2 cursor-pointer active:scale-95"
                                    >
                                      Stop
                                    </button>
                                    <button
                                      onClick={() => handleServiceAction("restart", s.name)}
                                      className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-400 transition-colors text-[10px] font-bold px-2 cursor-pointer active:scale-95 flex items-center gap-1"
                                    >
                                      <RotateCw size={8} /> Restart
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleServiceAction("start", s.name)}
                                    className="p-1 rounded bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-green-400 transition-colors text-[10px] font-bold px-2 cursor-pointer active:scale-95"
                                  >
                                    Start
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                )}

                {/* PROCESSES TAB */}
                {activeTab === "processes" && (
                  <div className="space-y-4">
                    {/* Header and filters */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 pb-3 select-none">
                      <div className="flex items-center gap-2 self-start">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Sort by:</span>
                        <div className="flex bg-[#1d1e2b] rounded-lg p-0.5 border border-white/5">
                          <button
                            onClick={() => setProcessesSortField("cpu")}
                            className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                              processesSortField === "cpu"
                                ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                : "text-white/45 hover:text-white/80 border border-transparent"
                            }`}
                          >
                            % CPU
                          </button>
                          <button
                            onClick={() => setProcessesSortField("mem")}
                            className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                              processesSortField === "mem"
                                ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                : "text-white/45 hover:text-white/80 border border-transparent"
                            }`}
                          >
                            % MEM
                          </button>
                        </div>
                      </div>
                      <div className="relative w-full sm:w-48 self-stretch">
                        <Search className="absolute left-2.5 top-2 text-white/30" size={12} />
                        <input
                          type="text"
                          value={processesSearch}
                          onChange={(e) => setProcessesSearch(e.target.value)}
                          placeholder="Filter processes..."
                          className="w-full bg-black/25 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40"
                        />
                      </div>
                    </div>

                    {/* Processes List Table */}
                    <div className="overflow-hidden rounded-xl border border-white/5 bg-[#171822]/40">
                      {sortedProcesses.length === 0 ? (
                        <div className="p-8 text-center text-xs text-white/35">No processes found matching filter.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-black/30 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/40 select-none">
                                <th className="p-3 pl-4">PID / User</th>
                                <th className="p-3 text-center">% CPU</th>
                                <th className="p-3 text-center">% MEM</th>
                                <th className="p-3">Command</th>
                                <th className="p-3 text-right pr-4">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedProcesses.map(p => (
                                <tr key={p.pid} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                  <td className="p-3 pl-4">
                                    <div className="font-semibold text-white/90">PID {p.pid}</div>
                                    <div className="text-[10px] text-white/35 font-medium">{p.user}</div>
                                  </td>
                                  <td className="p-3 text-center font-semibold text-purple-300 font-mono">{p.cpu}%</td>
                                  <td className="p-3 text-center font-semibold text-cyan-300 font-mono">{p.mem}%</td>
                                  <td className="p-3 truncate max-w-[200px] text-white/60 font-mono text-[10px]" title={p.command}>
                                    {p.command}
                                  </td>
                                  <td className="p-3 text-right pr-4">
                                    <button
                                      onClick={() => handleKillProcess(p.pid)}
                                      className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 transition-colors text-[9px] font-bold px-2 cursor-pointer active:scale-95"
                                      title="Kill Process"
                                    >
                                      Kill
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCKER LOGS POPUP MODAL */}
      {activeLogsContainerId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-fade-in font-sans">
          <div className="w-[85vw] h-[85vh] max-w-[1000px] bg-[#1a1b26] border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-black/35 select-none">
              <div className="flex items-center gap-2">
                <FileText className="text-cyan-400 animate-pulse" size={16} />
                <span className="text-xs font-bold text-white/90 tracking-wider">DOCKER CONTAINER LOGS: {activeLogsContainerId.slice(0, 12)}</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search in logs */}
                <div className="relative w-48">
                  <Search className="absolute left-2 top-2 text-white/30" size={10} />
                  <input
                    type="text"
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="w-full bg-black/35 border border-white/5 rounded-lg pl-7 pr-3 py-1 text-[10px] text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/40"
                  />
                </div>

                <button
                  onClick={() => handleOpenLogs(activeLogsContainerId)}
                  disabled={loadingLogs}
                  className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 text-white/60 hover:text-white transition-all cursor-pointer disabled:opacity-30"
                  title="Reload Logs"
                >
                  <RotateCw size={13} className={loadingLogs ? "animate-spin" : ""} />
                </button>
                
                <button
                  onClick={() => {
                    setActiveLogsContainerId(null);
                    setLogsSearch("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Modal Body: Logs Stream */}
            <div className="flex-1 min-h-0 bg-[#0f1015]/95 p-6 overflow-y-auto font-mono text-[11px] leading-relaxed text-white/80 scrollbar-gutter-stable select-text selection:bg-cyan-500/20">
              {loadingLogs ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3">
                  <RotateCw className="animate-spin text-cyan-400" size={20} />
                  <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Streaming container logs...</span>
                </div>
              ) : filteredLogs.trim() === "" ? (
                <div className="h-full flex items-center justify-center text-white/25">
                  {logsSearch ? "No logs matching filter." : "Container logs are currently empty."}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap select-text">{filteredLogs}</pre>
              )}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
