/**
 * TaskCatch Unified Tauri & Web Abstraction Layer
 * 
 * Provides 100% safe, non-crashing wrappers for all Tauri APIs.
 * Automatically switches between native desktop Tauri IPC and browser localStorage simulation.
 */

export const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

const INITIAL_SAMPLE_TASKS = [
  {
    id: 'sample-1',
    content: 'Deploy hotfix for authentication token expiry',
    original_text: 'Slack #dev-ops: We need to deploy the hotfix for the token expiry ASAP before 5 PM release.',
    priority: 'Urgent',
    category: 'Development',
    deadline: new Date(Date.now() + 4 * 3600000).toISOString(),
    source_app: 'Slack | #dev-ops',
    timestamp: new Date().toISOString(),
    completed: false,
  },
  {
    id: 'sample-2',
    content: 'Review Q3 financial projections spreadsheet',
    original_text: 'Email from CFO: Please review the attached Q3 financial model by tomorrow afternoon.',
    priority: 'High',
    category: 'Finance',
    deadline: new Date(Date.now() + 24 * 3600000).toISOString(),
    source_app: 'Inbox - sample@gmail.com - Google Chrome',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    completed: false,
  },
  {
    id: 'sample-3',
    content: 'Store the provided key in a secure vault',
    original_text: 'API credentials generated: Ensure all tokens are stored in AWS Secrets Manager.',
    priority: 'High',
    category: 'Security',
    deadline: new Date(Date.now() + 48 * 3600000).toISOString(),
    source_app: 'AWS Management Console - Google Chrome',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    completed: false,
  },
  {
    id: 'sample-4',
    content: 'Order replacement ergonomic mouse',
    original_text: 'Logitech MX Master 3S order request for workstation setup.',
    priority: 'Low',
    category: 'Personal',
    deadline: null,
    source_app: 'Amazon.com - Google Chrome',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    completed: false,
  },
];

function getStoredTasks() {
  if (typeof window === 'undefined') return INITIAL_SAMPLE_TASKS;
  const stored = localStorage.getItem('taskcatch_web_tasks');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_SAMPLE_TASKS;
    }
  }
  localStorage.setItem('taskcatch_web_tasks', JSON.stringify(INITIAL_SAMPLE_TASKS));
  return INITIAL_SAMPLE_TASKS;
}

function saveStoredTasks(tasks) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('taskcatch_web_tasks', JSON.stringify(tasks));
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
      const tasks = getStoredTasks().map((t) =>
        t.id === (args.taskId || args.task_id) ? { ...t, completed: !t.completed } : t
      );
      saveStoredTasks(tasks);
      const updated = tasks.find((t) => t.id === (args.taskId || args.task_id));
      return updated ? updated.completed : false;
    }
    case 'create_task_item': {
      const newTask = {
        id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        content: args.content,
        priority: args.priority || 'Medium',
        category: args.category || 'General',
        deadline: args.deadline || null,
        source_app: 'Web Browser Entry',
        original_text: args.content,
        timestamp: new Date().toISOString(),
        completed: false,
      };
      const tasks = [newTask, ...getStoredTasks()];
      saveStoredTasks(tasks);
      return newTask;
    }
    case 'trigger_capture': {
      return;
    }
    case 'chat_with_standup_ai': {
      const config = getStoredConfig();
      const apiKey = config.groq_api_key;
      const prompt = args.prompt || '';
      const tasks = getStoredTasks();

      if (apiKey && apiKey.trim().length > 0) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: `You are the Morning Standup Bot. Current tasks JSON: ${JSON.stringify(tasks)}. Respond in JSON: {"reply": "Markdown response", "mutations": []}`,
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              response_format: { type: 'json_object' },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(data.choices[0].message.content);
            return parsed;
          }
        } catch (e) {
          console.warn('[Web AI] Groq direct fetch failed, using mock response:', e);
        }
      }

      // Default smart response if no key or offline
      const urgentCount = tasks.filter((t) => !t.completed && (t.priority === 'Urgent' || t.priority === 'High')).length;
      return {
        reply: `Here is your Standup Summary:\n\n- You have **${urgentCount} high/urgent priorities** on deck.\n- All systems operational.\n\n*Note: To enable live LLM chat on the web, add your Groq API key in Settings.*`,
        mutations: [],
      };
    }
    default:
      console.warn(`[Web Tauri Mock] Unhandled command: ${cmd}`, args);
      return null;
  }
}

/**
 * Safe invoke: executes native Tauri command if in desktop app, else runs web storage simulation.
 */
export async function safeInvoke(cmd, args = {}) {
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke(cmd, args);
    } catch (e) {
      console.error(`[Tauri Invoke Error] ${cmd}:`, e);
      return webTauriBackend(cmd, args);
    }
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
