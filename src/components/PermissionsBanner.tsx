import React from 'react';
import { KeyRound, X } from 'lucide-react';
import { AppSettings, SystemPermissionsStatus } from '../lib/types';

interface PermissionsBannerProps {
  settings: AppSettings;
  permissions: SystemPermissionsStatus | null;
  onOpenSettings: () => void;
  onDismiss: () => void;
  isDismissed: boolean;
}

export const PermissionsBanner: React.FC<PermissionsBannerProps> = ({
  settings,
  onOpenSettings,
  onDismiss,
  isDismissed,
}) => {
  if (isDismissed) return null;
  const isMissingKey = !settings.groq_api_key && !settings.openai_api_key;
  if (!isMissingKey) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 mb-4">
      <div className="bg-[#171d15] border border-[#273322] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#222c1d] text-[#a2b885] flex-shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#f0f3eb]">
              Configure Free Groq Cloud Key
            </h4>
            <p className="text-xs text-[#86937e]">
              Add your API key in settings for instant sub-second AI task extraction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onOpenSettings}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#11170d] bg-[#a2b885] hover:bg-[#b3ca94] transition-all cursor-pointer"
          >
            Configure
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-[#6e7d66] hover:text-[#d4dcce] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
