import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Plus, Tag, Flame } from 'lucide-react';

export function NewTaskModal({ isOpen, onClose, onTaskCreated }) {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('General');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const newTask = await invoke('create_task_item', {
        content: content.trim(),
        priority,
        category,
      });
      if (onTaskCreated) onTaskCreated(newTask);
      setContent('');
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#12140e] border border-[#2a301e] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-[#e4e6db]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a917e] hover:text-[#e4e6db] p-1.5 rounded-lg hover:bg-[#1f2416] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold tracking-tight text-[#f3f5ec] mb-1">Create New Task</h2>
        <p className="text-xs text-[#8a917e] mb-5">Add a task manually to your active dashboard queue.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#c8cebe] mb-1.5">Task Description</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What needs to be done?"
              required
              className="w-full bg-[#0b0c08] border border-[#272d1c] focus:border-[#d7e9b0] focus:ring-1 focus:ring-[#d7e9b0] text-sm text-[#e4e6db] rounded-xl p-3 outline-none resize-none transition-all placeholder:text-[#4d5341]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#c8cebe] mb-1.5">
                <Flame className="w-3.5 h-3.5 text-[#d48c48]" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#0b0c08] border border-[#272d1c] text-xs text-[#e4e6db] rounded-xl px-3 py-2.5 outline-none focus:border-[#d7e9b0]"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#c8cebe] mb-1.5">
                <Tag className="w-3.5 h-3.5 text-[#939a82]" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0b0c08] border border-[#272d1c] text-xs text-[#e4e6db] rounded-xl px-3 py-2.5 outline-none focus:border-[#d7e9b0]"
              >
                <option value="General">General</option>
                <option value="Security">Security</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Product">Product</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#a1a896] hover:text-[#e4e6db] bg-transparent rounded-xl transition-colors border border-transparent hover:border-[rgba(168,173,122,0.3)]"
              style={{ background: 'linear-gradient(135deg, rgba(35,37,28,0.5), rgba(10,11,8,0.8))' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-[#0b0c0a] rounded-xl transition-all shadow-[0_0_15px_rgba(215,233,176,0.2)] disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))' }}
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
