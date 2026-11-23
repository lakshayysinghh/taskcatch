import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MorningStandupModal } from './MorningStandupModal';
import { safeInvoke } from '../lib/tauri';
import { makeTask } from '../test/fixtures';

vi.mock('../lib/tauri', () => ({ safeInvoke: vi.fn() }));

const HOUR = 3600e3;
const renderModal = (props = {}) =>
  render(
    <MorningStandupModal isOpen onClose={() => {}} tasks={[]} onClearCompleted={() => {}} onRefreshTasks={() => {}} {...props} />
  );
const statValue = (label) => screen.getByText(label).nextSibling.textContent;

beforeEach(() => {
  safeInvoke.mockReset();
});

describe('MorningStandupModal', () => {
  it('shows applied AI changes without crashing (regression: missing CheckCircle import)', async () => {
    const deadline = new Date(2026, 10, 26, 9, 0).toISOString();
    safeInvoke.mockResolvedValue({
      reply: 'Moved the **hotfix**.',
      mutations: [{ task_id: 'a', action: 'update', update_priority: 'Urgent', update_deadline: deadline, task_title: 'Deploy hotfix' }],
    });
    const onRefreshTasks = vi.fn();
    renderModal({ onRefreshTasks });

    await userEvent.type(screen.getByPlaceholderText(/Ask your assistant/), 'Make the hotfix urgent{enter}');

    expect(await screen.findByText('Applied Changes')).toBeTruthy();
    expect(screen.getByText(/Deploy hotfix: due .* · priority Urgent/)).toBeTruthy();
    expect(safeInvoke).toHaveBeenCalledWith('chat_with_standup_ai', { prompt: 'Make the hotfix urgent' });
    expect(onRefreshTasks).toHaveBeenCalled();
  });

  it('keeps the conversation when tasks change while open (regression: chat reset)', async () => {
    safeInvoke.mockResolvedValue({ reply: 'Raised it.', mutations: [] });
    const task = makeTask({ priority: 'Low' });
    const { rerender } = renderModal({ tasks: [task] });

    await userEvent.type(screen.getByPlaceholderText(/Ask your assistant/), 'raise priority{enter}');
    await screen.findByText('Raised it.');

    // The assistant's change arrives as new task data, changing the High/Urgent count.
    rerender(
      <MorningStandupModal isOpen onClose={() => {}} tasks={[{ ...task, priority: 'Urgent' }]} onClearCompleted={() => {}} onRefreshTasks={() => {}} />
    );

    expect(screen.getByText('raise priority')).toBeTruthy();
    expect(screen.getByText('Raised it.')).toBeTruthy();
  });

  it('counts overdue and due-today from deadlines, not capture time', () => {
    const now = Date.now();
    renderModal({
      tasks: [
        makeTask({ timestamp: '2020-01-01T00:00:00Z', priority: 'High', deadline: null }), // old, no deadline
        makeTask({ deadline: new Date(now - HOUR).toISOString() }), // overdue
        makeTask({ deadline: new Date(now - HOUR).toISOString(), completed: true }), // done
      ],
    });
    expect(statValue('Overdue')).toBe('1');
  });

  it('shows a helpful message when no API key is configured', async () => {
    safeInvoke.mockRejectedValue('Groq API key is not configured. Please set it in Settings.');
    renderModal();
    await userEvent.type(screen.getByPlaceholderText(/Ask your assistant/), 'hello{enter}');
    expect(await screen.findByText(/open Settings/)).toBeTruthy();
  });
});
