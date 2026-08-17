import React, { useState } from 'react';
import { X, Calendar, Flag, Tag, FileText, Check } from 'lucide-react';
import { Task, UpdateTaskInput } from '../lib/types';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: UpdateTaskInput) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(task?.title || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [category, setCategory] = useState(task?.category || 'General');
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.slice(0, 16) : '');
  const [rawText, setRawText] = useState(task?.raw_source_text || '');

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: task.id,
      title: title.trim() || 'Untitled Task',
      priority,
      category: category.trim() || 'General',
      deadline: deadline ? new Date(deadline).toISOString() : null,
      raw_source_text: rawText.trim() || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[rgba(19,20,16,0.92)] backdrop-blur-[20px] border border-[rgba(168,173,122,0.2)] rounded-[12px] shadow-2xl overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(168,173,122,0.14)]">
          <h3 className="text-base font-semibold text-[#f0f3eb]">
            {task.id ? 'Edit task' : 'Create task'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6e7d66] hover:text-[#f0f3eb] hover:bg-[#1a2116] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold text-[#7e8c75] mb-1.5 uppercase tracking-wider">
              Task title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deploy hotfix for auth service"
              className="w-full px-3.5 py-2.5 bg-[#0d100c] border border-[#1f261c] focus:border-[#8fa372] rounded-xl text-sm text-[#f0f3eb] placeholder-[#4f5b47] outline-none transition-all"
              required
            />
          </div>

          {/* Priority & Category Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-[#7e8c75] mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Flag className="w-3 h-3 text-[#8fa372]" />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full px-3.5 py-2.5 bg-[#0d100c] border border-[#1f261c] focus:border-[#8fa372] rounded-xl text-xs text-[#f0f3eb] outline-none transition-all cursor-pointer"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-[#7e8c75] mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#8fa372]" />
                <span>Category</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Development, Finance"
                className="w-full px-3.5 py-2.5 bg-[#0d100c] border border-[#1f261c] focus:border-[#8fa372] rounded-xl text-xs text-[#f0f3eb] placeholder-[#4f5b47] outline-none transition-all"
              />
            </div>
          </div>

          {/* Deadline Field */}
          <div>
            <label className="block text-xs font-semibold text-[#7e8c75] mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#8fa372]" />
              <span>Deadline</span>
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0d100c] border border-[#1f261c] focus:border-[#8fa372] rounded-xl text-xs text-[#f0f3eb] outline-none transition-all cursor-pointer"
            />
          </div>

          {/* Raw Source Text */}
          <div>
            <label className="block text-xs font-semibold text-[#7e8c75] mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#8fa372]" />
              <span>Source context (optional)</span>
            </label>
            <textarea
              rows={2}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Raw text from email, Slack, etc."
              className="w-full px-3.5 py-2 bg-[#0d100c] border border-[#1f261c] focus:border-[#8fa372] rounded-xl text-xs text-[#d4dcce] font-mono placeholder-[#4f5b47] outline-none transition-all resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1b2217]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#7e8c75] hover:text-[#f0f3eb] hover:bg-[#181e15] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-[#11170d] bg-[#a2b885] hover:bg-[#b3ca94] transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
