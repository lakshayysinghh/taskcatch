/**
 * UI-only preferences, kept in this webview's localStorage (they never need
 * the backend). Values survive restarts of the desktop app.
 */

const SOUND_KEY = 'taskcatch_sound_enabled';

/** Whether to play the chime when a task is captured. Defaults to on. */
export function isSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage unavailable (e.g. blocked site data); the default stays in effect.
  }
}
