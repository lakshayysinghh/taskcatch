import React, { useEffect, useRef } from 'react';
import { Check, RotateCcw, Pencil, X } from 'lucide-react';

/** Toast shown after a capture, with Undo and Edit. Auto-dismisses after 8 s. */
export function FloatingHUD({ task, onUndo, onEdit, onClose }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Restart the timer only when a new task arrives, not on every parent render.
  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 8000);
    return () => clearTimeout(timer);
  }, [task?.id]);

  if (!task) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <div className="flex max-w-full items-center gap-3 rounded-2xl border border-line-strong bg-[#161714]/95 py-2 pl-2.5 pr-2 shadow-pop backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Captured</div>
          <div className="max-w-[240px] truncate text-[13px] font-medium text-ink sm:max-w-[360px]">{task.content}</div>
        </div>
        <div className="ml-1 flex items-center gap-0.5 border-l border-line pl-2">
          <button
            type="button"
            onClick={() => onUndo(task.id)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-olive-200 transition hover:bg-white/[0.06]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-ink-2 transition hover:bg-white/[0.06] hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition hover:bg-white/[0.06] hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
