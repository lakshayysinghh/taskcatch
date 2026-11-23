import { describe, expect, it, vi } from 'vitest';
import { cancelVoice, startVoice, stopVoice, voiceSupported } from './voice';
import { safeInvoke } from './tauri';

// Desktop app: the Rust backend records; the page only calls its commands.
vi.mock('./tauri', () => ({ isTauri: true, safeInvoke: vi.fn(async (cmd) => (cmd === 'voice_stop' ? 'pay rent friday' : undefined)) }));

describe('desktop voice', () => {
  it('uses the backend recorder commands', async () => {
    expect(voiceSupported()).toBe(true);
    await startVoice();
    expect(await stopVoice()).toBe('pay rent friday');
    await cancelVoice();
    expect(safeInvoke.mock.calls.map((c) => c[0])).toEqual(['voice_start', 'voice_stop', 'voice_cancel']);
  });
});
