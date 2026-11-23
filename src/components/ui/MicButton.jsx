import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { cancelVoice, startVoice, stopVoice, voiceSupported } from '../../lib/voice';

/**
 * Click to start recording, click again to transcribe. The transcript goes to
 * onTranscript; problems go to onError as a readable message. Leaving the
 * page (e.g. closing the dialog) mid-recording discards it.
 */
export function MicButton({ onTranscript, onError, disabled = false, size = 'md', className = '' }) {
  const [state, setState] = useState('idle'); // idle | starting | recording | transcribing
  const [seconds, setSeconds] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (state !== 'recording') return undefined;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(
    () => () => {
      if (stateRef.current === 'recording' || stateRef.current === 'starting') cancelVoice();
    },
    []
  );

  if (!voiceSupported()) return null;

  const fail = (err) => {
    setState('idle');
    onError?.(typeof err === 'string' ? err : err?.message || 'Voice input failed.');
  };

  const onClick = async () => {
    if (state === 'idle') {
      setState('starting');
      try {
        await startVoice();
        setState('recording');
      } catch (err) {
        fail(err);
      }
    } else if (state === 'recording') {
      setState('transcribing');
      try {
        const text = await stopVoice();
        setState('idle');
        onTranscript?.(text);
      } catch (err) {
        fail(err);
      }
    }
  };

  const busy = state === 'starting' || state === 'transcribing';
  const recording = state === 'recording';
  const label = recording ? 'Stop and transcribe' : busy ? (state === 'starting' ? 'Opening microphone…' : 'Transcribing…') : 'Speak instead of typing';
  const dims = size === 'sm' ? 'h-8 gap-1.5 px-2' : 'h-9 gap-1.5 px-2.5';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={label}
      aria-pressed={recording}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg text-[12px] font-medium tabular-nums transition ${dims} ${
        recording
          ? 'bg-danger/15 text-danger ring-1 ring-danger/30 hover:bg-danger/20'
          : 'text-ink-3 hover:bg-white/[0.06] hover:text-ink disabled:opacity-60'
      } ${className}`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
          </span>
          <span>{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}</span>
          <Square className="h-3 w-3 fill-current" />
        </>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
