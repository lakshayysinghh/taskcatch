import React from 'react';
import { Loader2, Mic } from 'lucide-react';
import { Kbd } from './ui/Kbd';

/**
 * Shown while a voice hotkey is held (listening) and while the speech is
 * being transcribed. Hotkey voice usually happens with TaskCatch in the tray;
 * the start/stop sounds cover that case, this covers the open window.
 */
export function VoiceIndicator({ status, voiceHotkey, dictationHotkey }) {
  if (!status || (status.state !== 'listening' && status.state !== 'transcribing')) return null;
  const dictation = status.purpose === 'dictation';
  const key = dictation ? dictationHotkey : voiceHotkey;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-full border border-line-strong bg-[#161714]/95 py-2 pl-2.5 pr-4 text-[13px] text-ink shadow-pop backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        {status.state === 'listening' ? (
          <>
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-danger/15 text-danger">
              <span className="absolute inset-0 animate-ping rounded-full bg-danger/20 motion-reduce:animate-none" />
              <Mic className="relative h-3.5 w-3.5" />
            </span>
            <span className="font-medium">{dictation ? 'Dictating…' : 'Listening for a task…'}</span>
            {key && (
              <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                release <Kbd>{key}</Kbd> to finish
              </span>
            )}
          </>
        ) : (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-olive-300/15 text-olive-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
            <span className="font-medium">{dictation ? 'Typing your words…' : 'Turning that into a task…'}</span>
          </>
        )}
      </div>
    </div>
  );
}
