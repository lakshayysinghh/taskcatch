import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualCaptureModal } from './ManualCaptureModal';

const textbox = () => screen.getByPlaceholderText(/Deploy auth hotfix/);

describe('ManualCaptureModal (quick add)', () => {
  it('saves a real ISO deadline (regression: stored "Today at 5:00 PM")', async () => {
    const onSaveTask = vi.fn(async () => true);
    const onClose = vi.fn();
    render(<ManualCaptureModal isOpen onClose={onClose} onSaveTask={onSaveTask} />);

    await userEvent.type(textbox(), 'Deploy hotfix tomorrow 5pm #dev urgent');
    expect(screen.getByText(/Tomorrow at/)).toBeTruthy();
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const saved = onSaveTask.mock.calls[0][0];
    expect(saved).toMatchObject({ content: 'Deploy hotfix tomorrow 5pm #dev urgent', priority: 'Urgent', category: 'Development' });

    const expected = new Date();
    expected.setDate(expected.getDate() + 1);
    expected.setHours(17, 0, 0, 0);
    expect(new Date(saved.deadline).getTime()).toBe(expected.getTime());
  });

  it('adds no deadline when none is mentioned', async () => {
    const onSaveTask = vi.fn(async () => true);
    render(<ManualCaptureModal isOpen onClose={() => {}} onSaveTask={onSaveTask} />);

    await userEvent.type(textbox(), 'review the proposal');
    expect(screen.getByText('No deadline')).toBeTruthy();
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(onSaveTask).toHaveBeenCalled());
    expect(onSaveTask.mock.calls[0][0].deadline).toBeNull();
  });

  it('keeps the text when saving fails', async () => {
    const onClose = vi.fn();
    render(<ManualCaptureModal isOpen onClose={onClose} onSaveTask={async () => false} />);

    await userEvent.type(textbox(), 'call the bank{enter}');

    await waitFor(() => expect(textbox().value).toBe('call the bank'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
