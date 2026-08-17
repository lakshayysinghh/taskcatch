import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 36, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-[10px] bg-gradient-to-br from-[#23261a] to-[#0d0e0a] p-[1px] border border-[rgba(168,173,122,0.3)] shadow-[0_4px_20px_rgba(124,132,80,0.2)] flex items-center justify-center overflow-hidden flex-shrink-0 group hover:border-[rgba(168,173,122,0.6)] transition-all ${className}`}
    >
      {/* Ambient background glow inside badge */}
      <div className="absolute inset-0 bg-radial from-[rgba(168,173,122,0.25)] via-transparent to-transparent opacity-80 pointer-events-none" />

      {/* SVG Icon */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[72%] h-[72%] relative z-10 drop-shadow-[0_2px_8px_rgba(168,173,122,0.4)]"
      >
        <defs>
          <linearGradient id="oliveGradientLogo" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f2f4e8" />
            <stop offset="45%" stopColor="#a8ad7a" />
            <stop offset="100%" stopColor="#545a34" />
          </linearGradient>
          <linearGradient id="glowStroke" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d9dcc4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#33361f" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Outer Catch Reticle Arc */}
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="url(#glowStroke)"
          strokeWidth="1.5"
          strokeDasharray="4 2.5"
          className="opacity-75"
        />

        {/* Dynamic Energy Lightning Catch Shape Centered */}
        <path
          d="M17.5 5L9.5 16.5H16L14.5 27L22.5 15.5H16L17.5 5Z"
          fill="url(#oliveGradientLogo)"
          stroke="#0b0c0a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
