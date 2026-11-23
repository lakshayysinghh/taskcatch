import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: Escape closes, Tab stays inside, background scroll is
 * locked, and focus returns to whatever opened it.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  size = 'md',
  footer,
  children,
  bodyClassName = 'px-6 py-5',
  panelClassName = '',
  ariaLabel, // accessible name for dialogs without a visible title
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // Focus the field marked data-autofocus, else the first focusable element.
    const timer = setTimeout(() => {
      const panel = panelRef.current;
      const target = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
      target?.focus();
    }, 30);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const trapTab = (e) => {
    if (e.key !== 'Tab') return;
    const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onCloseRef.current?.()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        aria-describedby={description ? descId : undefined}
        onKeyDown={trapTab}
        className={`relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-pop animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 ${SIZES[size]} ${panelClassName}`}
      >
        {title && (
          <div className="flex items-start gap-3.5 border-b border-line px-6 pb-4 pt-5">
            {Icon && (
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-olive-300/20 bg-olive-300/10 text-olive-200">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-[15.5px] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onCloseRef.current?.()}
              aria-label="Close"
              className="-mr-1.5 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition hover:bg-white/[0.06] hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
        {footer && (
          <div className="flex items-center justify-between gap-3 border-t border-line bg-black/20 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
