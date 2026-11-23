import React, { useEffect, useMemo, useState } from 'react';
import { isTauri, safeInvoke as invoke, safeListen as listen, safeSendNotification } from './lib/tauri';
import { DUE_SOON_MS, compareByDeadline, isDueWithin, isOverdue } from './lib/taskMeta';
import { isOnboardingDone, isSoundEnabled, setOnboardingDone } from './lib/prefs';
import { OnboardingGuide } from './components/OnboardingGuide';

import { AmbientBackground } from './components/AmbientBackground';
import { Header } from './components/Header';
import { FloatingHUD } from './components/FloatingHUD';
import { ErrorToast } from './components/ErrorToast';
import { OverviewView } from './views/OverviewView';
import { DashboardView } from './views/DashboardView';

// Dialogs
import { SettingsModal } from './components/SettingsModal';
import { MorningStandupModal } from './components/MorningStandupModal';
import { ManualCaptureModal } from './components/ManualCaptureModal';
import { DownloadModal } from './components/DownloadModal';
import { TaskDetailModal } from './components/TaskDetailModal';

const DASHBOARD_HASH = '#dashboard';

/**
 * The desktop app opens on the dashboard. The website opens on the product
 * overview, unless the URL asks for the dashboard (#dashboard).
 */
function initialView() {
  if (isTauri) return 'dashboard';
  return window.location.hash === DASHBOARD_HASH ? 'dashboard' : 'overview';
}

