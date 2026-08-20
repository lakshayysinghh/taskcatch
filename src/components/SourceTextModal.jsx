import React from 'react';
import { X, FileText } from 'lucide-react';

export function SourceTextModal({ isOpen, onClose, text }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#12140e] border border-[#2a301e] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-[#e4e6db]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a917e] hover:text-[#e4e6db] p-1.5 rounded-lg hover:bg-[#1f2416] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-[#d7e9b0]" />
          <h2 className="text-lg font-bold tracking-tight text-[#f3f5ec]">Original Source Text</h2>
        </div>

        <div className="bg-[#0b0c08] border border-[#272d1c] rounded-xl p-4 max-h-80 overflow-y-auto font-mono text-xs text-[#c5cbb9] leading-relaxed whitespace-pre-wrap select-text">
          {text || 'No raw source context recorded for this item.'}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#23271a] hover:bg-[#313725] text-[#d7e9b0] rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
