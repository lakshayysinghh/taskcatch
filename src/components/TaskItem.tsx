import React, { useState } from 'react';
import {
  Check,
  Clock,
  Timer,
  Flame,
  Tag,
  Globe,
  MessageSquare,
  Terminal,
  FileCode,
  AppWindow,
  Calendar,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Task } from '../lib/types';
import {
  formatDeadline,
  formatCaptureDate,
  getPriorityStyles,
  getDueStatus,
  getGoogleCalendarUrl,
  downloadIcsFile,
} from '../lib/utils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onSyncTodoist?: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onDelete,
  onEdit,
}) => {
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);

  const priorityStyle = getPriorityStyles(task.priority);
  const formattedDeadline = formatDeadline(task.deadline);
  const formattedCaptureDate = formatCaptureDate(task.created_at);
  const dueStatus = getDueStatus(task.deadline);

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
    <div
      className={`bg-[rgba(19,20,16,0.72)] backdrop-blur-[16px] border border-[rgba(168,173,122,0.14)] rounded-[12px] p-[18px_20px] mb-[12px] relative flex items-start gap-[14px] transition-all hover:border-[rgba(168,173,122,0.3)] ${
        task.is_completed ? 'opacity-50' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer mt-0.5 ${
          task.is_completed
            ? 'bg-[#a8ad7a] border-[#a8ad7a] text-[#0b0c0a]'
            : 'border-[rgba(168,173,122,0.25)] hover:border-[#a8ad7a] bg-transparent'
        }`}
        title={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.is_completed && <Check className="w-3 h-3 stroke-[3]" />}
      </button>

      {/* Task Vertical Bar */}
      <div
        className={`w-[3px] self-stretch min-h-[32px] rounded-[2px] flex-shrink-0 ${
          task.is_completed ? 'bg-[rgba(168,173,122,0.14)]' : priorityStyle.barGradient
        }`}
      />

      {/* Task Body */}
      <div className="flex-1 min-w-0">
        {/* Top Badges */}
        <div className="flex items-center gap-[8px] mb-[10px] flex-wrap">
          {/* Priority Badge */}
          <span className={`text-[11px] px-[10px] py-[4px] rounded-[6px] flex items-center gap-1 ${priorityStyle.badgeClass}`}>
            {(task.priority === 'urgent' || task.priority === 'high') && (
              <Flame className="w-3 h-3 text-[#0b0c0a]" />
            )}
            <span>{priorityStyle.label}</span>
          </span>

          {/* Category */}
          {task.category && (
            <span className="text-[11px] text-[#93958a] bg-transparent pl-0 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#7c8450]" />
              <span>{task.category}</span>
            </span>
          )}

          {/* Origin App Context Badge */}
          {task.source_app && (
            <span
              className="text-[11px] text-[#93958a] bg-white/[0.03] border border-[rgba(168,173,122,0.14)] px-[8px] py-[3px] rounded-[6px] flex items-center gap-1.5"
              title={task.source_window_title ? `${task.source_app}: ${task.source_window_title}` : task.source_app}
            >
              {getAppIcon(task.source_app)}
              <span className="truncate max-w-[120px]">{task.source_app}</span>
            </span>
          )}

          {/* Deep-Link Origin URL */}
          {task.source_url && (
            <a
              href={task.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#a8ad7a] hover:text-[#d9dcc4] bg-[rgba(168,173,122,0.08)] hover:bg-[rgba(168,173,122,0.18)] border border-[rgba(168,173,122,0.25)] px-[8px] py-[3px] rounded-[6px] flex items-center gap-1 transition-all no-underline"
              title={`Open original link: ${task.source_url}`}
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open source</span>
            </a>
          )}

          {/* Deadline Date Pill with Clock icon */}
          {formattedDeadline && (
            <span className="text-[11px] text-[#c7c9bb] bg-white/[0.03] border border-[rgba(168,173,122,0.14)] px-[10px] py-[4px] rounded-[6px] flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#a8ad7a]" />
              <span>{formattedDeadline}</span>
            </span>
          )}
        </div>

        {/* Task Title */}
        <div
          onClick={() => onToggle(task.id)}
          className={`text-[15px] font-medium text-[#f2f2ec] mb-[6px] cursor-pointer select-text ${
            task.is_completed ? 'line-through text-[#93958a]' : ''
          }`}
        >
          {task.title}
        </div>

        {/* Task Meta Footer */}
        <div className="text-[12px] text-[#93958a]">
          <span>{formattedCaptureDate}</span>
          {task.raw_source_text && (
            <>
              <span> &nbsp;·&nbsp; </span>
              <a
                href="#source"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSourceExpanded(!isSourceExpanded);
                }}
                className="text-[#a8ad7a] no-underline border-b border-[#a8ad7a]/30 hover:border-[#a8ad7a] transition-colors cursor-pointer"
              >
                View source text
              </a>
            </>
          )}
        </div>

        {/* Expandable Source Text Drawer */}
        {isSourceExpanded && (
          <div className="mt-3 p-3 rounded-[8px] bg-[rgba(10,11,8,0.85)] border border-[rgba(168,173,122,0.14)] text-xs text-[#a8ad7a] font-mono leading-relaxed select-text space-y-1.5">
            {task.source_window_title && (
              <div className="text-[11px] text-[#93958a] font-sans flex items-center gap-1.5 pb-1 border-b border-[rgba(168,173,122,0.1)]">
                <span className="font-semibold text-[#d9dcc4]">Origin Window:</span>
                <span className="truncate">{task.source_window_title}</span>
              </div>
            )}
            {task.source_url && (
              <div className="text-[11px] text-[#a8ad7a] font-sans flex items-center gap-1.5 pb-1 border-b border-[rgba(168,173,122,0.1)]">
                <span className="font-semibold text-[#d9dcc4]">URL:</span>
                <a href={task.source_url} target="_blank" rel="noreferrer" className="underline truncate">
                  {task.source_url}
                </a>
              </div>
            )}
            {task.raw_source_text && (
              <div>
                <span className="text-[10px] text-[#93958a] uppercase tracking-wider block mb-1 font-sans">
                  Raw Extracted Source:
                </span>
                {task.raw_source_text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Actions (Top) and Live Remaining Timer Badge (Bottom) */}
      <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 ml-2 min-h-[48px]">
        {/* Top: Action Icons (Calendar, Edit & Delete) */}
        <div className="flex items-center gap-[10px] text-[#93958a] text-[15px]">
          {/* Calendar Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCalendarMenuOpen(!isCalendarMenuOpen)}
              className="p-1 rounded-[6px] hover:text-[#a8ad7a] hover:bg-[rgba(168,173,122,0.1)] transition-all cursor-pointer"
              title="Add to Calendar (Google / Outlook)"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>

            {isCalendarMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-[rgba(19,20,16,0.95)] backdrop-blur-[20px] border border-[rgba(168,173,122,0.2)] rounded-[10px] shadow-2xl p-1 z-50 animate-fadeIn space-y-0.5">
                <a
                  href={getGoogleCalendarUrl(task)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsCalendarMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] text-xs font-medium text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all no-underline"
                >
                  <Globe className="w-3 h-3 text-[#a8ad7a]" />
                  <span>Google Calendar</span>
                </a>
                <button
                  onClick={() => {
                    downloadIcsFile(task);
                    setIsCalendarMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] text-xs font-medium text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all text-left cursor-pointer"
                >
                  <Download className="w-3 h-3 text-[#a8ad7a]" />
                  <span>Outlook / .ics</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Task */}
          <span
            onClick={() => onEdit(task)}
            className="hover:text-[#a8ad7a] cursor-pointer transition-colors"
            title="Edit task"
          >
            ✎
          </span>

          {/* Delete Task */}
          <span
            onClick={() => onDelete(task.id)}
            className="hover:text-[#ff7b7b] cursor-pointer transition-colors"
            title="Delete task"
          >
            ✕
          </span>
        </div>

        {/* Bottom Right: Live Countdown Remaining Timer / Overdue Badge */}
        {!task.is_completed && dueStatus.isDueSoon && (
          <div className="mt-2">
            <span className="text-[11px] font-medium text-[#d9dcc4] bg-[rgba(124,132,80,0.25)] border border-[rgba(168,173,122,0.35)] px-[8px] py-[3px] rounded-[6px] flex items-center gap-1 shadow-sm">
              <Timer className="w-3 h-3 text-[#d9dcc4] animate-pulse" />
              <span>{dueStatus.text}</span>
            </span>
          </div>
        )}

        {!task.is_completed && dueStatus.isOverdue && (
          <div className="mt-2">
            <span className="text-[11px] font-medium text-[#e07575] bg-[rgba(224,117,117,0.15)] border border-[rgba(224,117,117,0.3)] px-[8px] py-[3px] rounded-[6px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#e07575]" />
              <span>Overdue</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
