import React, { useState } from 'react';
import { safeOpen as open } from '../lib/tauri';
import { X, Download, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export function DownloadModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const command = 'irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--surface-glass-modal)] border border-[var(--border-subtle)] rounded-lg w-full max-w-lg shadow-2xl relative text-[#e4e6db] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-[rgba(168,173,122,0.12)] border border-[var(--border-subtle)]">
              <Download className="w-4 h-4 text-[var(--olive-300)]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f2f2ec]">Install TaskCatch Daemon</h2>
              <p className="text-xs text-[var(--text-secondary)]">Universal Windows global highlight capture & tray app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[#f2f2ec] p-1.5 rounded-md hover:bg-[rgba(168,173,122,0.1)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5">
          {/* Method 1: 1-Line PowerShell Command */}
          <div>
            <div className="text-xs font-semibold text-[#c8cebe] mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[var(--olive-300)]" /> Recommended: 1-Line PowerShell Installer
            </div>
            <div className="flex items-center justify-between bg-[rgba(10,11,8,0.95)] border border-[var(--border-subtle)] rounded-md p-3 font-mono text-xs text-[var(--olive-100)] select-all overflow-x-auto">
              <span className="truncate mr-2">{command}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-md bg-[rgba(168,173,122,0.15)] hover:bg-[rgba(168,173,122,0.3)] text-[#d5d6cd] transition-colors shrink-0"
                title="Copy Command"
              >
                {copied ? <Check className="w-4 h-4 text-[#6ec97a]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Method 2: Direct EXE Installer */}
          <div className="p-4 rounded-md bg-[rgba(10,11,8,0.6)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#f2f2ec]">TaskCatch_Setup.exe (Standalone)</div>
              <div className="text-[11px] text-[var(--text-secondary)]">Includes background tray icon & global shortcut listener</div>
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                open('https://github.com/lakshayysinghh/taskcatch/releases');
              }}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-[rgba(168,173,122,0.12)] hover:bg-[rgba(168,173,122,0.25)] text-[var(--olive-100)] border border-[var(--border-subtle)] transition-all flex items-center gap-1.5"
            >
              Download EXE <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-[var(--border-subtle)] bg-[rgba(10,11,8,0.5)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[#f2f2ec] rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
