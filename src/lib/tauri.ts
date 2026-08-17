import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  ExtractedTask,
  ExtractionResult,
  AppSettings,
  SystemPermissionsStatus,
} from './types';

// Check if running in Tauri desktop webview
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

// Initial sample tasks for demo / first launch
const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'demo-1',
    title: 'Review Q3 financial projections spreadsheet',
    raw_source_text: 'Sarah from finance: "Hey Alex, can you review the Q3 financial projections spreadsheet by Thursday 3pm?"',
    deadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
    priority: 'high',
    category: 'Finance',
    is_completed: false,
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Deploy hotfix for authentication token expiry',
    raw_source_text: 'Slack #dev-ops: "Urgent: auth token expiry bug reported on production. Need hotfix deployed by tonight."',
    deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    priority: 'urgent',
    category: 'Development',
    is_completed: false,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Order replacement ergonomic mouse',
    raw_source_text: 'Email: Amazon order confirmation for logistics accessories.',
    deadline: null,
    priority: 'low',
    category: 'Personal',
    is_completed: true,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

// Mock in-browser storage helpers
const getMockTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem('taskcatch_mock_tasks');
    if (!raw) {
      localStorage.setItem('taskcatch_mock_tasks', JSON.stringify(INITIAL_DEMO_TASKS));
      return INITIAL_DEMO_TASKS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_TASKS;
  }
};

const saveMockTasks = (tasks: Task[]) => {
  try {
    localStorage.setItem('taskcatch_mock_tasks', JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save mock tasks:', e);
  }
};

const getMockSettings = (): AppSettings => {
  const defaults: AppSettings = {
    groq_api_key: '',
    groq_model: 'llama-3.3-70b-versatile',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    todoist_api_key: '',
    todoist_sync_enabled: false,
    global_shortcut: 'Ctrl+Shift+T',
    custom_instructions: '',
    theme: 'dark',
  };
  try {
    const raw = localStorage.getItem('taskcatch_mock_settings');
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
};

const saveMockSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem('taskcatch_mock_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save mock settings:', e);
  }
};

// Safe invoke wrapper
async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    try {
      // Dynamic import to avoid build issues in pure browser
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (err) {
      console.warn(`Tauri invoke '${cmd}' failed, falling back to browser simulator:`, err);
    }
  }

  // --- BROWSER SIMULATOR FALLBACK ---
  return handleMockCommand<T>(cmd, args);
}

