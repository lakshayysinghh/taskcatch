import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ToastMessage } from '../lib/types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto p-4 rounded-2xl bg-[#121611] border border-[#252f20] shadow-2xl flex items-start gap-3 transition-all animate-slideUp"
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#a2b885] mt-0.5 flex-shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 text-[#e07575] mt-0.5 flex-shrink-0" />}
          {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#d8b068] mt-0.5 flex-shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-[#8fa372] mt-0.5 flex-shrink-0" />}

          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-semibold text-[#f0f3eb] leading-tight">
              {t.title}
            </h5>
            <p className="text-xs text-[#86937e] mt-0.5 line-clamp-2">
              {t.message}
            </p>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 rounded-lg text-[#6e7d66] hover:text-[#f0f3eb] hover:bg-[#1a2116] transition-all cursor-pointer flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
