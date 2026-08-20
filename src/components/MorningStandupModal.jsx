import React, { useState, useEffect, useRef } from 'react';
import { safeInvoke as invoke } from '../lib/tauri';
import { X, Sun, Zap, Bot, User, Send, ArrowRight, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function MorningStandupModal({ isOpen, onClose, tasks, onToggleTask, onPushOverdue, onClearCompleted, onRefreshTasks }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTasks = tasks.filter((t) => !t.completed);
  const overdueCount = activeTasks.filter(t => new Date(t.timestamp) < today && (t.priority === 'Urgent' || t.priority === 'High')).length;
  const dueTodayCount = activeTasks.filter(t => new Date(t.timestamp) >= today).length;
  const highUrgentTasks = activeTasks.filter(t => t.priority === 'High' || t.priority === 'Urgent');
  const highUrgentCount = highUrgentTasks.length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setIsTyping(false);
      setMessages([{
        id: 'initial',
        role: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `${getGreeting()}! Here is your executive standup briefing for today:

- **${highUrgentCount} High/Urgent priority item(s)** on your radar.
${overdueCount > 0 ? `- **${overdueCount} Overdue item(s)** require attention.` : ''}

Would you like me to reschedule the overdue tasks, give you a summary, or curate your top 3 focus priorities for today?`,
        suggestedActions: [
          { label: 'What should I focus on first?', prompt: 'What should I focus on first today?' },
          ...(overdueCount > 0 ? [{ label: 'Push overdue to tomorrow', prompt: 'Push all overdue tasks to tomorrow' }] : []),
          { label: 'Clear completed tasks', action: 'clear' }
        ]
      }]);
    }
  }, [isOpen, highUrgentCount, overdueCount]);

  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSendPrompt = async (promptText) => {
    if (!promptText.trim()) return;

    // Add user message
    const newUserMsg = {
      id: Date.now().toString(),
      role: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: promptText
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const response = await invoke('chat_with_standup_ai', { prompt: promptText });
      
      const newBotMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: response.reply,
        mutations: response.mutations
      };

      setMessages(prev => [...prev, newBotMsg]);

      // If AI mutated tasks, trigger a fresh fetch in App.jsx
      if (response.mutations && response.mutations.length > 0) {
        if (onRefreshTasks) {
          onRefreshTasks();
        }
      }

    } catch (err) {
      console.error(err);
      let errorMsg = err.toString();
      if (errorMsg.includes('Groq API key is not configured')) {
        errorMsg = "⚠️ Your Groq API key is not configured. Please open Settings (Ctrl+,) to set it up before chatting.";
      }
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: errorMsg,
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    
    // Quick intercept for local specific actions if needed
    if (inputValue.toLowerCase() === 'clear completed') {
      onClearCompleted();
      setInputValue('');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: "I have cleared all completed tasks from your dashboard locally."
      }]);
      return;
    }

    const text = inputValue;
    setInputValue('');
    handleSendPrompt(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--surface-glass-modal)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-[700px] h-[85vh] max-h-[800px] flex flex-col shadow-2xl relative text-[#e4e6db] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] shrink-0 bg-[rgba(10,11,8,0.7)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(168,173,122,0.1)] to-[rgba(168,173,122,0.02)] border border-[var(--border-subtle)] flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5 text-[var(--olive-300)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-[#f2f2ec]">The Morning Standup Bot</h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-[var(--olive-300)] bg-[rgba(168,173,122,0.1)] flex items-center gap-1">
                  <Sun className="w-3 h-3" /> Executive AI
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Your daily executive assistant & day prioritizer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[#f2f2ec] p-2 rounded-lg hover:bg-[rgba(168,173,122,0.1)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 border-b border-[var(--border-subtle)] shrink-0 bg-[rgba(10,11,8,0.5)]">
          <div className="py-4 text-center border-r border-[var(--border-subtle)] flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest uppercase mb-1">Overdue</div>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-[#ff7b7b]' : 'text-[var(--olive-500)]'}`}>{overdueCount}</div>
          </div>
          <div className="py-4 text-center border-r border-[var(--border-subtle)] flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest uppercase mb-1">Due Today</div>
            <div className="text-2xl font-bold text-[#f2f2ec]">{dueTodayCount}</div>
          </div>
          <div className="py-4 text-center flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest uppercase mb-1">High / Urgent</div>
            <div className={`text-2xl font-bold ${highUrgentCount > 0 ? 'text-[#e6c17a]' : 'text-[var(--olive-500)]'}`}>{highUrgentCount}</div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0a0b08] scrollbar-hide">
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-4 max-w-[95%] ${msg.role === 'user' ? 'justify-end max-w-[80%] ml-auto' : ''}`}>
              
              {/* Bot Avatar */}
              {msg.role === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-[rgba(168,173,122,0.15)] border border-[var(--olive-500)] flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-[var(--olive-100)]" />
                </div>
              )}

              {/* Message Bubble */}
              <div className={`flex-1 rounded-2xl p-4 text-[14px] shadow-sm relative ${
                msg.role === 'user' 
                  ? 'bg-[rgba(168,173,122,0.1)] border border-[rgba(168,173,122,0.25)] rounded-tr-sm text-[#f2f2ec]' 
                  : 'bg-[rgba(19,20,16,0.6)] border border-[var(--border-subtle)] rounded-tl-sm text-[#d4d5cc]'
              } ${msg.isError ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)] text-[#ff7b7b]' : ''}`}>
                
                {msg.role === 'bot' ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[rgba(0,0,0,0.3)] prose-pre:border-none prose-li:my-1 text-[#e4e4de]">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}

                {/* Optional Mutations Display */}
                {msg.mutations && msg.mutations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                    <div className="text-[10px] text-[var(--olive-500)] uppercase tracking-wider mb-2 font-bold">Applied Changes</div>
                    <ul className="space-y-1">
                      {msg.mutations.map((m, i) => (
                        <li key={i} className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-[var(--olive-500)]" />
                          Updated Task ({m.action})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Actions (only for initial or specific bot messages) */}
                {msg.suggestedActions && (
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {msg.suggestedActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (action.action === 'clear') {
                            onClearCompleted();
                            setMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              role: 'bot',
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              content: "Completed tasks cleared."
                            }]);
                          } else {
                            handleSendPrompt(action.prompt);
                          }
                        }}
                        disabled={isTyping}
                        className="px-3.5 py-2 text-[12px] font-medium rounded-xl border border-[rgba(168,173,122,0.3)] bg-[rgba(168,173,122,0.08)] hover:bg-[rgba(168,173,122,0.15)] text-[var(--olive-100)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#e6c17a]" /> {action.label} <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    ))}
                  </div>
                )}

                <div className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-right text-[var(--olive-500)]' : 'text-left text-[var(--text-dim)]'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-4 max-w-[95%] animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-[rgba(168,173,122,0.15)] border border-[var(--olive-500)] flex items-center justify-center shrink-0 mt-1">
                <Loader2 className="w-4 h-4 text-[var(--olive-300)] animate-spin" />
              </div>
              <div className="bg-[rgba(19,20,16,0.6)] border border-[var(--border-subtle)] rounded-2xl rounded-tl-sm p-4 text-[14px] text-[var(--text-secondary)] shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Thinking...
              </div>
            </div>
          )}

          <div ref={chatEndRef} className="h-2" />
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[rgba(10,11,8,0.8)] shrink-0">
          <form onSubmit={handleInputSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
              placeholder="Ask your assistant (e.g. 'Push overdue to tomorrow' or 'What is my lowest priority?')"
              className="w-full bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] focus:border-[var(--olive-500)] text-[13px] text-[#f2f2ec] rounded-xl pl-4 pr-12 py-3.5 outline-none transition-all placeholder:text-[var(--text-placeholder)] shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[rgba(168,173,122,0.1)] hover:bg-[rgba(168,173,122,0.2)] text-[var(--olive-300)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-[rgba(168,173,122,0.3)]"
              style={{ background: 'linear-gradient(135deg, rgba(35,37,28,0.5), rgba(10,11,8,0.8))' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
