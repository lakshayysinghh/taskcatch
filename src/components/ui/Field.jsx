import React from 'react';

/** Shared look for text inputs, selects and textareas. */
export const inputClass =
  'w-full rounded-[10px] border border-line-strong bg-black/25 px-3 text-[13.5px] text-ink placeholder:text-ink-3 outline-none transition focus:border-olive-300/50 focus:ring-4 focus:ring-olive-300/10 disabled:opacity-60';

export function Label({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px] font-medium text-ink-2">
      <span>{children}</span>
      {hint && <span className="text-[11.5px] font-normal text-ink-3">{hint}</span>}
    </label>
  );
}

/** A select with a custom chevron so it matches the other fields. */
export function Select({ className = '', children, ...props }) {
  return (
    <div className="relative">
      <select className={`${inputClass} h-10 cursor-pointer appearance-none pr-9 ${className}`} {...props}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
