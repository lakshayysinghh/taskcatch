#!/usr/bin/env python3
"""
TaskCatch Command-Line Interface (CLI)
Usage:
  taskcatch add "Buy groceries tomorrow at 5pm #personal p:high"
  taskcatch list
  taskcatch done <id_or_number>
  taskcatch standup
  taskcatch capture
  taskcatch clear
"""

import sys
import os
import json
import sqlite3
import re
from datetime import datetime, timezone, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

DB_DIR = os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser('~')), 'TaskCatch')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'taskcatch.db')

# ANSI Colors
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        raw_source_text TEXT,
        deadline TEXT,
        priority TEXT DEFAULT 'medium',
        category TEXT DEFAULT 'General',
        is_completed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        source_app TEXT,
        source_window_title TEXT,
        source_url TEXT
    )
    """)
    conn.commit()
    return conn

def parse_nlp_shorthand(text, eod_hour=17):
    category = "General"
    cat_match = re.search(r"#([\w\-]+)", text)
    if cat_match:
        category = cat_match.group(1).capitalize()
        text = text.replace(cat_match.group(0), "").strip()

    priority = "medium"
    prio_match = re.search(r"\b(?:p:|priority:)(urgent|high|medium|low)\b", text, re.I)
    if prio_match:
        priority = prio_match.group(1).lower()
        text = text.replace(prio_match.group(0), "").strip()
    elif "!urgent" in text.lower():
        priority = "urgent"
        text = re.sub(r"!urgent", "", text, flags=re.I).strip()

    deadline = None
    now = datetime.now(timezone.utc)
    lower = text.lower()

    if "tomorrow" in lower:
        dt = now + timedelta(days=1)
        dt = dt.replace(hour=eod_hour, minute=0, second=0, microsecond=0)
        deadline = dt.isoformat()
    elif "today" in lower or "tonight" in lower or "eod" in lower:
        dt = now.replace(hour=eod_hour, minute=0, second=0, microsecond=0)
        deadline = dt.isoformat()
    elif "friday" in lower:
        days_ahead = (4 - now.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        dt = now + timedelta(days=days_ahead)
        dt = dt.replace(hour=eod_hour, minute=0, second=0, microsecond=0)
        deadline = dt.isoformat()

    title = re.sub(r"\s+", " ", text).strip()
    if not title:
        title = "Action Item"

    return {
        "title": title,
        "priority": priority,
        "category": category,
        "deadline": deadline,
    }

def cmd_add(args):
    if not args:
        print(f"{RED}Error:{RESET} Please provide a task description.")
        print(f"Example: {CYAN}taskcatch add \"Deploy hotfix tomorrow at 5pm #dev p:urgent\"{RESET}")
        return

    raw_text = " ".join(args)
    parsed = parse_nlp_shorthand(raw_text)

    conn = get_db()
    task_id = "task_" + os.urandom(4).hex()
    now_iso = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """
        INSERT INTO tasks (id, title, raw_source_text, deadline, priority, category, is_completed, created_at, source_app)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'CLI')
    """,
        (
            task_id,
            parsed["title"],
            raw_text,
            parsed["deadline"],
            parsed["priority"],
            parsed["category"],
            now_iso,
        ),
    )
    conn.commit()
    conn.close()

    # Notify local daemon so web dashboard live-updates via SSE (non-blocking)
    new_task_payload = {
        "id": task_id,
        "title": parsed["title"],
        "raw_source_text": raw_text,
        "deadline": parsed["deadline"],
        "priority": parsed["priority"],
        "category": parsed["category"],
        "is_completed": False,
        "created_at": now_iso,
        "source_app": "CLI",
        "source_window_title": "",
        "source_url": None,
    }
    try:
        import urllib.request, json as _json
        req_body = _json.dumps(new_task_payload).encode("utf-8")
        req = urllib.request.Request(
            "http://127.0.0.1:5174/api/notify",
            data=req_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=1)
    except Exception:
        pass  # Daemon not running — dashboard will reflect after next refresh

    print(f"\n{GREEN}{BOLD}✔ Task Captured to TaskCatch!{RESET}")
    print(f"  • {BOLD}Title:{RESET}    {parsed['title']}")
    print(f"  • {BOLD}Priority:{RESET} {parsed['priority'].upper()}")
    print(f"  • {BOLD}Category:{RESET} #{parsed['category']}")
    if parsed["deadline"]:
        print(f"  • {BOLD}Deadline:{RESET} {parsed['deadline']}")
    print(f"  • {DIM}ID: {task_id}{RESET}\n")

def cmd_list(args=None):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM tasks WHERE is_completed = 0 ORDER BY created_at DESC"
    ).fetchall()
    conn.close()

    if not rows:
        print(f"\n{GREEN}✨ All caught up! No active tasks pending.{RESET}\n")
        return

    print(f"\n{CYAN}{BOLD}⚡ TASKCATCH — ACTIVE ACTION ITEMS ({len(rows)}){RESET}")
    print("=" * 70)
    print(f"{BOLD}{'#':<3} {'PRIORITY':<9} {'CATEGORY':<12} {'DEADLINE':<16} {'TITLE'}{RESET}")
    print("-" * 70)

    for idx, r in enumerate(rows, 1):
        prio = r["priority"] or "medium"
        prio_color = RED if prio in ("urgent", "high") else (YELLOW if prio == "medium" else GREEN)
        dl_str = "None"
        if r["deadline"]:
            try:
                dl_str = r["deadline"][:10]
            except:
                pass
        cat = (r["category"] or "General")[:11]
        title = (r["title"] or "")[:35]

        print(f"{idx:<3} {prio_color}{prio.upper():<9}{RESET} {cat:<12} {dl_str:<16} {title}")

    print("=" * 70)
    print(f"{DIM}Tip: Mark complete with: taskcatch done <number>{RESET}\n")

def cmd_done(args):
    if not args:
        print(f"{RED}Error:{RESET} Please specify the task number or ID to complete.")
        return

    target = args[0]
    conn = get_db()

    # Check if number
    if target.isdigit():
        idx = int(target)
        rows = conn.execute(
            "SELECT id, title FROM tasks WHERE is_completed = 0 ORDER BY created_at DESC"
        ).fetchall()
        if 1 <= idx <= len(rows):
            task_id = rows[idx - 1]["id"]
            title = rows[idx - 1]["title"]
            conn.execute("UPDATE tasks SET is_completed = 1 WHERE id = ?", (task_id,))
            conn.commit()
            conn.close()
            print(f"\n{GREEN}✔ Completed:{RESET} \"{title}\"\n")
            return
        else:
            conn.close()
            print(f"{RED}Error:{RESET} Task #{idx} not found.")
            return

    # Treat as ID
    conn.execute("UPDATE tasks SET is_completed = 1 WHERE id = ?", (target,))
    conn.commit()
    conn.close()
    print(f"\n{GREEN}✔ Task marked as completed.{RESET}\n")

def cmd_standup(args=None):
    conn = get_db()
    rows = conn.execute("SELECT * FROM tasks WHERE is_completed = 0").fetchall()
    conn.close()

    now = datetime.now(timezone.utc)
    overdue = []
    urgent = []

    for r in rows:
        if r["priority"] in ("urgent", "high"):
            urgent.append(r)
        if r["deadline"]:
            try:
                dt = datetime.fromisoformat(r["deadline"].replace("Z", "+00:00"))
                if dt < now:
                    overdue.append(r)
            except:
                pass

    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 17 else "Good evening")

    print(f"\n{YELLOW}{BOLD}☀️ {greeting}! Here is your Executive Standup Briefing:{RESET}")
    print("-" * 65)
    print(f"  • Active Tasks:    {BOLD}{len(rows)}{RESET}")
    print(f"  • Overdue Items:   {RED if overdue else GREEN}{BOLD}{len(overdue)}{RESET}")
    print(f"  • High / Urgent:   {YELLOW if urgent else GREEN}{BOLD}{len(urgent)}{RESET}")
    print("-" * 65)

    if urgent:
        print(f"\n{BOLD}🎯 Top High-Impact Priorities Today:{RESET}")
        for idx, r in enumerate(urgent[:3], 1):
            print(f"  {idx}. [{r['priority'].upper()}] {r['title']} (#{r['category']})")
    else:
        print(f"\n{GREEN}✨ Your top priority queue is clear for today!{RESET}")
    print("")

def cmd_clear(args=None):
    conn = get_db()
    cursor = conn.execute("DELETE FROM tasks WHERE is_completed = 1")
    conn.commit()
    count = cursor.rowcount
    conn.close()
    print(f"\n{GREEN}✔ Cleaned up {count} completed task(s) from database.{RESET}\n")

def print_help():
    print(f"""
{CYAN}{BOLD}⚡ TASKCATCH CLI — Universal Action Item Extractor{RESET}

