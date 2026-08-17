"""
TaskCatch Native Windows Global Background Daemon
Listens globally for F9, F8, Alt+X, Alt+C, and Ctrl+Shift+T across all Windows apps.
Safely captures highlighted text with 64-bit Win32 clipboard bindings, extracts tasks with Groq LLM,
stores in SQLite, and pushes to web dashboard in real time.
"""

import sys
import os
import time
import json
import sqlite3
import threading
import traceback
import urllib.request
import urllib.error
import ctypes
from ctypes import wintypes
from datetime import datetime, timezone, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# -------------------------------------------------------------
# Configuration
# -------------------------------------------------------------
PORT = 5174
DB_DIR = os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser('~')), 'TaskCatch')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'taskcatch.db')

# Virtual Key Codes
MOD_NONE = 0x0000
MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_NOREPEAT = 0x4000

VK_F9 = 0x78
VK_F8 = 0x77
VK_X = 0x58
VK_C = 0x43
VK_T = 0x54
VK_CONTROL = 0x11
VK_SHIFT_KEY = 0x10
VK_MENU = 0x12  # Alt

HOTKEY_F9 = 201
HOTKEY_F8 = 202
HOTKEY_ALT_X = 203
HOTKEY_ALT_C = 204
HOTKEY_CTRL_SHIFT_T = 205

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# 64-bit Windows API type declarations
kernel32.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
kernel32.GlobalAlloc.restype = wintypes.HGLOBAL

kernel32.GlobalLock.argtypes = [wintypes.HGLOBAL]
kernel32.GlobalLock.restype = ctypes.c_void_p

kernel32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
kernel32.GlobalUnlock.restype = wintypes.BOOL

user32.GetClipboardData.argtypes = [wintypes.UINT]
user32.GetClipboardData.restype = wintypes.HANDLE

user32.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]
user32.SetClipboardData.restype = wintypes.HANDLE

sse_clients = []
sse_lock = threading.Lock()

# -------------------------------------------------------------
# SQLite Database Manager
# -------------------------------------------------------------
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            raw_source_text TEXT,
            source_app TEXT,
            source_window_title TEXT,
            deadline DATETIME,
            priority TEXT DEFAULT 'medium',
            category TEXT DEFAULT 'General',
            is_completed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    # Migration if columns don't exist
    for col_def in [
        "source_app TEXT",
        "source_window_title TEXT",
        "source_url TEXT",
        "batch_id TEXT",
        "batch_total INTEGER"
    ]:
        try:
            cursor.execute(f"ALTER TABLE tasks ADD COLUMN {col_def};")
        except Exception:
            pass

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()

def get_setting(key, default=""):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row and row['value']:
            return row['value']
    except Exception as e:
        print(f"Error reading setting {key}: {e}", flush=True)
    return default

def save_task_to_db(task):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tasks (id, title, raw_source_text, source_app, source_window_title, source_url, batch_id, batch_total, deadline, priority, category, is_completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        task['id'],
        task['title'],
        task.get('raw_source_text'),
        task.get('source_app', 'Desktop'),
        task.get('source_window_title', ''),
        task.get('source_url', ''),
        task.get('batch_id'),
        task.get('batch_total'),
        task.get('deadline'),
        task.get('priority', 'medium'),
        task.get('category', 'General'),
        1 if task.get('is_completed') else 0,
        task.get('created_at', datetime.now(timezone.utc).isoformat())
    ))
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Active Window & Context Origin Intelligence
# -------------------------------------------------------------
def get_active_window_info():
    try:
        hwnd = user32.GetForegroundWindow()
        if not hwnd:
            return {"source_app": "Desktop", "source_window_title": ""}

        # 1. Window Title
        length = user32.GetWindowTextLengthW(hwnd)
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        title = buff.value.strip()

        # 2. Process Name
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

        process_name = "Desktop"
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        h_process = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid.value)
        if h_process:
            try:
                proc_buff = ctypes.create_unicode_buffer(1024)
                proc_size = wintypes.DWORD(1024)
                if kernel32.QueryFullProcessImageNameW(h_process, 0, proc_buff, ctypes.byref(proc_size)):
                    full_path = proc_buff.value
                    exe_name = full_path.split('\\')[-1].lower()
                    
                    app_map = {
                        "slack.exe": "Slack",
                        "chrome.exe": "Google Chrome",
                        "msedge.exe": "Microsoft Edge",
                        "firefox.exe": "Firefox",
                        "brave.exe": "Brave",
                        "code.exe": "VS Code",
                        "outlook.exe": "Outlook",
                        "discord.exe": "Discord",
                        "teams.exe": "Microsoft Teams",
                        "notion.exe": "Notion",
                        "powershell.exe": "PowerShell",
                        "cmd.exe": "Terminal",
                        "windowsterminal.exe": "Windows Terminal",
                    }
                    process_name = app_map.get(exe_name, exe_name.replace(".exe", "").capitalize())
            finally:
                kernel32.CloseHandle(h_process)

        return {
            "source_app": process_name,
            "source_window_title": title
        }
    except Exception as e:
        print(f"Error querying active window: {e}", flush=True)
        return {"source_app": "Desktop", "source_window_title": ""}

