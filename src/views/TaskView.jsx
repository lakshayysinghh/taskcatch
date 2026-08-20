import React, { useState, useEffect } from 'react';
import { safeListen as listen, safeInvoke as invoke } from '../lib/tauri';

export function TaskView() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // Load initial tasks from DB
    const loadTasks = async () => {
      try {
        const loadedTasks = await invoke('get_tasks');
        setTasks(loadedTasks);
      } catch (err) {
        console.error("Failed to load tasks", err);
      }
    };
    
    loadTasks();

    // Listen for new tasks from background captures
    const unlisten = listen('new-task-captured', (event) => {
      const newTask = event.payload;
      setTasks((prev) => [newTask, ...prev]);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col h-full gap-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Captured Tasks</h2>
        <p className="text-muted-foreground mt-2">Your AI-processed notes and action items.</p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-12">
        {tasks.length === 0 ? (
          <div className="text-center p-12 bg-muted/50 rounded-xl border border-border border-dashed">
            <p className="text-muted-foreground">No tasks captured yet. Highlight some text and press Ctrl+Shift+T!</p>
          </div>
        ) : (
          tasks.map((task, idx) => (
            <div key={idx} className="bg-card border border-border rounded-lg p-5 shadow-sm group transition-all hover:border-primary/50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {new Date(task.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="prose prose-invert max-w-none text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {task.content}
              </div>
              {task.original_text && (
                <details className="mt-4 text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground transition-colors">Original Context</summary>
                  <div className="mt-2 p-3 bg-muted rounded border border-border font-mono whitespace-pre-wrap">
                    {task.original_text}
                  </div>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
