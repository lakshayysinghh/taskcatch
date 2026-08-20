import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { isTauri } from './lib/tauri';
import { App } from './App';
import { Overlay } from './Overlay';
import './theme.css';

function Root() {
  const [windowLabel, setWindowLabel] = useState('main');

  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/window')
        .then(({ getCurrentWindow }) => {
          const appWindow = getCurrentWindow();
          if (appWindow && appWindow.label) {
            setWindowLabel(appWindow.label);
          }
        })
        .catch(() => {
          setWindowLabel('main');
        });
    } else {
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
