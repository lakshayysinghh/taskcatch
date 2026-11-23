import React, { useEffect, useRef } from 'react';
import { Circle, CircleHelp, Clock, Flame, Inbox, Layers, Loader2, Plus, Search, SlidersHorizontal, Sparkles, Sun, Tag, Trash2, X, Zap } from 'lucide-react';
import { LogoMark } from '../components/ui/LogoMark';
import { CATEGORIES } from '../lib/taskMeta';
import { Button } from '../components/ui/Button';
import { Kbd } from '../components/ui/Kbd';
import { StatsBar } from '../components/StatsBar';
import { TaskItem } from '../components/TaskItem';
import { CustomDropdown } from '../components/CustomDropdown';

function greeting(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function summary({ totalCount, activeCount, due48hCount, overdueCount }) {
  if (totalCount === 0) return 'Your workspace is ready. Add your first task to get started.';
  if (activeCount === 0) return "You're all caught up.";
  const parts = [`${activeCount} open ${activeCount === 1 ? 'task' : 'tasks'}`];
  if (due48hCount > 0) parts.push(`${due48hCount} due in the next 48 hours`);
  if (overdueCount > 0) parts.push(`${overdueCount} past due`);
  return parts.join(' · ');
}

/** Shown instead of stats, filters and the list until the first task exists. */
function EmptyWorkspace({ hotkey, canCapture, onOpenQuickAdd, onOpenNewTask, onOpenGuide }) {
  const ways = [
    {
      icon: Zap,
      title: canCapture ? 'Capture from any app' : 'Capture from any app (desktop)',
      text: canCapture
        ? 'Highlight text in Slack, Chrome or Outlook and press the hotkey.'
        : 'Install the Windows app, highlight text anywhere and press the hotkey.',
      keys: [hotkey],
    },
    {
      icon: Sparkles,
      title: 'Quick add',
      text: 'Type a task in plain words — priority and deadline are picked up for you.',
      keys: ['Ctrl', 'K'],
      onClick: onOpenQuickAdd,
    },
    {
      icon: Plus,
      title: 'New task',
      text: 'Fill in the title, priority, category and deadline yourself.',
      onClick: onOpenNewTask,
    },
  ];

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-line bg-surface shadow-card animate-in fade-in duration-500">
      <div className="relative px-6 pb-10 pt-12 text-center sm:px-10">
        <div className="absolute inset-0 bg-grid opacity-[0.05]" aria-hidden="true" />
        <div
          className="absolute left-1/2 top-0 h-48 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(180,187,130,0.18),transparent)] blur-2xl"
          aria-hidden="true"
        />
        <div className="relative">
          <LogoMark size={48} className="mx-auto" />
          <h2 className="mt-5 font-display text-[32px] leading-tight text-ink sm:text-[36px]">Your task list is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-2">
            Everything you capture lands here, sorted by deadline. Start with one of the options below.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button variant="primary" onClick={onOpenQuickAdd}>
              <Sparkles className="h-4 w-4" />
              Add your first task
            </Button>
            <Button variant="ghost" onClick={onOpenGuide}>
              <CircleHelp className="h-4 w-4" />
              Take the tour
            </Button>
          </div>
        </div>
      </div>

      <div className="grid border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-line">
        {ways.map((w) => {
          const Inner = (
            <>
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-olive-300/20 bg-olive-300/10 text-olive-200">
                  <w.icon className="h-4 w-4" strokeWidth={1.9} />
                </span>
                {w.keys && (
                  <span className="flex items-center gap-1">
                    {w.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                )}
              </div>
              <div className="mt-4 text-[14px] font-semibold text-ink">{w.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{w.text}</p>
            </>
          );
          return w.onClick ? (
            <button
              key={w.title}
              type="button"
              onClick={w.onClick}
              className="border-t border-line p-6 text-left transition first:border-t-0 hover:bg-white/[0.02] sm:border-t-0"
            >
              {Inner}
            </button>
          ) : (
            <div key={w.title} className="border-t border-line p-6 first:border-t-0 sm:border-t-0">
              {Inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex h-9 items-center rounded-[10px] border border-line-strong bg-surface p-[3px]" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-full rounded-[7px] px-3 text-[12.5px] font-medium transition ${
            value === o.value ? 'bg-white/[0.08] text-ink shadow-card' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
          <span className={`ml-1.5 tabular-nums ${value === o.value ? 'text-ink-2' : 'text-ink-3'}`}>{o.count}</span>
        </button>
      ))}
    </div>
  );
}

export function DashboardView({
  tasks,
  filteredTasks,
  counts,
  hotkey,
  isCapturing,
  canCapture = true,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  priorityFilter,
  setPriorityFilter,
  categoryFilter,
  setCategoryFilter,
  sortOrder,
  setSortOrder,
  onToggle,
  onDelete,
  onEdit,
  onClearCompleted,
  onQuickCapture,
  onOpenStandup,
  onOpenQuickAdd,
  onOpenNewTask,
  onOpenGuide,
}) {
  const searchRef = useRef(null);
  const now = new Date();
  const hasFilters = Boolean(searchQuery) || priorityFilter !== 'all' || categoryFilter !== 'all';

  // "/" focuses search, like most productivity apps.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setCategoryFilter('all');
  };

  return (
    <main className="relative z-10 mx-auto max-w-[1120px] px-5 pb-24 pt-10 sm:px-8 sm:pt-12">
      {/* Heading + actions */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
          <p className="text-[12.5px] font-medium text-ink-3">
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="mt-1 font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[46px]">
            {greeting(now)}<span className="italic text-olive-300">.</span>
          </h1>
          <p className="mt-2 text-[14px] text-ink-2">{summary(counts)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onOpenStandup}>
            <Sun className="h-4 w-4 text-olive-300" />
            Standup
            {counts.overdueCount > 0 && (
              <span className="ml-0.5 rounded-full bg-danger/15 px-1.5 text-[11px] font-semibold tabular-nums text-danger">{counts.overdueCount}</span>
            )}
          </Button>
          {canCapture && (
            <Button onClick={onQuickCapture} disabled={isCapturing} title="Captures the text you highlighted in the app you were using before TaskCatch">
              {isCapturing ? <Loader2 className="h-4 w-4 animate-spin text-olive-300" /> : <Zap className="h-4 w-4 text-olive-300" />}
              Quick capture
            </Button>
          )}
          <Button onClick={onOpenQuickAdd} title="Quick add (Ctrl+K)">
            <Sparkles className="h-4 w-4 text-olive-300" />
            Quick add
            <Kbd className="ml-0.5 hidden sm:inline-flex">Ctrl K</Kbd>
          </Button>
          <Button variant="primary" onClick={onOpenNewTask}>
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            New task
          </Button>
        </div>
      </section>

      <div className="mt-5 flex items-start gap-2.5 text-[12.5px] leading-6 text-ink-3">
        {canCapture ? (
          <span className="relative mt-2 flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/50 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
        ) : (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-olive-400" />
        )}
        <p>
          {canCapture ? (
            <>
              Highlight text in any app and press <Kbd>{hotkey}</Kbd> to capture it.
            </>
          ) : (
            <>
              Tasks you add here are saved only in this browser. With the desktop app, press <Kbd>{hotkey}</Kbd> on highlighted text in any app.
            </>
          )}
        </p>
      </div>

      {tasks.length === 0 ? (
        <EmptyWorkspace
          hotkey={hotkey}
          canCapture={canCapture}
          onOpenQuickAdd={onOpenQuickAdd}
          onOpenNewTask={onOpenNewTask}
          onOpenGuide={onOpenGuide}
        />
      ) : (
      <>
      <div className="mt-8">
        <StatsBar
          activeCount={counts.activeCount}
          totalCount={counts.totalCount}
          due48hCount={counts.due48hCount}
          overdueCount={counts.overdueCount}
          completedCount={counts.completedCount}
        />
      </div>

      {/* Toolbar */}
      <section className="mt-8 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, categories, source text…"
            aria-label="Search tasks"
            className="h-11 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-16 text-[14px] text-ink shadow-card outline-none transition placeholder:text-ink-3 focus:border-olive-300/40 focus:ring-4 focus:ring-olive-300/10"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition hover:bg-white/[0.06] hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Kbd className="absolute right-3.5 top-1/2 -translate-y-1/2">/</Kbd>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <Segmented
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'all', label: 'All', count: counts.totalCount },
              { value: 'active', label: 'Active', count: counts.activeCount },
              { value: 'completed', label: 'Completed', count: counts.completedCount },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <CustomDropdown
              value={priorityFilter}
              onChange={setPriorityFilter}
              icon={SlidersHorizontal}
              options={[
                { value: 'all', label: 'All priorities', icon: SlidersHorizontal },
                { value: 'Urgent', label: 'Urgent', icon: Flame },
                { value: 'High', label: 'High', icon: Flame },
                { value: 'Medium', label: 'Medium', icon: Layers },
                { value: 'Low', label: 'Low', icon: Circle },
              ]}
            />
            <CustomDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              icon={Tag}
              options={[{ value: 'all', label: 'All categories', icon: Tag }, ...CATEGORIES.map((c) => ({ value: c, label: c, icon: Tag }))]}
            />
            <CustomDropdown
              value={sortOrder}
              onChange={setSortOrder}
              icon={Clock}
              options={[
                { value: 'deadline', label: 'Sort: Deadline', icon: Clock },
                { value: 'newest', label: 'Sort: Newest', icon: Clock },
                { value: 'oldest', label: 'Sort: Oldest', icon: Clock },
              ]}
            />
            {counts.completedCount > 0 && (
              <Button variant="ghost" size="md" onClick={onClearCompleted} className="hover:!text-danger">
                <Trash2 className="h-3.5 w-3.5" />
                Clear completed
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Task list */}
      <section className="mt-4">
        {filteredTasks.length > 0 ? (
          <div className="divide-y divide-line overflow-visible rounded-2xl border border-line bg-surface shadow-card">
            {filteredTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line-strong bg-surface-2 text-ink-3">
              <Inbox className="h-5 w-5" strokeWidth={1.8} />
            </span>
            {hasFilters || tasks.length > 0 ? (
              <>
                <h3 className="mt-5 text-[15px] font-semibold text-ink">No matching tasks</h3>
                <p className="mt-1 text-[13.5px] text-ink-2">Try a different search or filter.</p>
                {hasFilters && (
                  <Button variant="secondary" size="sm" onClick={clearFilters} className="mt-5">
                    Clear filters
                  </Button>
                )}
              </>
            ) : null}
          </div>
        )}
      </section>
      </>
      )}
    </main>
  );
}
