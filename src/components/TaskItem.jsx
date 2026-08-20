import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Check, Flame, Layers, Circle, Tag, Clock, AppWindow } from 'lucide-react';

export function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  const getPriorityBadge = (priority) => {
    if (priority === 'Urgent') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-[#0b0c0a] bg-gradient-to-br from-[var(--olive-300)] to-[var(--olive-700)] shadow-sm uppercase tracking-wider">
          <Flame className="w-3 h-3" />
          Urgent
        </span>
      );
    }
    if (priority === 'High') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full text-[var(--olive-300)] bg-[rgba(168,173,122,0.15)] border border-[rgba(168,173,122,0.3)] uppercase tracking-wider">
          <Flame className="w-3 h-3" />
          High
        </span>
      );
    }
    if (priority === 'Medium') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full text-[var(--olive-300)] bg-[rgba(168,173,122,0.08)] border border-[var(--border-subtle)] uppercase tracking-wider">
          <Layers className="w-3 h-3" />
          Medium
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full text-[var(--text-secondary)] border border-[var(--border-subtle)] uppercase tracking-wider">
        <Circle className="w-3 h-3" />
        Low
      </span>
    );
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const formatDeadline = (isoStr) => {
    if (!isoStr) return null;
    try {
      const now = new Date();
      const target = new Date(isoStr);
      const diffMs = target - now;
      const isPast = diffMs < 0;
      const absDiff = Math.abs(diffMs);
      const diffHours = Math.floor(absDiff / (1000 * 60 * 60));
      const diffMins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

      const timeString = target.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const isToday = now.toDateString() === target.toDateString();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = tomorrow.toDateString() === target.toDateString();

      let label = '';
      if (isPast) {
        label = diffHours > 0 ? `Overdue by ${diffHours}h ${diffMins}m` : `Overdue by ${diffMins}m`;
      } else if (diffHours < 24 && isToday) {
        label = `Due in ${diffHours}h ${diffMins}m (${timeString})`;
      } else if (isTomorrow) {
        label = `Due Tomorrow at ${timeString}`;
      } else {
        label = `Due ${target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeString}`;
      }

      return { label, isPast, isUrgentDue: !isPast && diffHours < 6 };
    } catch {
      return { label: isoStr, isPast: false, isUrgentDue: false };
    }
  };

  // Google Calendar export link generator
  const exportGoogleCalendar = () => {
    const title = encodeURIComponent(task.content || 'TaskCatch Item');
    const details = encodeURIComponent(
      `Captured via TaskCatch\n\nOriginal Text:\n${task.original_text || 'None'}`
    );
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
    window.open(url, '_blank');
    setShowCalendarMenu(false);
  };

  // ICS download for Outlook/Apple Calendar
  const downloadICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TaskCatch//EN
