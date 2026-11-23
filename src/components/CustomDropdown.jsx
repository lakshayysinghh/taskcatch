import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/** Compact filter menu used in the dashboard toolbar. */
export function CustomDropdown({ value, options, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setIsOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        className={`inline-flex h-9 items-center gap-2 rounded-[10px] border px-3 text-[13px] font-medium transition ${
          isOpen || value !== options[0].value
            ? 'border-olive-300/30 bg-olive-300/[0.07] text-ink'
            : 'border-line-strong bg-surface text-ink-2 hover:text-ink'
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-ink-3" />}
        <span>{selected.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-ink-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 z-30 mt-1.5 min-w-[190px] overflow-hidden rounded-xl border border-line-strong bg-surface-2 p-1 shadow-pop animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
                  active ? 'bg-white/[0.06] text-ink' : 'text-ink-2 hover:bg-white/[0.04] hover:text-ink'
                }`}
              >
                {opt.icon && <opt.icon className={`h-3.5 w-3.5 ${active ? 'text-olive-300' : 'text-ink-3'}`} />}
                <span className="flex-1">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-olive-300" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
