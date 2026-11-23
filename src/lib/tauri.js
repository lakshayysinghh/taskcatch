/**
 * TaskCatch Unified Tauri & Web Abstraction Layer
 * 
 * In the desktop app, calls go to the Rust backend. In a plain browser (the web
 * deployment), they go to a localStorage simulation instead. The choice is made
 * once from the environment, never per call: a backend error in the desktop app
 * is passed to the caller, not covered up with simulated data.
 */

import { applyTaskPatch, isOverdue } from './taskMeta';

export const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

const TASKS_KEY = 'taskcatch_web_tasks';

// Earlier versions seeded four demo tasks with these ids into every visitor's
// browser. The dashboard now starts empty, so they are removed on load.
const isLegacySampleTask = (t) => typeof t?.id === 'string' && /^sample-\d+$/.test(t.id);

/** Tasks saved in this browser; starts empty. */
function getStoredTasks() {
  if (typeof window === 'undefined') return [];
  let stored = null;
  try {
    stored = localStorage.getItem(TASKS_KEY);
  } catch {
    return []; // storage blocked by the browser
  }
  if (!stored) return [];
  let tasks;
  try {
    tasks = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(tasks)) return [];
  const real = tasks.filter((t) => !isLegacySampleTask(t));
  if (real.length !== tasks.length) saveStoredTasks(real);
  return real;
}

function saveStoredTasks(tasks) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    throw 'Your browser is blocking storage for this site, so tasks cannot be saved here.';
  }
}

function getStoredConfig() {
  if (typeof window === 'undefined') return { groq_api_key: '', global_hotkey: 'F9' };
  const stored = localStorage.getItem('taskcatch_web_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { groq_api_key: '', global_hotkey: 'F9' };
    }
  }
  return { groq_api_key: '', global_hotkey: 'F9' };
}

function saveStoredConfig(cfg) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('taskcatch_web_config', JSON.stringify(cfg));
}

