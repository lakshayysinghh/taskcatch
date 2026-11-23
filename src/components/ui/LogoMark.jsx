import React, { useId } from 'react';

/** TaskCatch mark: selection corners around a check. Matches public/favicon.svg. */
export function LogoMark({ size = 28, className = '' }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef1d9" />
          <stop offset="1" stopColor="#8d945a" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="9" fill="#141511" stroke="rgba(236,238,220,0.14)" />
      <path
        d="M8.5 12.5V10a1.5 1.5 0 0 1 1.5-1.5h2.5M19.5 8.5H22a1.5 1.5 0 0 1 1.5 1.5v2.5M23.5 19.5V22a1.5 1.5 0 0 1-1.5 1.5h-2.5M12.5 23.5H10A1.5 1.5 0 0 1 8.5 22v-2.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="m12 16.3 2.8 2.8 5.4-5.9"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
