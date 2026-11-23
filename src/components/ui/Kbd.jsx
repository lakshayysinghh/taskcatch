import React from 'react';

/** A keyboard key cap, e.g. <Kbd>F9</Kbd>. */
export function Kbd({ children, className = '' }) {
  return (
    <kbd
      className={`inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-[5px] border border-line-strong border-b-[rgba(0,0,0,0.6)] bg-surface-3 px-1.5 font-mono text-[10.5px] font-medium leading-none text-ink-2 shadow-[0_1px_0_rgba(0,0,0,0.5)] ${className}`}
    >
      {children}
    </kbd>
  );
}
