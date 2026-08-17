import React, { useState } from 'react';
import {
  Sun,
  Zap,
  Sparkles,
} from 'lucide-react';

interface DashboardActionDeckProps {
  onOpenStandup: () => void;
  onQuickCapture: () => void;
  onOpenManualCapture: () => void;
  onOpenNewTask: () => void;
  standupBadgeCount: number;
  isCapturing: boolean;
}

const MOTIVATIONAL_QUOTES = [
  {
    quote: "Focus is the art of knowing what to ignore.",
    author: "Steve Jobs",
  },
  {
    quote: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
  },
  {
    quote: "You don't have to be extreme, just consistent.",
    author: "Daily Focus",
  },
  {
    quote: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    quote: "Do the hard jobs first. The easy jobs will take care of themselves.",
    author: "Dale Carnegie",
  },
];

export const DashboardActionDeck: React.FC<DashboardActionDeckProps> = ({
  onOpenStandup,
  onQuickCapture,
  onOpenManualCapture,
  onOpenNewTask,
  standupBadgeCount,
  isCapturing,
}) => {
  const [quoteIndex] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex];

  return (
    <div className="mb-8 space-y-6">
      {/* Motivational Quote Banner */}
      <div className="text-center max-w-xl mx-auto py-2 px-4">
        <p className="text-[14px] sm:text-[15px] font-['Newsreader',serif] italic text-[#d9dcc4] leading-relaxed">
          "{currentQuote.quote}"
        </p>
        <span className="text-[11px] text-[#7c8450] font-sans font-medium mt-1 block">
          — {currentQuote.author}
        </span>
      </div>

      {/* Centered Main Action Buttons */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {/* Morning Standup Bot Button */}
        <button
          onClick={onOpenStandup}
          className="relative font-sans text-[13px] font-medium px-[18px] py-[10px] rounded-[10px] border border-[rgba(168,173,122,0.25)] bg-[rgba(168,173,122,0.1)] hover:bg-[rgba(168,173,122,0.2)] hover:border-[rgba(168,173,122,0.45)] backdrop-blur-[12px] text-[#f2f2ec] transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
          title="Daily Executive Standup & AI Prioritizer"
        >
          <Sun className="w-4 h-4 text-[#d9dcc4]" />
          <span>standup</span>
          {standupBadgeCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-[#7c8450] text-[#0b0c0a] text-[10px] font-bold flex items-center justify-center">
              {standupBadgeCount}
            </span>
          )}
        </button>

        {/* Quick Capture Button */}
        <button
          onClick={onQuickCapture}
          disabled={isCapturing}
          className="font-sans text-[13px] font-medium px-[18px] py-[10px] rounded-[10px] border border-[rgba(168,173,122,0.18)] bg-[rgba(19,20,16,0.7)] hover:bg-[rgba(19,20,16,0.9)] hover:border-[rgba(168,173,122,0.35)] backdrop-blur-[12px] text-[#d5d6cd] hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          title="Global shortcut: F9 or Alt+C"
        >
          <Zap className={`w-4 h-4 text-[#a8ad7a] ${isCapturing ? 'animate-pulse' : ''}`} />
          <span>{isCapturing ? 'capturing...' : 'quick capture'}</span>
        </button>

        {/* AI Extract Button */}
        <button
          onClick={onOpenManualCapture}
          className="font-sans text-[13px] font-medium px-[18px] py-[10px] rounded-[10px] border border-[rgba(168,173,122,0.18)] bg-[rgba(19,20,16,0.7)] hover:bg-[rgba(19,20,16,0.9)] hover:border-[rgba(168,173,122,0.35)] backdrop-blur-[12px] text-[#a8ad7a] hover:text-[#d9dcc4] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          title="AI Extract from text (Ctrl+K)"
        >
          <Sparkles className="w-4 h-4" />
          <span>extract</span>
        </button>

        {/* + New Task Button (Primary Gradient) */}
        <button
          onClick={onOpenNewTask}
          className="font-sans text-[13px] font-semibold px-[20px] py-[10px] rounded-[10px] text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(124,132,80,0.25)] cursor-pointer active:scale-95 border-none"
        >
          <span>+ new task</span>
        </button>
      </div>

      {/* Instructions & Global Shortcut Help Ribbon */}
      <div className="flex items-center justify-center gap-4 flex-wrap text-[11px] text-[#808375]">
        <span className="flex items-center gap-1.5 bg-white/[0.02] border border-[rgba(168,173,122,0.12)] px-2.5 py-1 rounded-[6px]">
          <kbd className="px-1 py-0.2 rounded bg-[#1f2119] text-[#d9dcc4] font-mono text-[10px]">Ctrl + K</kbd>
          <span>NLP Quick Add</span>
        </span>

        <span className="flex items-center gap-1.5 bg-white/[0.02] border border-[rgba(168,173,122,0.12)] px-2.5 py-1 rounded-[6px]">
          <kbd className="px-1 py-0.2 rounded bg-[#1f2119] text-[#d9dcc4] font-mono text-[10px]">F9</kbd>
          <span>Global Highlight Capture</span>
        </span>

        <span className="flex items-center gap-1.5 bg-white/[0.02] border border-[rgba(168,173,122,0.12)] px-2.5 py-1 rounded-[6px]">
          <Sun className="w-3 h-3 text-[#a8ad7a]" />
          <span>Daily Standup Prioritizer</span>
        </span>
      </div>
    </div>
  );
};
