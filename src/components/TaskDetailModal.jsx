import React, { useState, useEffect } from 'react';
import { X, Flame, Tag, Calendar, FileText, Check, Flag } from 'lucide-react';

export function TaskDetailModal({ isOpen, onClose, task, onSave }) {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('General');
  const [deadline, setDeadline] = useState('');
  const [originalText, setOriginalText] = useState('');

  useEffect(() => {
    if (task) {
      setContent(task.content || '');
      setPriority(task.priority || 'Medium');
      setCategory(task.category || 'General');
      setDeadline(task.deadline || '');
      setOriginalText(task.original_text || '');
    } else {
      setContent('');
      setPriority('Medium');
      setCategory('General');
      setDeadline('');
      setOriginalText('');
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSave({
      id: task?.id,
      content: content.trim(),
      priority,
      category,
      deadline: deadline || undefined,
      original_text: originalText.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--surface-glass-modal)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg shadow-2xl relative text-[#e4e6db] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-bold text-[#f2f2ec]">
            {task?.id ? 'Edit task' : 'Create task'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[#f2f2ec] p-1.5 rounded-lg hover:bg-[rgba(168,173,122,0.1)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title / Description */}
          <div>
            <label className="block text-[11px] font-bold text-[#8c9182] uppercase tracking-wider mb-2">Task Title</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. Deploy hotfix for auth service"
              required
              className="w-full bg-[rgba(10,11,8,0.5)] border border-[var(--border-subtle)] focus:border-[var(--olive-300)] text-sm text-[#f2f2ec] rounded-xl p-3 outline-none placeholder:text-[#52574d] shadow-inner"
            />
          </div>

          {/* Priority & Category Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#8c9182] uppercase tracking-wider mb-2">
                <Flag className="w-3.5 h-3.5" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[rgba(10,11,8,0.5)] border border-[var(--border-subtle)] focus:border-[var(--olive-300)] text-sm text-[#f2f2ec] rounded-xl p-3 outline-none appearance-none cursor-pointer shadow-inner"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238c9182\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#8c9182] uppercase tracking-wider mb-2">
                <Tag className="w-3.5 h-3.5" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[rgba(10,11,8,0.5)] border border-[var(--border-subtle)] focus:border-[var(--olive-300)] text-sm text-[#f2f2ec] rounded-xl p-3 outline-none appearance-none cursor-pointer shadow-inner"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238c9182\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="General">General</option>
                <option value="Security">Security</option>
                <option value="Development">Development</option>
                <option value="Finance">Finance</option>
                <option value="Personal">Personal</option>
                <option value="Engineering">Engineering</option>
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#8c9182] uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5" /> Deadline
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[rgba(10,11,8,0.5)] border border-[var(--border-subtle)] focus:border-[var(--olive-300)] text-sm text-[#f2f2ec] rounded-xl p-3 outline-none placeholder:text-[#52574d] shadow-inner"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Raw Source Context Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#8c9182] uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5" /> Source Context (Optional)
            </label>
            <textarea
              rows={3}
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Raw text from email, Slack, etc."
              className="w-full bg-[rgba(10,11,8,0.5)] border border-[var(--border-subtle)] focus:border-[var(--olive-300)] font-mono text-sm text-[#8c9182] rounded-xl p-3 outline-none resize-none placeholder:text-[#52574d] shadow-inner"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] font-medium text-[#8c9182] hover:text-[#f2f2ec] transition-colors bg-transparent border-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-[13px] font-semibold rounded-lg text-[#0b0c0a] shadow-sm hover:opacity-95 transition-all flex items-center gap-2 bg-[var(--olive-300)]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Save task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
