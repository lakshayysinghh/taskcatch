import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, CheckCircle, Loader2, Sun, Zap } from 'lucide-react';
import { safeInvoke as invoke } from '../lib/tauri';
import { isDueToday, isOverdue } from '../lib/taskMeta';
import { Modal } from './ui/Modal';
import { LogoMark } from './ui/LogoMark';

/** One line per applied change, e.g. "Deploy hotfix: due Thu, Nov 26, 9:00 AM · priority Urgent". */
function describeMutation(m) {
  const parts = [];
  if (m.update_deadline) {
    const d = new Date(m.update_deadline);
    parts.push(
      Number.isNaN(d.getTime())
        ? 'deadline updated'
        : `due ${d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    );
  }
  if (m.update_priority) parts.push(`priority ${m.update_priority}`);
  return `${m.task_title || 'Task'}: ${parts.join(' · ') || 'updated'}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function Stat({ label, value, tone }) {
  return (
    <div className="px-5 py-3.5">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className={`mt-1 text-[24px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

export function MorningStandupModal({ isOpen, onClose, tasks, onClearCompleted, onRefreshTasks }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Counts use each task's deadline, never its capture time.
  const now = new Date();
  const overdueCount = tasks.filter((t) => isOverdue(t, now)).length;
  const dueTodayCount = tasks.filter((t) => isDueToday(t, now)).length;
  const highUrgentCount = tasks.filter((t) => !t.completed && (t.priority === 'High' || t.priority === 'Urgent')).length;

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setIsTyping(false);
      setMessages([
        {
          id: 'initial',
          role: 'bot',
          timestamp: clock(),
          content: `${greeting()}! Here's where things stand:

- **${highUrgentCount}** high or urgent ${highUrgentCount === 1 ? 'task' : 'tasks'} open
- **${dueTodayCount}** due later today${overdueCount > 0 ? `\n- **${overdueCount}** past due` : ''}

Ask me what to focus on, or to reschedule and reprioritise tasks.`,
          suggestedActions: [
            { label: 'What should I focus on first?', prompt: 'What should I focus on first today?' },
            ...(overdueCount > 0 ? [{ label: 'Push overdue to tomorrow', prompt: 'Push all overdue tasks to tomorrow at 9 AM' }] : []),
            { label: 'Clear completed tasks', action: 'clear' },
          ],
        },
      ]);
    }
    // Only reset when the modal opens. Counts change as the assistant edits
    // tasks; re-running then would wipe the conversation mid-chat.
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  const addBotMessage = (content, extra = {}) =>
    setMessages((prev) => [...prev, { id: `${Date.now()}-bot`, role: 'bot', timestamp: clock(), content, ...extra }]);

  const handleSendPrompt = async (promptText) => {
    if (!promptText.trim()) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}-user`, role: 'user', timestamp: clock(), content: promptText }]);
    setIsTyping(true);

    try {
      const response = await invoke('chat_with_standup_ai', { prompt: promptText });
      addBotMessage(response.reply, { mutations: response.mutations });
      // The assistant changed tasks: refresh the list in App.
      if (response.mutations?.length > 0) onRefreshTasks?.();
    } catch (err) {
      console.error(err);
      let errorMsg = String(err);
      if (errorMsg.includes('Groq API key is not configured')) {
        errorMsg = 'Your Groq API key is not configured. Please open Settings (Ctrl+,) to add one before chatting.';
      }
      addBotMessage(errorMsg, { isError: true });
    } finally {
      setIsTyping(false);
    }
  };

  const clearCompleted = () => {
    onClearCompleted();
    addBotMessage('Completed tasks cleared.');
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    if (inputValue.trim().toLowerCase() === 'clear completed') {
      setInputValue('');
      clearCompleted();
      return;
    }
    const text = inputValue;
    setInputValue('');
    handleSendPrompt(text);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Sun}
      title="Morning standup"
      description="Your assistant for today's priorities."
      size="lg"
      panelClassName="h-[min(780px,calc(100vh-2rem))]"
      bodyClassName="flex flex-col overflow-hidden p-0"
    >
      <div className="grid shrink-0 grid-cols-3 divide-x divide-line border-b border-line bg-black/20">
        <Stat label="Overdue" value={overdueCount} tone={overdueCount > 0 ? 'text-danger' : 'text-ink'} />
        <Stat label="Due today" value={dueTodayCount} tone="text-ink" />
        <Stat label="High / urgent" value={highUrgentCount} tone={highUrgentCount > 0 ? 'text-warning' : 'text-ink'} />
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="max-w-[80%] rounded-2xl rounded-br-md border border-olive-300/20 bg-olive-300/10 px-4 py-2.5 text-[14px] leading-relaxed text-ink">
                {msg.content}
                <div className="mt-1 text-right text-[10.5px] text-olive-400">{msg.timestamp}</div>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <LogoMark size={28} className="mt-0.5 shrink-0" />
              <div className="min-w-0 max-w-[88%] flex-1">
                <div
                  className={`rounded-2xl rounded-tl-md border px-4 py-3 text-[14px] ${
                    msg.isError ? 'border-danger/25 bg-danger/[0.07] text-[#f6c3bb]' : 'border-line bg-surface-2 text-ink'
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none leading-relaxed prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-ink">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {msg.mutations?.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3">
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-olive-300">Applied Changes</div>
                      <ul className="space-y-1">
                        {msg.mutations.map((m, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-ink-2">
                            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-olive-300" />
                            <span>{describeMutation(m)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {msg.suggestedActions && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.suggestedActions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        disabled={isTyping}
                        onClick={() => (action.action === 'clear' ? clearCompleted() : handleSendPrompt(action.prompt))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white/[0.02] px-3 py-1.5 text-[12.5px] text-ink-2 transition hover:border-olive-300/30 hover:text-ink disabled:opacity-50"
                      >
                        <Zap className="h-3 w-3 text-olive-300" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 text-[10.5px] text-ink-3">{msg.timestamp}</div>
              </div>
            </div>
          )
        )}

        {isTyping && (
          <div className="flex items-center gap-3 animate-in fade-in duration-200">
            <LogoMark size={28} className="shrink-0" />
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-line bg-surface-2 px-4 py-2.5 text-[13px] text-ink-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-olive-300" />
              Thinking…
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleInputSubmit} className="shrink-0 border-t border-line bg-black/20 p-4">
        <div className="relative">
          <input
            data-autofocus
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping}
            placeholder="Ask your assistant — e.g. “push overdue to tomorrow” or “what's my lowest priority?”"
            aria-label="Message the standup assistant"
            className="h-12 w-full rounded-xl border border-line-strong bg-surface pl-4 pr-14 text-[14px] text-ink outline-none transition placeholder:text-ink-3 focus:border-olive-300/40 focus:ring-4 focus:ring-olive-300/10 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            aria-label="Send"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-b from-olive-100 to-olive-300 text-[#15160f] transition disabled:from-white/10 disabled:to-white/5 disabled:text-ink-3"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
