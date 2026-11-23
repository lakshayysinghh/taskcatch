import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelVoice, startVoice, stopVoice, voiceSupported } from './voice';

// Browser build: MediaRecorder + Groq Whisper with the visitor's key.

class FakeRecorder {
  static last = null;
  constructor(stream) {
    this.stream = stream;
    this.state = 'inactive';
    this.mimeType = 'audio/webm';
    FakeRecorder.last = this;
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };
let now = 1_000_000;

beforeEach(() => {
  now = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
  });
  localStorage.setItem('taskcatch_web_config', JSON.stringify({ groq_api_key: 'placeholder-key', voice_language: 'hi' }));
});

afterEach(async () => {
  await cancelVoice();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const okResponse = (text) => ({ ok: true, status: 200, json: async () => ({ text }) });

describe('web voice', () => {
  it('is supported when the browser can record', () => {
    expect(voiceSupported()).toBe(true);
  });

  it('needs a Groq key', async () => {
    localStorage.setItem('taskcatch_web_config', JSON.stringify({ groq_api_key: '' }));
    await expect(startVoice()).rejects.toMatch(/Groq API key/);
  });

  it('explains a blocked microphone', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
    await expect(startVoice()).rejects.toMatch(/Microphone access was blocked/);
  });

  it('transcribes with Whisper, sending the pinned language', async () => {
    const fetchMock = vi.fn(async () => okResponse('  call the bank tomorrow  '));
    vi.stubGlobal('fetch', fetchMock);

    await startVoice();
    now += 2000;
    const text = await stopVoice();

    expect(text).toBe('call the bank tomorrow');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(init.headers.Authorization).toBe('Bearer placeholder-key');
    expect(init.body.get('model')).toBe('whisper-large-v3-turbo');
    expect(init.body.get('language')).toBe('hi');
    expect(init.body.get('file')).toBeInstanceOf(Blob);
    expect(track.stop).toHaveBeenCalled(); // microphone released
  });

  it('rejects very short takes without calling Groq', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await startVoice();
    now += 100;
    await expect(stopVoice()).rejects.toMatch(/Too short/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a rejected key and rate limits clearly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })));
    await startVoice();
    now += 2000;
    await expect(stopVoice()).rejects.toMatch(/rejected the API key/);

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429 })));
    await startVoice();
    now += 2000;
    await expect(stopVoice()).rejects.toMatch(/rate limit/);
  });

  it('treats an empty transcript as no speech', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse('   ')));
    await startVoice();
    now += 2000;
    await expect(stopVoice()).rejects.toMatch(/No speech was recognised/);
  });

  it('cancel discards the recording and frees the microphone', async () => {
    await startVoice();
    await cancelVoice();
    expect(track.stop).toHaveBeenCalled();
    await expect(stopVoice()).rejects.toMatch(/Not recording/);
  });
});
