import React from 'react';

const VARIANTS = {
  primary:
    'bg-gradient-to-b from-olive-100 to-olive-300 text-[#15160f] shadow-glow hover:from-olive-50 hover:to-olive-200 active:to-olive-300',
  secondary:
    'bg-surface-2 text-ink border border-line-strong shadow-card hover:bg-surface-3 hover:border-olive-300/25',
  ghost: 'text-ink-2 hover:text-ink hover:bg-white/[0.05]',
  danger: 'text-danger bg-danger/10 border border-danger/20 hover:bg-danger/15',
};

const SIZES = {
  sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-[13px] gap-2 rounded-[10px]',
  lg: 'h-11 px-5 text-[14px] gap-2 rounded-xl',
  icon: 'h-8 w-8 justify-center rounded-lg',
};

/** The app's one button. Variants: primary | secondary | ghost | danger. */
export const Button = React.forwardRef(function Button(
  { variant = 'secondary', size = 'md', type = 'button', className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex shrink-0 select-none items-center whitespace-nowrap font-medium transition-[background,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b09] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
