// Shared setup for Vitest (jsdom).

// jsdom does not implement scrollIntoView; the standup chat calls it on every message.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Each test starts with empty storage, so the web backend re-seeds its sample tasks.
afterEach(() => {
  localStorage.clear();
});
