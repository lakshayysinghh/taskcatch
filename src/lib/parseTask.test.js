import { describe, expect, it } from 'vitest';
import { parseTaskText } from './parseTask';
import { local } from '../test/fixtures';

// Same cases as the tests in src-tauri/src/ai_client.rs; keep them in step.
const WED_MORNING = local(2026, 11, 25, 9, 0);
const WED_EVENING = local(2026, 11, 25, 19, 0);

const deadline = (text, now) => {
  const d = parseTaskText(text, now).deadline;
  return d ? new Date(d).getTime() : null;
};
const labels = (text) => {
  const r = parseTaskText(text, WED_MORNING);
  return `${r.priority}/${r.category}`;
};

describe('priority and category', () => {
  it('matches whole words only', () => {
    expect(labels('Follow up with Sam about the syntax error')).toBe('Medium/General'); // not "low", not "tax"
    expect(labels('Thanks! See you')).toBe('Medium/General'); // a single "!" is not urgent
    expect(labels('Highlight the author bio')).toBe('Medium/General'); // not "high", not "auth"
  });

  it('recognises keywords and #tags', () => {
    expect(labels('URGENT: fix the #dev build')).toBe('Urgent/Development');
    expect(labels('Pay the invoice, important')).toBe('High/Finance');
    expect(labels('Rotate the vault token, low priority')).toBe('Low/Security');
    expect(labels('buy groceries')).toBe('Medium/Personal');
    expect(labels('Server is down!!')).toBe('Urgent/General');
  });
});

describe('deadlines (local time)', () => {
  it('resolves weekdays to their next occurrence', () => {
    expect(deadline('send report by friday', WED_MORNING)).toBe(local(2026, 11, 27, 17, 0).getTime());
    expect(deadline('prep for monday', WED_MORNING)).toBe(local(2026, 11, 30, 17, 0).getTime());
    expect(deadline('wednesday 3pm sync', WED_MORNING)).toBe(local(2026, 11, 25, 15, 0).getTime());
  });

  it('understands tonight, tomorrow and explicit times', () => {
    expect(deadline('deploy tonight', WED_MORNING)).toBe(local(2026, 11, 25, 22, 0).getTime());
    expect(deadline('call tomorrow at 10:30 am', WED_MORNING)).toBe(local(2026, 11, 26, 10, 30).getTime());
    expect(deadline('ping at 8pm', WED_MORNING)).toBe(local(2026, 11, 25, 20, 0).getTime());
    expect(deadline('standup at 12pm', WED_MORNING)).toBe(local(2026, 11, 25, 12, 0).getTime());
  });

  it('rolls past times forward instead of creating overdue tasks', () => {
    expect(deadline('call at 3pm', WED_EVENING)).toBe(local(2026, 11, 26, 15, 0).getTime());
    expect(deadline('finish this today', WED_EVENING)).toBe(local(2026, 11, 25, 23, 59).getTime());
    const lateTonight = local(2026, 11, 25, 23, 0);
    expect(deadline('deploy tonight', lateTonight)).toBe(lateTonight.getTime() + 3600e3);
  });

  it('gives no deadline unless a date is named or the text is urgent', () => {
    expect(deadline('review the proposal', WED_MORNING)).toBeNull();
    expect(deadline('asap: restart the server', WED_MORNING)).toBe(WED_MORNING.getTime() + 4 * 3600e3);
  });

  it('ignores impossible times', () => {
    expect(deadline('meet at 13pm', WED_MORNING)).toBeNull();
  });

  it('returns an ISO string the backend accepts', () => {
    const { deadline: iso } = parseTaskText('tomorrow 5pm', WED_MORNING);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
