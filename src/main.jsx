import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { VoiceOverlay } from './components/VoiceOverlay';

// Self-hosted typefaces (bundled with the app; no requests to font CDNs).
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './theme.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  // The floating voice indicator window loads the same bundle at #overlay.
  const isOverlay = window.location.hash === '#overlay';
  root.render(isOverlay ? <VoiceOverlay /> : (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  ));
}
