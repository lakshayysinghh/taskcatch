import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { App } from './App';
import { Overlay } from './Overlay';
import './theme.css';

function Root() {
  const [windowLabel, setWindowLabel] = useState('main');

  useEffect(() => {
    try {
      const appWindow = getCurrentWindow();
      if (appWindow && appWindow.label) {
        setWindowLabel(appWindow.label);
      }
    } catch (e) {
      // In browser preview mode, default to 'main'
      setWindowLabel('main');
    }
  }, []);

  if (windowLabel === 'overlay') {
    return <Overlay />;
  }

  return <App />;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<Root />);
}
