import React from 'react';
import { Settings, Download } from 'lucide-react';
import { AppSettings } from '../lib/types';
import { AppLogo } from './AppLogo';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenDownload?: () => void;
  onOpenLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenDownload,
  onOpenLanding,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(168,173,122,0.12)] bg-[rgba(10,11,8,0.85)] backdrop-blur-[24px] mb-8">
      <div className="w-full px-6 sm:px-10 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div
          className="flex items-center gap-[14px] cursor-pointer group flex-shrink-0"
          onClick={onOpenLanding}
          title="View Product Overview"
        >
          <AppLogo size={34} />

          <div>
            <div className="text-[16px] font-bold text-[#f2f2ec] tracking-tight leading-tight flex items-center gap-2">
              <span className="group-hover:text-[#d9dcc4] transition-colors">taskcatch</span>
              <span className="text-[10px] font-semibold text-[#a8ad7a] bg-[rgba(168,173,122,0.12)] border border-[rgba(168,173,122,0.25)] px-1.5 py-0.2 rounded uppercase tracking-wider">
                v1.0
              </span>
            </div>
            <div className="text-[12px] text-[#93958a] mt-[2px] font-normal">
              universal quick-add extractor
            </div>
          </div>
        </div>

        {/* Right: Download & Settings */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Download for Windows Button */}
          {onOpenDownload && (
            <button
              onClick={onOpenDownload}
              className="font-sans text-[12px] font-medium px-[13px] py-[8px] rounded-[8px] border border-[rgba(168,173,122,0.2)] bg-[rgba(168,173,122,0.08)] hover:bg-[rgba(168,173,122,0.18)] hover:border-[rgba(168,173,122,0.4)] backdrop-blur-[8px] text-[#d9dcc4] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              title="Download for Windows (PowerShell or .exe)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>download app</span>
            </button>
          )}

          {/* Settings Icon */}
          <button
            onClick={onOpenSettings}
            className="p-[8px] rounded-[8px] border border-[rgba(168,173,122,0.14)] bg-[rgba(19,20,16,0.55)] backdrop-blur-[8px] text-[#93958a] hover:text-[#f2f2ec] hover:border-[rgba(168,173,122,0.3)] transition-all cursor-pointer"
            title="Settings (Ctrl+,)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
