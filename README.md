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
Download the latest `TaskCatch_<version>_x64-setup.exe` (or the `.msi`) from the [Releases](https://github.com/lakshayysinghh/taskcatch/releases) page.

The 1-line installer downloads the same setup `.exe` and verifies its SHA-256 checksum against the digest GitHub publishes for the release asset before running it.

---

## ✨ Features

- **⚡ Global capture hotkey (`F9` by default, configurable):** Highlight text in Slack, Chrome, VS Code, Discord or Word and press the hotkey. TaskCatch copies the selection and turns it into a task without you switching windows.
- **🗂️ Runs in the tray:** Closing the window keeps TaskCatch running in the system tray so the hotkey keeps working. Right-click the tray icon to quit.
- **🛡️ Clipboard preservation (Windows):** Whatever was on your clipboard (text, rich text, images, copied files) is put back after a capture. If nothing was selected, the clipboard is not touched.
- **🔍 Source window:** Each captured task records the title of the window it came from.
- **↩️ Capture HUD:** After each capture, an in-app pill offers one-click Undo and Edit.
- **☀️ Morning Standup Bot (needs a Groq key):** Ask about your tasks and have them rescheduled or reprioritised in chat. Every change is validated before it is saved.
- **⌨️ Quick add (`Ctrl + K`):** Type a task in plain words. An offline keyword parser picks up priority (`urgent`, `p1`), category (`#dev`, `invoice`) and deadline (`tonight`, `tomorrow 5pm`, `by friday`) with a live preview.
- **📅 Calendar export:** Open a task in Google Calendar or download it as an `.ics` file.
- **🎨 Obsidian & Olive Glow theme:** Mouse-parallax ambient background and glassmorphism.

---

## 🛠️ Architecture

- **Desktop shell:** Tauri 2 + Rust. Global hotkey via `tauri-plugin-global-shortcut`; selection capture, clipboard save/restore and window titles via Win32 APIs.
- **Frontend:** React 18 + Vite + Tailwind CSS (JavaScript).
- **AI extraction:** Groq (Llama 3.3 70B) with your own API key, called from the Rust backend. Without a key, or if the request fails, a local keyword parser is used instead.
- **Storage:** Tasks are kept in `%APPDATA%\TaskCatch\tasks.json`, written atomically with a `tasks.json.bak` backup. Settings, including your Groq key in plain text, are in `%APPDATA%\TaskCatch\config.json`.
- **Web build:** The same UI runs in a browser (`npm run dev`, or the Vercel deployment) with tasks in `localStorage`. Hotkey capture needs the desktop app.

---

## 🚀 Getting Started (Development)

Building the desktop app needs [Rust](https://rustup.rs) and the [Tauri prerequisites for Windows](https://v2.tauri.app/start/prerequisites/) (Visual Studio C++ Build Tools and WebView2).

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lakshayysinghh/taskcatch.git
   cd taskcatch
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the desktop app in development mode:**
   ```bash
   npm run tauri dev
   ```
   Or run only the browser build (no hotkey capture): `npm run dev`

4. **Run the tests:**
   ```bash
   npm test                      # frontend: parser, storage rules, UI regressions (Vitest)
   cd src-tauri && cargo test    # backend: task store, AI parsing (needs `npm run build` first)
   ```
   CI runs both on every push (`.github/workflows/ci.yml`).

5. **Build the release installer:**
   ```bash
   npm run tauri build
   ```

---

## 📄 License
MIT License. Free and Open Source forever.
