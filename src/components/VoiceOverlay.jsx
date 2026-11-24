import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ClipboardCheck, Loader2, Mic } from 'lucide-react';
import { safeInvoke as invoke, safeListen as listen } from '../lib/tauri';

const BARS = 7;
// Each bar reacts a little differently so the meter looks like a voice, not a block.
const BAR_SHAPE = [0.45, 0.7, 0.9, 1, 0.85, 0.65, 0.4];

/** What the pill says for each state. Exported for tests. */
export function overlayCopy(status, hotkeys = {}) {
  const dictation = status?.purpose === 'dictation';
  const key = dictation ? hotkeys.dictation : hotkeys.voice;
  switch (status?.state) {
    case 'listening':
      return { title: dictation ? 'Dictating' : 'Listening for a task', detail: key ? `Release ${key} when done` : '' };
    case 'transcribing':
      return { title: dictation ? 'Writing it down…' : 'Turning it into a task…', detail: '' };
    case 'done':
      return { title: dictation ? 'Inserted' : 'Task added', detail: '' };
    case 'copied':
      return { title: 'Copied to clipboard', detail: 'Press Ctrl+V to paste' };
    case 'error':
      return { title: "Didn't catch that", detail: status.message || '' };
    default:
      return null;
  }
}

/**
 * The floating voice indicator, rendered in its own small, transparent,
 * always-on-top window (#overlay) that never takes focus. The backend shows
 * and hides the window; this only draws the current state.
 */
export function VoiceOverlay() {
  const [status, setStatus] = useState(null);
  const [level, setLevel] = useState(0);
  const [hotkeys, setHotkeys] = useState({});
  const smooth = useRef(0);

  useEffect(() => {
    // The window itself is transparent; only the pill is drawn.
    for (const el of [document.documentElement, document.body, document.getElementById('root')]) {
      if (el) el.style.background = 'transparent';
    }
    invoke('get_config')
      .then((cfg) => cfg && setHotkeys({ voice: cfg.voice_hotkey, dictation: cfg.dictation_hotkey }))
      .catch(() => {});

    let cleanup = () => {};
    Promise.all([
      listen('voice-status', (event) => {
        const next = event.payload;
        if (!next || next.purpose === 'text') return;
        setStatus(next);
        if (next.state === 'listening') {
          smooth.current = 0;
          setLevel(0);
          // Hotkeys can be changed in Settings while the app runs.
          invoke('get_config')
            .then((cfg) => cfg && setHotkeys({ voice: cfg.voice_hotkey, dictation: cfg.dictation_hotkey }))
            .catch(() => {});
        }
      }),
      listen('voice-level', (event) => {
        const raw = Number(event.payload) || 0;
        // Rise fast, fall slowly, like a VU meter.
        smooth.current = raw > smooth.current ? raw : smooth.current * 0.75 + raw * 0.25;
        setLevel(smooth.current);
      }),
    ]).then((unlisteners) => {
      cleanup = () => unlisteners.forEach((u) => typeof u === 'function' && u());
    });
    return () => cleanup();
  }, []);

  const copy = overlayCopy(status, hotkeys);
  if (!copy) return null;
  const state = status.state;

  return (
    <div className="flex h-screen w-screen items-center justify-center p-2" role="status" aria-live="polite">
      <div className="flex max-w-full items-center gap-3 rounded-full border border-white/10 bg-[#141511]/95 py-2 pl-2.5 pr-5 text-ink shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150">
        <span
          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            state === 'listening'
              ? 'bg-danger/15 text-danger'
              : state === 'error'
                ? 'bg-danger/15 text-danger'
                : state === 'copied'
                  ? 'bg-warning/15 text-warning'
                  : 'bg-olive-300/15 text-olive-200'
          }`}
        >
          {state === 'listening' && <span className="absolute inset-0 animate-ping rounded-full bg-danger/20 motion-reduce:animate-none" />}
          {state === 'listening' && <Mic className="relative h-4 w-4" />}
          {state === 'transcribing' && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
          {state === 'done' && <Check className="h-4 w-4" />}
          {state === 'copied' && <ClipboardCheck className="h-4 w-4" />}
          {state === 'error' && <AlertCircle className="h-4 w-4" />}
        </span>

        {state === 'listening' && (
          <span className="flex h-6 shrink-0 items-center gap-[3px]" aria-hidden="true" data-testid="level-meter">
            {BAR_SHAPE.slice(0, BARS).map((shape, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-olive-200 transition-[height] duration-75"
                style={{ height: `${Math.round(4 + 20 * Math.min(1, level * shape * 1.15))}px` }}
              />
            ))}
          </span>
        )}

        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium leading-tight">{copy.title}</span>
          {copy.detail && <span className="block truncate text-[11.5px] leading-tight text-ink-3">{copy.detail}</span>}
        </span>
      </div>
    </div>
  );
}