{BOLD}USAGE:{RESET}
  {GREEN}taskcatch add <text>{RESET}      Capture a task with shorthand (#tag, p:urgent, tomorrow 5pm)
  {GREEN}taskcatch list{RESET}            Display all active action items
  {GREEN}taskcatch done <#>{RESET}        Mark task as completed by row number or ID
  {GREEN}taskcatch standup{RESET}         Run executive daily morning standup briefing
  {GREEN}taskcatch clear{RESET}           Purge all completed items
  {GREEN}taskcatch help{RESET}            Show this command help

{BOLD}EXAMPLES:{RESET}
  taskcatch add "Deploy auth patch tomorrow at 5pm #dev p:urgent"
  taskcatch add "Review client NDA by Friday 4pm #legal"
  taskcatch done 1
  taskcatch standup
""")

def main():
    if len(sys.argv) < 2:
        cmd_list()
        return

    cmd = sys.argv[1].lower()
    args = sys.argv[2:]

    if cmd in ("add", "new", "create", "a"):
        cmd_add(args)
    elif cmd in ("list", "ls", "l", "tasks"):
        cmd_list(args)
    elif cmd in ("done", "complete", "check", "d"):
        cmd_done(args)
    elif cmd in ("standup", "briefing", "s"):
        cmd_standup(args)
    elif cmd in ("clear", "clean", "purge"):
        cmd_clear(args)
    elif cmd in ("help", "--help", "-h"):
        print_help()
    else:
        # Default: treat entire arguments as quick add
        cmd_add(sys.argv[1:])

if __name__ == "__main__":
    main()
