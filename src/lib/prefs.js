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

const ONBOARDING_KEY = 'taskcatch_onboarding_done';

/** Whether the first-run guide has been finished or skipped. */
export function isOnboardingDone() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return true; // storage blocked: don't show the guide on every visit
  }
}

export function setOnboardingDone() {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Storage unavailable; the guide may show again next time.
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage unavailable (e.g. blocked site data); the default stays in effect.
  }
}
