import React from 'react';
import { safeOpen as open } from '../lib/tauri';
import { Zap, Download, Settings, ArrowLeft, ArrowRight, Github } from 'lucide-react';

export function Header({ currentView, onToggleView, onOpenDownload, onOpenSettings }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full h-16 backdrop-blur-[24px] bg-[rgba(10,11,8,0.85)] border-b border-[rgba(168,173,122,0.12)] px-6">
      <div className="max-w-[1100px] h-full mx-auto flex items-center justify-between">
        {/* Brand Group */}
        <button
          onClick={onToggleView}
          className="flex items-center gap-3 text-left group transition-all"
          title={currentView === 'dashboard' ? 'View Product Overview' : 'Open Dashboard'}
        >
          <div className="w-[36px] h-[36px] rounded-[10px] border border-[rgba(168,173,122,0.3)] bg-[rgba(10,11,8,0.5)] flex items-center justify-center shadow-[0_0_20px_rgba(168,173,122,0.15)] transition-all group-hover:shadow-[0_0_25px_rgba(168,173,122,0.25)] group-hover:scale-105">
            <div className="w-[20px] h-[20px] rounded-md border border-dashed border-[var(--olive-500)] flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-[var(--olive-300)] fill-[var(--olive-300)]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[18px] font-bold text-[#f2f2ec] tracking-tight group-hover:text-[var(--olive-100)] transition-colors">
                taskcatch
              </span>
              <span className="text-[10px] font-mono font-semibold text-[var(--olive-300)] border border-[rgba(168,173,122,0.3)] px-1.5 py-0.5 rounded-md bg-[rgba(168,173,122,0.08)] uppercase tracking-widest mt-0.5">
                V1.0
              </span>
            </div>
            <div className="text-[12px] text-[var(--text-secondary)] -mt-0.5">
              universal quick-add extractor
            </div>
          </div>
        </button>

        {/* Actions Group */}
        <div className="flex items-center gap-2.5">
          {currentView === 'overview' ? (
            <>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  open('https://github.com/lakshayysinghh/taskcatch');
                }}
                className="font-sans text-[13px] font-medium px-4 py-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,173,122,0.04)] hover:bg-[rgba(168,173,122,0.1)] text-[#d5d6cd] transition-all flex items-center gap-1.5"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <button
                onClick={onOpenDownload}
                className="font-sans text-[13px] font-bold px-4 py-2 rounded-[10px] text-[#0b0c0a] shadow-[0_0_15px_rgba(168,173,122,0.2)] hover:opacity-95 transition-all flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))' }}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={onToggleView}
                className="font-sans text-[13px] font-medium px-4 py-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(10,11,8,0.5)] hover:bg-[rgba(29,31,24,0.7)] text-[#f2f2ec] transition-all flex items-center gap-1.5"
              >
                Open Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onOpenDownload}
                className="font-sans text-[13px] font-medium px-4 py-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,173,122,0.05)] hover:bg-[rgba(168,173,122,0.12)] text-[#f2f2ec] transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-[var(--olive-300)]" />
                download app
              </button>

              <button
                onClick={onOpenSettings}
                className="p-2.5 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(10,11,8,0.5)] hover:bg-[rgba(29,31,24,0.7)] text-[var(--text-secondary)] hover:text-[#f2f2ec] transition-colors"
                title="Settings (Ctrl+,)"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
