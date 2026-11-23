import React, { useEffect, useState } from 'react';
import { Check, PencilLine, Plus, X } from 'lucide-react';
import { PRIORITIES, CATEGORIES, toLocalInputValue, fromLocalInputValue } from '../lib/taskMeta';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Label, Select, inputClass } from './ui/Field';
import { priorityDotClass } from './ui/Badges';

export function TaskDetailModal({ isOpen, onClose, task, onSave }) {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('General');
  const [deadline, setDeadline] = useState(''); // datetime-local value, in local time
  const [originalText, setOriginalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setContent(task.content || '');
      setPriority(task.priority || 'Medium');
      setCategory(task.category || 'General');
      setDeadline(toLocalInputValue(task.deadline));
      setOriginalText(task.original_text || '');
    } else {
      setContent('');
      setPriority('Medium');
      setCategory('General');
      setDeadline('');
      setOriginalText('');
    }
    setIsSaving(false);
  }, [task, isOpen]);

  // Keep a task's older category selectable so editing other fields doesn't change it.
  const categoryOptions = CATEGORIES.includes(category) ? CATEGORIES : [...CATEGORIES, category];
  const isEdit = Boolean(task?.id);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!content.trim() || isSaving) return;

    setIsSaving(true);
    const saved = await onSave({
      id: task?.id,
      content: content.trim(),
      priority,
      category,
      deadline: fromLocalInputValue(deadline),
      original_text: originalText.trim() || null,
    });
    setIsSaving(false);

    // On failure the error banner explains why; keep the form so nothing typed is lost.
    if (saved) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={isEdit ? PencilLine : Plus}
      title={isEdit ? 'Edit task' : 'New task'}
      description={isEdit ? 'Changes are saved to your task list.' : 'Add a task by hand.'}
      footer={
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="task-detail-form" disabled={isSaving}>
            <Check className="h-4 w-4" strokeWidth={2.4} />
            {isSaving ? 'Saving...' : 'Save task'}
          </Button>
        </div>
      }
    >
      <form id="task-detail-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="task-title">Title</Label>
          <input
            id="task-title"
            data-autofocus
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. Deploy hotfix for auth service"
            required
            className={`${inputClass} h-10`}
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[12.5px] font-medium text-ink-2">Priority</legend>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={priority === p}
                onClick={() => setPriority(p)}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-[10px] border text-[12.5px] font-medium transition ${
                  priority === p
                    ? 'border-olive-300/40 bg-olive-300/10 text-ink'
                    : 'border-line-strong bg-black/20 text-ink-2 hover:text-ink'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${priorityDotClass(p)}`} />
                {p}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="task-category">Category</Label>
            <Select id="task-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="task-deadline" className="text-[12.5px] font-medium text-ink-2">
                Deadline
              </label>
              {deadline && (
                <button
                  type="button"
                  onClick={() => setDeadline('')}
                  className="inline-flex items-center gap-0.5 text-[11.5px] text-ink-3 transition hover:text-ink"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <input
              id="task-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={`${inputClass} h-10 [color-scheme:dark]`}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="task-source" hint="Optional">
            Source text
          </Label>
          <textarea
            id="task-source"
            rows={3}
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Raw text from email, Slack, etc."
            className={`${inputClass} resize-none py-2.5 font-mono text-[12.5px] leading-relaxed`}
          />
        </div>
      </form>
    </Modal>
  );
}
