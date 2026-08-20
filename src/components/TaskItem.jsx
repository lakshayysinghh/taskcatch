import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Check, MoreHorizontal, Flame, Layers, Circle, Tag } from 'lucide-react';

export function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  const getPriorityBarClass = (priority) => {
    if (priority === 'Urgent') return 'bg-gradient-to-b from-[var(--olive-100)] to-[var(--olive-500)]';
    if (priority === 'High') return 'bg-gradient-to-b from-[var(--olive-500)] to-[var(--olive-900)]';
    return 'bg-[var(--border-subtle)]';
  };

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
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#c7c9bb]">
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
        <div className="text-[12px] text-[var(--text-secondary)]">
          Captured {formatDate(task.timestamp)} &nbsp;·&nbsp;{' '}
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
          <div className="mt-2.5 p-3 rounded-lg bg-[rgba(10,11,8,0.85)] border border-[var(--border-subtle)] font-mono text-[11px] text-[#c5c9ba] leading-relaxed whitespace-pre-wrap select-text animate-in fade-in duration-150">
            <div className="text-[10px] text-[var(--text-secondary)] font-sans uppercase tracking-wider mb-1">
              Extracted Snippet:
            </div>
            {task.original_text}
          </div>
        )}
      </div>

      {/* Right Column Action Icons & Calendar Menu */}
      <div className="flex items-center gap-2.5 text-[var(--text-secondary)] text-[14px] self-start pt-0.5 relative">
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
    </div>
  );
}
