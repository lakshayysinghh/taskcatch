import React from 'react';
import { safeOpen as open } from '../lib/tauri';
import { Zap, Shield, Cpu, ArrowRight, Download, Terminal, Sparkles, Github, Copy } from 'lucide-react';

export function OverviewView({ onOpenDashboard, onOpenDownload }) {
  return (
    <div className="max-w-[1000px] mx-auto py-12 px-6 space-y-16 animate-in fade-in duration-300 relative z-10">
      {/* The Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[rgba(168,173,122,0.06)] border border-[rgba(168,173,122,0.2)] text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
          <span>Free & open source</span>
          <span className="w-1 h-1 rounded-full bg-[var(--olive-500)]" />
          <span>Zero subscription — bring your own key</span>
          <span className="w-1 h-1 rounded-full bg-[var(--olive-500)]" />
          <span>No taskcatch servers</span>
        </div>

        <h1 className="font-editorial text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#f2f2ec] leading-[1.12]">
          Highlight. <span className="italic text-[var(--olive-100)]">TaskCatch.</span>
        </h1>

        <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          A free, open-source universal action item extractor for Windows. Highlight text in Slack, Chrome, Word, or your code editor — press <kbd className="font-mono bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] border border-[rgba(168,173,122,0.2)] px-1.5 py-0.5 rounded text-[11px]">F9</kbd> — and clean action items land right into your dashboard with smart deadlines and priority.
        </p>

        {/* Primary Call to Actions (CTAs) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
          <button
            onClick={onOpenDownload}
            className="px-6 py-3 rounded-xl text-[13px] font-bold text-[#0b0c0a] shadow-[0_0_25px_rgba(215,233,176,0.25)] hover:opacity-95 transition-all flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))' }}
          >
            <Download className="w-4 h-4" />
            <span>Download for Windows</span>
          </button>

          <button
            onClick={onOpenDashboard}
            className="px-6 py-3 rounded-xl text-[13px] font-semibold border border-[var(--border-subtle)] bg-[rgba(10,11,8,0.6)] text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all flex items-center gap-2 shadow-sm"
          >
            <Zap className="w-4 h-4 text-[var(--olive-300)]" />
            <span>Launch Live Dashboard</span>
          </button>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              open('https://github.com/lakshayysinghh/taskcatch');
            }}
            className="px-6 py-3 rounded-xl text-[13px] font-semibold border border-[var(--border-subtle)] bg-[rgba(10,11,8,0.6)] text-[#d5d6cd] hover:bg-[rgba(168,173,122,0.1)] transition-all flex items-center gap-2.5 shadow-sm group"
          >
            <Github className="w-4 h-4" />
            <span>Star on GitHub</span>
            <span className="flex items-center gap-1 bg-[rgba(168,173,122,0.12)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md text-[11px] text-[var(--olive-100)] group-hover:bg-[rgba(168,173,122,0.2)] transition-colors">
              ★ 120
            </span>
          </a>
        </div>

        {/* Command Line Install */}
        <div className="pt-6 flex flex-col items-center gap-4">
          <div className="flex items-center justify-between gap-4 bg-[rgba(10,11,8,0.95)] border border-[var(--border-subtle)] rounded-xl pl-5 pr-1.5 py-1.5 shadow-inner max-w-lg mx-auto w-full">
            <span className="font-mono text-[12px] text-[var(--olive-100)] truncate">
              <span className="text-[var(--olive-500)] mr-2">PS&gt;</span>
              irm https://raw.githubusercontent.com/laks...
            </span>
            <button
              onClick={() => navigator.clipboard.writeText('irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(168,173,122,0.1)] hover:bg-[rgba(168,173,122,0.2)] text-[var(--text-secondary)] hover:text-[#f2f2ec] text-[11px] font-medium transition-colors border border-transparent hover:border-[rgba(168,173,122,0.2)] shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-3 text-[11px] text-[var(--text-secondary)] font-medium">
            <span>• 100% Free on Windows 10 & 11</span>
            <span>• Local SQLite Storage</span>
            <span>• Under 15 MB</span>
          </div>
        </div>
      </div>

      {/* The Three Pillar Features */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--olive-300)]">Core Architecture</h2>
          <p className="font-editorial italic text-lg text-[#f2f2ec]">The Three Pillars of TaskCatch</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1: Global Hotkey Interception */}
          <div className="p-6 rounded-lg bg-[var(--surface-glass)] backdrop-blur-[16px] border border-[var(--border-subtle)] hover:border-[rgba(168,173,122,0.35)] transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-[rgba(168,173,122,0.12)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--olive-300)] shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#f2f2ec]">1. Global Hotkey Interception</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                TaskCatch isn't just a browser app; it operates at the OS level. Running silently in the background tray, you can press your global shortcut (like <kbd className="font-mono bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] px-1 py-0.5 rounded text-[10px]">F9</kbd> or <kbd className="font-mono bg-[rgba(168,173,122,0.12)] text-[var(--olive-100)] px-1 py-0.5 rounded text-[10px]">Ctrl+Shift+T</kbd>) from <em>any</em> application. TaskCatch silently copies the highlight and triggers an instant capture.
              </p>
            </div>
            <div className="text-[11px] font-mono text-[var(--olive-300)] pt-2 border-t border-[var(--border-subtle)]">
              OS-Level Hook
            </div>
          </div>

          {/* Pillar 2: Lightning Groq AI Inference */}
          <div className="p-6 rounded-lg bg-[var(--surface-glass)] backdrop-blur-[16px] border border-[var(--border-subtle)] hover:border-[rgba(168,173,122,0.35)] transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-[rgba(168,173,122,0.12)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--olive-300)] shadow-sm">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#f2f2ec]">2. Lightning Groq AI Inference</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Powered by Groq's ultra-fast inference engine running Llama models. TaskCatch distills unstructured text (like a rambling 5-paragraph email thread or long Slack message) into a single, concise task title with priority and category tags in milliseconds.
              </p>
            </div>
            <div className="text-[11px] font-mono text-[var(--olive-300)] pt-2 border-t border-[var(--border-subtle)]">
              800+ tokens/sec
            </div>
          </div>

          {/* Pillar 3: Local Offline Storage */}
          <div className="p-6 rounded-lg bg-[var(--surface-glass)] backdrop-blur-[16px] border border-[var(--border-subtle)] hover:border-[rgba(168,173,122,0.35)] transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-[rgba(168,173,122,0.12)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--olive-300)] shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#f2f2ec]">3. Local Offline Storage</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Your privacy is paramount. All tasks, metadata, and API credentials are kept strictly local on your machine in encrypted local storage with client-side heuristic fallbacks when offline. Zero telemetry, zero third-party cloud lock-in.
              </p>
            </div>
            <div className="text-[11px] font-mono text-[var(--olive-300)] pt-2 border-t border-[var(--border-subtle)]">
              100% Private & Offline-Ready
            </div>
          </div>
        </div>
      </div>

      {/* 1-Line Windows Installation Callout */}
      <div className="p-6 sm:p-7 rounded-2xl bg-[rgba(15,16,12,0.92)] border border-[var(--border-subtle)] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="text-xs font-semibold text-[#f2f2ec] flex items-center justify-center sm:justify-start gap-2">
            <Terminal className="w-4 h-4 text-[var(--olive-300)]" /> 1-Line Windows Installation
          </div>
          <div className="text-xs text-[var(--text-secondary)] max-w-md">
            Automatically download, install, and configure the TaskCatch background daemon on your Windows machine with a single PowerShell command.
          </div>
        </div>
        <button
          onClick={onOpenDownload}
          className="px-5 py-2.5 text-xs font-semibold bg-[rgba(168,173,122,0.14)] hover:bg-[rgba(168,173,122,0.25)] border border-[var(--border-subtle)] text-[var(--olive-100)] rounded-xl transition-all whitespace-nowrap shadow-sm"
        >
          View Installer Commands
        </button>
      </div>
      {/* Privacy & Trust Section */}
      <div className="space-y-6 pt-16">
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--olive-300)]">— PRIVACY & TRUST</h2>
          <h3 className="font-editorial text-4xl text-[#f2f2ec] font-medium">A trust ledger, not a privacy promise.</h3>
          <p className="text-sm text-[var(--text-secondary)]">The honest version of "your data is safe": here is exactly where everything lives.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-[rgba(10,11,8,0.4)] border border-[var(--border-subtle)] hover:bg-[rgba(19,20,16,0.6)] transition-all space-y-3">
            <div className="flex justify-between items-start">
              <h4 className="text-[14px] font-bold text-[#f2f2ec]">Bring your own Groq key</h4>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(168,173,122,0.1)] text-[var(--olive-300)] uppercase">BYOK</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">No subscription and no usage markups. You bring your own free Groq API key and query directly.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-[rgba(10,11,8,0.4)] border border-[var(--border-subtle)] hover:bg-[rgba(19,20,16,0.6)] transition-all space-y-3">
            <div className="flex justify-between items-start">
              <h4 className="text-[14px] font-bold text-[#f2f2ec]">No TaskCatch servers</h4>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(168,173,122,0.1)] text-[var(--olive-300)] uppercase">DIRECT</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Requests go straight from your machine to Groq. There is no middleman or proxy server in between.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[rgba(10,11,8,0.4)] border border-[var(--border-subtle)] hover:bg-[rgba(19,20,16,0.6)] transition-all space-y-3">
            <div className="flex justify-between items-start">
              <h4 className="text-[14px] font-bold text-[#f2f2ec]">Local SQLite storage</h4>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(168,173,122,0.1)] text-[var(--olive-300)] uppercase">SQLITE</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">All tasks, dates, and preferences live in a single SQLite database file on your PC — not in the cloud.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[rgba(10,11,8,0.4)] border border-[var(--border-subtle)] hover:bg-[rgba(19,20,16,0.6)] transition-all space-y-3">
            <div className="flex justify-between items-start">
              <h4 className="text-[14px] font-bold text-[#f2f2ec]">Source available</h4>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(168,173,122,0.1)] text-[var(--olive-300)] uppercase">OPEN</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">The code is open on GitHub. Read the data path, audit it, or build it from source for yourself.</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border-subtle)] to-transparent my-16" />

      {/* How it's built Section */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--olive-300)]">— HOW IT'S BUILT</h2>
          <h3 className="font-editorial text-4xl text-[#f2f2ec] font-medium">Honest engineering, all the way down.</h3>
          <p className="text-sm text-[var(--text-secondary)]">Native where it matters, open where it counts.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[rgba(10,11,8,0.4)] border border-[var(--border-subtle)] hover:bg-[rgba(19,20,16,0.6)] transition-all space-y-1.5">
            <h4 className="text-[13px] font-bold text-[#f2f2ec]">Tauri 2</h4>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Native webview shell, small binary, low memory</p>
          </div>
          <div className="p-5 rounded-2xl bg-[rgba(10,11,8,0.4)] border border-[var(--border-subtle)] hover:bg-[rgba(19,20,16,0.6)] transition-all space-y-1.5">
            <h4 className="text-[13px] font-bold text-[#f2f2ec]">Rust Core</h4>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Global hotkeys, clipboard hooks, SQLite store</p>
          </div>
          <div className="p-5 rounded-2xl bg-[rgba(10,11,8,0.4)] border border-[var(--border-subtle)] hover:bg-[rgba(19,20,16,0.6)] transition-all space-y-1.5">
            <h4 className="text-[13px] font-bold text-[#f2f2ec]">React 18 + Vite</h4>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Fast, responsive Olive Glow interface</p>
          </div>
          <div className="p-5 rounded-2xl bg-[rgba(10,11,8,0.4)] border border-[var(--border-subtle)] hover:bg-[rgba(19,20,16,0.6)] transition-all space-y-1.5">
            <h4 className="text-[13px] font-bold text-[#f2f2ec]">Win32 APIs</h4>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Native foreground window titles & deep-links</p>
          </div>
        </div>
      </div>

      {/* Final CTA Footer */}
      <div className="pt-24 pb-12 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-[rgba(168,173,122,0.08)] border border-[rgba(168,173,122,0.2)] flex items-center justify-center text-[var(--olive-300)] shadow-sm">
          <Zap className="w-5 h-5" />
        </div>
        <h2 className="font-editorial text-4xl text-[#f2f2ec] font-medium">Ready to capture tasks with zero friction?</h2>
        
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenDownload}
            className="px-6 py-3 rounded-xl text-[13px] font-bold text-[#0b0c0a] shadow-[0_0_25px_rgba(215,233,176,0.25)] hover:opacity-95 transition-all"
            style={{ background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))' }}
          >
            Download for Windows
          </button>
          <button
            onClick={onOpenDashboard}
            className="px-6 py-3 rounded-xl text-[13px] font-semibold border border-[var(--border-subtle)] bg-[rgba(10,11,8,0.6)] text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all shadow-sm"
          >
            Open Dashboard
          </button>
        </div>

        <div className="pt-8 text-[11px] text-[var(--text-secondary)] font-medium">
          TaskCatch • Open source • Free forever
        </div>
      </div>
    </div>
  );
}