# -------------------------------------------------------------
# Windows Clipboard & Safe Copy Simulation
# -------------------------------------------------------------
CF_UNICODETEXT = 13
GMEM_MOVEABLE = 0x0002

def safe_open_clipboard():
    for _ in range(15):
        if user32.OpenClipboard(None):
            return True
        time.sleep(0.02)
    return False

def get_clipboard_text():
    if not safe_open_clipboard():
        return None
    try:
        handle = user32.GetClipboardData(CF_UNICODETEXT)
        if not handle:
            return None
        ptr = kernel32.GlobalLock(handle)
        if not ptr:
            return None
        try:
            text = ctypes.c_wchar_p(ptr).value
            return text
        finally:
            kernel32.GlobalUnlock(handle)
    finally:
        user32.CloseClipboard()

def set_clipboard_text(text):
    if not safe_open_clipboard():
        return False
    try:
        user32.EmptyClipboard()
        if text:
            w_bytes = (text + '\0').encode('utf-16-le')
            handle = kernel32.GlobalAlloc(GMEM_MOVEABLE, len(w_bytes))
            if handle:
                ptr = kernel32.GlobalLock(handle)
                if ptr:
                    ctypes.memmove(ptr, w_bytes, len(w_bytes))
                    kernel32.GlobalUnlock(handle)
                    user32.SetClipboardData(CF_UNICODETEXT, handle)
        return True
    except Exception as e:
        print(f"Clipboard write error: {e}", flush=True)
        return False
    finally:
        user32.CloseClipboard()

def release_all_modifiers():
    user32.keybd_event(VK_SHIFT_KEY, 0, 2, 0)
    user32.keybd_event(VK_CONTROL, 0, 2, 0)
    user32.keybd_event(VK_MENU, 0, 2, 0)
    time.sleep(0.04)

def simulate_copy():
    release_all_modifiers()
    user32.keybd_event(VK_CONTROL, 0, 0, 0)
    time.sleep(0.02)
    user32.keybd_event(VK_C, 0, 0, 0)
    time.sleep(0.02)
    user32.keybd_event(VK_C, 0, 2, 0)
    time.sleep(0.02)
    user32.keybd_event(VK_CONTROL, 0, 2, 0)
    time.sleep(0.04)

def capture_highlighted_text():
    try:
        # 1. Format-aware backup of original clipboard
        has_text = user32.IsClipboardFormatAvailable(CF_UNICODETEXT)
        backup = get_clipboard_text() if has_text else None
        sentinel = f"__TASKCATCH_SENTINEL_{int(time.time() * 1000)}__"
        set_clipboard_text(sentinel)
        time.sleep(0.025)

        # 2. Simulate Copy Keystrokes with modifier release
        simulate_copy()

        # 3. Adaptive debounce polling loop (up to 140ms with 15ms step)
        captured = None
        for _ in range(10):
            time.sleep(0.015)
            current = get_clipboard_text()
            if current and current != sentinel:
                captured = current.strip()
                break

        # 4. Non-destructive restore
        if backup is not None:
            set_clipboard_text(backup)
        elif not has_text:
            # If clipboard originally had non-text binary or was empty, don't overwrite with stale sentinel
            if safe_open_clipboard():
                user32.EmptyClipboard()
                user32.CloseClipboard()

        return captured
    except Exception as e:
        print(f"Capture error: {e}", flush=True)
        return None

