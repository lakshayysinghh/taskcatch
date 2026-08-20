import React, { useState, useEffect } from 'react';
import { Sun, Zap, Sparkles, Plus, Loader2 } from 'lucide-react';

const CURATED_QUOTES = [
  "“You don't have to be extreme, just consistent.” — Daily Focus",
  "“Action is the foundational key to all success.” — Pablo Picasso",
  "“Simplicity boils down to two steps: Identify the essential. Eliminate the rest.” — Leo Babauta",
  "“Focus on being productive instead of busy.” — Tim Ferriss",
  "“The secret of getting ahead is getting started.” — Mark Twain",
];

export function DashboardActionDeck({
  overdueCount,
  isCapturing,
  onQuickCapture,
  onOpenStandup,
  onOpenExtract,
  onOpenNewTask,
  hotkey = 'F9',
}) {
  const [quote, setQuote] = useState(CURATED_QUOTES[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * CURATED_QUOTES.length);
    setQuote(CURATED_QUOTES[randomIndex]);
  }, []);

  return (
    <div className="text-center space-y-6 pt-4 pb-2">
      {/* Layer 1: Motivational Editorial Quote */}
      <div className="space-y-1">
        <p className="font-editorial italic text-[16px] text-[var(--olive-100)] leading-relaxed tracking-wide">
          {quote}
        </p>
      </div>

      {/* Layer 2: 4-Button Action Deck Row */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Standup Button */}
        <button
          onClick={onOpenStandup}
          className="font-sans text-[13px] font-medium px-4 py-2.5 rounded-full border border-[var(--border-subtle)] text-[#d5d6cd] hover:border-[rgba(168,173,122,0.4)] transition-all flex items-center gap-2 relative shadow-sm"
          style={{ background: 'linear-gradient(135deg, rgba(35,37,28,0.8), rgba(10,11,8,0.95))' }}
        >
          <Sun className="w-4 h-4 text-[var(--olive-300)]" />
          <span>standup</span>
          {overdueCount > 0 && (
            <span className="bg-[#e07575] text-[#0b0c0a] font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {overdueCount}
            </span>
          )}
        </button>

        {/* Quick Capture Button */}
        <button
          onClick={onQuickCapture}
          disabled={isCapturing}
          className="font-sans text-[13px] font-medium px-4 py-2.5 rounded-full border border-[var(--border-subtle)] text-[#d5d6cd] hover:border-[rgba(168,173,122,0.4)] transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, rgba(35,37,28,0.8), rgba(10,11,8,0.95))' }}
        >
          {isCapturing ? (
            <Loader2 className="w-4 h-4 text-[var(--olive-300)] animate-spin" />
          ) : (
            <Zap className="w-4 h-4 text-[var(--olive-300)]" />
          )}
          <span>quick capture</span>
        </button>

        {/* Extract Button (Natural Language Command Bar) */}
        <button
          onClick={onOpenExtract}
          className="font-sans text-[13px] font-medium px-4 py-2.5 rounded-full border border-[var(--border-subtle)] text-[#d5d6cd] hover:border-[rgba(168,173,122,0.4)] transition-all flex items-center gap-2 shadow-sm"
          style={{ background: 'linear-gradient(135deg, rgba(35,37,28,0.8), rgba(10,11,8,0.95))' }}
        >
          <Sparkles className="w-4 h-4 text-[var(--olive-300)]" />
          <span>extract</span>
        </button>

        {/* + New Task Button */}
        <button
          onClick={onOpenNewTask}
          className="font-sans text-[13px] font-semibold px-5 py-2.5 rounded-full text-[#0b0c0a] shadow-[0_0_15px_rgba(168,173,122,0.2)] hover:opacity-95 transition-all flex items-center gap-1.5"
          style={{ background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))' }}
        >
          <span>+ new task</span>
        </button>
      </div>

      {/* Layer 3: Keyboard Shortcut Monospace Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <div className="flex items-center gap-2 bg-[rgba(19,20,16,0.65)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
          <kbd className="font-mono bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] border border-[rgba(168,173,122,0.2)] px-1.5 py-0.5 rounded text-[10px]">
            Ctrl + K
          </kbd>
          <span>NLP Quick Add</span>
        </div>

        <div className="flex items-center gap-2 bg-[rgba(19,20,16,0.65)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
          <span>Your Hot Key</span>
          <kbd className="font-mono bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] border border-[rgba(168,173,122,0.2)] px-1.5 py-0.5 rounded text-[10px]">
            {hotkey}
          </kbd>
          <span className="text-[10px] text-[var(--text-placeholder)]">(Recommended)</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[rgba(19,20,16,0.65)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
          <Sun className="w-3 h-3 text-[var(--olive-300)]" />
          <span>Daily Standup Prioritizer</span>
        </div>
      </div>
    </div>
  );
}
