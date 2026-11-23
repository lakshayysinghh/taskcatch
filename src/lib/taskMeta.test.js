import { describe, expect, it } from 'vitest';
import {
  DUE_SOON_MS,
  applyTaskPatch,
  compareByDeadline,
  fromLocalInputValue,
  getDeadline,
  isDueToday,
  isDueWithin,
  isOverdue,
  normalizeCategory,
  normalizePriority,
  toLocalInputValue,
} from './taskMeta';
import { local, makeTask } from '../test/fixtures';

const NOON = local(2026, 11, 25, 12, 0);
const iso = (...args) => local(...args).toISOString();

describe('normalisers', () => {
  it('accept any case and reject unknown values', () => {
    expect(normalizePriority(' urgent ')).toBe('Urgent');
    expect(normalizePriority('p1')).toBeNull();
    expect(normalizeCategory('FINANCE')).toBe('Finance');
    expect(normalizeCategory('Work')).toBeNull();
  });
});

describe('deadline status (never the capture time)', () => {
  it('a task captured long ago with no deadline is not overdue', () => {
    const old = makeTask({ timestamp: iso(2020, 1, 1), deadline: null });
    expect(isOverdue(old, NOON)).toBe(false);
  });

  it('overdue only when active and past its deadline', () => {
    const late = makeTask({ deadline: iso(2026, 11, 25, 11, 0) });
    expect(isOverdue(late, NOON)).toBe(true);
    expect(isOverdue({ ...late, completed: true }, NOON)).toBe(false);
  });

  it('due today and due within 48 hours', () => {
    expect(isDueToday(makeTask({ deadline: iso(2026, 11, 25, 18, 0) }), NOON)).toBe(true);
    expect(isDueToday(makeTask({ deadline: iso(2026, 11, 26, 9, 0) }), NOON)).toBe(false);
    expect(isDueWithin(makeTask({ deadline: iso(2026, 11, 27, 11, 0) }), DUE_SOON_MS, NOON)).toBe(true);
    expect(isDueWithin(makeTask({ deadline: iso(2026, 11, 28, 13, 0) }), DUE_SOON_MS, NOON)).toBe(false);
  });

  it('treats old free-text deadlines as no deadline', () => {
    expect(getDeadline({ deadline: 'Today at 5:00 PM' })).toBeNull();
    expect(isOverdue(makeTask({ deadline: 'Today at 5:00 PM' }), NOON)).toBe(false);
  });
});

describe('compareByDeadline', () => {
  it('earliest first, then undated tasks newest first', () => {
    const tasks = [
      makeTask({ id: 'none-old', timestamp: '2026-01-01T00:00:00Z' }),
      makeTask({ id: 'late', deadline: '2026-12-05T00:00:00Z' }),
      makeTask({ id: 'none-new', timestamp: '2026-06-01T00:00:00Z' }),
      makeTask({ id: 'soon', deadline: '2026-11-26T00:00:00Z' }),
    ];
    expect(tasks.sort(compareByDeadline).map((t) => t.id)).toEqual(['soon', 'late', 'none-new', 'none-old']);
  });
});

describe('datetime-local conversion', () => {
  it('round-trips through local time', () => {
    const value = iso(2026, 12, 1, 17, 30);
    expect(toLocalInputValue(value)).toBe('2026-12-01T17:30');
    expect(fromLocalInputValue('2026-12-01T17:30')).toBe(value);
  });

  it('handles empty and invalid values', () => {
    expect(toLocalInputValue(null)).toBe('');
    expect(toLocalInputValue('Today at 5:00 PM')).toBe('');
    expect(fromLocalInputValue('')).toBeNull();
  });
});

describe('applyTaskPatch', () => {
  const task = makeTask({ category: 'Engineering', deadline: '2026-12-01T00:00:00.000Z' });

  it('validates every field before changing anything', () => {
    expect(() => applyTaskPatch(task, { content: 'changed', priority: 'Extreme' })).toThrow();
    expect(() => applyTaskPatch(task, { deadline: 'Today at 5:00 PM' })).toThrow();
    expect(() => applyTaskPatch(task, { content: '   ' })).toThrow();
    expect(task.content).not.toBe('changed');
  });

  it('normalises values, keeps an unchanged legacy category, clears with null', () => {
    const next = applyTaskPatch(task, { priority: 'high', category: 'Engineering', deadline: null, original_text: '' });
    expect(next).toMatchObject({ priority: 'High', category: 'Engineering', deadline: null, original_text: null });
    expect(next.timestamp).toBe(task.timestamp);
  });

  it('rejects a new unknown category', () => {
    expect(() => applyTaskPatch(task, { category: 'Work' })).toThrow();
  });
});
