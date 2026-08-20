import React, { useEffect } from 'react';
import { Sparkles, RotateCcw, Edit2, X } from 'lucide-react';

export function FloatingHUD({ task, onUndo, onEdit, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [task, onClose]);

  if (!task) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-[rgba(15,16,12,0.96)] border border-[rgba(168,173,122,0.3)] backdrop-blur-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.7)] rounded-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#f2f2ec]">
        {/* Pulsing Green Status Dot */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6ec97a] shadow-[0_0_8px_#6ec97a] animate-pulse shrink-0" />
          <span className="text-[var(--olive-100)] font-medium max-w-[200px] sm:max-w-[320px] truncate">
            {task.content}
          </span>
        </div>

        <div className="h-3 w-[1px] bg-[rgba(168,173,122,0.2)]" />

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onUndo(task.id)}
            className="flex items-center gap-1 text-[var(--olive-300)] hover:text-[var(--olive-100)] px-2 py-1 rounded-md hover:bg-[rgba(168,173,122,0.1)] transition-colors font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>

          <button
            onClick={() => onEdit(task)}
            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[#f2f2ec] px-2 py-1 rounded-md hover:bg-[rgba(168,173,122,0.1)] transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>

          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[#f2f2ec] p-1 rounded-md hover:bg-[rgba(168,173,122,0.1)] transition-colors ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
