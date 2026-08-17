import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  X,
  Send,
  ArrowRight,
  Bot,
  User,
} from 'lucide-react';
import { Task, AppSettings } from '../lib/types';
import { api } from '../lib/tauri';
import { AppLogo } from './AppLogo';

interface MorningStandupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onTasksUpdated: () => void;
  onShowToast: (title: string, msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  settings: AppSettings;
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  actions?: { label: string; actionId: string; icon?: string }[];
  timestamp: string;
}

export const MorningStandupModal: React.FC<MorningStandupModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onTasksUpdated,
  onShowToast,
  settings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Statistics
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 3600 * 1000;

  const activeTasks = tasks.filter((t) => !t.is_completed);

  const overdueTasks = activeTasks.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline).getTime();
    return !isNaN(d) && d < now.getTime();
  });

  const dueTodayTasks = activeTasks.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline).getTime();
    return !isNaN(d) && d >= todayStart && d <= todayEnd;
  });

  const urgentTasks = activeTasks.filter(
    (t) => t.priority.toLowerCase() === 'urgent' || t.priority.toLowerCase() === 'high'
  );

  // Time of day greeting
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Generate initial briefing when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const greeting = getGreeting();
    let briefingText = `${greeting}! Here is your executive standup briefing for today:\n\n`;

    if (overdueTasks.length > 0) {
      briefingText += `• **${overdueTasks.length} Overdue Action Item(s)** from earlier that need attention.\n`;
    }
    if (dueTodayTasks.length > 0) {
      briefingText += `• **${dueTodayTasks.length} Task(s) due today**.\n`;
    }
    if (urgentTasks.length > 0) {
      briefingText += `• **${urgentTasks.length} High/Urgent priority item(s)** on your radar.\n`;
    }
    if (overdueTasks.length === 0 && dueTodayTasks.length === 0 && urgentTasks.length === 0) {
      briefingText += `• You have **${activeTasks.length} active tasks** in total and all deadlines are on track!`;
    } else {
      briefingText += `\nWould you like me to reschedule the overdue tasks or curate your top 3 focus priorities for today?`;
    }

    const initialActions = [];
    if (overdueTasks.length > 0) {
      initialActions.push({
        label: `Push ${overdueTasks.length} overdue to Tomorrow 9 AM`,
        actionId: 'reschedule_overdue_tomorrow',
      });
      initialActions.push({
        label: `Push ${overdueTasks.length} overdue to Today EOD`,
        actionId: 'reschedule_overdue_today',
      });
    }
    initialActions.push({
      label: '⚡ What should I focus on first?',
      actionId: 'focus_top_priority',
    });
    initialActions.push({
      label: '🧹 Clear completed tasks',
      actionId: 'clear_completed',
    });

    setMessages([
      {
        id: 'msg_init',
        sender: 'assistant',
        text: briefingText,
        actions: initialActions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  // Handle Assistant Actions
  const handleExecuteAction = async (actionId: string) => {
    setIsProcessing(true);

    if (actionId === 'reschedule_overdue_tomorrow') {
      try {
        const tomorrow9am = new Date(now);
        tomorrow9am.setDate(tomorrow9am.getDate() + 1);
        tomorrow9am.setHours(9, 0, 0, 0);

        for (const t of overdueTasks) {
          await api.updateTask({
            id: t.id,
            deadline: tomorrow9am.toISOString(),
          });
        }
        onTasksUpdated();
        onShowToast('Overdue Rescheduled', `Pushed ${overdueTasks.length} tasks to Tomorrow 9 AM`, 'success');

        setMessages((prev) => [
          ...prev,
          {
            id: 'action_user_' + Date.now(),
            sender: 'user',
            text: 'Please push overdue tasks to tomorrow at 9 AM.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: 'action_bot_' + Date.now(),
            sender: 'assistant',
            text: `✅ Done! I've rescheduled **${overdueTasks.length} overdue task(s)** to tomorrow at 9:00 AM. Your board is now clean.`,
            actions: [
              { label: '⚡ What should I focus on next?', actionId: 'focus_top_priority' },
            ],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err: any) {
        onShowToast('Error', err.message || 'Failed to reschedule', 'error');
      }
    } else if (actionId === 'reschedule_overdue_today') {
      try {
        const [eodHourStr] = (settings.eod_time || '17:00').split(':');
        const eodHour = parseInt(eodHourStr, 10) || 17;
        const todayEod = new Date(now);
        todayEod.setHours(eodHour, 0, 0, 0);

        for (const t of overdueTasks) {
          await api.updateTask({
            id: t.id,
            deadline: todayEod.toISOString(),
          });
        }
        onTasksUpdated();
        onShowToast('Rescheduled', `Pushed ${overdueTasks.length} tasks to Today ${settings.eod_time || '17:00'}`, 'success');

        setMessages((prev) => [
          ...prev,
          {
            id: 'action_user_' + Date.now(),
            sender: 'user',
            text: 'Reschedule overdue tasks to today EOD.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: 'action_bot_' + Date.now(),
            sender: 'assistant',
            text: `✅ Updated! All ${overdueTasks.length} overdue task(s) are now set for **Today at ${settings.eod_time || '5:00 PM'}**.`,
            actions: [
              { label: '⚡ What should I focus on first?', actionId: 'focus_top_priority' },
            ],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err: any) {
        onShowToast('Error', err.message || 'Failed to reschedule', 'error');
      }
    } else if (actionId === 'focus_top_priority') {
      const topTasks = [...urgentTasks, ...dueTodayTasks, ...activeTasks].slice(0, 3);

      let reply = `🎯 Here are your **Top 3 High-Impact Priorities** for today:\n\n`;
      if (topTasks.length === 0) {
        reply = `✨ Your plate is currently clear! You have no active urgent tasks pending.`;
      } else {
        topTasks.forEach((t, idx) => {
          reply += `**${idx + 1}. ${t.title}**\n   • Priority: \`${t.priority.toUpperCase()}\` • Category: \`${t.category}\`\n\n`;
        });
        reply += `Focus on item #1 first before moving to other tasks.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'action_user_' + Date.now(),
          sender: 'user',
          text: 'What should I focus on first today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: 'action_bot_' + Date.now(),
          sender: 'assistant',
          text: reply,
          actions: [
            { label: '🧹 Clear completed tasks', actionId: 'clear_completed' },
            { label: '👋 Ready to work (Close)', actionId: 'close_standup' },
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else if (actionId === 'clear_completed') {
      try {
        await api.clearCompleted();
        onTasksUpdated();
        onShowToast('Cleared', 'Completed items cleaned up.', 'info');

        setMessages((prev) => [
          ...prev,
          {
            id: 'action_user_' + Date.now(),
            sender: 'user',
            text: 'Clear all completed tasks.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: 'action_bot_' + Date.now(),
            sender: 'assistant',
            text: `🧹 Done! Removed all finished items from your active board.`,
            actions: [
              { label: '⚡ Top 3 Priorities', actionId: 'focus_top_priority' },
            ],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err: any) {
        onShowToast('Error', err.message || 'Failed to clear', 'error');
      }
    } else if (actionId === 'close_standup') {
      onClose();
    }

    setIsProcessing(false);
  };

  // Custom User Prompt Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: 'user_' + Date.now(),
        sender: 'user',
        text: userText,
        timestamp: timeStr,
      },
    ]);

    setIsProcessing(true);

    // AI Response (Groq or local assistant logic)
    try {
      const lower = userText.toLowerCase();

      if (lower.includes('overdue') && (lower.includes('tomorrow') || lower.includes('push') || lower.includes('reschedule'))) {
        await handleExecuteAction('reschedule_overdue_tomorrow');
        return;
      }

      if (lower.includes('clear') && lower.includes('completed')) {
        await handleExecuteAction('clear_completed');
        return;
      }

      if (lower.includes('focus') || lower.includes('first') || lower.includes('priority') || lower.includes('what should i do')) {
        await handleExecuteAction('focus_top_priority');
        return;
      }

      // If Groq key is configured, query LLM for custom assistance!
      if (settings.groq_api_key && settings.groq_api_key.trim().startsWith('gsk_')) {
        const taskSummary = activeTasks
          .map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (Due: ${t.deadline || 'None'}, Category: ${t.category})`)
          .join('\n');

        const prompt = `You are an elite Executive Assistant conducting a daily morning standup.
Current Time: ${new Date().toLocaleTimeString()}
Current Active Tasks:
${taskSummary || 'No active tasks.'}

User Message: "${userText}"

Provide a concise, encouraging, structured 2-3 sentence executive recommendation.`;

        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.groq_api_key.trim()}`,
          },
          body: JSON.stringify({
            model: settings.groq_model || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const reply = data.choices?.[0]?.message?.content || 'Understood! Let me know what you would like to tackle next.';
          setMessages((prev) => [
            ...prev,
            {
              id: 'bot_' + Date.now(),
              sender: 'assistant',
              text: reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          setIsProcessing(false);
          return;
        }
      }

      // Default smart assistant response
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'assistant',
          text: `You have **${activeTasks.length} active tasks** in total (${urgentTasks.length} high/urgent). Focus on executing one priority item at a time to maintain momentum today!`,
          actions: [
            { label: '⚡ Top 3 Priorities', actionId: 'focus_top_priority' },
            { label: '🧹 Clear Completed', actionId: 'clear_completed' },
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'assistant',
          text: `I'm here to help you organize and prioritize your day. Try clicking one of the suggested action buttons below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[rgba(19,20,16,0.96)] backdrop-blur-[28px] border border-[rgba(168,173,122,0.3)] rounded-[16px] shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[640px] max-h-[92vh] animate-scaleUp">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(168,173,122,0.14)] bg-[#0d0e0a]">
          <div className="flex items-center gap-3">
            <AppLogo size={32} />
            <div>
              <div className="text-[15px] font-bold text-[#f2f2ec] flex items-center gap-2">
                <span>The Morning Standup Bot</span>
                <span className="text-[10px] font-semibold text-[#a8ad7a] bg-[rgba(168,173,122,0.12)] border border-[rgba(168,173,122,0.25)] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sun className="w-2.5 h-2.5 text-[#d9dcc4]" />
                  <span>Executive AI</span>
                </span>
              </div>
              <div className="text-[11px] text-[#93958a]">
                Your daily executive assistant & day prioritizer
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Metric Ribbon */}
        <div className="grid grid-cols-3 border-b border-[rgba(168,173,122,0.12)] bg-[rgba(10,11,8,0.8)] py-2.5 px-6 text-center">
          <div className="flex flex-col items-center justify-center border-r border-[rgba(168,173,122,0.1)] pr-2">
            <span className="text-[10px] text-[#93958a] uppercase tracking-wider">Overdue</span>
            <span className={`text-[15px] font-bold ${overdueTasks.length > 0 ? 'text-[#ff7b7b]' : 'text-[#a8ad7a]'}`}>
              {overdueTasks.length}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center border-r border-[rgba(168,173,122,0.1)] px-2">
            <span className="text-[10px] text-[#93958a] uppercase tracking-wider">Due Today</span>
            <span className="text-[15px] font-bold text-[#d9dcc4]">
              {dueTodayTasks.length}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center pl-2">
            <span className="text-[10px] text-[#93958a] uppercase tracking-wider">High / Urgent</span>
            <span className="text-[15px] font-bold text-[#a8ad7a]">
              {urgentTasks.length}
            </span>
          </div>
        </div>

        {/* Chat Message Scrollable Container */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  msg.sender === 'user'
                    ? 'bg-[#23241d] border border-[rgba(168,173,122,0.25)] text-[#f2f2ec]'
                    : 'bg-gradient-to-br from-[#a8ad7a]/30 to-[#33361f]/50 border border-[rgba(168,173,122,0.3)] text-[#d9dcc4]'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[82%] rounded-[12px] p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#23241d] text-[#f2f2ec] border border-[rgba(168,173,122,0.2)]'
                    : 'bg-[rgba(10,11,8,0.85)] text-[#d9dcc4] border border-[rgba(168,173,122,0.18)] shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Interactive Action Buttons inside assistant reply */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[rgba(168,173,122,0.12)] flex flex-wrap gap-1.5">
                    {msg.actions.map((act, i) => (
                      <button
                        key={i}
                        disabled={isProcessing}
                        onClick={() => handleExecuteAction(act.actionId)}
                        className="px-2.5 py-1.5 rounded-[6px] text-[11px] font-semibold text-[#f2f2ec] bg-[rgba(168,173,122,0.14)] hover:bg-[rgba(168,173,122,0.26)] border border-[rgba(168,173,122,0.3)] hover:border-[rgba(168,173,122,0.55)] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        <span>{act.label}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-[#a8ad7a]" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-1 text-[9px] text-[#55634e] text-right">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom Input Field */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[rgba(168,173,122,0.14)] bg-[#0d0e0a]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask your assistant (e.g. 'Push overdue to tomorrow' or 'What should I do first?')"
              className="flex-1 px-4 py-2.5 bg-[#0a0b08] border border-[rgba(168,173,122,0.2)] focus:border-[#a8ad7a] rounded-[10px] text-xs text-[#f2f2ec] placeholder-[#4f5b47] outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isProcessing || !inputMessage.trim()}
              className="p-2.5 rounded-[10px] text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
