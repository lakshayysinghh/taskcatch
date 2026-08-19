import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Clock,
  Loader2,
  Tag,
  CornerDownLeft,
} from 'lucide-react';
import { api } from '../lib/tauri';
import { AppSettings } from '../lib/types';
import { getPriorityStyles, parseNaturalLanguageInput } from '../lib/utils';

interface ManualCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  onShowToast: (title: string, msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  settings?: AppSettings;
}

const SAMPLE_COMMANDS = [
  'Deploy hotfix for auth token expiry tomorrow 10am #dev p:urgent',
  'Review Q3 financial projections by Friday 5pm #finance p:high',
  'Buy replacement ergonomic mouse #personal p:low',
  'Submit weekly client report by EOD #work',
];

export const ManualCaptureModal: React.FC<ManualCaptureModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  onShowToast,
  settings,
}) => {
  const [inputText, setInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Live parsed shorthand preview
  const liveParsed = inputText.trim()
    ? parseNaturalLanguageInput(inputText.trim(), settings?.eod_time || '17:00')
    : null;

  useEffect(() => {
    if (isOpen) {
      setInputText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExtractOrQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setIsExtracting(true);

    try {
      const res = await api.extractFromText(inputText.trim());
      if (res.success && res.task) {
        onShowToast('Task Captured', `"${res.task.title}"`, 'success');
        onTaskCreated();
        onClose();
        setInputText('');
      } else if (liveParsed) {
        const newTask = await api.createTask({
          title: liveParsed.task_title,
          raw_source_text: inputText.trim(),
          deadline: liveParsed.deadline,
          priority: liveParsed.priority,
          category: liveParsed.category,
        });
        onShowToast('Task Created', `"${newTask.title}"`, 'success');
        onTaskCreated();
        onClose();
        setInputText('');
      }
    } catch (err: any) {
      onShowToast('Error', err.message || 'Failed to extract task', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-[rgba(19,20,16,0.94)] backdrop-blur-[24px] border border-[rgba(168,173,122,0.25)] rounded-[14px] shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(168,173,122,0.14)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#a8ad7a]" />
            <h3 className="text-[15px] font-semibold text-[#f2f2ec]">
              Quick Add & NLP Command Bar
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleExtractOrQuickAdd} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#93958a] mb-1.5 uppercase tracking-wider">
              Type shorthand (e.g. <span className="text-[#a8ad7a]">#dev</span>, <span className="text-[#a8ad7a]">p:urgent</span>, <span className="text-[#a8ad7a]">tomorrow 5pm</span>) or paste text:
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleExtractOrQuickAdd();
                }
              }}
              placeholder="e.g. Deploy hotfix for token expiry tomorrow at 4pm #dev p:urgent"
              className="w-full px-3.5 py-2.5 bg-[#0a0b08] border border-[rgba(168,173,122,0.2)] focus:border-[#a8ad7a] rounded-[10px] text-xs text-[#f2f2ec] placeholder-[#4f5b47] outline-none transition-all resize-none"
              autoFocus
            />
          </div>

          {/* Live Shorthand Preview Chips */}
          {liveParsed && (
            <div className="p-3 rounded-[8px] bg-[rgba(168,173,122,0.06)] border border-[rgba(168,173,122,0.16)] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-[#f2f2ec] truncate max-w-[240px]">
                  {liveParsed.task_title}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${getPriorityStyles(liveParsed.priority).badgeClass}`}>
                  {liveParsed.priority.toUpperCase()}
                </span>
                {liveParsed.category && (
                  <span className="text-[10px] text-[#93958a] flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    <span>{liveParsed.category}</span>
                  </span>
                )}
                {liveParsed.deadline && (
                  <span className="text-[10px] text-[#a8ad7a] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(liveParsed.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#93958a] flex items-center gap-0.5">
                <span>Press</span>
                <kbd className="px-1 py-0.5 rounded bg-[#23241d] text-[#f2f2ec] font-mono text-[9px]">Enter</kbd>
              </span>
            </div>
          )}

          {/* Sample Command Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#55634e] mr-1 font-medium">Examples:</span>
            {SAMPLE_COMMANDS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInputText(prompt)}
                className="text-[11px] px-2.5 py-1 rounded-[6px] bg-[rgba(19,20,16,0.6)] hover:bg-[rgba(168,173,122,0.12)] text-[#93958a] hover:text-[#d5d6cd] border border-[rgba(168,173,122,0.14)] transition-all cursor-pointer truncate max-w-[220px]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={isExtracting || !inputText.trim()}
            className="w-full py-2.5 rounded-[8px] text-[13px] font-semibold text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <CornerDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Task to Dashboard</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
