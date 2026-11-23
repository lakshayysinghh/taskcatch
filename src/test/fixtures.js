// Test fixtures. Dates are built in local time so tests pass in any timezone.

/** A local Date. 2026-11-25 is a Wednesday. */
export const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);

let counter = 0;

/** A task with sensible defaults; override any field. */
export function makeTask(overrides = {}) {
  counter += 1;
  return {
    id: `t-${counter}`,
    content: `Task ${counter}`,
    original_text: null,
    timestamp: '2026-11-01T09:00:00.000Z',
    priority: 'Medium',
    category: 'General',
    deadline: null,
    source_app: null,
    completed: false,
    ...overrides,
  };
}

/** A Groq chat-completions response whose message content is `payload` as JSON. */
export function groqResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
  };
}
