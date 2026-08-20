import React, { useState, useEffect, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Search, ChevronDown, Trash2, Inbox, Sparkles, X, Clock, CheckCircle, Circle, Flame, Layers, SortAsc, Tag } from 'lucide-react';

import { AmbientBackground } from './components/AmbientBackground';
import { Header } from './components/Header';
import { DashboardActionDeck } from './components/DashboardActionDeck';
import { StatsBar } from './components/StatsBar';
import { TaskItem } from './components/TaskItem';
import { FloatingHUD } from './components/FloatingHUD';
import { OverviewView } from './views/OverviewView';

// Modals
import { SettingsModal } from './components/SettingsModal';
import { MorningStandupModal } from './components/MorningStandupModal';
import { ManualCaptureModal } from './components/ManualCaptureModal';
import { DownloadModal } from './components/DownloadModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CustomDropdown } from './components/CustomDropdown';

export function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'overview'
  const [tasks, setTasks] = useState([]);
  const [config, setConfig] = useState({ groq_api_key: '', global_hotkey: 'F9' });
  const [isCapturing, setIsCapturing] = useState(false);
  const [hudTask, setHudTask] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('deadline');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isExtractOpen, setIsExtractOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const SAMPLE_TASKS = [
    {
      id: 'sample-1',
      content: 'Deploy hotfix for authentication token expiry',
      original_text: 'Slack #dev-ops: We need to deploy the hotfix for the token expiry ASAP before 5 PM release.',
      priority: 'Urgent',
      category: 'Development',
      timestamp: new Date().toISOString(),
      completed: false,
    },
    {
      id: 'sample-2',
      content: 'Review Q3 financial projections spreadsheet',
      original_text: 'Email from CFO: Please review the attached Q3 financial model by tomorrow afternoon.',
      priority: 'High',
      category: 'Finance',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      completed: false,
    },
    {
      id: 'sample-3',
      content: 'Store the provided key in a secure vault',
      original_text: 'API credentials generated: Ensure all tokens are stored in AWS Secrets Manager.',
      priority: 'High',
      category: 'Security',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      completed: false,
    },
    {
      id: 'sample-4',
      content: 'Order replacement ergonomic mouse',
      original_text: 'Logitech MX Master 3S order request for workstation setup.',
      priority: 'Low',
      category: 'Personal',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      completed: false,
    },
  ];

  // Load initial tasks & config
  useEffect(() => {
    invoke('get_tasks')
      .then((data) => {
        if (data && data.length > 0) {
          setTasks(data);
        } else {
          setTasks(SAMPLE_TASKS);
        }
      })
      .catch((err) => {
        console.warn('Running in browser or failed to fetch tasks from Tauri, using fallback sample data:', err);
        setTasks(SAMPLE_TASKS);
      });

    invoke('get_config')
      .then((cfg) => {
        if (cfg) setConfig(cfg);
      })
      .catch((err) => console.warn('Using default config in browser mode:', err));
  }, []);

  const playCaptureChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.12); // A6 bell harmonic

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch {
      // Audio playback unavailable or muted
    }
  };

  // Listen for live background captures
  useEffect(() => {
    const handleNewTask = async (event) => {
      const newTask = event.payload;
      setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
      setHudTask(newTask);
      setIsCapturing(false);
      playCaptureChime();

      if (!document.hasFocus()) {
        try {
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
          }
          if (permissionGranted) {
            sendNotification({ title: 'CAPTURED', body: newTask.content });
          }
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
    };

    const unlistenCaptured = listen('new-task-captured', handleNewTask);
    const unlistenCreated = listen('task-created', handleNewTask);

    const unlistenStatus = listen('status-update', (event) => {
      const payload = event.payload;
      if (payload.state === 'processing') setIsCapturing(true);
      if (payload.state === 'done' || payload.state === 'idle') setIsCapturing(false);
    });

    // Global keyboard listener inside dashboard (Ctrl+K, Ctrl+,)
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsExtractOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlistenCaptured.then((u) => u());
      unlistenCreated.then((u) => u());
      unlistenStatus.then((u) => u());
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Task Actions
  const handleToggleTask = async (taskId) => {
    try {
      await invoke('toggle_task_item', { taskId });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
      );
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await invoke('delete_task_item', { taskId });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleClearCompleted = async () => {
    const completedIds = tasks.filter((t) => t.completed).map((t) => t.id);
    for (const id of completedIds) {
      await invoke('delete_task_item', { taskId: id }).catch(console.error);
    }
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const handleQuickCapture = async () => {
    setIsCapturing(true);
    try {
      await invoke('trigger_capture');
    } catch (err) {
      console.error('Trigger capture error:', err);
      setIsCapturing(false);
    }
  };

  const handleSaveEditedTask = async (taskData) => {
    if (taskData.id) {
      // Update existing
      setTasks((prev) =>
        prev.map((t) => (t.id === taskData.id ? { ...t, ...taskData } : t))
      );
    } else {
      // Create new
      try {
        const created = await invoke('create_task_item', {
          content: taskData.content,
          priority: taskData.priority,
          category: taskData.category,
          deadline: taskData.deadline,
        });
        setTasks((prev) => [created, ...prev]);
      } catch (err) {
        console.error('Failed to create task:', err);
      }
    }
  };

  const handlePushOverdue = () => {
    setTasks((prev) =>
      prev.map((t) =>
        t.priority === 'Urgent' || t.priority === 'High'
          ? { ...t, timestamp: new Date(Date.now() + 86400000).toISOString() }
          : t
      )
    );
    setIsStandupOpen(false);
  };

  // Metrics Calculations
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;
  const highPriorityCount = tasks.filter((t) => !t.completed && (t.priority === 'High' || t.priority === 'Urgent')).length;
  const due48hCount = tasks.filter((t) => !t.completed).length; // Simulated upcoming count

  // Filtered & Sorted Task List
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // Tab filter
        if (activeTab === 'active' && task.completed) return false;
        if (activeTab === 'completed' && !task.completed) return false;

        // Priority filter
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

        // Category filter
        if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchContent = task.content?.toLowerCase().includes(q);
          const matchCategory = task.category?.toLowerCase().includes(q);
          const matchOriginal = task.original_text?.toLowerCase().includes(q);
          if (!matchContent && !matchCategory && !matchOriginal) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.timestamp) - new Date(a.timestamp);
        if (sortOrder === 'oldest') return new Date(a.timestamp) - new Date(b.timestamp);
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
  }, [tasks, activeTab, priorityFilter, categoryFilter, searchQuery, sortOrder]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans antialiased relative selection:bg-[var(--olive-900)] selection:text-[var(--olive-100)] pt-16 pb-16">
      {/* Parallax & Drifting Olive Background */}
      <AmbientBackground />

      {/* Floating Action HUD upon capture */}
      {hudTask && (
        <FloatingHUD
          task={hudTask}
          onUndo={(id) => {
            handleDeleteTask(id);
            setHudTask(null);
          }}
          onEdit={(t) => {
            setEditingTask(t);
            setHudTask(null);
          }}
          onClose={() => setHudTask(null)}
        />
      )}

      {/* Sticky Global Header */}
      <Header
        currentView={currentView}
        onToggleView={() => setCurrentView((prev) => (prev === 'dashboard' ? 'overview' : 'dashboard'))}
        onOpenDownload={() => setIsDownloadOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      {currentView === 'overview' ? (
        <OverviewView
          onOpenDashboard={() => setCurrentView('dashboard')}
          onOpenDownload={() => setIsDownloadOpen(true)}
        />
      ) : (
        <main className="max-w-[1100px] mx-auto px-6 pt-2 space-y-6 relative z-10 animate-in fade-in duration-200">
          {/* Centered Action Deck & Motivational Quote */}
          <DashboardActionDeck
            overdueCount={highPriorityCount}
            isCapturing={isCapturing}
            onQuickCapture={handleQuickCapture}
            onOpenStandup={() => setIsStandupOpen(true)}
            onOpenExtract={() => setIsExtractOpen(true)}
            onOpenNewTask={() => setIsNewTaskOpen(true)}
            hotkey={config.global_hotkey || 'F9'}
          />

          {/* 4-Card Metrics Grid */}
          <StatsBar
            activeCount={activeCount}
            totalCount={totalCount}
            highPriorityCount={highPriorityCount}
            due48hCount={due48hCount}
            completedCount={completedCount}
          />

          {/* Search, Filters & Task List Area */}
          <div className="space-y-4">
            {/* Inline Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--accent-olive)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, #categories, keywords..."
                className="w-full bg-[var(--surface-glass)] backdrop-blur-md border border-[var(--border-subtle)] focus:border-[var(--border-focus)] text-xs sm:text-sm text-[#f2f2ec] rounded-xl pl-10 pr-9 py-2.5 outline-none transition-all placeholder:text-[var(--text-placeholder)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[#f2f2ec] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Status Segmented Control Pills */}
              <div className="flex gap-1 bg-[var(--surface-glass)] backdrop-blur-md border border-[var(--border-subtle)] rounded-full p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`text-[13px] px-3.5 py-1.5 rounded-full transition-all ${
                    activeTab === 'all'
                      ? 'font-medium text-[#f2f2ec] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[#f2f2ec]'
                  }`}
                  style={
                    activeTab === 'all'
                      ? { background: 'linear-gradient(135deg, var(--olive-700), var(--olive-900))' }
                      : {}
                  }
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`text-[13px] px-3.5 py-1.5 rounded-full transition-all ${
                    activeTab === 'active'
                      ? 'font-medium text-[#f2f2ec] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[#f2f2ec]'
                  }`}
                  style={
                    activeTab === 'active'
                      ? { background: 'linear-gradient(135deg, var(--olive-700), var(--olive-900))' }
                      : {}
                  }
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`text-[13px] px-3.5 py-1.5 rounded-full transition-all ${
                    activeTab === 'completed'
                      ? 'font-medium text-[#f2f2ec] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[#f2f2ec]'
                  }`}
                  style={
                    activeTab === 'completed'
                      ? { background: 'linear-gradient(135deg, var(--olive-700), var(--olive-900))' }
                      : {}
                  }
                >
                  Completed ({completedCount})
                </button>
              </div>

              {/* Right Dropdowns & Bulk Clear Action */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Priority Dropdown */}
                <CustomDropdown
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  icon={SortAsc}
                  options={[
                    { value: 'all', label: 'All priorities', icon: SortAsc },
                    { value: 'Urgent', label: 'Urgent', icon: Flame },
                    { value: 'High', label: 'High', icon: Flame },
                    { value: 'Medium', label: 'Medium', icon: Layers },
                    { value: 'Low', label: 'Low', icon: Circle },
                  ]}
                />

                {/* Category Dropdown */}
                <CustomDropdown
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  icon={Tag}
                  options={[
                    { value: 'all', label: 'All categories', icon: Tag },
                    { value: 'General', label: 'General', icon: Tag },
                    { value: 'Work', label: 'Work', icon: Tag },
                    { value: 'Personal', label: 'Personal', icon: Tag },
                  ]}
                />

                {/* Sort Dropdown */}
                <CustomDropdown
                  value={sortOrder}
                  onChange={setSortOrder}
                  icon={Clock}
                  options={[
                    { value: 'newest', label: 'Sort: Newest', icon: Clock },
                    { value: 'oldest', label: 'Sort: Oldest', icon: Clock },
                    { value: 'deadline', label: 'Sort: Deadline', icon: Clock },
                  ]}
                />

                {/* Clear Completed Action Button */}
                {completedCount > 0 && (
                  <button
                    onClick={handleClearCompleted}
                    className="px-2.5 py-1.5 text-xs rounded-full bg-[rgba(239,68,68,0.12)] hover:bg-[rgba(239,68,68,0.22)] border border-[rgba(239,68,68,0.25)] text-[#ff7b7b] transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear completed ({completedCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Task Row Items Stack */}
            <div className="space-y-2 pt-1">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 px-4 bg-[var(--surface-glass)] backdrop-blur-md rounded-xl border border-[var(--border-subtle)] space-y-3">
                  <Inbox className="w-8 h-8 text-[var(--olive-300)] mx-auto opacity-70" />
                  {searchQuery || priorityFilter !== 'all' || categoryFilter !== 'all' ? (
                    <div>
                      <p className="text-sm font-medium text-[#f2f2ec]">No matching tasks</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setPriorityFilter('all');
                          setCategoryFilter('all');
                        }}
                        className="text-xs text-[var(--olive-300)] hover:underline mt-1"
                      >
                        Clear active filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      <p className="text-sm font-medium text-[#f2f2ec]">No tasks in queue</p>
                      <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                        Highlight text anywhere in your browser, Slack, or email and press your global hotkey (currently{' '}
                        <kbd className="font-mono bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] border border-[rgba(168,173,122,0.2)] px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {config.global_hotkey || 'F9'}
                        </kbd>
                        ) to instantly capture it as a task.
                      </p>
                      <button
                        onClick={() => setIsExtractOpen(true)}
                        className="px-5 py-2.5 text-[13px] font-bold rounded-[10px] text-[#0b0c0a] shadow-[0_0_15px_rgba(168,173,122,0.15)] hover:opacity-95 transition-all inline-flex items-center gap-1.5 mt-2"
                        style={{ background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))' }}
                      >
                        <Sparkles className="w-4 h-4" /> Extract with AI
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    onEdit={(t) => setEditingTask(t)}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      )}

      {/* Modals & Dialogs Stack */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={(updated) => setConfig(updated)}
      />

      <MorningStandupModal
        isOpen={isStandupOpen}
        onClose={() => setIsStandupOpen(false)}
        tasks={tasks}
        onToggleTask={handleToggleTask}
        onPushOverdue={handlePushOverdue}
        onClearCompleted={handleClearCompleted}
        onRefreshTasks={() => {
          invoke('get_tasks').then(setTasks).catch(console.error);
        }}
      />

      <ManualCaptureModal
        isOpen={isExtractOpen}
        onClose={() => setIsExtractOpen(false)}
        onSaveTask={(data) => handleSaveEditedTask(data)}
      />

      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />

      <TaskDetailModal
        isOpen={isNewTaskOpen || !!editingTask}
        task={editingTask}
        onClose={() => {
          setIsNewTaskOpen(false);
          setEditingTask(null);
        }}
        onSave={(data) => handleSaveEditedTask(data)}
      />
    </div>
  );
}