# -------------------------------------------------------------
# LLM Task Extraction (Single Task Extraction Engine)
# -------------------------------------------------------------
def extract_url_from_text_or_window(text, window_title):
    import re
    # Check text for HTTP/HTTPS URL
    url_match = re.search(r'https?://[^\s<>"]+|www\.[^\s<>"]+', text)
    if url_match:
        url = url_match.group(0)
        if not url.startswith('http'):
            url = 'https://' + url
        return url
    
    # Check window title for URL pattern (e.g. Chrome / Edge)
    win_url_match = re.search(r'https?://[^\s<>"]+', window_title)
    if win_url_match:
        return win_url_match.group(0)
    
    return None

def extract_task_with_llm(raw_text, eod_time="17:00"):
    current_time_iso = datetime.now(timezone.utc).isoformat()
    groq_key = get_setting('groq_api_key', '')
    groq_model = get_setting('groq_model', 'llama-3.3-70b-versatile')

    if groq_key and groq_key.strip().startswith('gsk_'):
        try:
            print(f"[AI ENGINE] Querying Groq ({groq_model})...", flush=True)
            system_prompt = f"""You are a high-speed, deterministic Task Extraction Engine.
Analyze the user's input text and extract a clear, concise action item.
Current Timestamp: {current_time_iso}
User Workday End-of-Day (EOD): {eod_time}

Rules:
1. Extract a clear, imperative action item as 'task_title'.
2. Infer deadlines relative to the current timestamp. If "EOD" or "end of day", use {eod_time}. Output ISO-8601 string or null.
3. Infer priority (low, medium, high, urgent).
4. Categorize into a single word (e.g. Development, Finance, Work, Personal).

Return ONLY valid JSON matching this schema:
{{
  "task_title": "string",
  "deadline": "YYYY-MM-DDTHH:MM:SSZ" | null,
  "priority": "low" | "medium" | "high" | "urgent",
  "category": "string"
}}"""

            req_payload = {
                "model": groq_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": raw_text}
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"}
            }

            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=json.dumps(req_payload).encode('utf-8'),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {groq_key.strip()}"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=4) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))
                content = resp_data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return {
                    "task_title": parsed.get("task_title", "Action Item"),
                    "deadline": parsed.get("deadline"),
                    "priority": parsed.get("priority", "medium").lower(),
                    "category": parsed.get("category", "General")
                }
        except Exception as e:
            print(f"[AI ENGINE] Groq query error: {e}. Using local extractor.", flush=True)

    return local_heuristic_extract(raw_text, eod_time)

def local_heuristic_extract(text, eod_time="17:00"):
    lower = text.lower()
    
    try:
        eod_hour = int(eod_time.split(':')[0])
    except Exception:
        eod_hour = 17

    now = datetime.now(timezone.utc)

    # Priority inference
    priority = "medium"
    if any(k in lower for k in ["urgent", "critical", "asap", "emergency", "immediately", "blocker"]):
        priority = "urgent"
    elif any(k in lower for k in ["important", "high priority", "deadline today", "by tomorrow", "must review", "action required"]):
        priority = "high"
    elif any(k in lower for k in ["low priority", "when you can", "someday", "whenever", "when you have time"]):
        priority = "low"

    # Category inference
    category = "General"
    if any(k in lower for k in ["budget", "financial", "finance", "invoice", "tax", "cost", "payment", "projections", "revenue", "pricing"]):
        category = "Finance"
    elif any(k in lower for k in ["bug", "hotfix", "auth", "deploy", "code", "database", "devops", "sre", "api", "pull request", "token", "memory leak"]):
        category = "Development"
    elif any(k in lower for k in ["client", "meeting", "report", "deck", "presentation", "contract", "proposal", "review", "onboarding", "slides"]):
        category = "Work"
    elif any(k in lower for k in ["buy", "doctor", "coffee", "grocery", "gym", "home", "chore", "appointment", "order", "mouse", "desk"]):
        category = "Personal"

    # Deadline inference
    deadline = None
    if any(k in lower for k in ["tonight", "10 pm", "6:00 pm", "6 pm", "today", "eod", "end of day"]):
        deadline = now.replace(hour=eod_hour, minute=0, second=0, microsecond=0).isoformat()
    elif "tomorrow" in lower:
        deadline = (now + timedelta(days=1)).replace(hour=eod_hour, minute=0, second=0, microsecond=0).isoformat()
    elif "friday" in lower:
        days_ahead = (4 - now.weekday() + 7) % 7 or 7
        deadline = (now + timedelta(days=days_ahead)).replace(hour=eod_hour, minute=0, second=0, microsecond=0).isoformat()
    elif "next monday" in lower or "monday" in lower:
        days_ahead = (0 - now.weekday() + 7) % 7 or 7
        deadline = (now + timedelta(days=days_ahead)).replace(hour=12, minute=0, second=0, microsecond=0).isoformat()
    elif "in 2 days" in lower or "in two days" in lower:
        deadline = (now + timedelta(days=2)).isoformat()

    # Clean title
    clean_title = text.strip().split('\n')[0]
    for prefix in [
        "hey team", "hey", "hi", "hello", "please send", "please", "can you", "could you",
        "remember to", "urgent from", "need to", "should", "must review", "action required",
        "follow up on", "reminder:"
    ]:
        if clean_title.lower().startswith(prefix):
            clean_title = clean_title[len(prefix):].lstrip(" ,:")
            break
    if len(clean_title) > 80:
        clean_title = clean_title[:77] + "..."
    if not clean_title:
        clean_title = "Action Item"
    clean_title = clean_title[0].upper() + clean_title[1:] if clean_title else "Action Item"

    return {
        "task_title": clean_title,
        "deadline": deadline,
        "priority": priority,
        "category": category
    }

