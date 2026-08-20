import React, { useState } from 'react';

export function Tooltip({ children, content }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative flex items-center group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md whitespace-nowrap z-50 animate-in fade-in zoom-in duration-200">
          {content}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
        </div>
      )}
    </div>
  );
}
