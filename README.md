# ⚡ TaskCatch — Universal Action Item Extractor

<p align="center">
  <img src="public/favicon.svg" width="84" height="84" alt="TaskCatch Logo" />
</p>

<p align="center">
  <strong>Highlight text in any application. Press F9. Clean action items land in your dashboard with smart deadlines and priority.</strong>
</p>

<p align="center">
  <a href="#-quick-install-windows">Install</a> •
  <a href="#-terminal-cli-support-powershell--cmd">Terminal CLI</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started-dev">Development</a>
</p>

---

## ⚡ Quick Install (Windows)

### Option 1: 1-Line PowerShell Command (Recommended)
Paste this into your PowerShell terminal:
```powershell
irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex
```
* **Zero SmartScreen Warnings:** Configures background `F9` hotkeys, Start Menu shortcuts, and adds `taskcatch` & `tc` commands to your `PATH` in 3 seconds!

### Option 2: Standalone Desktop Installer
Download the latest `TaskCatch_Setup.exe` from the [Releases](https://github.com/lakshayysinghh/taskcatch/releases) page.

---

## 💻 Terminal CLI Support (PowerShell & CMD)

TaskCatch includes a first-class Command Line Interface (`taskcatch` / `tc`):

| Command | Shorthand | What it does | Example |
| :--- | :--- | :--- | :--- |
| **`taskcatch add <text>`** | `tc a <text>` | Capture task with NLP shorthand | `taskcatch add "Deploy auth patch tomorrow at 5pm #dev p:urgent"` |
| **`taskcatch list`** | `tc ls` | Display formatted terminal table | `taskcatch list` |
| **`taskcatch done <#>`** | `tc d <#>` | Mark task as completed | `taskcatch done 1` |
| **`taskcatch standup`** | `tc s` | Run morning standup briefing | `taskcatch standup` |
| **`taskcatch clear`** | `tc clear` | Purge all completed items | `taskcatch clear` |

---

## ✨ Features

- **⚡ Global OS-Wide Instant Capture (`F9` / `Alt + C`):** Highlight text in Slack, Chrome, VS Code, Discord, or Word, and extract action items instantly without switching windows.
- **🛡️ Non-Destructive Clipboard Preservation:** Preserves whatever was in your clipboard (including images, formatted text, and copied files).
- **🔍 Active Window & Deep-Link Origin Intelligence:** Automatically captures the origin application and deep-link URLs (`🔗 Open source`).
- **🖥️ Dual Floating Action HUD:** Native always-on-top frameless overlay at the top of your physical screen + in-app pill with 1-click `[Undo]` (`Ctrl + Z`).
- **☀️ The Morning Standup Bot:** Daily AI executive assistant that summarizes overdue items, reschedules with 1 click, and curates your Top 3 daily priorities.
- **⌨️ Natural Language Command Bar (`Ctrl + K`):** Quick-add shorthand parser (`#dev`, `p:urgent`, `tomorrow 5pm`) with real-time live preview chips.
- **📅 1-Click Calendar Integrations:** One-click Google Calendar web event creation and standard RFC-5545 `.ics` file downloads.
- **⏰ Smart Workday & EOD Setting:** Customizable End-of-Day hour (5:00 PM, 6:00 PM, 7:00 PM, 8:00 PM) for relative deadlines.
- **🎨 Obsidian & Olive Glow Theme:** 3D mouse-parallax ambient depth, vintage woodcut editorial artwork, and custom vector emblem.
- **📰 Editorial Landing Page:** Bulbul-style product overview with 1-line installation box.

---

## 🛠️ Architecture

TaskCatch is designed for local-first speed and zero-friction utility:
- **Core Engine:** Tauri v2 + Rust (Native Win32 global hooks, clipboard listeners, SQLite store).
- **Web Frontend:** React 18 + TypeScript + Vite + Tailwind CSS.
- **CLI Engine:** Python 3 standalone CLI (`taskcatch_cli.py` & batch wrappers).
- **AI Extraction:** Direct client-side inference with Groq Cloud (Llama 3.3 70B) + smart local offline heuristic fallback.
- **Local Database:** SQLite on-device storage in `$LOCALAPPDATA/TaskCatch/taskcatch.db`.

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

5. **Run the automated E2E test suite:**
   ```bash
   npm run test:e2e
   ```

---

## 📄 License
MIT License. Free and Open Source forever.
