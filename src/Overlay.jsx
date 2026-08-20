import React, { useEffect, useState } from 'react';
import { safeListen as listen, isTauri } from './lib/tauri';

export function Overlay() {
  const [status, setStatus] = useState('idle');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let appWindow = null;
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        appWindow = getCurrentWindow();
      }).catch(() => {});
    }

    const unlistenStatusUpdate = listen('status-update', async (event) => {
      const payload = event.payload;
      
      if (payload?.state === 'processing') {
        setStatus('processing');
        setIsVisible(true);
        if (appWindow) await appWindow.show();
      } else if (payload?.state === 'done') {
        setStatus('done');
        // Fade out after a short delay
        setTimeout(async () => {
          setIsVisible(false);
          setTimeout(async () => {
            if (appWindow) await appWindow.hide();
          }, 300);
        }, 1500);
      }
    });

    return () => {
      unlistenStatusUpdate.then((u) => typeof u === 'function' && u());
    };
  }, []);

  return (
    <div 
      className={`w-full h-screen flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'transparent' }} // Important for Tauri transparent windows
    >
      <div className="bg-card text-card-foreground border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-3">
        {status === 'processing' && (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span className="font-medium text-sm">Capturing and Processing...</span>
          </>
        )}
        {status === 'done' && (
          <>
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-sm text-green-500">Saved to Dashboard</span>
          </>
        )}
      </div>
    </div>
  );
}
