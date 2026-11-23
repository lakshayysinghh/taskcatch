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
const MODEL = 'whisper-large-v3-turbo';

let web = null; // { recorder, stream, chunks, startedAt }

export function voiceSupported() {
  if (isTauri) return true;
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

async function webConfig() {
  const cfg = (await safeInvoke('get_config')) || {};
  return { key: (cfg.groq_api_key || '').trim(), language: (cfg.voice_language || '').trim() };
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
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

function finishRecording(session) {
  return new Promise((resolve) => {
    if (session.recorder.state === 'inactive') {
      resolve();
      return;
    }
    session.recorder.onstop = () => resolve();
    session.recorder.stop();
  });
}

export async function stopVoice() {
  if (isTauri) return safeInvoke('voice_stop');

  const session = web;
  web = null;
  if (!session) throw 'Not recording.';
  await finishRecording(session);
  stopTracks(session.stream);

  if (Date.now() - session.startedAt < 350) throw 'Too short — keep recording while you speak.';
  const type = session.recorder.mimeType || 'audio/webm';
  const blob = new Blob(session.chunks, { type });
  if (blob.size < 1000) throw 'No speech was recorded. Check your microphone.';

  const { key, language } = await webConfig();
  const form = new FormData();
  form.append('file', blob, type.includes('ogg') ? 'speech.ogg' : 'speech.webm');
  form.append('model', MODEL);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (language) form.append('language', language);

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
  const text = String(data.text || '').trim();
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
