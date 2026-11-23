import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Clock, Download, MousePointerClick, Settings, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Kbd } from './ui/Kbd';
import { LogoMark } from './ui/LogoMark';
import { CategoryTag, PriorityBadge } from './ui/Badges';

/* ---------- Step visuals (small product mockups, no real data) ---------- */

function WelcomeVisual() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="absolute h-40 w-40 rounded-full border border-olive-300/10" />
      <div className="absolute h-56 w-56 rounded-full border border-olive-300/[0.06]" />
      <div className="absolute h-28 w-28 rounded-full bg-[radial-gradient(closest-side,rgba(180,187,130,0.35),transparent)] blur-xl" />
      <LogoMark size={64} className="relative" />
    </div>
  );
}

function CaptureVisual({ hotkey }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
      <p className="max-w-[360px] text-center text-[12.5px] leading-relaxed text-ink-2">
        “Can you{' '}
        <span className="rounded-[3px] bg-olive-300/25 px-0.5 text-olive-50 shadow-[0_0_0_1px_rgba(180,187,130,0.35)]">
          send the signed contract to Dana by tomorrow
        </span>
        ?”
      </p>
      <div className="flex items-center gap-2 text-[12px] text-ink-3">
        <MousePointerClick className="h-3.5 w-3.5" /> Highlight, then press <Kbd className="text-olive-100">{hotkey}</Kbd>
      </div>
      <div className="w-full max-w-[340px] rounded-xl border border-line-strong bg-surface-2 px-3.5 py-3 shadow-card">
        <div className="text-[13px] font-medium text-ink">Send the signed contract to Dana</div>
        <div className="mt-2 flex items-center gap-2.5">
          <PriorityBadge priority="High" />
          <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-2">
            <Clock className="h-3 w-3 text-ink-3" /> Tomorrow · 5:00 pm
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickAddVisual() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
      <div className="flex w-full max-w-[360px] items-center gap-2 rounded-xl border border-olive-300/30 bg-black/30 px-3.5 py-3 text-[13px] text-ink shadow-[0_0_0_4px_rgba(180,187,130,0.08)]">
        <Sparkles className="h-4 w-4 shrink-0 text-olive-300" />
        <span className="truncate">Pay the invoice by friday #finance</span>
        <span className="ml-auto h-4 w-px shrink-0 animate-pulse bg-olive-200" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <PriorityBadge priority="Medium" />
        <CategoryTag category="Finance" />
        <span className="inline-flex items-center gap-1 text-[12px] text-ink-2">
          <Calendar className="h-3.5 w-3.5 text-ink-3" /> Fri · 5:00 pm
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
        Open it anywhere with <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </div>
    </div>
  );
}

function StandupVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-8">
      <div className="ml-auto max-w-[260px] rounded-2xl rounded-br-md border border-olive-300/20 bg-olive-300/10 px-3.5 py-2 text-[12.5px] text-ink">
        What should I focus on first?
      </div>
      <div className="flex max-w-[320px] items-start gap-2">
        <LogoMark size={22} className="mt-0.5 shrink-0" />
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface-2 px-3.5 py-2 text-[12.5px] leading-relaxed text-ink-2">
          Start with the <span className="font-medium text-ink">contract for Dana</span> — it’s due tomorrow. I moved the
          invoice to Friday morning.
        </div>
      </div>
    </div>
  );
}

/* ---------- Guide ---------- */

/**
 * First-run guide. Shown once on the first visit to the dashboard; finishing
 * or skipping it (button, Esc or backdrop) calls onClose, which records it.
 */
export function OnboardingGuide({ isOpen, onClose, hotkey = 'F9', isDesktop, onOpenSettings, onOpenDownload }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const steps = [
    {
      title: 'Welcome to TaskCatch',
      body: 'Turn anything you read — a Slack message, an email, a code comment — into a clean task. This quick tour shows you how.',
      visual: <WelcomeVisual />,
    },
    {
      title: 'Capture from any app',
      body: isDesktop
        ? `Highlight text anywhere and press ${hotkey}. TaskCatch saves it as a task with a priority, category and deadline, and leaves your clipboard exactly as it was.`
        : `In the desktop app, highlight text anywhere and press ${hotkey} to capture it. Here in the browser you can add tasks by hand to try it out.`,
      visual: <CaptureVisual hotkey={hotkey} />,
      action: !isDesktop && { label: 'Get the desktop app', icon: Download, run: onOpenDownload },
    },
    {
      title: 'Or just type it',
      body: 'Quick add understands plain words: “urgent” sets the priority, “#dev” the category, and “tomorrow 5pm” or “by friday” the deadline.',
      visual: <QuickAddVisual />,
    },
    {
      title: 'Plan your day with Standup',
      body: 'Ask what to focus on, or have tasks rescheduled in chat. AI features use your own free Groq API key from Settings — everything else works offline.',
      visual: <StandupVisual />,
      action: { label: 'Add an API key', icon: Settings, run: onOpenSettings },
    },
  ];

  const last = step === steps.length - 1;
  const current = steps[step];

  const runAction = () => {
    onClose();
    current.action.run?.();
  };

  const onKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' && !last) setStep((s) => s + 1);
    if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Getting started with TaskCatch" size="md" bodyClassName="p-0">
      <div onKeyDown={onKeyDown}>
        <div className="relative h-[220px] overflow-hidden border-b border-line bg-[linear-gradient(180deg,rgba(180,187,130,0.07),transparent_70%)]">
          <div className="absolute inset-0 bg-grid opacity-[0.05]" aria-hidden="true" />
          <div key={step} className="relative h-full animate-in fade-in slide-in-from-right-4 duration-300">
            {current.visual}
          </div>
        </div>

        <div className="px-7 pb-2 pt-6">
          <p className="text-[12px] font-medium text-olive-300" aria-live="polite">
            Step {step + 1} of {steps.length}
          </p>
          <h2 className="mt-1.5 font-display text-[30px] leading-[1.1] tracking-[-0.01em] text-ink">{current.title}</h2>
          <p className="mt-2.5 min-h-[69px] text-[14px] leading-relaxed text-ink-2">{current.body}</p>
          {/* Always reserve this line so the dialog keeps one height across steps. */}
          <div className="mt-1 h-6">
            {current.action && (
              <button
                type="button"
                onClick={runAction}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-olive-300 transition hover:text-olive-200"
              >
                <current.action.icon className="h-3.5 w-3.5" />
                {current.action.label}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-7 pb-6 pt-5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                tabIndex={-1}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-olive-300' : 'w-1.5 bg-white/15 hover:bg-white/30'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {!last && (
              <Button variant="ghost" onClick={onClose}>
                Skip tour
              </Button>
            )}
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)} aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            {last ? (
              <Button variant="primary" onClick={onClose} data-autofocus>
                Get started
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setStep((s) => s + 1)} data-autofocus>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
