import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Sparkles, Tag, Flame, Calendar, CornerDownLeft, Shield, DollarSign, Terminal, User } from 'lucide-react';

export function ManualCaptureModal({ isOpen, onClose, onSaveTask }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } else {
      setText('');
    }
  }, [isOpen]);

  // Real-time NLP Heuristic Parsing Engine
  const parsedPreview = useMemo(() => {
    const lower = text.toLowerCase();

    // 1. Priority Detection
    let priority = 'Medium';
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('critical') || lower.includes('!')) {
      priority = 'Urgent';
    } else if (lower.includes('high') || lower.includes('important') || lower.includes('p1')) {
      priority = 'High';
    } else if (lower.includes('low') || lower.includes('someday') || lower.includes('p3')) {
      priority = 'Low';
    }

    // 2. Category Detection
    let category = 'General';
    let categoryIcon = Tag;
    if (lower.includes('#dev') || lower.includes('bug') || lower.includes('fix') || lower.includes('deploy') || lower.includes('code')) {
      category = 'Development';
      categoryIcon = Terminal;
    } else if (lower.includes('#finance') || lower.includes('invoice') || lower.includes('budget') || lower.includes('tax') || lower.includes('$')) {
      category = 'Finance';
      categoryIcon = DollarSign;
    } else if (lower.includes('#security') || lower.includes('auth') || lower.includes('vault') || lower.includes('token') || lower.includes('key')) {
      category = 'Security';
      categoryIcon = Shield;
    } else if (lower.includes('#personal') || lower.includes('buy') || lower.includes('call') || lower.includes('home')) {
      category = 'Personal';
      categoryIcon = User;
    }

    // 3. Deadline Detection
    let deadline = 'Today at 5:00 PM';
    if (lower.includes('tomorrow')) deadline = 'Tomorrow at 9:00 AM';
    else if (lower.includes('friday')) deadline = 'Friday at 5:00 PM';
    else if (lower.includes('monday')) deadline = 'Next Monday at 9:00 AM';
    else if (lower.includes('today')) deadline = 'Today at 5:00 PM';

    return { priority, category, categoryIcon, deadline };
  }, [text]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    onSaveTask({
      content: text.trim(),
      priority: parsedPreview.priority,
      category: parsedPreview.category,
      deadline: parsedPreview.deadline,
    });

    setText('');
    onClose();
  };

  const handleKeyDown = (e) => {
    // Enter without Shift -> Instant Save
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Escape -> Close
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const CategoryIcon = parsedPreview.categoryIcon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--surface-glass-modal)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative text-[#e4e6db] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[rgba(168,173,122,0.12)] border border-[var(--border-subtle)] text-[var(--olive-300)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f2f2ec]">Natural Language Quick Add</h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">Dump thoughts & auto-categorize in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[#f2f2ec] p-1.5 rounded-lg hover:bg-[rgba(168,173,122,0.1)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Deploy auth hotfix tomorrow morning #dev urgent!"
              className="w-full bg-[rgba(10,11,8,0.95)] border border-[var(--border-subtle)] focus:border-[var(--olive-300)] focus:ring-1 focus:ring-[var(--olive-300)] text-sm text-[#f2f2ec] rounded-xl p-3.5 outline-none resize-none placeholder:text-[var(--text-placeholder)] font-sans transition-all leading-relaxed"
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-mono pointer-events-none bg-[rgba(19,20,16,0.8)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
              <span>Enter</span>
              <CornerDownLeft className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Real-Time Live Preview Chips */}
          <div className="p-3.5 rounded-xl bg-[rgba(10,11,8,0.65)] border border-[var(--border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                Live Intent Preview
              </span>
              <span className="text-[10px] font-mono text-[var(--olive-300)]">
                {text.length > 0 ? 'Parsing active...' : 'Awaiting input'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Priority Chip */}
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                  parsedPreview.priority === 'Urgent'
                    ? 'bg-[rgba(239,68,68,0.15)] text-[#ff7b7b] border-[rgba(239,68,68,0.3)] shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    : parsedPreview.priority === 'High'
                    ? 'bg-[rgba(234,179,8,0.15)] text-[#eab308] border-[rgba(234,179,8,0.3)]'
                    : 'bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] border-[var(--border-subtle)]'
                }`}
              >
                <Flame className="w-3 h-3" />
                Priority: <strong className="font-semibold">{parsedPreview.priority}</strong>
              </span>

              {/* Category Chip */}
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] border border-[var(--border-subtle)] flex items-center gap-1.5 transition-all">
                <CategoryIcon className="w-3 h-3 text-[var(--olive-300)]" />
                Category: <strong className="font-semibold">#{parsedPreview.category}</strong>
              </span>

              {/* Deadline Chip */}
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] border border-[var(--border-subtle)] flex items-center gap-1.5 transition-all">
                <Calendar className="w-3 h-3 text-[var(--olive-300)]" />
                {parsedPreview.deadline}
              </span>
            </div>
          </div>

          {/* Quick Syntax Cheat Sheet */}
          <div className="text-[11px] text-[var(--text-secondary)] space-y-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[var(--olive-300)]">Keywords:</span>
              <span><code className="text-[#e4e4de]">urgent</code>, <code className="text-[#e4e4de]">#dev</code>, <code className="text-[#e4e4de]">tomorrow</code>, <code className="text-[#e4e4de]">friday</code></span>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-secondary)]">Press <kbd className="font-mono bg-[rgba(168,173,122,0.1)] px-1 py-0.5 rounded text-[var(--olive-100)]">Esc</kbd> to exit</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[#f2f2ec] rounded-xl transition-colors border border-transparent hover:border-[rgba(168,173,122,0.3)]"
                style={{ background: 'linear-gradient(135deg, rgba(35,37,28,0.5), rgba(10,11,8,0.8))' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="px-5 py-2 text-xs font-semibold rounded-xl text-[#0b0c0a] shadow-[0_0_15px_rgba(168,173,122,0.2)] hover:opacity-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))' }}
              >
                <span>Save Task</span>
                <CornerDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