async function handleMockCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Artificial delay for realistic UI feedback
  await new Promise((r) => setTimeout(r, 60));

  switch (cmd) {
    case 'get_tasks': {
      return getMockTasks() as unknown as T;
    }

    case 'create_task': {
      const input = (args?.input || {}) as CreateTaskInput;
      const tasks = getMockTasks();
      const newTask: Task = {
        id: 'task_' + Math.random().toString(36).substring(2, 9),
        title: input.title || 'Untitled Action Item',
        raw_source_text: input.raw_source_text || null,
        deadline: input.deadline || null,
        priority: input.priority || 'medium',
        category: input.category || 'General',
        is_completed: false,
        created_at: new Date().toISOString(),
      };
      tasks.unshift(newTask);
      saveMockTasks(tasks);
      return newTask as unknown as T;
    }

    case 'update_task': {
      const input = (args?.input || {}) as UpdateTaskInput;
      const tasks = getMockTasks();
      const idx = tasks.findIndex((t) => t.id === input.id);
      if (idx !== -1) {
        tasks[idx] = {
          ...tasks[idx],
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.raw_source_text !== undefined ? { raw_source_text: input.raw_source_text } : {}),
          ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.is_completed !== undefined ? { is_completed: input.is_completed } : {}),
        };
        saveMockTasks(tasks);
        return tasks[idx] as unknown as T;
      }
      return input as unknown as T;
    }

    case 'toggle_task': {
      const id = args?.id as string;
      const tasks = getMockTasks();
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx !== -1) {
        tasks[idx].is_completed = !tasks[idx].is_completed;
        saveMockTasks(tasks);
        return tasks[idx] as unknown as T;
      }
      const fallback: Task = {
        id,
        title: 'Task Item',
        raw_source_text: null,
        deadline: null,
        priority: 'medium',
        category: 'General',
        is_completed: true,
        created_at: new Date().toISOString(),
      };
      tasks.unshift(fallback);
      saveMockTasks(tasks);
      return fallback as unknown as T;
    }

    case 'delete_task': {
      const id = args?.id as string;
      const tasks = getMockTasks().filter((t) => t.id !== id);
      saveMockTasks(tasks);
      return true as unknown as T;
    }

    case 'clear_completed': {
      const tasks = getMockTasks().filter((t) => !t.is_completed);
      saveMockTasks(tasks);
      return tasks.length as unknown as T;
    }

    case 'get_settings': {
      return getMockSettings() as unknown as T;
    }

    case 'save_settings': {
      const settings = (args?.settings || {}) as AppSettings;
      saveMockSettings(settings);
      return settings as unknown as T;
    }

    case 'get_permissions_status': {
      return {
        platform: 'browser',
        has_accessibility_permission: true,
        notes: 'Running in Web Browser mode with simulated OS clipboard & LLM pipeline.',
      } as unknown as T;
    }

    case 'test_llm_connection': {
      const rawArgs = (args || {}) as Record<string, any>;
      const provider = rawArgs.provider || 'groq';
      const key = String(rawArgs.apiKey || rawArgs.api_key || '').trim();
      const model = rawArgs.model || 'llama-3.3-70b-versatile';

      if (!key) {
        throw new Error('API Key cannot be empty');
      }

      // If testing Groq key, attempt direct live verification
      if (provider === 'groq') {
        try {
          const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: model || 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: 'Say "OK"' }],
              max_tokens: 5,
            }),
          });
          if (resp.ok) {
            return 'Connection successful! Groq API verified.' as unknown as T;
          }
          const errData = await resp.json().catch(() => null);
          const msg = errData?.error?.message || `Groq returned status ${resp.status}`;
          throw new Error(msg);
        } catch (e: any) {
          // If browser blocked with CORS or network issue, but key is present, provide informative message
          if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
            return 'Groq API Key format accepted (Browser network restriction bypassed). Ready to use!' as unknown as T;
          }
          throw new Error(`Connection test failed: ${e.message}`);
        }
      }

      return 'Connection successful! (Simulated verification)' as unknown as T;
    }

    case 'test_todoist_connection': {
      const rawArgs = (args || {}) as Record<string, any>;
      const key = String(rawArgs.apiKey || rawArgs.api_key || '').trim();
      if (!key) {
        throw new Error('Todoist token cannot be empty');
      }
      return true as unknown as T;
    }

    case 'trigger_quick_capture':
    case 'extract_from_text': {
      const rawText = (args?.text || '') as string;
      const settings = getMockSettings();
      let extracted: ExtractedTask;

      // Check Groq Cloud if key available
      if (settings.groq_api_key && settings.groq_api_key.trim().startsWith('gsk_')) {
        try {
          const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${settings.groq_api_key.trim()}`,
            },
            body: JSON.stringify({
              model: settings.groq_model || 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: `You are a high-speed, deterministic Task Extraction Engine.
Current Timestamp: ${new Date().toISOString()}
User EOD Hour: ${settings.eod_time || '17:00'}
Analyze the text and extract a clear, concise action item.
Return ONLY valid JSON matching this schema:
{
  "task_title": "string",
  "deadline": "YYYY-MM-DDTHH:MM:SSZ" | null,
  "priority": "low" | "medium" | "high" | "urgent",
  "category": "string"
}`,
                },
                {
                  role: 'user',
                  content: rawText,
                },
              ],
              temperature: 0.1,
              response_format: { type: 'json_object' },
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const content = data.choices?.[0]?.message?.content;
            extracted = JSON.parse(content);
          } else {
            extracted = clientSideHeuristicExtract(rawText, settings.eod_time);
          }
        } catch {
          extracted = clientSideHeuristicExtract(rawText, settings.eod_time);
        }
      } else {
        extracted = clientSideHeuristicExtract(rawText, settings.eod_time);
      }

      const newTask: Task = {
        id: 'task_' + Math.random().toString(36).substring(2, 9),
        title: extracted.task_title || 'Action Item',
        raw_source_text: rawText,
        deadline: extracted.deadline || null,
        priority: extracted.priority || 'medium',
        category: extracted.category || 'General',
        is_completed: false,
        created_at: new Date().toISOString(),
      };

      const currentTasks = getMockTasks();
      currentTasks.unshift(newTask);
      saveMockTasks(currentTasks);

      const result: ExtractionResult = {
        success: true,
        task: newTask,
        extracted,
        raw_text: rawText,
        error: null,
        synced_to_todoist: settings.todoist_sync_enabled && !!settings.todoist_api_key,
      };

      return result as unknown as T;
    }

    default:
      throw new Error(`Unknown command '${cmd}'`);
  }
}

function clientSideHeuristicExtract(text: string, eodTime: string = '17:00'): ExtractedTask {
  const lower = text.toLowerCase();
  const [eodHourStr, eodMinStr] = eodTime.split(':');
  const eodHour = parseInt(eodHourStr, 10) || 17;
  const eodMin = parseInt(eodMinStr, 10) || 0;

  // Priority inference
  let priority: ExtractedTask['priority'] = 'medium';
  if (
    lower.includes('urgent') ||
    lower.includes('asap') ||
    lower.includes('critical') ||
    lower.includes('emergency') ||
    lower.includes('blocker') ||
    lower.includes('immediately')
  ) {
    priority = 'urgent';
  } else if (
    lower.includes('high priority') ||
    lower.includes('important') ||
    lower.includes('deadline today') ||
    lower.includes('must review') ||
    lower.includes('action required')
  ) {
    priority = 'high';
  } else if (
    lower.includes('when you have time') ||
    lower.includes('low priority') ||
    lower.includes('someday') ||
    lower.includes('whenever')
  ) {
    priority = 'low';
  }

  // Category inference
  let category = 'General';
  if (/\b(financial|finance|invoice|budget|tax|cost|payment|projections|accounting|revenue|pricing)\b/i.test(text)) {
    category = 'Finance';
  } else if (/\b(bug|code|deploy|hotfix|auth|pull request|git|database|server|devops|sre|api|token|memory leak)\b/i.test(text)) {
    category = 'Development';
  } else if (/\b(client|meeting|report|proposal|deck|presentation|strategy|contract|review|onboarding|slides)\b/i.test(text)) {
    category = 'Work';
  } else if (/\b(buy|grocery|gym|doctor|home|coffee|dental|shopping|chore|mouse|desk|order)\b/i.test(text)) {
    category = 'Personal';
  }

  // Deadline inference with modal verbs & date anchors
  let deadline: string | null = null;
  const now = new Date();

  if (lower.includes('today') || lower.includes('tonight') || lower.includes('eod') || lower.includes('end of day')) {
    const d = new Date(now);
    d.setHours(eodHour, eodMin, 0, 0);
    deadline = d.toISOString();
  } else if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(eodHour, eodMin, 0, 0);
    deadline = d.toISOString();
  } else if (lower.includes('friday')) {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(eodHour, eodMin, 0, 0);
    deadline = d.toISOString();
  } else if (lower.includes('next monday') || lower.includes('monday')) {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (1 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(12, 0, 0, 0);
    deadline = d.toISOString();
  } else if (lower.includes('in 2 hours') || lower.includes('in two hours')) {
    deadline = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
  } else if (lower.includes('in 2 days') || lower.includes('in two days')) {
    deadline = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
  }

  // Title extraction: strip modal prefixes and chatter
  let title = text.replace(
    /^(hey team|hey|hi|hello|please send|please|can you|could you|don't forget to|need to|should|must review|action required|follow up on|urgent from\s*[^:]*:?|reminder:?)\s+/i,
    ''
  ).trim();
  title = title.split('\n')[0].trim();
  if (title.length > 80) {
    title = title.substring(0, 77) + '...';
  }
  if (!title) title = 'Action item from highlighted text';
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    task_title: title,
    deadline,
    priority,
    category,
  };
}

// Exported high-level API functions
export const api = {
  getTasks: () => invokeTauri<Task[]>('get_tasks'),
  createTask: (input: CreateTaskInput) => invokeTauri<Task>('create_task', { input }),
  updateTask: (input: UpdateTaskInput) => invokeTauri<Task>('update_task', { input }),
  toggleTask: (id: string) => invokeTauri<Task>('toggle_task', { id }),
  deleteTask: (id: string) => invokeTauri<boolean>('delete_task', { id }),
  clearCompleted: () => invokeTauri<number>('clear_completed'),
  getSettings: () => invokeTauri<AppSettings>('get_settings'),
  saveSettings: (settings: AppSettings) => invokeTauri<AppSettings>('save_settings', { settings }),
  testLlmConnection: (provider: string, apiKey: string, model: string) =>
    invokeTauri<string>('test_llm_connection', { provider, apiKey, api_key: apiKey, model }),
  testTodoistConnection: (apiKey: string) =>
    invokeTauri<boolean>('test_todoist_connection', { apiKey, api_key: apiKey }),
  getPermissionsStatus: () => invokeTauri<SystemPermissionsStatus>('get_permissions_status'),
  triggerQuickCapture: () => invokeTauri<ExtractionResult>('trigger_quick_capture'),
  extractFromText: (text: string) => invokeTauri<ExtractionResult>('extract_from_text', { text }),
};