export function App() {
  const [currentView, setCurrentView] = useState(initialView); // 'dashboard' | 'overview'
  const [tasks, setTasks] = useState([]);
  const [config, setConfig] = useState({ groq_api_key: '', global_hotkey: 'F9' });
  const [isCapturing, setIsCapturing] = useState(false);
  const [hudTask, setHudTask] = useState(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('deadline');

  // Dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isExtractOpen, setIsExtractOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  // First-run guide: opens on the first visit to the dashboard, never again
  // once finished or skipped. The help button reopens it.
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  useEffect(() => {
    if (currentView === 'dashboard' && !isOnboardingDone()) setIsGuideOpen(true);
  }, [currentView]);
  const closeGuide = () => {
    setOnboardingDone();
    setIsGuideOpen(false);
  };

  // User-visible error notice. Backend failures surface here instead of
  // being swallowed, so the UI never shows a change that was not saved.
  const [errorMessage, setErrorMessage] = useState(null);
  const reportError = (action, err) => {
    console.error(`${action}:`, err);
    const detail = typeof err === 'string' ? err : err?.message || String(err);
    setErrorMessage(`${action}: ${detail}`);
  };

  // Website navigation: #dashboard is bookmarkable and Back returns to the overview.
  const navigate = (view) => {
    setCurrentView(view);
    if (!isTauri) {
      const wantHash = view === 'dashboard' ? DASHBOARD_HASH : '';
      if (window.location.hash !== wantHash) {
        window.history.pushState(null, '', wantHash || `${window.location.pathname}${window.location.search}`);
      }
    }
    document.documentElement.scrollTop = 0;
  };

  useEffect(() => {
    if (isTauri) return undefined;
    const onPop = () => setCurrentView(window.location.hash === DASHBOARD_HASH ? 'dashboard' : 'overview');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Load initial tasks & config
  useEffect(() => {
    invoke('get_tasks')
      .then((data) => {
        if (data && data.length > 0) setTasks(data);
      })
      .catch((err) => reportError('Could not load your tasks', err));

    invoke('get_config')
      .then((cfg) => {
        if (cfg) setConfig(cfg);
      })
      .catch((err) => reportError('Could not load settings', err));
  }, []);

  const playCaptureChime = () => {
    if (!isSoundEnabled()) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.12);
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

  // Live background captures and keyboard shortcuts
  useEffect(() => {
    const handleNewTask = (event) => {
      const newTask = event.payload;
      setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
      setHudTask(newTask);
      setIsCapturing(false);
      playCaptureChime();
      if (!document.hasFocus()) {
        safeSendNotification({ title: 'Captured', body: newTask.content });
      }
    };

    let cleanup = () => {};
    Promise.all([
      listen('new-task-captured', handleNewTask),
      listen('status-update', (event) => {
        const payload = event.payload;
        if (payload?.state === 'processing') setIsCapturing(true);
        if (payload?.state === 'done' || payload?.state === 'idle') setIsCapturing(false);
        if (payload?.state === 'error') {
          setIsCapturing(false);
          const message = payload.message || 'Unknown error';
          reportError('Capture failed', message);
          // Usually the window is hidden in the tray during a hotkey capture.
          if (!document.hasFocus()) {
            safeSendNotification({ title: 'Capture failed', body: message });
          }
        }
      }),
    ]).then((unlisteners) => {
      cleanup = () => unlisteners.forEach((u) => typeof u === 'function' && u());
    });

    // Ctrl+K quick add, Ctrl+, settings
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
      cleanup();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Task actions
  const handleToggleTask = async (taskId) => {
    try {
      // Use the state the backend saved rather than flipping locally.
      const completed = await invoke('toggle_task_item', { taskId });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: Boolean(completed) } : t)));
    } catch (err) {
      reportError('Could not update task', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await invoke('delete_task_item', { taskId });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      reportError('Could not delete task', err);
    }
  };

  const handleClearCompleted = async () => {
    const completedIds = tasks.filter((t) => t.completed).map((t) => t.id);
    const removed = new Set();
    let lastError = null;
    for (const id of completedIds) {
      try {
        await invoke('delete_task_item', { taskId: id });
        removed.add(id);
      } catch (err) {
        lastError = err;
      }
    }
    // Only drop tasks the backend actually deleted.
    setTasks((prev) => prev.filter((t) => !removed.has(t.id)));
    if (lastError) {
      reportError(`Could not clear ${completedIds.length - removed.size} completed task(s)`, lastError);
    }
  };

  const handleQuickCapture = async () => {
    setIsCapturing(true);
    try {
      await invoke('trigger_capture');
    } catch (err) {
      reportError('Could not start capture', err);
      setIsCapturing(false);
    }
  };

  /** Creates or updates a task in the backend. Returns true only once it is saved. */
  const handleSaveEditedTask = async (taskData) => {
    try {
      if (taskData.id) {
        const updated = await invoke('update_task_item', {
          taskId: taskData.id,
          patch: {
            content: taskData.content,
            priority: taskData.priority,
            category: taskData.category,
            deadline: taskData.deadline ?? null,
            original_text: taskData.original_text ?? null,
          },
        });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await invoke('create_task_item', {
          content: taskData.content,
          priority: taskData.priority,
          category: taskData.category,
          deadline: taskData.deadline ?? null,
          originalText: taskData.original_text ?? null,
        });
        setTasks((prev) => [created, ...prev]);
      }
      return true;
    } catch (err) {
      reportError(taskData.id ? 'Could not save changes' : 'Could not save new task', err);
      return false;
    }
  };

  // Metrics (deadline-based; `timestamp` is only the capture time)
  const now = new Date();
  const completedCount = tasks.filter((t) => t.completed).length;
  const counts = {
    totalCount: tasks.length,
    completedCount,
    activeCount: tasks.length - completedCount,
    overdueCount: tasks.filter((t) => isOverdue(t, now)).length,
    due48hCount: tasks.filter((t) => isDueWithin(t, DUE_SOON_MS, now)).length,
  };

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (activeTab === 'active' && task.completed) return false;
          if (activeTab === 'completed' && !task.completed) return false;
          if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
          if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const hit =
              task.content?.toLowerCase().includes(q) ||
              task.category?.toLowerCase().includes(q) ||
              task.original_text?.toLowerCase().includes(q);
            if (!hit) return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (sortOrder === 'newest') return new Date(b.timestamp) - new Date(a.timestamp);
          if (sortOrder === 'oldest') return new Date(a.timestamp) - new Date(b.timestamp);
          return compareByDeadline(a, b);
        }),
    [tasks, activeTab, priorityFilter, categoryFilter, searchQuery, sortOrder]
  );

  const hotkey = config.global_hotkey || 'F9';

  return (
    <div className="relative min-h-screen bg-canvas text-ink">
      <AmbientBackground />

      <Header
        currentView={currentView}
        onNavigate={navigate}
        onOpenDownload={() => setIsDownloadOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      <ErrorToast message={errorMessage} onDismiss={() => setErrorMessage(null)} />

      {currentView === 'overview' ? (
        <OverviewView onOpenDashboard={() => navigate('dashboard')} onOpenDownload={() => setIsDownloadOpen(true)} />
      ) : (
        <DashboardView
          tasks={tasks}
          filteredTasks={filteredTasks}
          counts={counts}
          hotkey={hotkey}
          isCapturing={isCapturing}
          canCapture={isTauri}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          onToggle={handleToggleTask}
          onDelete={handleDeleteTask}
          onEdit={(t) => setEditingTask(t)}
          onClearCompleted={handleClearCompleted}
          onQuickCapture={handleQuickCapture}
          onOpenStandup={() => setIsStandupOpen(true)}
          onOpenQuickAdd={() => setIsExtractOpen(true)}
          onOpenNewTask={() => setIsNewTaskOpen(true)}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      )}

      <OnboardingGuide
        isOpen={isGuideOpen}
        onClose={closeGuide}
        hotkey={hotkey}
        isDesktop={isTauri}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDownload={() => setIsDownloadOpen(true)}
      />

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

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onConfigSaved={(updated) => setConfig(updated)} />

      <MorningStandupModal
        isOpen={isStandupOpen}
        onClose={() => setIsStandupOpen(false)}
        tasks={tasks}
        onClearCompleted={handleClearCompleted}
        onRefreshTasks={() => {
          invoke('get_tasks')
            .then(setTasks)
            .catch((err) => reportError('Could not refresh tasks', err));
        }}
      />

      <ManualCaptureModal isOpen={isExtractOpen} onClose={() => setIsExtractOpen(false)} onSaveTask={handleSaveEditedTask} />

      <DownloadModal isOpen={isDownloadOpen} onClose={() => setIsDownloadOpen(false)} />

      <TaskDetailModal
        isOpen={isNewTaskOpen || !!editingTask}
        task={editingTask}
        onClose={() => {
          setIsNewTaskOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveEditedTask}
      />
    </div>
  );
}
