/**
 * Shared task vocabulary and deadline helpers.
 *
 * PRIORITIES and CATEGORIES must match the lists in src-tauri/src/db.rs.
 * `timestamp` is when a task was captured; `deadline` is when it is due.
 * Everything about "overdue" or "due soon" uses `deadline` only.
 */

export const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];
export const CATEGORIES = ['General', 'Development', 'Finance', 'Security', 'Personal'];

const HOUR_MS = 60 * 60 * 1000;

function canonical(value, allowed) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === v) || null;
}

export const normalizePriority = (value) => canonical(value, PRIORITIES);
export const normalizeCategory = (value) => canonical(value, CATEGORIES);

/** The deadline as a Date, or null if missing or unparseable (e.g. old free-text values). */
export function getDeadline(task) {
  if (!task?.deadline) return null;
  const d = new Date(task.deadline);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function endOfDay(now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Not completed and the deadline has passed. */
export function isOverdue(task, now = new Date()) {
  const d = getDeadline(task);
  return !task.completed && !!d && d < now;
}

/** Not completed and due between now and `withinMs` from now. */
export function isDueWithin(task, withinMs, now = new Date()) {
  const d = getDeadline(task);
  return !task.completed && !!d && d >= now && d - now <= withinMs;
}

/** Not completed and due later today. */
export function isDueToday(task, now = new Date()) {
  const d = getDeadline(task);
  return !task.completed && !!d && d >= now && d <= endOfDay(now);
}

export const DUE_SOON_MS = 48 * HOUR_MS;

/** Sort: earliest deadline first; tasks without a deadline after them, newest first. */
export function compareByDeadline(a, b) {
  const da = getDeadline(a);
  const db = getDeadline(b);
  if (da && db) return da - db;
  if (da) return -1;
  if (db) return 1;
  return new Date(b.timestamp) - new Date(a.timestamp);
}

/** ISO string → value for <input type="datetime-local"> (local time, minute precision). */
export function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) → ISO string, or null when empty. */
export function fromLocalInputValue(value) {
  if (!value) return null;
  const d = new Date(value); // a date-time without an offset is parsed as local time
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Applies a partial update the same way the Rust backend does (used by the
 * browser build). Validates everything first; throws a string on bad input.
 * Absent fields are unchanged; `deadline: null` / `original_text: null` clear.
 */
export function applyTaskPatch(task, patch = {}) {
  const next = { ...task };

  if (patch.content !== undefined) {
    const content = String(patch.content ?? '').trim();
    if (!content) throw 'Task title cannot be empty';
    if (content.length > 500) throw 'Task title is longer than 500 characters';
    next.content = content;
  }
  if (patch.priority !== undefined) {
    const p = normalizePriority(patch.priority);
    if (!p) throw `Invalid priority '${patch.priority}'`;
    next.priority = p;
  }
  if (patch.category !== undefined && patch.category !== task.category) {
    const c = normalizeCategory(patch.category);
    if (!c) throw `Invalid category '${patch.category}'`;
    next.category = c;
  }
  if (patch.deadline !== undefined) {
    if (patch.deadline === null || String(patch.deadline).trim() === '') {
      next.deadline = null;
    } else {
      const d = new Date(patch.deadline);
      if (Number.isNaN(d.getTime())) throw `Invalid deadline '${patch.deadline}'`;
      next.deadline = d.toISOString();
    }
  }
  if (patch.original_text !== undefined) {
    const t = patch.original_text;
    next.original_text = t && String(t).trim() ? t : null;
  }
  return next;
}
