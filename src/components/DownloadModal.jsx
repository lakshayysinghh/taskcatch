import React, { useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, ShieldCheck, Terminal } from 'lucide-react';
import { safeOpen as open } from '../lib/tauri';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

const COMMAND = 'irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex';
const RELEASES_URL = 'https://github.com/lakshayysinghh/taskcatch/releases/latest';

export function DownloadModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the command is selectable below.
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Download}
      title="Install TaskCatch for Windows"
      description="Runs in the tray with the global capture hotkey. Windows 10 and 11, 64-bit."
      footer={
        <Button variant="ghost" onClick={onClose} className="ml-auto">
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line-strong bg-surface-2 p-4">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <Terminal className="h-4 w-4 text-olive-300" />
            One-line install
            <span className="ml-auto rounded-full bg-olive-300/10 px-2 py-0.5 text-[11px] font-medium text-olive-200">Recommended</span>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-2">Paste into PowerShell. Installs silently and launches TaskCatch.</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-black/30 py-1.5 pl-3 pr-1.5">
            <code className="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap font-mono text-[12px] text-ink">{COMMAND}</code>
            <Button variant="secondary" size="sm" onClick={handleCopy} aria-label="Copy install command">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-ink-3">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Verifies the installer’s SHA-256 against GitHub before running it.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
          <div>
            <div className="text-[13.5px] font-semibold text-ink">Windows installer (.exe / .msi)</div>
            <div className="text-[12.5px] text-ink-2">Download from GitHub Releases and run it yourself.</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => open(RELEASES_URL)}>
            Releases <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
