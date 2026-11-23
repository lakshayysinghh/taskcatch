import React from 'react';
import { AlertCircle, X } from 'lucide-react';

/** Backend error notice, pinned under the header until dismissed. */
export function ErrorToast({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[72px] z-50 flex justify-center px-4">
      <div
        role="alert"
        className="pointer-events-auto flex w-full max-w-[620px] items-start gap-3 rounded-xl border border-danger/25 bg-[#1d1210]/95 px-4 py-3 text-[13px] leading-relaxed text-[#f6c3bb] shadow-pop backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <span className="flex-1 break-words">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-danger/80 transition hover:bg-danger/10 hover:text-danger"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
