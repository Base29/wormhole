# 🌌 Wormhole

Wormhole is a modern, premium, and highly secure multi-session **SSH Terminal** and **SFTP File Explorer** designed for developer productivity. Built on a state-of-the-art stack using **Tauri**, **React**, **Vite**, and **TypeScript**, it delivers blazing-fast desktop performance combined with an elegant, translucent macOS design aesthetic.

---

## ✨ Features & Capabilities

### 🔒 Zero-Trust macOS Vault Security
Keep your remote connection secrets locked down with hardware-backed security. Wormhole integrates natively with the **macOS Keychain** to securely store your SSH private key passphrases and passwords. Credentials never touch plain text files, remaining encrypted under system-level macOS security services.

### 🔀 True Multi-Session Tab Management
Connect to multiple target environments simultaneously. Seamlessly switch between active sessions using a sleek, glassmorphic top tab bar. Toggle a server connection as a full-featured terminal shell, or launch an integrated SFTP file manager on the fly.

### 🐧 Remote OS Auto-Detection
Wormhole dynamically scans the host system properties upon connection to automatically identify the remote environment. It instantly identifies major distributions (including **Ubuntu, Debian, CentOS, Fedora, Arch, Alpine, macOS, and Raspberry Pi / Raspbian**) and updates its connection profiles with beautiful high-contrast operating system icons.

### 📁 Integrated SFTP Explorer
Manage remote files effortlessly with a drag-and-drop-capable file browser. Navigate folders, create new directories, download files locally, or upload new files to your remote hosts—all running alongside your active terminal sessions.

### 💅 Premium Developer Aesthetics
Wormhole is crafted to feel like a native, premium extension of your desktop:
- **macOS Window Vibrancy:** Elegant background translucency that blends beautifully with your desktop wallpaper.
- **Glassmorphic Design System:** Rich contrast, sleek dark modes, subtle micro-animations, and vibrant accent colors.
- **Responsive Workspace:** Collapsible dynamic sidebar layouts designed for modern widescreen and compact laptop setups.
- **Interactive Prompts:** Gorgeous credentials dialogs and seamless modal workflows.

---

## 🛠️ Technology Stack

- **Backend:** [Rust](https://www.rust-lang.org/) (leveraging [Tauri v2](https://tauri.app/) for ultra-lightweight desktop bundling and native macOS system access)
- **Frontend Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build System:** [Vite 7](https://vite.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Terminal Rendering:** [xterm.js](https://xtermjs.org/) (high-performance GPU-accelerated terminal emulation)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (via `rustup`)
- macOS Build Tools (Xcode Command Line Tools)

### Installation & Run

1. Clone this repository to your local workspace.
2. Install frontend and backend dependencies:
   ```bash
   npm install
   ```
3. Start the application in developer mode:
   ```bash
   npm run tauri dev
   ```

### Production Build

To compile a highly optimized, production-ready desktop bundle:
```bash
npm run tauri build
```
The build artifacts will be saved in `src-tauri/target/release/bundle/`.

---

## 🔒 Security Architecture

Wormhole establishes direct, sandboxed SSH client tunnels inside isolated Rust tasks, utilizing the standard `ssh2` crate. For credentials:
1. **ssh-agent Support:** Automatically leverages system SSH agents whenever possible.
2. **macOS Keychain Integration:** Password inputs or key passphrases are routed to secure Apple Keychain items via Rust's `keyring` API wrapper, providing biometric or system passkey authentication guards.
