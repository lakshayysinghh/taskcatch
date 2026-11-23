// Shared setup for Vitest (jsdom).

// jsdom does not implement scrollIntoView; the standup chat calls it on every message.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Each test starts with empty storage (so the web backend re-seeds its sample
// tasks) and at the site root (the website stores the open view in the URL hash).
afterEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
