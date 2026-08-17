import React, { useState } from 'react';
import {
  Download,
  Github,
  Copy,
  Check,
  Zap,
  ArrowRight,
  Clock,
  Sun,
  Wrench,
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { AmbientBackground } from './AmbientBackground';

interface LandingPageProps {
  onOpenApp: () => void;
  onOpenDownload: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenApp,
  onOpenDownload,
}) => {
  const [copied, setCopied] = useState(false);
  const installCmd = 'irm https://taskcatch.app/install.ps1 | iex';

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative min-h-screen text-[#e4e4de] bg-[#0a0b08] font-sans selection:bg-[#33361f] selection:text-[#d9dcc4] overflow-x-hidden">
      {/* Subtle 3D Ambient Mouse Parallax Layer */}
      <AmbientBackground subtle={true} />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[rgba(168,173,122,0.12)] bg-[rgba(10,11,8,0.85)] backdrop-blur-[24px]">
        <div className="w-full px-6 sm:px-10 h-16 flex items-center justify-between">
          {/* Left: Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer flex-shrink-0 group"
            onClick={onOpenApp}
            title="Launch Dashboard"
          >
            <AppLogo size={32} />
            <span className="text-[17px] font-bold text-[#f2f2ec] tracking-tight group-hover:text-[#d9dcc4] transition-colors">
              taskcatch
            </span>
          </div>

          {/* Center: Centered Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[#93958a] font-medium">
            <a href="#what-it-does" className="hover:text-[#d9dcc4] transition-colors no-underline">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#d9dcc4] transition-colors no-underline">
              How it works
            </a>
            <a href="#privacy" className="hover:text-[#d9dcc4] transition-colors no-underline">
              Privacy
            </a>
            <a href="#tech-stack" className="hover:text-[#d9dcc4] transition-colors no-underline">
              Engineering
            </a>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            <a
              href="https://github.com/taskcatch/taskcatch"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-[8px] bg-white/[0.04] hover:bg-white/[0.08] border border-[rgba(168,173,122,0.2)] text-[12px] font-medium text-[#d9dcc4] transition-all flex items-center gap-1.5 no-underline cursor-pointer"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>

            <button
              onClick={onOpenDownload}
              className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Download</span>
            </button>

            <button
              onClick={onOpenApp}
              className="hidden sm:flex px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold text-[#d9dcc4] bg-[rgba(168,173,122,0.12)] hover:bg-[rgba(168,173,122,0.22)] border border-[rgba(168,173,122,0.3)] transition-all items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-6 max-w-4xl mx-auto text-center">
        {/* Top Micro-Badges */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[rgba(168,173,122,0.08)] border border-[rgba(168,173,122,0.2)] text-[12px] text-[#a8ad7a] mb-8 font-medium">
          <span>Free & open source</span>
          <span>•</span>
          <span>Zero subscription — bring your own key</span>
          <span>•</span>
          <span>No taskcatch servers</span>
        </div>

        {/* Editorial Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight text-[#f2f2ec] mb-6 leading-[1.08] font-['Newsreader',serif]">
          Highlight. <span className="italic text-[#d9dcc4]">TaskCatch.</span>
        </h1>

        {/* Subtitle Description */}
        <p className="text-base sm:text-lg text-[#93958a] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          A free, open-source universal action item extractor for Windows. Highlight text in Slack, Chrome, Word, or your code editor — press <kbd className="px-1.5 py-0.5 rounded bg-[#1f2119] text-[#d9dcc4] border border-[rgba(168,173,122,0.3)] font-mono text-xs">F9</kbd> — and clean action items land right into your dashboard with smart deadlines and priority.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex items-center justify-center gap-3.5 flex-wrap mb-8">
          <button
            onClick={onOpenDownload}
            className="px-6 py-3 rounded-[10px] text-sm font-semibold text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_24px_rgba(124,132,80,0.25)] active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download for Windows</span>
          </button>

          <button
            onClick={onOpenApp}
            className="px-6 py-3 rounded-[10px] text-sm font-semibold text-[#f2f2ec] bg-[rgba(19,20,16,0.85)] hover:bg-[rgba(168,173,122,0.15)] border border-[rgba(168,173,122,0.3)] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Zap className="w-4 h-4 text-[#a8ad7a]" />
            <span>Launch Live Dashboard</span>
          </button>

          <a
            href="https://github.com/taskcatch/taskcatch"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-[10px] bg-white/[0.03] hover:bg-white/[0.08] border border-[rgba(168,173,122,0.2)] text-sm font-medium text-[#d9dcc4] transition-all flex items-center gap-2 no-underline cursor-pointer"
          >
            <Github className="w-4 h-4" />
            <span>Star on GitHub</span>
            <span className="text-xs px-1.5 py-0.2 rounded bg-[#1f2119] text-[#a8ad7a] border border-[rgba(168,173,122,0.2)]">★ 120</span>
          </a>
        </div>

        {/* 1-Line PowerShell Install Box */}
        <div className="max-w-md mx-auto mb-6 p-2 rounded-[10px] bg-[rgba(19,20,16,0.92)] border border-[rgba(168,173,122,0.25)] flex items-center justify-between gap-2 font-mono text-xs text-[#d9dcc4] shadow-md">
          <div className="truncate flex items-center gap-2 pl-2">
            <span className="text-[#a8ad7a] font-bold select-none">PS&gt;</span>
            <span className="truncate">{installCmd}</span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-[6px] bg-[#23241d] hover:bg-[#33361f] text-[#f2f2ec] border border-[rgba(168,173,122,0.25)] transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95 text-[11px]"
            title="Copy command"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#a8ad7a]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#a8ad7a]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="text-[12px] text-[#737568] space-x-2">
          <span>• 100% Free on Windows 10 & 11</span>
          <span>•</span>
          <span>Local SQLite Storage</span>
          <span>•</span>
          <span>Under 15 MB</span>
        </div>

        {/* Editorial Woodcut Hero Illustration Banner */}
        <div className="mt-14 max-w-3xl mx-auto rounded-[16px] overflow-hidden border border-[rgba(168,173,122,0.22)] shadow-[0_16px_48px_rgba(0,0,0,0.7)] group">
          <img
            src="/images/editorial_desk.jpg"
            alt="Quiet Workspace by the Window Illustration"
            className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
          />
          <div className="p-3 bg-[rgba(10,11,8,0.92)] border-t border-[rgba(168,173,122,0.12)] text-[11px] text-[#808375] font-['Newsreader',serif] italic text-center">
            one global shortcut, every window. focus where your work already is.
          </div>
        </div>
      </section>

      {/* SECTION 1: WHAT IT DOES */}
      <section id="what-it-does" className="relative z-10 py-20 px-6 border-t border-[rgba(168,173,122,0.12)] max-w-5xl mx-auto">
        <div className="mb-12">
          <span className="text-[11px] font-bold text-[#a8ad7a] uppercase tracking-widest block mb-2">
            — WHAT IT DOES
          </span>
          <h2 className="text-3xl sm:text-4xl font-normal text-[#f2f2ec] tracking-tight font-['Newsreader',serif]">
            Three things, done quietly well.
          </h2>
          <p className="text-sm text-[#93958a] mt-2 max-w-xl">
            No complex dashboards to babysit, no context switching. Highlight, tap, and clean tasks land where you can organize them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-[14px] bg-[rgba(19,20,16,0.65)] border border-[rgba(168,173,122,0.16)] space-y-4 hover:border-[rgba(168,173,122,0.35)] transition-all">
            <div className="w-9 h-9 rounded-[8px] bg-[rgba(168,173,122,0.12)] border border-[rgba(168,173,122,0.25)] flex items-center justify-center text-[#d9dcc4]">
              <Zap className="w-4 h-4 text-[#a8ad7a]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#f2f2ec]">
              Highlight & extract, anywhere
            </h3>
            <p className="text-[13px] text-[#93958a] leading-relaxed">
              Press your global hotkey in any window. TaskCatch safely grabs the highlighted text non-destructively without wiping your existing clipboard buffer.
            </p>
            <div className="pt-2">
              <span className="text-[11px] font-mono px-2 py-1 rounded bg-[#1f2119] border border-[rgba(168,173,122,0.25)] text-[#a8ad7a]">
                F9 / Alt + C
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-[14px] bg-[rgba(19,20,16,0.65)] border border-[rgba(168,173,122,0.16)] space-y-4 hover:border-[rgba(168,173,122,0.35)] transition-all">
            <div className="w-9 h-9 rounded-[8px] bg-[rgba(168,173,122,0.12)] border border-[rgba(168,173,122,0.25)] flex items-center justify-center text-[#d9dcc4]">
              <Clock className="w-4 h-4 text-[#a8ad7a]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#f2f2ec]">
              Smart deadline & origin context
            </h3>
            <p className="text-[13px] text-[#93958a] leading-relaxed">
              Relative deadlines (<em>"tomorrow at 5pm"</em>, <em>"by EOD"</em>) resolve to exact ISO timestamps. Origin app badges and deep-link URLs are automatically attached.
            </p>
            <div className="pt-2">
              <span className="text-[11px] font-mono px-2 py-1 rounded bg-[#1f2119] border border-[rgba(168,173,122,0.25)] text-[#d9dcc4]">
                💬 Slack · 🔗 Open source
              </span>
            </div>
          </div>

          {/* Card 3: Morning Standup Bot with Under Development Status */}
          <div className="p-6 rounded-[14px] bg-[rgba(19,20,16,0.65)] border border-[rgba(168,173,122,0.16)] space-y-4 hover:border-[rgba(168,173,122,0.35)] transition-all relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-[8px] bg-[rgba(168,173,122,0.12)] border border-[rgba(168,173,122,0.25)] flex items-center justify-center text-[#d9dcc4]">
                <Sun className="w-4 h-4 text-[#a8ad7a]" />
              </div>
              {/* Honest Under Development Status Badge */}
              <span className="text-[10px] font-semibold text-[#d9dcc4] bg-[rgba(168,173,122,0.15)] border border-[rgba(168,173,122,0.3)] px-2 py-0.5 rounded flex items-center gap-1">
                <Wrench className="w-2.5 h-2.5 text-[#a8ad7a]" />
                <span>Under Development • Beta Preview</span>
              </span>
            </div>

            <h3 className="text-[16px] font-semibold text-[#f2f2ec]">
              The Morning Standup Bot
            </h3>
            <p className="text-[13px] text-[#93958a] leading-relaxed">
              A proactive executive assistant that greets you, summarizes overdue items, and organizes your top 3 daily priorities. Currently in experimental preview.
            </p>
            <div className="pt-2">
              <span className="text-[11px] font-mono px-2 py-1 rounded bg-[#1f2119] border border-[rgba(168,173,122,0.25)] text-[#a8ad7a]">
                ☀️ Standup Assistant
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS + CRAFT IMAGE */}
      <section id="how-it-works" className="relative z-10 py-20 px-6 border-t border-[rgba(168,173,122,0.12)] max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-[11px] font-bold text-[#a8ad7a] uppercase tracking-widest block mb-2">
              — HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-normal text-[#f2f2ec] tracking-tight font-['Newsreader',serif] mb-4">
              Highlight, tap, extracted.
            </h2>
            <p className="text-sm text-[#93958a] mb-8 leading-relaxed">
              The whole interaction takes under 200 milliseconds. Everything happens silently without breaking your flow or leaving your active window.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-[10px] bg-[rgba(19,20,16,0.6)] border border-[rgba(168,173,122,0.14)] flex items-start gap-3.5">
                <span className="text-[12px] font-mono font-bold text-[#a8ad7a] mt-0.5">01</span>
                <div>
                  <h4 className="text-[14px] font-semibold text-[#f2f2ec]">Highlight anywhere</h4>
                  <p className="text-[12px] text-[#93958a] mt-0.5">Select text in Slack, Chrome, VS Code, or email.</p>
                </div>
              </div>

              <div className="p-4 rounded-[10px] bg-[rgba(19,20,16,0.6)] border border-[rgba(168,173,122,0.14)] flex items-start gap-3.5">
                <span className="text-[12px] font-mono font-bold text-[#a8ad7a] mt-0.5">02</span>
                <div>
                  <h4 className="text-[14px] font-semibold text-[#f2f2ec]">Tap F9</h4>
                  <p className="text-[12px] text-[#93958a] mt-0.5">Global OS hotkey triggers instant extraction in &lt;200ms.</p>
                </div>
              </div>

              <div className="p-4 rounded-[10px] bg-[rgba(19,20,16,0.6)] border border-[rgba(168,173,122,0.14)] flex items-start gap-3.5">
                <span className="text-[12px] font-mono font-bold text-[#a8ad7a] mt-0.5">03</span>
                <div>
                  <h4 className="text-[14px] font-semibold text-[#f2f2ec]">Clean task lands</h4>
                  <p className="text-[12px] text-[#93958a] mt-0.5">Floating mini-HUD confirms capture with 1-click Undo.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Woodcut Illustration */}
          <div className="rounded-[16px] overflow-hidden border border-[rgba(168,173,122,0.2)] shadow-xl">
            <img
              src="/images/editorial_craft.jpg"
              alt="Craftsman Study Desk Illustration"
              className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
            />
            <div className="p-3 bg-[rgba(10,11,8,0.9)] border-t border-[rgba(168,173,122,0.1)] text-[11px] text-[#808375] font-['Newsreader',serif] italic text-center">
              clean checklists, crafted for clarity.
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PRIVACY & TRUST */}
      <section id="privacy" className="relative z-10 py-20 px-6 border-t border-[rgba(168,173,122,0.12)] max-w-5xl mx-auto">
        <div className="mb-12">
          <span className="text-[11px] font-bold text-[#a8ad7a] uppercase tracking-widest block mb-2">
            — PRIVACY & TRUST
          </span>
          <h2 className="text-3xl sm:text-4xl font-normal text-[#f2f2ec] tracking-tight font-['Newsreader',serif]">
            A trust ledger, not a privacy promise.
          </h2>
          <p className="text-sm text-[#93958a] mt-2 max-w-xl">
            The honest version of "your data is safe": here is exactly where everything lives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-5 rounded-[12px] bg-[rgba(19,20,16,0.65)] border border-[rgba(168,173,122,0.14)] space-y-2">
            <div className="text-[13px] font-semibold text-[#f2f2ec] flex items-center justify-between">
              <span>Bring your own Groq key</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f2119] text-[#a8ad7a]">BYOK</span>
            </div>
            <p className="text-[12px] text-[#93958a] leading-relaxed">
              No subscription and no usage markups. You bring your own free Groq API key and query directly.
            </p>
          </div>

          <div className="p-5 rounded-[12px] bg-[rgba(19,20,16,0.65)] border border-[rgba(168,173,122,0.14)] space-y-2">
            <div className="text-[13px] font-semibold text-[#f2f2ec] flex items-center justify-between">
              <span>No TaskCatch servers</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f2119] text-[#a8ad7a]">DIRECT</span>
            </div>
            <p className="text-[12px] text-[#93958a] leading-relaxed">
              Requests go straight from your machine to Groq. There is no middleman or proxy server in between.
            </p>
          </div>

          <div className="p-5 rounded-[12px] bg-[rgba(19,20,16,0.65)] border border-[rgba(168,173,122,0.14)] space-y-2">
            <div className="text-[13px] font-semibold text-[#f2f2ec] flex items-center justify-between">
              <span>Local SQLite storage</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f2119] text-[#a8ad7a]">SQLITE</span>
            </div>
            <p className="text-[12px] text-[#93958a] leading-relaxed">
              All tasks, dates, and preferences live in a single SQLite database file on your PC — not in the cloud.
            </p>
          </div>

          <div className="p-5 rounded-[12px] bg-[rgba(19,20,16,0.65)] border border-[rgba(168,173,122,0.14)] space-y-2">
            <div className="text-[13px] font-semibold text-[#f2f2ec] flex items-center justify-between">
              <span>Source available</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f2119] text-[#a8ad7a]">OPEN</span>
            </div>
            <p className="text-[12px] text-[#93958a] leading-relaxed">
              The code is open on GitHub. Read the data path, audit it, or build it from source for yourself.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: HOW IT'S BUILT */}
      <section id="tech-stack" className="relative z-10 py-20 px-6 border-t border-[rgba(168,173,122,0.12)] max-w-5xl mx-auto">
        <div className="mb-12">
          <span className="text-[11px] font-bold text-[#a8ad7a] uppercase tracking-widest block mb-2">
            — HOW IT'S BUILT
          </span>
          <h2 className="text-3xl sm:text-4xl font-normal text-[#f2f2ec] tracking-tight font-['Newsreader',serif]">
            Honest engineering, all the way down.
          </h2>
          <p className="text-sm text-[#93958a] mt-2 max-w-xl">
            Native where it matters, open where it counts.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-[10px] bg-[rgba(19,20,16,0.6)] border border-[rgba(168,173,122,0.14)] space-y-1">
            <div className="text-[13px] font-semibold text-[#f2f2ec]">Tauri 2</div>
            <div className="text-[11px] text-[#93958a]">Native webview shell, small binary, low memory</div>
          </div>

          <div className="p-4 rounded-[10px] bg-[rgba(19,20,16,0.6)] border border-[rgba(168,173,122,0.14)] space-y-1">
            <div className="text-[13px] font-semibold text-[#f2f2ec]">Rust Core</div>
            <div className="text-[11px] text-[#93958a]">Global hotkeys, clipboard hooks, SQLite store</div>
          </div>

          <div className="p-4 rounded-[10px] bg-[rgba(19,20,16,0.6)] border border-[rgba(168,173,122,0.14)] space-y-1">
            <div className="text-[13px] font-semibold text-[#f2f2ec]">React 18 + Vite</div>
            <div className="text-[11px] text-[#93958a]">Fast, responsive Olive Glow interface</div>
          </div>

          <div className="p-4 rounded-[10px] bg-[rgba(19,20,16,0.6)] border border-[rgba(168,173,122,0.14)] space-y-1">
            <div className="text-[13px] font-semibold text-[#f2f2ec]">Win32 APIs</div>
            <div className="text-[11px] text-[#93958a]">Native foreground window titles & deep-links</div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="relative z-10 py-16 px-6 border-t border-[rgba(168,173,122,0.14)] bg-[#070805] text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <AppLogo size={40} className="mx-auto" />
          <h3 className="text-2xl sm:text-3xl font-normal text-[#f2f2ec] font-['Newsreader',serif]">
            Ready to capture tasks with zero friction?
          </h3>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onOpenDownload}
              className="px-6 py-2.5 rounded-[8px] text-xs font-semibold text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Download for Windows
            </button>
            <button
              onClick={onOpenApp}
              className="px-6 py-2.5 rounded-[8px] text-xs font-semibold text-[#d9dcc4] bg-[rgba(168,173,122,0.1)] hover:bg-[rgba(168,173,122,0.2)] border border-[rgba(168,173,122,0.25)] transition-all cursor-pointer active:scale-95"
            >
              Open Dashboard
            </button>
          </div>
          <div className="text-[11px] text-[#55634e] pt-6">
            TaskCatch • Open source • Free forever
          </div>
        </div>
      </footer>
    </div>
  );
};
