import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Inbox,
  ArrowUpWideNarrow,
  Tag,
  Clock,
  Flame,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
  Search,
  X,
} from 'lucide-react';
import { Task } from '../lib/types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  searchQuery: string;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onClearCompleted: () => void;
  onSyncTodoist?: (id: string) => void;
  onOpenManualCapture?: () => void;
}

type FilterStatus = 'all' | 'active' | 'completed';
type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';
type SortOption = 'deadline' | 'created_at' | 'priority';

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  searchQuery,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onClearCompleted,
  onOpenManualCapture,
}) => {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
  const [localSearch, setLocalSearch] = useState('');

  // Custom Dropdown open states
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const priorityRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setIsPriorityOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [tasks]);

  const allCount = tasks.length;
  const activeCount = tasks.filter((t) => !t.is_completed).length;
  const completedCount = tasks.filter((t) => t.is_completed).length;

  const filteredTasks = useMemo(() => {
    const activeSearch = localSearch.trim() || searchQuery.trim();
    return tasks
      .filter((t) => {
        if (statusFilter === 'active' && t.is_completed) return false;
        if (statusFilter === 'completed' && !t.is_completed) return false;
        if (priorityFilter !== 'all' && t.priority.toLowerCase() !== priorityFilter) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

        if (activeSearch) {
          const q = activeSearch.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchCategory = (t.category || '').toLowerCase().includes(q);
          const matchSource = (t.raw_source_text || '').toLowerCase().includes(q);
          if (!matchTitle && !matchCategory && !matchSource) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (sortBy === 'priority') {
          const weights: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (weights[b.priority.toLowerCase()] || 0) - (weights[a.priority.toLowerCase()] || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [tasks, statusFilter, priorityFilter, categoryFilter, searchQuery, sortBy, localSearch]);

  // Labels for dropdown buttons
  const priorityLabels: Record<PriorityFilter, string> = {
    all: 'All priorities',
    urgent: 'Urgent only',
    high: 'High priority',
    medium: 'Medium priority',
    low: 'Low priority',
  };

  const sortLabels: Record<SortOption, string> = {
    deadline: 'Sort: deadline',
    priority: 'Sort: priority',
    created_at: 'Sort: newest',
  };

  return (
    <div>
      {/* Inline Search Bar */}
      <div className="relative mb-4">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
          <Search className="w-4 h-4 text-[#a8ad7a]" strokeWidth={2.2} />
        </div>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search tasks, #categories, keywords..."
          className="w-full bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] hover:border-[rgba(168,173,122,0.3)] focus:border-[rgba(168,173,122,0.5)] focus:outline-none rounded-[10px] pl-10 pr-9 py-[9px] text-[13px] text-[#d5d6cd] placeholder-[#606256] transition-all shadow-sm"
        />
        {localSearch && (
          <button
            onClick={() => setLocalSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93958a] hover:text-[#d5d6cd] transition-colors cursor-pointer z-10"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-[18px]">
        {/* Left: Status Filter Tabs */}
        <div className="flex gap-[6px] bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] rounded-[9px] p-[4px]">
          <span
            onClick={() => setStatusFilter('all')}
            className={`text-[13px] px-[14px] py-[7px] rounded-[6px] cursor-pointer transition-all ${
              statusFilter === 'all'
                ? 'bg-gradient-to-br from-[#545a34] to-[#33361f] text-[#f2f2ec] font-medium'
                : 'text-[#93958a] hover:text-[#d5d6cd]'
            }`}
          >
            All ({allCount})
          </span>
          <span
            onClick={() => setStatusFilter('active')}
            className={`text-[13px] px-[14px] py-[7px] rounded-[6px] cursor-pointer transition-all ${
              statusFilter === 'active'
                ? 'bg-gradient-to-br from-[#545a34] to-[#33361f] text-[#f2f2ec] font-medium'
                : 'text-[#93958a] hover:text-[#d5d6cd]'
            }`}
          >
            Active ({activeCount})
          </span>
          <span
            onClick={() => setStatusFilter('completed')}
            className={`text-[13px] px-[14px] py-[7px] rounded-[6px] cursor-pointer transition-all ${
              statusFilter === 'completed'
                ? 'bg-gradient-to-br from-[#545a34] to-[#33361f] text-[#f2f2ec] font-medium'
                : 'text-[#93958a] hover:text-[#d5d6cd]'
            }`}
          >
            Completed ({completedCount})
          </span>
        </div>

        {/* Right: Custom Rich Dropdowns */}
        <div className="flex items-center gap-[10px] flex-wrap">
          {/* 1. Custom Priority Dropdown */}
          <div className="relative" ref={priorityRef}>
            <button
              onClick={() => {
                setIsPriorityOpen(!isPriorityOpen);
                setIsCategoryOpen(false);
                setIsSortOpen(false);
              }}
              className="font-sans text-[12px] text-[#93958a] hover:text-[#f2f2ec] bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] hover:border-[rgba(168,173,122,0.3)] py-[7px] px-[12px] rounded-[8px] cursor-pointer transition-all flex items-center gap-2 shadow-sm"
            >
              <ArrowUpWideNarrow className="w-3.5 h-3.5 text-[#a8ad7a]" />
              <span>{priorityLabels[priorityFilter]}</span>
              <ChevronDown className={`w-3 h-3 text-[#93958a] transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPriorityOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-[rgba(19,20,16,0.95)] backdrop-blur-[20px] border border-[rgba(168,173,122,0.2)] rounded-[10px] shadow-2xl p-1 z-50 animate-fadeIn space-y-0.5">
                {(['all', 'urgent', 'high', 'medium', 'low'] as PriorityFilter[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPriorityFilter(p);
                      setIsPriorityOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition-all text-left cursor-pointer ${
                      priorityFilter === p
                        ? 'bg-[rgba(168,173,122,0.15)] text-[#f2f2ec]'
                        : 'text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.08)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {p === 'urgent' && <Flame className="w-3 h-3 text-[#d9dcc4]" />}
                      {p === 'high' && <Flame className="w-3 h-3 text-[#a8ad7a]" />}
                      {p === 'medium' && <Layers className="w-3 h-3 text-[#7c8450]" />}
                      {p === 'low' && <div className="w-2 h-2 rounded-full bg-[#545a34]" />}
                      {p === 'all' && <ArrowUpWideNarrow className="w-3 h-3 text-[#a8ad7a]" />}
                      <span className="capitalize">{p === 'all' ? 'All priorities' : p}</span>
                    </div>
                    {priorityFilter === p && <Check className="w-3 h-3 text-[#a8ad7a]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Custom Categories Dropdown */}
          <div className="relative" ref={categoryRef}>
            <button
              onClick={() => {
                setIsCategoryOpen(!isCategoryOpen);
                setIsPriorityOpen(false);
                setIsSortOpen(false);
              }}
              className="font-sans text-[12px] text-[#93958a] hover:text-[#f2f2ec] bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] hover:border-[rgba(168,173,122,0.3)] py-[7px] px-[12px] rounded-[8px] cursor-pointer transition-all flex items-center gap-2 shadow-sm"
            >
              <Tag className="w-3.5 h-3.5 text-[#a8ad7a]" />
              <span>{categoryFilter === 'all' ? 'All categories' : categoryFilter}</span>
              <ChevronDown className={`w-3 h-3 text-[#93958a] transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[rgba(19,20,16,0.95)] backdrop-blur-[20px] border border-[rgba(168,173,122,0.2)] rounded-[10px] shadow-2xl p-1 z-50 animate-fadeIn space-y-0.5">
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setIsCategoryOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition-all text-left cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-[rgba(168,173,122,0.15)] text-[#f2f2ec]'
                      : 'text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.08)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3 text-[#a8ad7a]" />
                    <span>All categories</span>
                  </div>
                  {categoryFilter === 'all' && <Check className="w-3 h-3 text-[#a8ad7a]" />}
                </button>

                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCategoryFilter(c);
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition-all text-left cursor-pointer ${
                      categoryFilter === c
                        ? 'bg-[rgba(168,173,122,0.15)] text-[#f2f2ec]'
                        : 'text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.08)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#a8ad7a]" />
                      <span className="truncate">{c}</span>
                    </div>
                    {categoryFilter === c && <Check className="w-3 h-3 text-[#a8ad7a]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Custom Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => {
                setIsSortOpen(!isSortOpen);
                setIsPriorityOpen(false);
                setIsCategoryOpen(false);
              }}
              className="font-sans text-[12px] text-[#93958a] hover:text-[#f2f2ec] bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] hover:border-[rgba(168,173,122,0.3)] py-[7px] px-[12px] rounded-[8px] cursor-pointer transition-all flex items-center gap-2 shadow-sm"
            >
              {sortBy === 'deadline' && <Clock className="w-3.5 h-3.5 text-[#a8ad7a]" />}
              {sortBy === 'priority' && <ArrowUpWideNarrow className="w-3.5 h-3.5 text-[#a8ad7a]" />}
              {sortBy === 'created_at' && <Calendar className="w-3.5 h-3.5 text-[#a8ad7a]" />}
              <span>{sortLabels[sortBy]}</span>
              <ChevronDown className={`w-3 h-3 text-[#93958a] transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-[rgba(19,20,16,0.95)] backdrop-blur-[20px] border border-[rgba(168,173,122,0.2)] rounded-[10px] shadow-2xl p-1 z-50 animate-fadeIn space-y-0.5">
                {(['deadline', 'priority', 'created_at'] as SortOption[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSortBy(s);
                      setIsSortOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition-all text-left cursor-pointer ${
                      sortBy === s
                        ? 'bg-[rgba(168,173,122,0.15)] text-[#f2f2ec]'
                        : 'text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.08)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {s === 'deadline' && <Clock className="w-3 h-3 text-[#a8ad7a]" />}
                      {s === 'priority' && <ArrowUpWideNarrow className="w-3 h-3 text-[#a8ad7a]" />}
                      {s === 'created_at' && <Calendar className="w-3 h-3 text-[#a8ad7a]" />}
                      <span>{sortLabels[s]}</span>
                    </div>
                    {sortBy === s && <Check className="w-3 h-3 text-[#a8ad7a]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Completed (Red Themed) */}
          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="text-[12px] font-medium text-[#ff7b7b] hover:text-[#ff9999] bg-[rgba(239,68,68,0.12)] hover:bg-[rgba(239,68,68,0.22)] border border-[rgba(239,68,68,0.3)] hover:border-[rgba(239,68,68,0.55)] py-[7px] px-[12px] rounded-[8px] cursor-pointer transition-all flex items-center gap-1.5 shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] active:scale-95"
              title="Delete all completed tasks"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#ff7b7b]" />
              <span>Clear completed ({completedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List Stack */}
      {filteredTasks.length === 0 ? (
        <div className="bg-[rgba(19,20,16,0.72)] backdrop-blur-[16px] border border-[rgba(168,173,122,0.14)] rounded-[12px] p-12 text-center">
          <Inbox className="w-9 h-9 text-[#545a34] mx-auto mb-3" />
          {(localSearch.trim() || searchQuery.trim() || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') ? (
            /* No results for current filter/search */
            <>
              <div className="text-[15px] font-medium text-[#f2f2ec] mb-1">
                No matching tasks
              </div>
              <div className="text-[12px] text-[#93958a] max-w-sm mx-auto mb-4">
                No tasks match your current filters or search. Try clearing the search or changing filters.
              </div>
              <button
                onClick={() => setLocalSearch('')}
                className="text-[12px] font-medium px-4 py-[7px] rounded-[8px] border border-[rgba(168,173,122,0.25)] text-[#a8ad7a] hover:bg-[rgba(168,173,122,0.1)] transition-all cursor-pointer"
              >
                Clear search
              </button>
            </>
          ) : (
            /* Truly empty — no tasks at all */
            <>
              <div className="text-[15px] font-medium text-[#f2f2ec] mb-1">
                No tasks yet
              </div>
              <div className="text-[12px] text-[#93958a] max-w-sm mx-auto mb-4">
                Highlight text in any application and press <span className="text-[#a8ad7a] font-medium">F9</span> or use quick capture.
              </div>
              {onOpenManualCapture && (
                <button
                  onClick={onOpenManualCapture}
                  className="text-[13px] font-semibold px-4 py-[8px] rounded-[8px] text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extract with AI</span>
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};
