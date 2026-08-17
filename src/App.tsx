import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { DashboardActionDeck } from './components/DashboardActionDeck';
import { StatsBar } from './components/StatsBar';
import { TaskList } from './components/TaskList';
import { SettingsModal } from './components/SettingsModal';
import { ManualCaptureModal } from './components/ManualCaptureModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { MorningStandupModal } from './components/MorningStandupModal';
import { DownloadModal } from './components/DownloadModal';
import { LandingPage } from './components/LandingPage';
import { PermissionsBanner } from './components/PermissionsBanner';
import { ToastContainer } from './components/Toast';
import { FloatingHUD } from './components/FloatingHUD';
import {
  Task,
  AppSettings,
  SystemPermissionsStatus,
  UpdateTaskInput,
  ToastMessage,
} from './lib/types';
import { api, isTauri } from './lib/tauri';
import { playChimeSound } from './lib/utils';

import { AmbientBackground } from './components/AmbientBackground';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<'app' | 'landing'>('app');
  const [settings, setSettings] = useState<AppSettings>({
    groq_api_key: '',
    groq_model: 'llama-3.3-70b-versatile',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    todoist_api_key: '',
    todoist_sync_enabled: false,
    global_shortcut: 'Ctrl+Shift+T',
    custom_instructions: '',
    theme: 'dark',
  });
  const [permissions, setPermissions] = useState<SystemPermissionsStatus | null>(null);

  const [searchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualCaptureOpen, setIsManualCaptureOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [hudTask, setHudTask] = useState<Task | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, title, message, type };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshTasks = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  // Compute standup badge count (overdue + due in next 24h)
  const standupBadgeCount = useMemo(() => {
    const nowTime = new Date().getTime();
    const next24h = nowTime + 24 * 3600 * 1000;
    return tasks.filter((t) => {
      if (t.is_completed || !t.deadline) return false;
      const d = new Date(t.deadline).getTime();
      return !isNaN(d) && d <= next24h;
    }).length;
  }, [tasks]);

  useEffect(() => {
    refreshTasks();
    refreshSettings();
    api.getPermissionsStatus().then(setPermissions).catch(console.error);

    if (isTauri()) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<Task>('task-created', (event) => {
          setTasks((prev) => {
            const updated = [event.payload, ...prev.filter((t) => t.id !== event.payload.id)];
            try {
              localStorage.setItem('taskcatch_mock_tasks', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          setHudTask(event.payload);
        });
        listen('open-settings', () => {
          setIsSettingsOpen(true);
        });
      });
    }

    // Connect to embedded SSE Stream (/api/events)
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/events');
      sse.addEventListener('task-created', (e) => {
        try {
          const newTask: Task = JSON.parse(e.data);
          setTasks((prev) => {
            const updated = [newTask, ...prev.filter((t) => t.id !== newTask.id)];
            try {
              localStorage.setItem('taskcatch_mock_tasks', JSON.stringify(updated));
            } catch (err) {
              console.error('Failed to sync to localStorage:', err);
            }
            return updated;
          });
          setHudTask(newTask);
          if (settings.sound_feedback_enabled ?? true) {
            playChimeSound(true);
          }
        } catch (err) {
          console.error('Failed to parse SSE task payload:', err);
        }
      });
    } catch {
      // SSE not active
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsManualCaptureOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && hudTask) {
        // Quick undo hotkey
        e.preventDefault();
        handleHudUndo(hudTask.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sse) sse.close();
    };
  }, [refreshTasks, refreshSettings, hudTask, settings.sound_feedback_enabled]);

  const handleToggleTask = async (id: string) => {
    try {
      const updated = await api.toggleTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to toggle task', 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete task', 'error');
    }
  };

  const handleHudUndo = async (taskId: string) => {
    try {
      await handleDeleteTask(taskId);
      setHudTask(null);
      showToast('Capture Undone', 'Task removed.', 'info');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to undo', 'error');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleSaveTaskEdit = async (input: UpdateTaskInput) => {
    try {
      const updated = await api.updateTask(input);
      setTasks((prev) => prev.map((t) => (t.id === input.id ? updated : t)));
      showToast('Task Updated', `"${updated.title}" saved.`, 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save changes', 'error');
    }
  };

  const handleClearCompleted = async () => {
    try {
      await api.clearCompleted();
      setTasks((prev) => prev.filter((t) => !t.is_completed));
      showToast('Cleared', 'Completed items removed.', 'info');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to clear tasks', 'error');
    }
  };

  const handleQuickCapture = async () => {
    setIsCapturing(true);
    try {
      let clipboardText = '';
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        try {
          clipboardText = await navigator.clipboard.readText();
        } catch {}
      }

      if (clipboardText && clipboardText.trim()) {
        const res = await api.extractFromText(clipboardText.trim());
        if (res.success && res.task) {
          const newTask = res.task;
          setTasks((prev) => {
            const updated = [newTask, ...prev.filter((t) => t.id !== newTask.id)];
            try {
              localStorage.setItem('taskcatch_mock_tasks', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          setHudTask(newTask);
          return;
        }
      }

      const res = await api.triggerQuickCapture();
      if (res.success && res.task) {
        setTasks((prev) => [res.task!, ...prev]);
        setHudTask(res.task);
      } else {
        setIsManualCaptureOpen(true);
      }
    } catch {
      setIsManualCaptureOpen(true);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      const saved = await api.saveSettings(newSettings);
      setSettings(saved);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save settings', 'error');
    }
  };

  const handleSyncTodoist = async (taskId: string) => {
    try {
      showToast('Syncing', 'Sending task to Todoist...', 'info');
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('sync_task_to_todoist', { id: taskId });
      showToast('Todoist Synced', 'Task added to Todoist inbox.', 'success');
    } catch (err: any) {
      showToast('Todoist Error', err.message || 'Make sure Todoist API key is set.', 'error');
    }
  };

  const handleOpenNewTask = () => {
    const tempTask: Task = {
      id: '',
      title: '',
      raw_source_text: '',
      deadline: null,
      priority: 'medium',
      category: 'General',
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    setEditingTask(tempTask);
  };

  return (
    <div className="relative min-h-screen bg-[#0a0b08] text-[#e4e4de] font-sans antialiased selection:bg-[#33361f] selection:text-[#d9dcc4] overflow-x-hidden">
      {/* Floating Transient Action HUD / Mini-Pill */}
      <FloatingHUD
        task={hudTask}
        onUndo={handleHudUndo}
        onEdit={(t) => {
          setHudTask(null);
          setEditingTask(t);
        }}
        onDismiss={() => setHudTask(null)}
      />

      {currentView === 'landing' ? (
        /* Editorial Product Landing Page */
        <LandingPage
          onOpenApp={() => setCurrentView('app')}
          onOpenDownload={() => setIsDownloadOpen(true)}
        />
      ) : (
        /* Live Task Dashboard */
        <>
          {/* 3D Parallax & Ambient Drifting Background Blobs */}
          <AmbientBackground />

          {/* Clean Sticky Minimal Header */}
          <Header
            settings={settings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenDownload={() => setIsDownloadOpen(true)}
            onOpenLanding={() => setCurrentView('landing')}
          />

          {/* Centered Dashboard Body */}
          <div className="relative z-10 max-w-[1100px] mx-auto px-6 pb-16">
            {/* Upper Action Deck & Motivational Quote */}
            <DashboardActionDeck
              onOpenStandup={() => setIsStandupOpen(true)}
              onQuickCapture={handleQuickCapture}
              onOpenManualCapture={() => setIsManualCaptureOpen(true)}
              onOpenNewTask={handleOpenNewTask}
              standupBadgeCount={standupBadgeCount}
              isCapturing={isCapturing}
            />

            {/* Permissions / Config Banner */}
            <PermissionsBanner
              settings={settings}
              permissions={permissions}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onDismiss={() => setIsBannerDismissed(true)}
              isDismissed={isBannerDismissed}
            />

            {/* 4-Card Stats Grid */}
            <StatsBar tasks={tasks} />

            {/* Filterable Task List */}
            <TaskList
              tasks={tasks}
              searchQuery={searchQuery}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={handleEditTask}
              onClearCompleted={handleClearCompleted}
              onSyncTodoist={settings.todoist_api_key ? handleSyncTodoist : undefined}
              onOpenManualCapture={() => setIsManualCaptureOpen(true)}
            />
          </div>
        </>
      )}

      {/* Global Modals */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />

      <MorningStandupModal
        isOpen={isStandupOpen}
        onClose={() => setIsStandupOpen(false)}
        tasks={tasks}
        onTasksUpdated={refreshTasks}
        onShowToast={showToast}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onShowToast={showToast}
      />

      <ManualCaptureModal
        isOpen={isManualCaptureOpen}
        onClose={() => setIsManualCaptureOpen(false)}
        onTaskCreated={refreshTasks}
        onShowToast={showToast}
        settings={settings}
      />

      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          isOpen={true}
          onClose={() => setEditingTask(null)}
          onSave={async (input) => {
            if (!input.id) {
              try {
                const created = await api.createTask({
                  title: input.title || 'Untitled Task',
                  raw_source_text: input.raw_source_text,
                  deadline: input.deadline,
                  priority: input.priority,
                  category: input.category,
                });
                setTasks((prev) => {
                  const updated = [created, ...prev];
                  try {
                    localStorage.setItem('taskcatch_mock_tasks', JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
                setHudTask(created);
              } catch (e: any) {
                showToast('Error', e.message || 'Failed to create task', 'error');
              }
            } else {
              handleSaveTaskEdit(input);
            }
          }}
        />
      )}

      {/* Toast Feedback Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
export default App;
