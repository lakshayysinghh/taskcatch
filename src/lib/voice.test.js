import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelVoice, cleanTranscript, collapseLoops, startVoice, stopVoice, vocabularyTerms, voiceSupported, whisperModels, whisperPrompt } from './voice';

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
  localStorage.setItem('taskcatch_web_config', JSON.stringify({ groq_api_key: 'placeholder-key', voice_language: 'hi', voice_vocabulary: 'Priya, Jira' }));
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
    expect(init.body.get('model')).toBe('whisper-large-v3');
    expect(init.body.get('response_format')).toBe('verbose_json');
    expect(init.body.get('prompt')).toBe('Names and terms: Priya, Jira.');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
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

describe('transcript clean-up', () => {
  it('turns custom words into a short Whisper prompt', () => {
    expect(vocabularyTerms(' Kubernetes,  NxtWave\nPriya ; kubernetes ,, ')).toEqual(['Kubernetes', 'NxtWave', 'Priya']);
    expect(whisperPrompt('Priya, Jira')).toBe('Names and terms: Priya, Jira.');
    expect(whisperPrompt(' , \n')).toBe('');
    const long = Array.from({ length: 500 }, (_, i) => `term${i}`).join(',');
    expect(whisperPrompt(long).length).toBeLessThanOrEqual(620);
  });

  it('drops segments Whisper marks as silence', () => {
    const data = {
      text: ' Call Priya about the invoice. Thank you.',
      segments: [
        { text: ' Call Priya about the invoice.', no_speech_prob: 0.01, avg_logprob: -0.2 },
        { text: ' Thank you.', no_speech_prob: 0.9, avg_logprob: -1.4 },
      ],
    };
    expect(cleanTranscript(data)).toBe('Call Priya about the invoice.');
    expect(cleanTranscript({ text: '  send   the deck ' })).toBe('send the deck');
  });

  it('treats known hallucinations and an echoed prompt as no speech', () => {
    for (const text of ['Thanks for watching!', ' you ', 'Subtitles by the Amara.org community', '...']) {
      expect(cleanTranscript({ text })).toBe('');
    }
    const prompt = whisperPrompt('Priya, Jira');
    expect(cleanTranscript({ text: 'Names and terms: Priya, Jira.' }, prompt)).toBe('');
    expect(cleanTranscript({ text: 'Ask Priya to update Jira.' }, prompt)).toBe('Ask Priya to update Jira.');
  });
});

describe('model choice and fallback', () => {
  it('orders models by the setting', () => {
    expect(whisperModels('')).toEqual(['whisper-large-v3', 'whisper-large-v3-turbo']);
    expect(whisperModels('fast')).toEqual(['whisper-large-v3-turbo', 'whisper-large-v3']);
  });

  it('falls back to the other model on a server error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(okResponse('book the room'));
    vi.stubGlobal('fetch', fetchMock);
    await startVoice();
    now += 2000;
    await expect(stopVoice()).resolves.toBe('book the room');
    expect(fetchMock.mock.calls.map(([, init]) => init.body.get('model'))).toEqual(['whisper-large-v3', 'whisper-large-v3-turbo']);
  });
});

describe('Whisper loops and repeats', () => {
  it('collapses loops but keeps normal repeats', () => {
    expect(collapseLoops('I will go. I will go. I will go. I will go. I will go.')).toBe('I will go.');
    expect(collapseLoops('ok ok ok ok ok then')).toBe('ok then');
    expect(collapseLoops('no, no, I said tomorrow')).toBe('no, no, I said tomorrow');
    expect(collapseLoops('very very very good')).toBe('very very very good');
  });

  it('drops back-to-back duplicate segments', () => {
    const data = {
      segments: [
        { text: ' Send the report.', no_speech_prob: 0, avg_logprob: -0.2 },
        { text: ' send the report', no_speech_prob: 0, avg_logprob: -0.3 },
        { text: ' Then call Sam.', no_speech_prob: 0, avg_logprob: -0.2 },
      ],
    };
    expect(cleanTranscript(data)).toBe('Send the report. Then call Sam.');
  });
});