# -------------------------------------------------------------
# SSE Broadcast & Audio Feedback
# -------------------------------------------------------------
def broadcast_sse_event(event_name, data):
    # 1. Forward directly to Vite Server SSE on port 5173
    try:
        req = urllib.request.Request(
            'http://127.0.0.1:5173/api/broadcast',
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=2)
    except Exception:
        pass

    # 2. Local daemon SSE clients
    payload = f"event: {event_name}\ndata: {json.dumps(data)}\n\n".encode('utf-8')
    with sse_lock:
        closed = []
        for client in sse_clients:
            try:
                client.wfile.write(payload)
                client.wfile.flush()
            except Exception:
                closed.append(client)
        for c in closed:
            if c in sse_clients:
                sse_clients.remove(c)

def play_audio_feedback():
    try:
        user32.MessageBeep(0x00000040)
    except Exception:
        pass

# -------------------------------------------------------------
# Native Windows Desktop Floating Overlay HUD
# -------------------------------------------------------------
def show_native_desktop_hud(task):
    def _run_hud():
        try:
            import tkinter as tk
            root = tk.Tk()
            root.title("TaskCatch Overlay HUD")
            root.overrideredirect(True)
            root.attributes('-topmost', True)
            root.attributes('-alpha', 0.95)
            
            screen_width = root.winfo_screenwidth()
            hud_width = 480
            hud_height = 68
            x = (screen_width - hud_width) // 2
            y = 35
            root.geometry(f"{hud_width}x{hud_height}+{x}+{y}")
            root.configure(bg="#0b0c0a")

            frame = tk.Frame(root, bg="#131410", highlightbackground="#33361f", highlightthickness=1)
            frame.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

            accent = tk.Frame(frame, bg="#a8ad7a", height=2)
            accent.pack(fill=tk.X, side=tk.TOP)

            content = tk.Frame(frame, bg="#131410", padx=14, pady=6)
            content.pack(fill=tk.BOTH, expand=True)

            header_frame = tk.Frame(content, bg="#131410")
            header_frame.pack(fill=tk.X)

            icon_lbl = tk.Label(header_frame, text="⚡", fg="#d9dcc4", bg="#131410", font=("Segoe UI", 9, "bold"))
            icon_lbl.pack(side=tk.LEFT)

            app_name = task.get("source_app", "Desktop")
            priority = task.get("priority", "medium").upper()
            tag_text = f"CAPTURED FROM {app_name.upper()}  •  {priority}"
            tag_lbl = tk.Label(header_frame, text=tag_text, fg="#a8ad7a", bg="#131410", font=("Segoe UI", 8, "bold"))
            tag_lbl.pack(side=tk.LEFT, padx=5)

            title_text = task.get("title", "Action Item")
            if len(title_text) > 54:
                title_text = title_text[:52] + "..."
            title_lbl = tk.Label(content, text=title_text, fg="#f2f2ec", bg="#131410", font=("Segoe UI", 10, "bold"), anchor="w")
            title_lbl.pack(fill=tk.X, pady=(2, 0))

            root.after(3400, root.destroy)
            root.mainloop()
        except Exception as e:
            print(f"[HUD] Desktop overlay error: {e}", flush=True)

    threading.Thread(target=_run_hud, daemon=True).start()

