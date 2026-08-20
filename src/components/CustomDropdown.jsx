import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function CustomDropdown({ value, options, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[rgba(10,11,8,0.5)] border border-[rgba(168,173,122,0.15)] hover:border-[rgba(168,173,122,0.3)] hover:text-[#f2f2ec] py-1.5 px-3 rounded-full outline-none cursor-pointer transition-all min-w-[120px] justify-between shadow-sm"
      >
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown className="w-3 h-3 text-[var(--text-dim)]" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 w-44 bg-[rgba(15,16,12,0.95)] border border-[rgba(168,173,122,0.2)] rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className="w-full text-left flex items-center justify-between px-3.5 py-2.5 text-[13px] hover:bg-[rgba(168,173,122,0.1)] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                {opt.icon && (
                  <opt.icon
                    className={`w-3.5 h-3.5 ${
                      value === opt.value
                        ? 'text-[var(--olive-300)]'
                        : 'text-[var(--text-dim)] group-hover:text-[var(--text-secondary)]'
                    }`}
                  />
                )}
                <span
                  className={
                    value === opt.value
                      ? 'text-[#f2f2ec] font-bold'
                      : 'text-[var(--text-secondary)] font-medium group-hover:text-[#f2f2ec]'
                  }
                >
                  {opt.label}
                </span>
              </div>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-[var(--olive-500)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