/** "now" for the model, with the user's UTC offset (mirrors local_time_context in ai_client.rs). */
function localTimeContext(now = new Date()) {
  const offsetMin = -now.getTimezoneOffset();
  const abs = Math.abs(offsetMin);
  const pad = (n) => String(n).padStart(2, '0');
  const offset = `${offsetMin >= 0 ? '+' : '-'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  return `Current local date and time: ${weekday} ${date} ${pad(now.getHours())}:${pad(now.getMinutes())} (UTC offset ${offset}).`;
}

const CHAT_INSTRUCTIONS = `You are the Morning Standup Bot, an executive AI assistant managing the user's tasks.
You are given the user's current tasks as JSON. Each task has an id, title, priority, category, deadline (ISO-8601 or null), completed flag and captured_at time.
A task is overdue when it is not completed and its deadline is earlier than the current time.
Answer the user's questions based on these tasks.
If they ask to push, reschedule or reprioritise tasks, include a mutation for each affected task.
IMPORTANT: respond in valid JSON with exactly two fields:
- "reply": a concise, helpful Markdown response to the user.
- "mutations": an array (possibly empty). Each item has "task_id", "action": "update", optional "update_priority" (one of "Urgent", "High", "Medium", "Low") and optional "update_deadline" (ISO-8601 date-time with the user's UTC offset).`;

/** Browser-build equivalent of chat_with_standup_ai: same prompt, same validation of changes. */
async function webStandupChat(apiKey, prompt, tasks) {
  const compact = tasks.map((t) => ({
    id: t.id,
    title: t.content,
    priority: t.priority,
    category: t.category,
    deadline: t.deadline,
    completed: t.completed,
    captured_at: t.timestamp,
  }));

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${CHAT_INSTRUCTIONS}\n\n${localTimeContext()}` },
        { role: 'user', content: `Current Tasks:\n${JSON.stringify(compact)}\n\nUser Prompt: ${prompt}` },
      ],
    }),
  });
  if (!res.ok) throw `API Error: ${res.status}`;

  let parsed;
  try {
    const data = await res.json();
    parsed = JSON.parse(data.choices[0].message.content);
  } catch {
    throw 'Failed to parse JSON schema from LLM.';
  }

  const stored = getStoredTasks();
  const applied = [];
  let skipped = 0;
  for (const m of Array.isArray(parsed.mutations) ? parsed.mutations : []) {
    const deadline = m.update_deadline ?? m.update_timestamp;
    const patch = {
      ...(m.update_priority ? { priority: m.update_priority } : {}),
      ...(deadline ? { deadline } : {}),
    };
    const index = stored.findIndex((t) => t.id === m.task_id);
    if ((m.action ?? 'update') !== 'update' || index === -1 || Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }
    try {
      stored[index] = applyTaskPatch(stored[index], patch);
      applied.push({
        task_id: m.task_id,
        action: 'update',
        update_priority: patch.priority ? stored[index].priority : null,
        update_deadline: patch.deadline ? stored[index].deadline : null,
        task_title: stored[index].content,
      });
    } catch {
      skipped++;
    }
  }
  if (applied.length > 0) saveStoredTasks(stored);

  let reply = String(parsed.reply ?? '');
  if (skipped > 0) reply += `\n\n_Note: ${skipped} suggested change(s) could not be applied and were skipped._`;
  return { reply, mutations: applied };
}

// Browser simulation fallback for Tauri commands
async function webTauriBackend(cmd, args = {}) {
  switch (cmd) {
    case 'get_tasks': {
      return getStoredTasks();
    }
    case 'get_config': {
      return getStoredConfig();
    }
    case 'update_config': {
      saveStoredConfig(args.newConfig || args.new_config || {});
      return;
    }
    case 'delete_task_item': {
      const tasks = getStoredTasks().filter((t) => t.id !== (args.taskId || args.task_id));
      saveStoredTasks(tasks);
      return;
    }
    case 'toggle_task_item': {
      const id = args.taskId || args.task_id;
      const tasks = getStoredTasks();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) throw `Task ${id} not found`;
      tasks[index] = { ...tasks[index], completed: !tasks[index].completed };
      saveStoredTasks(tasks);
      return tasks[index].completed;
    }
    case 'create_task_item': {
      const base = {
        id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        content: '',
        priority: 'Medium',
        category: 'General',
        deadline: null,
        source_app: null,
        original_text: null,
        timestamp: new Date().toISOString(),
        completed: false,
      };
      // Same validation as the desktop backend.
      const newTask = applyTaskPatch(base, {
        content: args.content ?? '',
        ...(args.priority ? { priority: args.priority } : {}),
        ...(args.category ? { category: args.category } : {}),
        deadline: args.deadline ?? null,
        original_text: args.originalText ?? null,
      });
      saveStoredTasks([newTask, ...getStoredTasks()]);
      return newTask;
    }
    case 'update_task_item': {
      const id = args.taskId || args.task_id;
      const tasks = getStoredTasks();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) throw `Task ${id} not found`;
      tasks[index] = applyTaskPatch(tasks[index], args.patch || {});
      saveStoredTasks(tasks);
      return tasks[index];
    }
    case 'trigger_capture': {
      // A browser tab cannot read other apps' selections.
      throw 'Capturing highlighted text needs the TaskCatch desktop app. In the browser, use "extract" (Ctrl+K) to add a task.';
    }
    case 'chat_with_standup_ai': {
      const config = getStoredConfig();
      const apiKey = config.groq_api_key;
      const prompt = args.prompt || '';
      const tasks = getStoredTasks();

      if (apiKey && apiKey.trim().length > 0) {
        // A configured key that fails is an error, not a cue to show a canned answer.
        return webStandupChat(apiKey.trim(), prompt, tasks);
      }

      // No key: offline summary, clearly labelled as such.
      const urgentCount = tasks.filter((t) => !t.completed && (t.priority === 'Urgent' || t.priority === 'High')).length;
      const overdue = tasks.filter((t) => isOverdue(t)).length;
      return {
        reply: `Here is your offline standup summary:\n\n- **${urgentCount}** high/urgent task(s) open.\n- **${overdue}** overdue task(s).\n\n*Add your Groq API key in Settings to chat with the assistant.*`,
        mutations: [],
      };
    }
    default:
      console.warn(`[Web Tauri Mock] Unhandled command: ${cmd}`, args);
      return null;
  }
}

/**
 * Runs the native Tauri command in the desktop app, or the web storage
 * simulation in a browser. In the desktop app, backend errors (Rust `Err`
 * strings) reject the returned promise; callers must handle them.
 */
export async function safeInvoke(cmd, args = {}) {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(cmd, args);
  }
  return webTauriBackend(cmd, args);
}

/**
 * Safe listen: listens for events inside Tauri, no-ops safely in web browser.
 */
export async function safeListen(event, callback) {
  if (isTauri) {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      return await listen(event, callback);
    } catch (e) {
      console.warn(`[Tauri Listen Error] ${event}:`, e);
    }
  }
  return () => {};
}

/**
 * Safe open: uses Tauri shell plugin if available, falls back to window.open.
 */
export async function safeOpen(url) {
  if (isTauri) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
      return;
    } catch (e) {
      console.warn('[Tauri Shell Open Error] Falling back to browser open:', e);
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Safe notification: triggers native notification in Tauri or Web Notification API.
 */
export async function safeSendNotification(options) {
  if (isTauri) {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
      let granted = await isPermissionGranted();
      if (!granted) {
        const res = await requestPermission();
        granted = res === 'granted';
      }
      if (granted) {
        sendNotification(options);
      }
    } catch (e) {
      console.warn('[Tauri Notification Error]:', e);
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(options.title || 'TaskCatch', { body: options.body });
    }
  }
}