# -------------------------------------------------------------
# Hotkey Trigger Action
# -------------------------------------------------------------
def handle_hotkey_trigger(trigger_name="HOTKEY"):
    try:
        print(f"\n⚡ [{trigger_name} TRIGGERED] Capturing highlighted text...", flush=True)
        
        # 1. Active window & process detection
        win_info = get_active_window_info()
        
        # 2. Capture highlighted text safely
        text = capture_highlighted_text()
        if not text:
            print("⚠ [CAPTURE] No highlighted text detected. Please select/highlight text first.", flush=True)
            return

        print(f"📋 [CAPTURED] ({len(text)} chars from {win_info['source_app']}): \"{text[:75]}{'...' if len(text) > 75 else ''}\"", flush=True)

        # 3. Detect deep-link source URL & EOD setting
        source_url = extract_url_from_text_or_window(text, win_info.get("source_window_title", ""))
        eod_setting = get_setting('eod_time', '17:00')

        # 4. Extract single clean task
        extracted = extract_task_with_llm(text, eod_setting)
        task_id = "task_" + os.urandom(4).hex()
        created_at = datetime.now(timezone.utc).isoformat()

        new_task = {
            "id": task_id,
            "title": extracted["task_title"],
            "raw_source_text": text,
            "source_app": win_info.get("source_app", "Desktop"),
            "source_window_title": win_info.get("source_window_title", ""),
            "source_url": source_url,
            "deadline": extracted.get("deadline"),
            "priority": extracted.get("priority", "medium"),
            "category": extracted.get("category", "General"),
            "is_completed": False,
            "created_at": created_at
        }

        save_task_to_db(new_task)
        print(f"💾 [SAVED] Task '{new_task['title']}' from [{win_info['source_app']}] saved to SQLite.", flush=True)

        # 5. Broadcast to dashboard
        broadcast_sse_event("task-created", new_task)

        # 6. Show Desktop Overlay HUD
        show_native_desktop_hud(new_task)

        # 7. Audio chime feedback check
        sound_enabled = get_setting('sound_feedback_enabled', 'true').lower() in ('true', '1', 'yes')
        if sound_enabled:
            play_audio_feedback()

        print(f"✅ [SYNCED] Pushed to dashboard & overlay ({new_task['priority'].upper()} / {new_task['category']})\n", flush=True)
    except Exception as e:
        print(f"Error handling hotkey trigger: {e}", flush=True)
        traceback.print_exc()

