import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Terminal,
  Info,
} from 'lucide-react';
import { AppLogo } from './AppLogo';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  const installCommand = 'irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex';

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadExe = () => {
    // Direct download link / release fallback
    window.open('https://github.com/lakshayysinghh/taskcatch/releases/latest/download/TaskCatch_Setup.exe', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[rgba(19,20,16,0.96)] backdrop-blur-[28px] border border-[rgba(168,173,122,0.25)] rounded-[16px] shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[rgba(168,173,122,0.12)] relative bg-[#0a0b08]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-[#a8ad7a] uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Download for Windows</span>
            </span>
          </div>

          <h2 className="text-[20px] font-bold text-[#f2f2ec] tracking-tight mb-2">
            Windows will warn you. Here's why.
          </h2>

          <p className="text-[13px] text-[#93958a] leading-relaxed">
            TaskCatch isn't code-signed with a commercial EV certificate yet — enterprise certificates cost hundreds of dollars each year, and TaskCatch is free and solo-built. The code is 100% open-source, local-first, and verified.
          </p>
        </div>

        {/* Dual Install Options Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto">
          {/* Option 1: 1-Line PowerShell Command (Recommended) */}
          <div className="p-5 rounded-[12px] bg-[rgba(10,11,8,0.9)] border border-[rgba(168,173,122,0.25)] flex flex-col justify-between space-y-4 hover:border-[rgba(168,173,122,0.4)] transition-all relative overflow-hidden">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#d9dcc4] bg-[rgba(168,173,122,0.15)] border border-[rgba(168,173,122,0.3)] px-2 py-0.5 rounded flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-[#a8ad7a]" />
                  <span>RECOMMENDED</span>
                </span>
              </div>

              <p className="text-[12px] text-[#93958a] leading-relaxed">
                Paste into PowerShell — it fetches the latest release, installs the background hotkeys, and launches with <strong>no SmartScreen prompt</strong>.
              </p>

              {/* Terminal Code Snippet */}
              <div className="p-3 rounded-[8px] bg-[#131410] border border-[rgba(168,173,122,0.18)] flex items-center justify-between gap-2 font-mono text-xs text-[#d9dcc4]">
                <div className="truncate flex items-center gap-1.5">
                  <span className="text-[#a8ad7a] font-bold select-none">PS&gt;</span>
                  <span className="truncate">{installCommand}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-[6px] bg-[#23241d] hover:bg-[#33361f] text-[#f2f2ec] border border-[rgba(168,173,122,0.25)] transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer active:scale-95 text-[11px]"
                  title="Copy command"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#a8ad7a]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#a8ad7a]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#7c8450] flex items-center gap-1 font-medium">
              <span>⚡ Fast 3-second automated installation</span>
            </div>
          </div>

          {/* Option 2: Direct .exe Installer */}
          <div className="p-5 rounded-[12px] bg-[rgba(10,11,8,0.9)] border border-[rgba(168,173,122,0.25)] flex flex-col justify-between space-y-4 hover:border-[rgba(168,173,122,0.4)] transition-all">
            <div className="space-y-2.5">
              <h3 className="text-[14px] font-semibold text-[#f2f2ec]">
                Prefer the installer?
              </h3>
              <p className="text-[12px] text-[#93958a] leading-relaxed">
                Grab the standalone <code className="text-[#d9dcc4]">.exe</code> setup wizard — two quick clicks get you past Windows SmartScreen:
              </p>

              <button
                onClick={handleDownloadExe}
                className="w-full py-2.5 rounded-[8px] text-xs font-semibold text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Download .exe installer</span>
              </button>
            </div>

            <div className="p-2.5 rounded-[8px] bg-[rgba(168,173,122,0.06)] border border-[rgba(168,173,122,0.12)] text-[11px] text-[#93958a] leading-relaxed flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#a8ad7a] flex-shrink-0 mt-0.5" />
              <span>
                When SmartScreen appears, click <strong>"More info"</strong>, then <strong>"Run anyway"</strong>. You only do this once.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[rgba(168,173,122,0.12)] bg-[#0a0b08] flex items-center justify-between text-xs text-[#93958a]">
          <div className="flex items-center gap-2">
            <AppLogo size={20} />
            <span>TaskCatch v1.0 • Windows 10 & 11 (64-bit)</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#a8ad7a] hover:text-[#d9dcc4] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