BEGIN:VEVENT
SUMMARY:${task.content.replace(/\n/g, ' ')}
DESCRIPTION:${(task.original_text || '').replace(/\n/g, '\\n')}
DTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${task.content.slice(0, 20)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowCalendarMenu(false);
  };

  return (
    <div
      className={`rounded-[10px] p-4 mb-2.5 bg-[var(--surface-glass)] backdrop-blur-[16px] border border-[var(--border-subtle)] hover:border-[rgba(168,173,122,0.35)] transition-all flex items-start gap-3.5 relative group ${
        task.completed ? 'opacity-50' : ''
      }`}
    >
      {/* Circular Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-4 h-4 mt-1 rounded-full border flex items-center justify-center transition-all shrink-0 ${
          task.completed
            ? 'bg-[var(--olive-300)] border-[var(--olive-300)] text-[#0b0c0a]'
            : 'border-[var(--border-subtle)] hover:border-[var(--olive-300)] bg-transparent'
        }`}
      >
        {task.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
      </button>

      {/* Center Body */}
      <div className="flex-1 min-w-0">
        {/* Metadata Badges Row */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {getPriorityBadge(task.priority)}
          <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--olive-300)]">
            <Tag className="w-3 h-3" />
            {task.category || 'General'}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#7e8275]">
            <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
            {formatDate(task.timestamp)}
          </span>
        </div>

        {/* Task Title */}
        <div
          className={`text-[14px] font-medium text-[#f2f2ec] mb-1 leading-snug break-words ${
            task.completed ? 'line-through text-[var(--text-secondary)]' : ''
          }`}
        >
          {task.content}
        </div>

        {/* Metadata & Origin Drawer Accordion */}
        <div className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
          <span>Captured {formatDate(task.timestamp)}</span>
          <span>·</span>
          {task.source_app && (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--olive-300)] bg-[rgba(168,173,122,0.06)] px-2 py-0.5 rounded border border-[rgba(168,173,122,0.2)] font-mono truncate max-w-[280px]" title={task.source_app}>
                <AppWindow className="w-3 h-3 shrink-0 text-[var(--olive-300)]" />
                <span className="truncate">{task.source_app}</span>
              </span>
              <span>·</span>
            </>
          )}
          {task.original_text ? (
            <button
              onClick={() => setIsSourceOpen(!isSourceOpen)}
              className="text-[var(--olive-300)] hover:underline border-b border-[rgba(168,173,122,0.3)] bg-transparent p-0 cursor-pointer inline-flex items-center gap-0.5"
            >
              <span>View source text</span>
              {isSourceOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          ) : (
            <span>Manual entry</span>
          )}
        </div>

        {/* Expandable Source Text Drawer */}
        {isSourceOpen && task.original_text && (
          <div className="mt-2.5 p-3.5 rounded-lg bg-[rgba(10,11,8,0.9)] border border-[var(--border-subtle)] space-y-2.5 animate-in fade-in duration-150">
            {task.source_app && (
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] text-[11px] text-[#d5d6cd]">
                <span className="text-[10px] uppercase font-bold text-[var(--olive-300)] tracking-wider">Source Window / Page:</span>
                <span className="font-mono text-[var(--olive-100)] bg-[rgba(168,173,122,0.12)] px-2 py-0.5 rounded border border-[rgba(168,173,122,0.25)] break-all">
                  {task.source_app}
                </span>
              </div>
            )}
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] font-sans uppercase tracking-wider mb-1">
                Extracted Snippet:
              </div>
              <div className="font-mono text-[11px] text-[#c5c9ba] leading-relaxed whitespace-pre-wrap select-text">
                {task.original_text}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Action Buttons & Timer */}
      <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-2 min-h-[44px]">
        {/* Top: Action Icons & Calendar Menu */}
        <div className="flex items-center gap-2.5 text-[var(--text-secondary)] text-[14px] pt-0.5 relative">
          {/* Calendar Menu */}
          <div className="relative">
            <button
              onClick={() => setShowCalendarMenu(!showCalendarMenu)}
              className="hover:text-[var(--olive-300)] transition-colors p-1"
              title="Export to Calendar"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>

            {showCalendarMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--surface-glass-modal)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-lg shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={exportGoogleCalendar}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#e4e4de] hover:bg-[rgba(168,173,122,0.15)] flex items-center gap-2"
                >
                  Google Calendar
                </button>
                <button
                  onClick={downloadICS}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#e4e4de] hover:bg-[rgba(168,173,122,0.15)] flex items-center gap-2"
                >
                  Outlook / Apple (.ics)
                </button>
              </div>
            )}
          </div>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(task)}
            className="hover:text-[var(--olive-300)] transition-colors p-1"
            title="Edit Task"
          >
            ✎
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(task.id)}
            className="hover:text-[#ff7b7b] transition-colors p-1"
            title="Delete Task"
          >
            ✕
          </button>
        </div>

        {/* Bottom: Dedicated Timer Badge */}
        {task.deadline && (() => {
          const deadlineInfo = formatDeadline(task.deadline);
          if (!deadlineInfo) return null;
          return (
            <div
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border shadow-sm ${
                deadlineInfo.isPast
                  ? 'bg-[rgba(255,80,80,0.15)] text-[#ff7575] border-[rgba(255,80,80,0.3)] animate-pulse'
                  : deadlineInfo.isUrgentDue || task.priority === 'Urgent'
                  ? 'bg-[rgba(215,233,176,0.14)] text-[var(--olive-100)] border-[rgba(168,173,122,0.4)] shadow-[0_0_12px_rgba(168,173,122,0.15)] font-mono'
                  : 'bg-[rgba(168,173,122,0.06)] text-[#c5c8ba] border-[var(--border-subtle)] font-mono'
              }`}
            >
              <Clock className={`w-3 h-3 ${deadlineInfo.isPast ? 'text-[#ff7575]' : 'text-[var(--olive-100)]'}`} />
              <span>{deadlineInfo.label}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
