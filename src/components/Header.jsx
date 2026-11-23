import React from 'react';
import { safeOpen as open } from '../lib/tauri';
import { Download, Settings, Github } from 'lucide-react';
import { version } from '../../package.json';
import { Button } from './ui/Button';
import { LogoMark } from './ui/LogoMark';

const GITHUB_URL = 'https://github.com/lakshayysinghh/taskcatch';

export function Header({ currentView, onNavigate, onOpenDownload, onOpenSettings }) {
  const tab = (view, label) => (
    <button
      type="button"
      onClick={() => onNavigate(view)}
      aria-current={currentView === view ? 'page' : undefined}
      className={`relative h-8 rounded-lg px-3 text-[13px] font-medium transition ${
        currentView === view ? 'bg-white/[0.07] text-ink' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#0a0b09]/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-5 sm:px-8">
        <button
          type="button"
          onClick={() => onNavigate('overview')}
          className="group flex items-center gap-2.5 rounded-lg"
          aria-label="TaskCatch home"
        >
          <LogoMark size={28} className="transition-transform duration-300 group-hover:rotate-[-4deg]" />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">TaskCatch</span>
          <span className="hidden rounded-md border border-line-strong px-1.5 py-[1px] font-mono text-[10.5px] text-ink-3 sm:inline">
            v{version}
          </span>
        </button>

        <nav className="hidden items-center gap-1 rounded-[10px] border border-line bg-white/[0.02] p-[3px] md:flex" aria-label="Main">
          {tab('overview', 'Overview')}
          {tab('dashboard', 'Dashboard')}
        </nav>

        <div className="flex items-center gap-1.5">
          {currentView === 'overview' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => open(GITHUB_URL)} className="hidden sm:inline-flex">
                <Github className="h-4 w-4" />
                GitHub
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} className="md:hidden">
                Dashboard
              </Button>
              <Button variant="primary" size="sm" onClick={onOpenDownload}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onOpenDownload}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download app</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings" title="Settings (Ctrl+,)">
                <Settings className="h-[17px] w-[17px]" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
