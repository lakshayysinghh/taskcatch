import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from './Modal';

const renderModal = (props = {}) =>
  render(
    <Modal isOpen onClose={() => {}} title="Example dialog" description="Details" {...props}>
      <input aria-label="first field" />
      <button type="button">Last button</button>
    </Modal>
  );

describe('Modal', () => {
  it('is a labelled, modal dialog', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).toBe('Example dialog');
  });

  it('closes on Escape, the close button and the backdrop', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('Close'));
    fireEvent.click(container.querySelector('[aria-hidden="true"]'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('locks page scroll while open and restores it on close', () => {
    const { rerender } = renderModal();
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Modal isOpen={false} onClose={() => {}} title="Example dialog" />);
    expect(document.body.style.overflow).toBe('');
  });

  it('renders nothing when closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
