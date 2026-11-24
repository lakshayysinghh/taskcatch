import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ManualCaptureModal } from './ManualCaptureModal';
import { SettingsModal } from './SettingsModal';
import { safeInvoke } from '../lib/tauri';

vi.mock('../lib/voice', () => ({
  voiceSupported: () => true,
  startVoice: vi.fn(async () => {}),
  stopVoice: vi.fn(async () => 'tomorrow 5pm'),
  cancelVoice: vi.fn(async () => {}),
}));

vi.mock('../lib/tauri', () => ({
  isTauri: true,
  safeOpen: vi.fn(),
  safeInvoke: vi.fn(async (cmd) =>
    cmd === 'get_config'
      ? { groq_api_key: 'k', global_hotkey: 'F9', voice_hotkey: 'F8', dictation_hotkey: 'F7', voice_language: '', dictation_cleanup: true, voice_vocabulary: 'Priya' }
      : undefined
  ),
}));

describe('Quick add with voice', () => {
  it('appends the spoken words to what was typed, and the preview updates', async () => {
    render(<ManualCaptureModal isOpen onClose={() => {}} onSaveTask={async () => true} />);
    const box = screen.getByPlaceholderText(/Deploy auth hotfix/);
    fireEvent.change(box, { target: { value: 'Call the bank' } });

    fireEvent.click(screen.getByLabelText('Speak instead of typing'));
    fireEvent.click(await screen.findByLabelText('Stop and transcribe'));

    await waitFor(() => expect(box.value).toBe('Call the bank tomorrow 5pm'));
    expect(screen.getByText(/Tomorrow at/)).toBeTruthy();
  });
});

describe('Settings: voice tab', () => {
  it('saves every setting, including voice, so nothing is reset to defaults', async () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen onClose={onClose} onConfigSaved={() => {}} />);
    await waitFor(() => expect(safeInvoke).toHaveBeenCalledWith('get_config'));

    fireEvent.click(screen.getByRole('tab', { name: /Voice/ }));
    fireEvent.change(screen.getByLabelText(/Language/), { target: { value: 'hi' } });
    // Turn dictation off with its "Off" preset (the second Off button on the tab).
    fireEvent.click(screen.getAllByText('Off')[1]);
    fireEvent.change(screen.getByLabelText(/Custom words/), { target: { value: ' Priya, Kubernetes ' } });
    fireEvent.click(screen.getByRole('switch', { name: /Tidy dictated text/ }));
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const saved = safeInvoke.mock.calls.find((c) => c[0] === 'update_config')[1].newConfig;
    expect(saved).toEqual({
      groq_api_key: 'k',
      global_hotkey: 'F9',
      voice_hotkey: 'F8',
      dictation_hotkey: '',
      voice_language: 'hi',
      dictation_cleanup: false,
      voice_vocabulary: 'Priya, Kubernetes',
    });
  });
});
