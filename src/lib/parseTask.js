/**
 * Offline keyword parser for quick-add text. Mirrors the fallback parser in
 * src-tauri/src/ai_client.rs; keep the two in step.
 *
 * Matches whole words only (so "syntax" is not "tax" and "follow" is not
 * "low"), and computes deadlines in the user's local time.
 */

const WEEKDAYS = [
  ['monday', 1],
  ['tuesday', 2],
  ['wednesday', 3],
  ['thursday', 4],
  ['friday', 5],
  ['saturday', 6],
  ['sunday', 0],
];

const HOUR_MS = 60 * 60 * 1000;

function toWords(text) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}#]+/u)
    .map((w) => w.replace(/^#+/, ''))
    .filter(Boolean);
}

function parsePriority(lower, words) {
  const has = (list) => words.some((w) => list.includes(w));
  if (lower.includes('!!') || has(['urgent', 'asap', 'critical', 'emergency'])) return 'Urgent';
  if (has(['high', 'important', 'p1'])) return 'High';
  if (has(['low', 'someday', 'p3'])) return 'Low';
  return 'Medium';
}

function parseCategory(lower, words) {
  const has = (list) => words.some((w) => list.includes(w));
  if (has(['dev', 'bug', 'bugs', 'fix', 'hotfix', 'deploy', 'code', 'release'])) return 'Development';
  if (lower.includes('$') || has(['finance', 'invoice', 'invoices', 'budget', 'tax', 'taxes', 'payment', 'expense'])) return 'Finance';
  if (has(['security', 'auth', 'vault', 'token', 'tokens', 'password', 'credentials'])) return 'Security';
  if (has(['personal', 'buy', 'call', 'home', 'groceries', 'doctor'])) return 'Personal';
  return 'General';
}

/** "5pm", "10:30 am" → { h, m } in 24h time, or null. */
function explicitTime(lower) {
  const match = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (!match) return null;
  let h = Number(match[1]);
  const m = match[2] ? Number(match[2]) : 0;
  if (h === 0 || h > 12 || m > 59) return null;
  if (h === 12) h = 0;
  if (match[3] === 'pm') h += 12;
  return { h, m };
}

function at(date, { h, m }) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Same rules as heuristic_deadline in ai_client.rs:
 * - "tonight": today 22:00 (or the stated time); if already past, one hour from now
 * - "tomorrow": tomorrow 17:00 (or the stated time)
 * - a weekday name: its next occurrence (today counts), 17:00 or the stated time
 * - "today"/"eod", or just a time: today; a stated time already past means tomorrow,
 *   while a past default time becomes end of today rather than instantly overdue
 * - otherwise: four hours from now for urgent text, else no deadline
 */
function parseDeadline(lower, words, now, urgent) {
  const has = (list) => words.some((w) => list.includes(w));
  const explicit = explicitTime(lower);

  if (has(['tonight'])) {
    const candidate = at(now, explicit || { h: 22, m: 0 });
    return candidate > now ? candidate : new Date(now.getTime() + HOUR_MS);
  }

  let day = null;
  if (has(['tomorrow'])) {
    day = addDays(now, 1);
  } else {
    const weekday = WEEKDAYS.find(([name]) => words.includes(name));
    if (weekday) {
      day = addDays(now, (weekday[1] - now.getDay() + 7) % 7);
    } else if (has(['today', 'eod']) || explicit) {
      day = new Date(now);
    }
  }

  if (!day) return urgent ? new Date(now.getTime() + 4 * HOUR_MS) : null;

  const time = explicit || { h: 17, m: 0 };
  const candidate = at(day, time);
  if (candidate > now) return candidate;
  if (!explicit) {
    const endOfToday = at(now, { h: 23, m: 59 });
    return endOfToday > now ? endOfToday : new Date(now.getTime() + HOUR_MS);
  }
  return at(addDays(day, 1), time);
}

/**
 * @returns {{ priority: string, category: string, deadline: string|null }}
 *   `deadline` is an ISO string, or null when the text names no date or time.
 */
export function parseTaskText(text, now = new Date()) {
  const lower = text.toLowerCase();
  const words = toWords(text);
  const priority = parsePriority(lower, words);
  const category = parseCategory(lower, words);
  const deadline = parseDeadline(lower, words, now, priority === 'Urgent');
  return { priority, category, deadline: deadline ? deadline.toISOString() : null };
}
