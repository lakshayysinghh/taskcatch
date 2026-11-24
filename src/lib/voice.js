/**
 * Voice input for the mic buttons (quick add, Standup chat).
 *
 * Desktop app: the Rust backend records the microphone (voice_start /
 * voice_stop), so no browser permission prompt is involved.
 * Browser build: records with MediaRecorder and sends the audio straight to
 * Groq Whisper with the visitor's own key. Nothing is stored.
 *
 * Both paths: startVoice() → stopVoice() resolves to the transcript, or
 * rejects with a message meant for the user. cancelVoice() discards.
 */
import { isTauri, safeInvoke } from './tauri';

const TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
// The most accurate Whisper model; same choice as the desktop app.
const MODEL = 'whisper-large-v3';
// Keep recording this long after "stop" so the last word is not clipped.
const TAIL_MS = 300;
// Whisper's prompt is limited to 224 tokens; stay well under it.
const MAX_VOCABULARY_CHARS = 600;

/** The user's custom words as a clean, de-duplicated list. */
export function vocabularyTerms(vocabulary) {
  const terms = [];
  let used = 0;
  for (const part of String(vocabulary || '').split(/[,;\n]/)) {
    const term = part.split(/\s+/).filter(Boolean).join(' ');
    if (!term || terms.some((t) => t.toLowerCase() === term.toLowerCase())) continue;
    if (used + term.length + 2 > MAX_VOCABULARY_CHARS) break;
    used += term.length + 2;
    terms.push(term);
  }
  return terms;
}

/** Whisper prompt with the spellings it should prefer, or '' for none. */
export function whisperPrompt(vocabulary) {
  const terms = vocabularyTerms(vocabulary);
  return terms.length ? `Names and terms: ${terms.join(', ')}.` : '';
}

const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// Phrases Whisper invents from silence (it was trained on subtitled video).
const HALLUCINATIONS = [
  'thanks for watching',
  'thank you for watching',
  'please subscribe',
  'like and subscribe',
  'subtitles by',
  'subtitled by',
  'transcribed by',
  'amara org',
];

/**
 * The transcript from a verbose_json response, without the segments Whisper
 * marks as non-speech, and '' if what is left is a known hallucination.
 * Mirrors clean_transcript in src-tauri/src/ai_client.rs.
 */
export function cleanTranscript(data, prompt = '') {
  const segments = Array.isArray(data?.segments) ? data.segments : [];
  const joined = segments.length
    ? segments
        .filter((s) => !((s.no_speech_prob ?? 0) > 0.6 && (s.avg_logprob ?? 0) < -1))
        .map((s) => s.text || '')
        .join(' ')
    : String(data?.text || '');
  const text = joined.split(/\s+/).filter(Boolean).join(' ');
  const n = normalize(text);
  if (!n || n === 'you' || HALLUCINATIONS.some((h) => n.includes(h))) return '';
  if (prompt && (n === normalize(prompt) || n.startsWith('names and terms'))) return '';
  return text;
}

let web = null; // { recorder, stream, chunks, startedAt }

export function voiceSupported() {
  if (isTauri) return true;
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

async function webConfig() {
  const cfg = (await safeInvoke('get_config')) || {};
  return {
    key: (cfg.groq_api_key || '').trim(),
    language: (cfg.voice_language || '').trim(),
    vocabulary: cfg.voice_vocabulary || '',
  };
}

function stopTracks(stream) {
  stream?.getTracks?.().forEach((t) => t.stop());
}

export async function startVoice() {
  if (isTauri) return safeInvoke('voice_start');

  if (!voiceSupported()) throw 'This browser cannot record audio.';
  if (web) throw 'Already recording.';
  const { key } = await webConfig();
  if (!key) throw 'Voice needs a Groq API key. Add one in Settings.';

  let stream;
  try {
    // The browser's own speech processing: echo and noise suppression and
    // automatic gain, so quiet or distant speech reaches Whisper clearly.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (err) {
    throw err?.name === 'NotAllowedError'
      ? 'Microphone access was blocked. Allow it for this site in your browser and try again.'
      : 'No microphone could be opened.';
  }
  const recorder = new MediaRecorder(stream);
  const session = { recorder, stream, chunks: [], startedAt: Date.now() };
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) session.chunks.push(e.data);
  };
  recorder.start();
  web = session;
}

function finishRecording(session, tailMs = 0) {
  return new Promise((resolve) => {
    if (session.recorder.state === 'inactive') {
      resolve();
      return;
    }
    session.recorder.onstop = () => resolve();
    const stop = () => session.recorder.state !== 'inactive' && session.recorder.stop();
    if (tailMs > 0) setTimeout(stop, tailMs);
    else stop();
  });
}

export async function stopVoice() {
  if (isTauri) return safeInvoke('voice_stop');

  const session = web;
  web = null;
  if (!session) throw 'Not recording.';
  const heldMs = Date.now() - session.startedAt;
  await finishRecording(session, heldMs < 350 ? 0 : TAIL_MS);
  stopTracks(session.stream);

  if (heldMs < 350) throw 'Too short — keep recording while you speak.';
  const type = session.recorder.mimeType || 'audio/webm';
  const blob = new Blob(session.chunks, { type });
  if (blob.size < 1000) throw 'No speech was recorded. Check your microphone.';

  const { key, language, vocabulary } = await webConfig();
  const prompt = whisperPrompt(vocabulary);
  const form = new FormData();
  form.append('file', blob, type.includes('ogg') ? 'speech.ogg' : 'speech.webm');
  form.append('model', MODEL);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  if (language) form.append('language', language);
  if (prompt) form.append('prompt', prompt);

  let res;
  try {
    res = await fetch(TRANSCRIBE_URL, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  } catch {
    throw 'Could not reach Groq for transcription.';
  }
  if (res.status === 401) throw 'Groq rejected the API key. Check it in Settings.';
  if (res.status === 429) throw "Groq's rate limit was reached. Wait a moment and try again.";
  if (!res.ok) throw `Transcription failed (${res.status}).`;
  const data = await res.json().catch(() => ({}));
  const text = cleanTranscript(data, prompt);
  if (!text) throw 'No speech was recognised. Try again a little closer to the microphone.';
  return text;
}

export async function cancelVoice() {
  if (isTauri) {
    await safeInvoke('voice_cancel').catch(() => {});
    return;
  }
  const session = web;
  web = null;
  if (!session) return;
  await finishRecording(session).catch(() => {});
  stopTracks(session.stream);
}
