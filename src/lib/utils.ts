import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Task, ExtractedTask } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDeadline(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (24 * 3600 * 1000));
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

    if (diffDays === 0) {
      return `Today at ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${timeStr}`;
    } else if (diffDays === -1) {
      return `Yesterday at ${timeStr}`;
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${date.getDate()} at ${timeStr}`;
    }
  } catch {
    return '';
  }
}

export function getDueStatus(isoString: string | null | undefined) {
  if (!isoString) return { isDueSoon: false, isOverdue: false, text: '' };
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { isDueSoon: false, isOverdue: false, text: '' };

    const now = new Date().getTime();
    const target = date.getTime();
    const diffMs = target - now;

    if (diffMs < 0) {
      return { isDueSoon: false, isOverdue: true, text: 'Overdue' };
    }

    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffMinutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));

    if (diffHours < 48) {
      if (diffHours === 0) {
        return { isDueSoon: true, isOverdue: false, text: `${diffMinutes}m left` };
      } else if (diffHours < 24) {
        return { isDueSoon: true, isOverdue: false, text: `${diffHours}h ${diffMinutes}m left` };
      } else {
        return { isDueSoon: true, isOverdue: false, text: `${diffHours}h left` };
      }
    }

    return { isDueSoon: false, isOverdue: false, text: '' };
  } catch {
    return { isDueSoon: false, isOverdue: false, text: '' };
  }
}

export function formatCaptureDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

    return `Captured ${month} ${day}, ${timeStr}`;
  } catch {
    return '';
  }
}

export function getPriorityStyles(priority: string) {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return {
        label: 'Urgent',
        barGradient: 'bg-gradient-to-b from-[#d9dcc4] to-[#7c8450]',
        badgeClass: 'bg-gradient-to-br from-[#a8ad7a] to-[#545a34] text-[#0b0c0a] font-medium shadow-sm',
      };
    case 'high':
      return {
        label: 'High',
        barGradient: 'bg-gradient-to-b from-[#7c8450] to-[#33361f]',
        badgeClass: 'bg-[#a8ad7a]/15 text-[#a8ad7a] border border-[#a8ad7a]/30 font-medium',
      };
    case 'low':
      return {
        label: 'Low',
        barGradient: 'bg-[#23241d]',
        badgeClass: 'bg-transparent text-[#93958a] border border-[rgba(168,173,122,0.14)] font-medium',
      };
    case 'medium':
    default:
      return {
        label: 'Medium',
        barGradient: 'bg-gradient-to-b from-[#545a34] to-[#23241d]',
        badgeClass: 'bg-[#7c8450]/15 text-[#a8ad7a] border border-[#7c8450]/30 font-medium',
      };
  }
}

// -------------------------------------------------------------
// Calendar Integration Helpers (Google Calendar & .ics Download)
// -------------------------------------------------------------
export function getGoogleCalendarUrl(task: Task): string {
  const title = encodeURIComponent(task.title);
  const details = encodeURIComponent(
    `TaskCatch Action Item\nPriority: ${task.priority.toUpperCase()}\nCategory: ${task.category}\n${task.raw_source_text ? `\nOriginal Context:\n${task.raw_source_text}` : ''}`
  );

  let startIso = '';
  let endIso = '';

  if (task.deadline) {
    const d = new Date(task.deadline);
    const end = new Date(d.getTime() + 30 * 60 * 1000); // 30 min duration
    startIso = d.toISOString().replace(/-|:|\.\d+/g, '');
    endIso = end.toISOString().replace(/-|:|\.\d+/g, '');
  } else {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 60 * 1000);
    startIso = now.toISOString().replace(/-|:|\.\d+/g, '');
    endIso = end.toISOString().replace(/-|:|\.\d+/g, '');
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
}

export function downloadIcsFile(task: Task) {
  const d = task.deadline ? new Date(task.deadline) : new Date();
  const end = new Date(d.getTime() + 30 * 60 * 1000);

  const formatIcsDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaskCatch//Task Tracker//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${task.id}@taskcatch.local`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(d)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${task.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(task.raw_source_text || task.title).replace(/\n/g, '\\n')}`,
    `PRIORITY:${task.priority === 'urgent' ? '1' : task.priority === 'high' ? '3' : '5'}`,
    `CATEGORIES:${task.category}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${task.title.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// Web Audio Synth Chime
// -------------------------------------------------------------
export function playChimeSound(enabled: boolean = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {}
}

// -------------------------------------------------------------
// Natural Language Inline Command Parser (Ctrl + K syntax)
// -------------------------------------------------------------
export function parseNaturalLanguageInput(
  rawInput: string,
  eodTime: string = '17:00'
): ExtractedTask {
  let text = rawInput.trim();
  let priority: ExtractedTask['priority'] = 'medium';
  let category = 'General';
  let deadline: string | null = null;

  // 1. Extract Priority tags: p:urgent, p:high, p:medium, p:low or !urgent, !high
  const priorityMatch = text.match(/(?:p:|!)(urgent|high|medium|low)\b/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as any;
    text = text.replace(priorityMatch[0], '').trim();
  }

  // 2. Extract Category tags: #finance, #dev, #work, #personal
  const categoryMatch = text.match(/#([a-zA-Z0-9_-]+)/);
  if (categoryMatch) {
    category = categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1);
    text = text.replace(categoryMatch[0], '').trim();
  }

  // 3. Parse EOD hour & minute
  const [eodHour, eodMin] = eodTime.split(':').map((n) => parseInt(n, 10) || 0);

  // 4. Extract Deadline syntax
  const now = new Date();
  const lower = text.toLowerCase();

  // Pattern: "at 7pm", "at 14:00", "5pm", "10 am"
  let targetHour = eodHour || 17;
  let targetMin = eodMin || 0;
  const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const isPm = timeMatch[3].toLowerCase() === 'pm';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    targetHour = h;
    targetMin = m;
    text = text.replace(timeMatch[0], '').trim();
  }

  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(targetHour, targetMin, 0, 0);
    deadline = d.toISOString();
    text = text.replace(/\btomorrow\b/i, '').trim();
  } else if (lower.includes('today') || lower.includes('tonight') || lower.includes('eod') || lower.includes('end of day')) {
    const d = new Date(now);
    d.setHours(targetHour, targetMin, 0, 0);
    deadline = d.toISOString();
    text = text.replace(/\b(today|tonight|eod|end of day)\b/i, '').trim();
  } else if (lower.includes('friday')) {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(targetHour, targetMin, 0, 0);
    deadline = d.toISOString();
    text = text.replace(/\b(this\s+)?friday\b/i, '').trim();
  } else if (lower.includes('next monday') || lower.includes('monday')) {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (1 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(targetHour, targetMin, 0, 0);
    deadline = d.toISOString();
    text = text.replace(/\b(next\s+)?monday\b/i, '').trim();
  } else if (timeMatch) {
    // If only time was provided, set for today if later, else tomorrow
    const d = new Date(now);
    d.setHours(targetHour, targetMin, 0, 0);
    if (d.getTime() < now.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    deadline = d.toISOString();
  }

  // Clean trailing punctuation / prepositions
  text = text.replace(/\s+(by|at|on|for)\s*$/i, '').trim();
  if (!text) text = 'Quick Task';

  return {
    task_title: text.charAt(0).toUpperCase() + text.slice(1),
    deadline,
    priority,
    category,
  };
}