# -------------------------------------------------------------
# Threaded HTTP Server & SSE Stream
# -------------------------------------------------------------
class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/events':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            with sse_lock:
                sse_clients.append(self)
            
            try:
                while True:
                    time.sleep(10)
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
            except Exception:
                with sse_lock:
                    if self in sse_clients:
                        sse_clients.remove(self)
        
        elif self.path == '/api/tasks':
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks ORDER BY is_completed ASC, created_at DESC")
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()

            payload = json.dumps(rows).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(payload)

        elif self.path == '/api/capture-now':
            threading.Thread(target=handle_hotkey_trigger, args=("MANUAL",), daemon=True).start()
            payload = json.dumps({"status": "capturing"}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(payload)
        
        else:
            payload = json.dumps({"status": "running", "primary_hotkey": "F9", "hotkeys": ["F9", "F8", "Alt+X", "Alt+C", "Ctrl+Shift+T"]}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(payload)

    def do_POST(self):
        if self.path == '/api/extract':
            content_len = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_len).decode('utf-8')
            data = json.loads(body) if body else {}
            text = data.get('text', '')
            if text:
                extracted = extract_task_with_llm(text)
                task_id = "task_" + os.urandom(4).hex()
                new_task = {
                    "id": task_id,
                    "title": extracted["task_title"],
                    "raw_source_text": text,
                    "deadline": extracted.get("deadline"),
                    "priority": extracted.get("priority", "medium"),
                    "category": extracted.get("category", "General"),
                    "is_completed": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                save_task_to_db(new_task)
                broadcast_sse_event("task-created", new_task)
                payload = json.dumps(new_task).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(payload)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(payload)
                return

def start_http_server():
    server = ThreadingHTTPServer(('127.0.0.1', PORT), BridgeHandler)
    server.serve_forever()

# -------------------------------------------------------------
# Main Windows Message Loop
# -------------------------------------------------------------
def run_hotkey_listener():
    init_db()

    # Register Hotkeys:
    # 1. F9 (Single key - ZERO modifier conflicts)
    r_f9 = user32.RegisterHotKey(None, HOTKEY_F9, MOD_NONE | MOD_NOREPEAT, VK_F9)
    # 2. F8 (Single key backup)
    r_f8 = user32.RegisterHotKey(None, HOTKEY_F8, MOD_NONE | MOD_NOREPEAT, VK_F8)
    # 3. Alt + X
    r_ax = user32.RegisterHotKey(None, HOTKEY_ALT_X, MOD_ALT, VK_X)
    # 4. Alt + C
    r_ac = user32.RegisterHotKey(None, HOTKEY_ALT_C, MOD_ALT, VK_C)
    # 5. Ctrl + Shift + T
    r_cst = user32.RegisterHotKey(None, HOTKEY_CTRL_SHIFT_T, MOD_CONTROL | MOD_SHIFT, VK_T)

    print("=" * 65, flush=True)
    print("  ⚡ TASKCATCH NATIVE WINDOWS BACKGROUND DAEMON ACTIVE", flush=True)
    print("=" * 65, flush=True)
    print("  ✓ HOTKEYS ACTIVE ACROSS ALL WINDOWS APPS:", flush=True)
    print(f"    • [ F9 ]             (PRIMARY - Press single key F9: {'Active' if r_f9 else 'Blocked'})", flush=True)
    print(f"    • [ F8 ]             (Press single key F8: {'Active' if r_f8 else 'Blocked'})", flush=True)
    print(f"    • [ Alt + X ]        (Press Alt + X: {'Active' if r_ax else 'Blocked'})", flush=True)
    print(f"    • [ Alt + C ]        (Press Alt + C: {'Active' if r_ac else 'Blocked'})", flush=True)
    print(f"    • [ Ctrl + Shift + T ] ({'Active' if r_cst else 'Blocked'})", flush=True)
    print(f"  ✓ Dashboard Bridge: http://127.0.0.1:{PORT}", flush=True)
    print(f"  ✓ SQLite Database:  {DB_PATH}", flush=True)
    print("\n  👉 HOW TO CAPTURE A TASK IN 2 SECONDS:", flush=True)
    print("  1. Highlight ANY text in Mail, Slack, Word, Chrome, or Discord.", flush=True)
    print("  2. Press [ F9 ] on your keyboard.", flush=True)
    print("  3. The task extracts and appears in your dashboard immediately!\n", flush=True)

    server_thread = threading.Thread(target=start_http_server, daemon=True)
    server_thread.start()

    msg = wintypes.MSG()
    try:
        while True:
            res = user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
            if res <= 0:
                break
            if msg.message == 0x0312:  # WM_HOTKEY
                key_name = "F9" if msg.wParam == HOTKEY_F9 else \
                           "F8" if msg.wParam == HOTKEY_F8 else \
                           "Alt+X" if msg.wParam == HOTKEY_ALT_X else \
                           "Alt+C" if msg.wParam == HOTKEY_ALT_C else "Ctrl+Shift+T"
                threading.Thread(target=handle_hotkey_trigger, args=(key_name,), daemon=True).start()
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))
    except KeyboardInterrupt:
        print("\nStopping TaskCatch daemon...", flush=True)
    finally:
        user32.UnregisterHotKey(None, HOTKEY_F9)
        user32.UnregisterHotKey(None, HOTKEY_F8)
        user32.UnregisterHotKey(None, HOTKEY_ALT_X)
        user32.UnregisterHotKey(None, HOTKEY_ALT_C)
        user32.UnregisterHotKey(None, HOTKEY_CTRL_SHIFT_T)

if __name__ == '__main__':
    run_hotkey_listener()
