import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TaskDetailModal } from './TaskDetailModal';
import { local, makeTask } from '../test/fixtures';

const deadlineInput = (container) => container.querySelector('input[type="datetime-local"]');

describe('TaskDetailModal (editing)', () => {
  const task = makeTask({ content: 'Ship release', deadline: local(2026, 12, 1, 17, 30).toISOString() });

  it('shows the saved deadline in local time (regression: ISO values rendered blank)', () => {
    const { container } = render(<TaskDetailModal isOpen task={task} onClose={() => {}} onSave={async () => true} />);
    expect(deadlineInput(container).value).toBe('2026-12-01T17:30');
  });

  it('saves an ISO deadline and closes on success', async () => {
    const onSave = vi.fn(async () => true);
    const onClose = vi.fn();
    render(<TaskDetailModal isOpen task={task} onClose={onClose} onSave={onSave} />);

    fireEvent.click(screen.getByText('Save task'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: task.id, content: 'Ship release', deadline: task.deadline, original_text: null })
    );
  });

  it('sends null to clear the deadline', async () => {
    const onSave = vi.fn(async () => true);
    const { container } = render(<TaskDetailModal isOpen task={task} onClose={() => {}} onSave={onSave} />);
    fireEvent.change(deadlineInput(container), { target: { value: '' } });
    fireEvent.click(screen.getByText('Save task'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ deadline: null })));
  });

  it('stays open with the typed changes when saving fails', async () => {
    const onClose = vi.fn();
    render(<TaskDetailModal isOpen task={task} onClose={onClose} onSave={async () => false} />);
    fireEvent.change(screen.getByDisplayValue('Ship release'), { target: { value: 'Ship release v2' } });
    fireEvent.click(screen.getByText('Save task'));

    await waitFor(() => expect(screen.getByText('Save task')).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Ship release v2')).toBeTruthy();
  });

  it('keeps an older category selectable', () => {
    render(<TaskDetailModal isOpen task={makeTask({ category: 'Engineering' })} onClose={() => {}} onSave={async () => true} />);
    expect(screen.getByDisplayValue('Engineering')).toBeTruthy();
  });
});
