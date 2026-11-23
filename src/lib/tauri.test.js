import { afterEach, describe, expect, it, vi } from 'vitest';
import { isTauri, safeInvoke as invoke } from './tauri';
import { groqResponse } from '../test/fixtures';

// jsdom has no __TAURI_INTERNALS__, so these exercise the browser (localStorage) backend,
// which must follow the same rules as the Rust backend.

afterEach(() => {
  vi.unstubAllGlobals();
});

const setApiKey = (key) =>
  localStorage.setItem('taskcatch_web_config', JSON.stringify({ groq_api_key: key, global_hotkey: 'F9' }));

describe('environment', () => {
  it('runs as the browser build', () => {
    expect(isTauri).toBe(false);
  });
});

/** Adds a task through the backend and returns it. */
const addTask = (content = 'Write the report', extra = {}) =>
  invoke('create_task_item', { content, priority: 'Medium', category: 'General', deadline: null, ...extra });

describe('get_tasks', () => {
  it('starts with no tasks — no demo data', async () => {
    expect(await invoke('get_tasks')).toEqual([]);
  });

  it('removes demo tasks seeded by earlier versions, keeping real ones', async () => {
    localStorage.setItem(
      'taskcatch_web_tasks',
      JSON.stringify([
        { id: 'sample-1', content: 'Deploy hotfix for authentication token expiry' },
        { id: 'web-123-abc', content: 'My real task', priority: 'Medium', category: 'General', timestamp: '2026-11-01T00:00:00Z' },
        { id: 'sample-4', content: 'Order replacement ergonomic mouse' },
      ])
    );
    const tasks = await invoke('get_tasks');
    expect(tasks.map((t) => t.id)).toEqual(['web-123-abc']);
    expect(JSON.parse(localStorage.getItem('taskcatch_web_tasks'))).toHaveLength(1); // cleaned up for good
  });

  it('survives corrupt stored data', async () => {
    localStorage.setItem('taskcatch_web_tasks', '{not json');
    expect(await invoke('get_tasks')).toEqual([]);
  });
});

describe('create_task_item', () => {
  it('validates and normalises input, and keeps the source text', async () => {
    const t = await invoke('create_task_item', {
      content: '  Ship it ',
      priority: 'urgent',
      category: 'development',
      deadline: null,
      originalText: 'from slack',
    });
    expect(t).toMatchObject({ content: 'Ship it', priority: 'Urgent', category: 'Development', original_text: 'from slack', deadline: null });
    expect((await invoke('get_tasks'))[0].id).toBe(t.id);
  });

  it('rejects free-text deadlines and empty titles', async () => {
    await expect(invoke('create_task_item', { content: 'x', deadline: 'Today at 5:00 PM' })).rejects.toBeDefined();
    await expect(invoke('create_task_item', { content: '   ' })).rejects.toBeDefined();
  });
});

describe('update_task_item', () => {
  it('saves edits and never changes the capture time', async () => {
    const first = await addTask();
    const deadline = new Date(2026, 11, 1, 9, 0).toISOString();
    await invoke('update_task_item', { taskId: first.id, patch: { content: 'Edited', deadline } });
    const reloaded = (await invoke('get_tasks')).find((t) => t.id === first.id);
    expect(reloaded).toMatchObject({ content: 'Edited', deadline, timestamp: first.timestamp });
  });

  it('rejects unknown tasks and invalid values', async () => {
    const first = await addTask();
    await expect(invoke('update_task_item', { taskId: 'nope', patch: {} })).rejects.toBeDefined();
    await expect(invoke('update_task_item', { taskId: first.id, patch: { priority: 'Extreme' } })).rejects.toBeDefined();
  });
});

describe('toggle_task_item', () => {
  it('returns the saved state and rejects unknown tasks', async () => {
    const first = await addTask();
    expect(await invoke('toggle_task_item', { taskId: first.id })).toBe(!first.completed);
    await expect(invoke('toggle_task_item', { taskId: 'nope' })).rejects.toBeDefined();
  });
});

describe('trigger_capture', () => {
  it('explains that capture needs the desktop app instead of hanging', async () => {
    await expect(invoke('trigger_capture')).rejects.toMatch(/desktop app/);
  });
});

describe('chat_with_standup_ai', () => {
  it('without a key, returns a labelled offline summary', async () => {
    const res = await invoke('chat_with_standup_ai', { prompt: 'hi' });
    expect(res.mutations).toEqual([]);
    expect(res.reply).toMatch(/offline/);
  });

  it('sends local time, applies only valid changes, to the deadline', async () => {
    setApiKey('placeholder-key');
    const target = await addTask('Deploy the hotfix', { priority: 'Urgent' });
    const other = await addTask('Review the budget');
    const fetchMock = vi.fn(async () =>
      groqResponse({
        reply: 'Done.',
        mutations: [
          { task_id: target.id, action: 'update', update_timestamp: '2026-11-26T09:00:00+05:30', update_priority: 'low' },
          { task_id: other.id, action: 'update', update_priority: 'EXTREME' },
          { task_id: 'ghost', action: 'update', update_priority: 'High' },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await invoke('chat_with_standup_ai', { prompt: 'push the hotfix' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toMatch(/UTC offset [+-]\d\d:\d\d/);
    expect(body.messages[1].content).not.toContain('original_text'); // source text stays local
    expect(res.mutations).toHaveLength(1);
    expect(res.mutations[0]).toMatchObject({ task_title: target.content, update_priority: 'Low' });
    expect(res.reply).toMatch(/2 suggested change\(s\) could not be applied/);

    const after = (await invoke('get_tasks')).find((t) => t.id === target.id);
    expect(new Date(after.deadline).getTime()).toBe(new Date('2026-11-26T09:00:00+05:30').getTime());
    expect(after.timestamp).toBe(target.timestamp);
    expect(after.priority).toBe('Low');
  });

  it('reports API failures instead of returning a canned answer', async () => {
    setApiKey('placeholder-key');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })));
    await expect(invoke('chat_with_standup_ai', { prompt: 'hi' })).rejects.toMatch(/401/);
  });
});
