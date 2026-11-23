import React, { useEffect, useRef, useState } from 'react';
import { CalendarPlus, Check, ChevronDown, Clock, Pencil, Trash2, AppWindow } from 'lucide-react';
import { safeOpen } from '../lib/tauri';
import { getDeadline } from '../lib/taskMeta';
import { PriorityBadge, CategoryTag } from './ui/Badges';

const timeFmt = { hour: 'numeric', minute: '2-digit' };

function formatCaptured(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], { month: 'short', day: 'numeric', ...timeFmt });
}

/** Deadline chip text and tone, or null when there is no usable deadline. */
function deadlineInfo(task) {
  const target = getDeadline(task); // null for missing or old free-text values
  if (!target) return null;
  const now = new Date();
  const diffMs = target - now;
  const time = target.toLocaleTimeString([], timeFmt);

  if (task.completed) return { label: diffMs < 0 ? 'Was due earlier' : `Due ${target.toLocaleDateString([], { month: 'short', day: 'numeric' })}`, tone: 'muted' };

  if (diffMs < 0) {
    const mins = Math.floor(-diffMs / 60000);
    const label = mins < 60 ? `${mins}m overdue` : mins < 48 * 60 ? `${Math.floor(mins / 60)}h overdue` : `${Math.floor(mins / 1440)}d overdue`;
    return { label, tone: 'danger' };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (target.toDateString() === now.toDateString()) {
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return { label: `Due in ${hours > 0 ? `${hours}h ` : ''}${mins}m · ${time}`, tone: diffMs < 6 * 3600000 ? 'warning' : 'default' };
  }
  if (target.toDateString() === tomorrow.toDateString()) return { label: `Tomorrow · ${time}`, tone: 'default' };
  return { label: `${target.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`, tone: 'default' };
}

const CHIP_TONES = {
  danger: 'border-danger/25 bg-danger/10 text-danger',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  default: 'border-line-strong bg-white/[0.03] text-ink-2',
  muted: 'border-line bg-transparent text-ink-3',
};

// --- Calendar export -------------------------------------------------------

const calStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** A 30-minute slot ending at the deadline (or starting in an hour if none). */
function eventWindow(task) {
  const due = getDeadline(task);
  const end = due || new Date(Date.now() + 90 * 60000);
  return { start: new Date(end.getTime() - 30 * 60000), end };
}

function openGoogleCalendar(task) {
  const { start, end } = eventWindow(task);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.content || 'TaskCatch task',
    details: `Captured with TaskCatch${task.original_text ? `\n\n${task.original_text}` : ''}`,
    dates: `${calStamp(start)}/${calStamp(end)}`,
  });
  safeOpen(`https://calendar.google.com/calendar/render?${params}`);
}

function downloadIcs(task) {
  const { start, end } = eventWindow(task);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaskCatch//EN',
    'BEGIN:VEVENT',
    `UID:${task.id}@taskcatch`,
    `DTSTAMP:${calStamp(new Date())}`,
    `DTSTART:${calStamp(start)}`,
    `DTEND:${calStamp(end)}`,
    `SUMMARY:${icsEscape(task.content || 'TaskCatch task')}`,
    `DESCRIPTION:${icsEscape(task.original_text || 'Captured with TaskCatch')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(task.content || 'task').replace(/[^\w\- ]+/g, '').trim().slice(0, 40) || 'task'}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------

function IconButton({ label, onClick, children, danger = false, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition hover:bg-white/[0.06] ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    if (!isCalendarOpen) return undefined;
    const close = (e) => {
      if (!calendarRef.current?.contains(e.target)) setIsCalendarOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isCalendarOpen]);

  const due = deadlineInfo(task);
  const hasSource = Boolean(task.original_text || task.source_app);

  return (
    <div className={`group relative flex gap-3.5 px-4 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-white/[0.018] sm:px-5 ${task.completed ? 'opacity-60' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.completed ? `Mark "${task.content}" as not done` : `Mark "${task.content}" as done`}
        onClick={() => onToggle(task.id)}
        className={`mt-[1px] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border transition ${
          task.completed
            ? 'border-olive-300 bg-olive-300 text-[#15160f]'
            : 'border-white/25 hover:border-olive-300 hover:bg-olive-300/10'
        }`}
      >
        {task.completed && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className={`break-words text-[14.5px] font-medium leading-snug text-ink ${task.completed ? 'text-ink-2 line-through decoration-ink-3' : ''}`}>
            {task.content}
          </p>
          {due && (
            <span className={`inline-flex h-6 w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-medium tabular-nums ${CHIP_TONES[due.tone]}`}>
              <Clock className="h-3 w-3" />
              {due.label}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-ink-3">
          <PriorityBadge priority={task.priority} />
          <CategoryTag category={task.category || 'General'} />
          <span>Captured {formatCaptured(task.timestamp)}</span>
          {hasSource ? (
            <button
              type="button"
              onClick={() => setIsSourceOpen((o) => !o)}
              aria-expanded={isSourceOpen}
              className="inline-flex items-center gap-0.5 text-olive-300 transition hover:text-olive-200"
            >
              Source
              <ChevronDown className={`h-3 w-3 transition-transform ${isSourceOpen ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <span>Added manually</span>
          )}
        </div>

        {isSourceOpen && hasSource && (
          <div className="mt-3 overflow-hidden rounded-xl border border-line bg-black/25 animate-in fade-in slide-in-from-top-1 duration-150">
            {task.source_app && (
              <div className="flex items-center gap-2 border-b border-line px-3.5 py-2 text-[12px] text-ink-2">
                <AppWindow className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                <span className="truncate">{task.source_app}</span>
              </div>
            )}
            {task.original_text && (
              <p className="select-text whitespace-pre-wrap px-3.5 py-3 font-mono text-[12px] leading-relaxed text-ink-2">{task.original_text}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <div className="relative" ref={calendarRef}>
          <IconButton label="Add to calendar" onClick={() => setIsCalendarOpen((o) => !o)} aria-expanded={isCalendarOpen}>
            <CalendarPlus className="h-4 w-4" />
          </IconButton>
          {isCalendarOpen && (
            <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-line-strong bg-surface-2 p-1 shadow-pop animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  openGoogleCalendar(task);
                  setIsCalendarOpen(false);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-2 transition hover:bg-white/[0.05] hover:text-ink"
              >
                Google Calendar
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadIcs(task);
                  setIsCalendarOpen(false);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-2 transition hover:bg-white/[0.05] hover:text-ink"
              >
                Outlook / Apple (.ics)
              </button>
            </div>
          )}
        </div>
        <IconButton label="Edit Task" onClick={() => onEdit(task)}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Delete task" onClick={() => onDelete(task.id)} danger>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
