import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CornerDownLeft, Sparkles } from 'lucide-react';
import { parseTaskText } from '../lib/parseTask';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Kbd } from './ui/Kbd';
import { PriorityBadge, CategoryTag } from './ui/Badges';
import { inputClass } from './ui/Field';

function formatDeadlineLabel(iso) {
  if (!iso) return 'No deadline';
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today at ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${time}`;
}

const EXAMPLES = ['urgent', 'p1', '#dev', 'invoice', 'tonight', 'tomorrow 5pm', 'by friday'];

export function ManualCaptureModal({ isOpen, onClose, onSaveTask }) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setText('');
      setIsSaving(false);
    }
  }, [isOpen]);

  // Live preview from the shared keyword parser (same rules as the desktop fallback)
  const preview = useMemo(() => {
    const parsed = parseTaskText(text);
    return { ...parsed, deadlineLabel: formatDeadlineLabel(parsed.deadline) };
  }, [text]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSaving) return;

    // Re-parse at submit time so relative deadlines are computed from "now",
    // not from when the preview was last rendered.
    const parsed = parseTaskText(text);
    setIsSaving(true);
    const saved = await onSaveTask({
      content: text.trim(),
      priority: parsed.priority,
      category: parsed.category,
      deadline: parsed.deadline,
    });
    setIsSaving(false);

    // On failure the error banner explains why; keep the text so it isn't lost.
    if (saved) {
      setText('');
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Sparkles}
      title="Quick add"
      description="Type a task in plain words. Priority, category and deadline are picked up as you type."
      footer={
        <>
          <span className="hidden items-center gap-4 whitespace-nowrap text-[12px] text-ink-3 sm:flex">
            <span className="flex items-center gap-1.5">
              <Kbd>Enter</Kbd> save
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Shift+Enter</Kbd> new line
            </span>
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!text.trim() || isSaving}>
              {isSaving ? 'Saving...' : 'Save task'}
              <CornerDownLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          data-autofocus
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Deploy auth hotfix tomorrow 5pm #dev urgent"
          aria-label="Task text"
          className={`${inputClass} resize-none py-3 text-[15px] leading-relaxed`}
        />

        <div className="rounded-xl border border-line bg-black/20 p-3.5">
          <div className="mb-2.5 text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">Preview</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <PriorityBadge priority={preview.priority} />
            <CategoryTag category={preview.category} />
            <span className={`inline-flex items-center gap-1.5 text-[12px] ${preview.deadline ? 'text-ink' : 'text-ink-3'}`}>
              <Calendar className="h-3.5 w-3.5 text-ink-3" />
              {preview.deadlineLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
          <span className="mr-0.5">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText((t) => (t.trim() ? `${t.trim()} ${ex}` : ex))}
              className="rounded-md border border-line-strong bg-white/[0.02] px-1.5 py-0.5 font-mono text-[11px] text-ink-2 transition hover:border-olive-300/30 hover:text-ink"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>
    </Modal>
  );
}
