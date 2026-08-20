# ⚡ TaskCatch — Universal Action Item Extractor

<p align="center">
  <img src="public/favicon.svg" width="80" height="80" alt="TaskCatch Logo" />
</p>

<p align="center">
  <strong>Highlight text in any application. Press F9. Clean action items land in your dashboard with smart deadlines and priority.</strong>
</p>

<p align="center">
  <a href="#-quick-install-windows">Install</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started-dev">Development</a>
</p>

> **Note:** You do **not** need to install Rust to use TaskCatch. The 1-line PowerShell command and pre-built `.exe` installers in [Releases](https://github.com/lakshayysinghh/taskcatch/releases) are ready to run without any toolchain. Local compilation from source requires [Rust / Rustup](https://rustup.rs) only if you want to build the native binary yourself.

---

## ⚡ Quick Install (Windows)

### Option 1: 1-Line PowerShell Command (Recommended)
Paste this into your PowerShell terminal:
```powershell
irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex
```

### Option 2: Standalone Installer
Download the latest `TaskCatch_Setup.exe` from the [Releases](https://github.com/lakshayysinghh/taskcatch/releases) page.

---

## ✨ Features

- **⚡ Global OS-Wide Instant Capture (`F9` / `Alt + C`):** Highlight text in Slack, Chrome, VS Code, Discord, or Word, and extract action items instantly without switching windows.
- **🛡️ Non-Destructive Clipboard Preservation:** Preserves whatever was in your clipboard (including images, formatted text, and files).
- **🔍 Active Window & Deep-Link Origin Intelligence:** Automatically captures the origin application and deep-link URLs (`🔗 Open source`).
- **🖥️ Dual Floating Action HUD:** Native always-on-top frameless overlay at the top of your physical screen + in-app pill with 1-click `[Undo]` (`Ctrl + Z`).
- **☀️ The Morning Standup Bot:** Daily AI executive assistant that summarizes overdue items and curates your Top 3 daily priorities.
- **⌨️ Natural Language Command Bar (`Ctrl + K`):** Quick-add shorthand parser (`#dev`, `p:urgent`, `tomorrow 5pm`) with real-time live preview chips.
- **📅 1-Click Calendar Integrations:** One-click Google Calendar web event creation and standard RFC-5545 `.ics` file downloads.
- **⏰ Smart Workday & EOD Setting:** Customizable End-of-Day hour (5:00 PM, 6:00 PM, 7:00 PM, 8:00 PM) for relative deadlines.
- **🎨 Obsidian & Olive Glow Theme:** 3D mouse-parallax ambient depth and bespoke glassmorphism.

---

## 🛠️ Architecture

TaskCatch is designed for local-first speed and zero-friction utility:
- **Core Engine:** Tauri v2 + Rust (Native Win32 global hooks, clipboard listeners, SQLite store).
- **Web Frontend:** React 18 + TypeScript + Vite + Tailwind CSS.
- **AI Extraction:** Direct client-side inference with Groq Cloud (Llama 3.3 70B) + smart local offline heuristic fallback.
- **Local Database:** SQLite on-device storage.

---

## 🚀 Getting Started (Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lakshayysinghh/taskcatch.git
   cd taskcatch
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Launch the background capture daemon:**
   ```bash
   npm run daemon
   ```

5. **Build native desktop release binary:**
   ```bash
   npm run tauri build
   ```

---

## 📄 License
MIT License. Free and Open Source forever.
