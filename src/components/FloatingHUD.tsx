import React, { useEffect, useState } from 'react';
import { Undo2, Pencil, X, Globe, MessageSquare, Terminal, FileCode, AppWindow } from 'lucide-react';
import { Task } from '../lib/types';
import { AppLogo } from './AppLogo';

interface FloatingHUDProps {
  task: Task | null;
  onUndo: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDismiss: () => void;
}

export const FloatingHUD: React.FC<FloatingHUDProps> = ({
  task,
  onUndo,
  onEdit,
  onDismiss,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!task) return;
    setProgress(100);

    const DURATION = 4500; // 4.5 seconds
    const intervalTime = 50;
    const decrement = (intervalTime / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [task, onDismiss]);

  if (!task) return null;

  // App icon helper
  const getAppIcon = (appName?: string | null) => {
    const name = (appName || '').toLowerCase();
    if (name.includes('slack') || name.includes('discord') || name.includes('teams')) {
      return <MessageSquare className="w-3 h-3 text-[#a8ad7a]" />;
    }
    if (name.includes('chrome') || name.includes('edge') || name.includes('firefox') || name.includes('brave')) {
      return <Globe className="w-3 h-3 text-[#a8ad7a]" />;
    }
    if (name.includes('code') || name.includes('idea') || name.includes('sublime')) {
      return <FileCode className="w-3 h-3 text-[#a8ad7a]" />;
    }
    if (name.includes('terminal') || name.includes('powershell') || name.includes('cmd')) {
      return <Terminal className="w-3 h-3 text-[#a8ad7a]" />;
    }
    return <AppWindow className="w-3 h-3 text-[#a8ad7a]" />;
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92vw] sm:w-auto animate-slideDown pointer-events-auto">
      <div className="relative overflow-hidden rounded-[14px] bg-[rgba(19,20,16,0.94)] backdrop-blur-[24px] border border-[rgba(168,173,122,0.3)] shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-[12px_16px] flex items-center gap-3">
        {/* Glowing Top Progress Line */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#7c8450] to-[#d9dcc4] transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />

        {/* Left: Branded App Logo */}
        <AppLogo size={28} />

        {/* Middle: Title & Origin App */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[#a8ad7a] font-semibold tracking-wide uppercase">
            <span>Captured</span>
            {task.source_app && (
              <span className="flex items-center gap-1 text-[#93958a] font-normal normal-case ml-1 bg-white/[0.04] border border-[rgba(168,173,122,0.14)] px-1.5 py-0.5 rounded">
                {getAppIcon(task.source_app)}
                <span className="truncate max-w-[120px]">{task.source_app}</span>
              </span>
            )}
          </div>
          <div className="text-[13px] font-medium text-[#f2f2ec] truncate max-w-[280px] sm:max-w-[340px]">
            {task.title}
          </div>
        </div>

        {/* Right: Actions (Undo & Edit) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Undo Button */}
          <button
            onClick={() => onUndo(task.id)}
            className="flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-[6px] text-[#f2f2ec] bg-[#23241d] hover:bg-[#33361f] border border-[rgba(168,173,122,0.25)] transition-all cursor-pointer active:scale-95"
            title="Undo capture (Ctrl+Z)"
          >
            <Undo2 className="w-3 h-3 text-[#a8ad7a]" />
            <span>Undo</span>
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-[6px] text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.12)] transition-all cursor-pointer"
            title="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={onDismiss}
            className="p-1 rounded-[6px] text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.12)] transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
