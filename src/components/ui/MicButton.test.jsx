import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MicButton } from './MicButton';
import * as voice from '../../lib/voice';

vi.mock('../../lib/voice', () => ({
  voiceSupported: vi.fn(() => true),
  startVoice: vi.fn(async () => {}),
  stopVoice: vi.fn(async () => 'send the contract to Dana'),
  cancelVoice: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
  voice.voiceSupported.mockReturnValue(true);
});

describe('MicButton', () => {
  it('records on the first click and returns the transcript on the second', async () => {
    const onTranscript = vi.fn();
    render(<MicButton onTranscript={onTranscript} />);

    fireEvent.click(screen.getByLabelText('Speak instead of typing'));
    const stop = await screen.findByLabelText('Stop and transcribe');
    expect(stop.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(stop);
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('send the contract to Dana'));
    expect(screen.getByLabelText('Speak instead of typing')).toBeTruthy();
  });

  it('reports errors and returns to idle', async () => {
    voice.startVoice.mockRejectedValueOnce('Microphone access was blocked.');
    const onError = vi.fn();
    render(<MicButton onError={onError} />);
    fireEvent.click(screen.getByLabelText('Speak instead of typing'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Microphone access was blocked.'));
    expect(screen.getByLabelText('Speak instead of typing')).toBeTruthy();
  });

  it('discards a recording when it unmounts mid-recording', async () => {
    const { unmount } = render(<MicButton />);
    fireEvent.click(screen.getByLabelText('Speak instead of typing'));
    await screen.findByLabelText('Stop and transcribe');
    unmount();
    expect(voice.cancelVoice).toHaveBeenCalled();
  });

  it('is hidden where recording is not possible', () => {
    voice.voiceSupported.mockReturnValue(false);
    const { container } = render(<MicButton />);
    expect(container.innerHTML).toBe('');
  });
});
