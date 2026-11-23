import React, { useState } from 'react';
import { safeOpen as open } from '../lib/tauri';
import {
  ArrowRight,
  Bot,
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  Github,
  Keyboard,
  Lock,
  MousePointerClick,
  PanelBottom,
  Sparkles,
  Zap,
} from 'lucide-react';
import { version } from '../../package.json';
import { Button } from '../components/ui/Button';
import { Kbd } from '../components/ui/Kbd';
import { PriorityBadge, CategoryTag } from '../components/ui/Badges';
import { LogoMark } from '../components/ui/LogoMark';

const GITHUB_URL = 'https://github.com/lakshayysinghh/taskcatch';
const RELEASES_URL = `${GITHUB_URL}/releases/latest`;
const INSTALL_COMMAND = 'irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex';

function Eyebrow({ children }) {
  return (
    <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-olive-300">{children}</p>
  );
}

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-[38px] leading-[1.08] tracking-[-0.01em] text-ink text-balance sm:text-[46px]">
        {title}
      </h2>
      {children && <p className="mt-4 text-[15px] leading-relaxed text-ink-2 text-balance">{children}</p>}
    </div>
  );
}

/** A miniature of the capture flow: highlighted chat text becomes a task card. */
function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-[980px]">
      <div className="absolute -inset-x-10 -top-10 bottom-0 rounded-[48px] bg-[radial-gradient(closest-side,rgba(180,187,130,0.14),transparent)] blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[22px] border border-line-strong bg-[#0e0f0d] shadow-pop">
        {/* Window chrome */}
        <div className="flex h-10 items-center gap-2 border-b border-line bg-white/[0.02] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="ml-3 text-[12px] text-ink-3"># launch-ops — Slack</span>
        </div>

        <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
          {/* Chat */}
          <div className="space-y-5 p-6 sm:p-8">
            {[
              { who: 'Priya', time: '9:41 AM', text: 'Release notes are merged, thanks all 🙌' },
              {
                who: 'Marcus',
                time: '9:44 AM',
                text: (
                  <>
                    Heads up — <span className="rounded-[3px] bg-olive-300/25 px-0.5 text-olive-50 shadow-[0_0_0_1px_rgba(180,187,130,0.35)]">we need to deploy the auth hotfix before the 5 PM release, it's urgent</span>.
                  </>
                ),
                active: true,
              },
              { who: 'Dana', time: '9:46 AM', text: 'On it after standup.' },
            ].map((m) => (
              <div key={m.who} className="flex gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold ${m.active ? 'bg-olive-300/15 text-olive-200' : 'bg-white/[0.05] text-ink-3'}`}>
                  {m.who[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-ink">{m.who}</span>
                    <span className="text-[11px] text-ink-3">{m.time}</span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{m.text}</p>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 pl-11 text-[12px] text-ink-3">
              <MousePointerClick className="h-3.5 w-3.5" />
              Highlight, then press
              <Kbd className="!h-6 !min-w-[30px] !text-[11.5px] text-olive-100">F9</Kbd>
            </div>
          </div>

          {/* Result */}
          <div className="relative border-t border-line bg-[linear-gradient(180deg,rgba(180,187,130,0.05),transparent)] p-6 sm:p-8 md:border-l md:border-t-0">
            <div className="mb-4 flex items-center gap-2 text-[12px] font-medium text-ink-3">
              <LogoMark size={18} />
              TaskCatch
              <span className="ml-auto inline-flex items-center gap-1 text-success">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Captured
              </span>
            </div>
            <div className="rounded-xl border border-line-strong bg-surface-2 p-4 shadow-card animate-in fade-in slide-in-from-bottom-2 duration-700">
              <p className="text-[14.5px] font-medium leading-snug text-ink">Deploy the auth hotfix before the 5 PM release</p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <PriorityBadge priority="Urgent" />
                <CategoryTag category="Development" />
              </div>
              <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3 text-[12px]">
                <span className="text-ink-3">From # launch-ops — Slack</span>
                <span className="inline-flex items-center gap-1 font-medium text-warning">
                  <Clock className="h-3.5 w-3.5" /> Today, 5:00 PM
                </span>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
              Title, priority, category and deadline are extracted for you. Your clipboard is put back exactly as it was.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { icon: MousePointerClick, title: 'Highlight', text: 'Select any text — a Slack message, an email, a code comment, a doc.' },
  { icon: Keyboard, title: 'Press F9', text: 'Your global hotkey works in every app, even with TaskCatch in the tray.' },
  { icon: ClipboardCheck, title: "It's on your list", text: 'A clean task with priority, category and deadline. Undo is one click away.' },
];

const FEATURES = [
  { icon: Zap, title: 'Works in every app', text: 'One global hotkey for Chrome, Slack, Outlook, Word, VS Code and anything else you can select text in.' },
  { icon: ClipboardCheck, title: 'Clipboard stays untouched', text: 'Text, images and copied files are restored after every capture. Nothing selected? Nothing changes.' },
  { icon: Clock, title: 'Deadlines that make sense', text: '“Tonight”, “tomorrow 5pm” and “by Friday” become real deadlines in your own timezone.' },
  { icon: Bot, title: 'Morning standup assistant', text: 'Ask what to focus on, or have tasks rescheduled and reprioritised in chat.' },
  { icon: Sparkles, title: 'Quick add with Ctrl+K', text: 'Type a task in plain words and watch priority, category and deadline fill in as you type.' },
  { icon: PanelBottom, title: 'Lives in the tray', text: 'Close the window and keep capturing. Open it from the tray when you want to review.' },
];

const PRIVACY = [
  { title: 'Stored on your PC', text: 'Tasks are kept in a local file in your Windows profile, with an automatic backup. Not in anyone’s cloud.' },
  { title: 'Your own Groq key — or none', text: 'With a key, captured text goes straight from your PC to Groq. Without one, a local parser runs fully offline.' },
  { title: 'No account, no analytics', text: 'There is no TaskCatch server, sign-up or tracking. The app talks only to Groq, and only if you add a key.' },
  { title: 'Open source', text: 'Read exactly where your data goes, or build TaskCatch yourself. Note: your API key is stored in plain text on your PC.' },
];

function InstallCard({ onOpenDownload }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onOpenDownload();
    }
  };

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-card">
      <div className="flex flex-col gap-1 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Install in one line</h3>
          <p className="text-[13px] text-ink-2">Paste into PowerShell. The installer’s SHA-256 is checked before it runs.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => open(RELEASES_URL)} className="-mr-2 self-start sm:self-auto">
          Download .exe instead <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-3 bg-black/30 px-6 py-4">
        <span className="select-none font-mono text-[12.5px] text-olive-400">PS&gt;</span>
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12.5px] text-ink">{INSTALL_COMMAND}</code>
        <Button variant="secondary" size="sm" onClick={copy} aria-label="Copy install command">
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

export function OverviewView({ onOpenDashboard, onOpenDownload }) {
  return (
    <div className="relative z-10">
      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-5 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
        <button
          type="button"
          onClick={() => open(RELEASES_URL)}
          className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] py-1 pl-1 pr-3 text-[12.5px] text-ink-2 transition hover:border-olive-300/30 hover:text-ink animate-in fade-in slide-in-from-bottom-1 duration-500"
        >
          <span className="rounded-full bg-olive-300/15 px-2 py-0.5 font-medium text-olive-200">v{version}</span>
          Free &amp; open source for Windows
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>

        <h1 className="mx-auto mt-7 max-w-4xl font-display text-[52px] leading-[0.98] tracking-[-0.02em] text-ink text-balance animate-in fade-in slide-in-from-bottom-2 duration-700 sm:text-[76px] lg:text-[88px]">
          Highlight anything.
          <br />
          <span className="bg-gradient-to-b from-olive-50 to-olive-300 bg-clip-text italic text-transparent">It's already a task.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-[560px] text-[16px] leading-relaxed text-ink-2 text-balance animate-in fade-in duration-700 sm:text-[17px]">
          Select text in Slack, Chrome, Outlook or VS Code and press <Kbd className="!h-[22px] text-olive-100">F9</Kbd>. TaskCatch turns it into a
          clean task with a priority, category and deadline — without leaving what you’re doing.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="primary" size="lg" onClick={onOpenDownload} className="w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Download for Windows
          </Button>
          <Button variant="secondary" size="lg" onClick={onOpenDashboard} className="w-full sm:w-auto">
            Launch Live Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-5 text-[12.5px] text-ink-3">
          Windows 10 &amp; 11 · ~6 MB installer · Bring your own Groq key, or run fully offline
        </p>
      </section>

      <section className="px-5 pb-28 sm:px-8">
        <ProductPreview />
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1120px] px-5 pb-28 sm:px-8">
        <SectionHeading eyebrow="How it works" title="Three keystrokes from message to task." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-line bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-olive-300/20 bg-olive-300/10 text-olive-200">
                  <s.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="font-display text-[34px] leading-none text-white/[0.08]">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.01em] text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1120px] px-5 pb-28 sm:px-8">
        <SectionHeading eyebrow="Features" title="Small app. Sharp edges sanded off.">
          Everything a capture tool should do, and nothing that gets in your way.
        </SectionHeading>
        <div className="mt-12 grid overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 [&>*]:bg-[#0d0e0c]">
          {FEATURES.map((f) => (
            <div key={f.title} className="group p-7 transition-colors hover:!bg-surface">
              <f.icon className="h-5 w-5 text-olive-300 transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={1.8} />
              <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink">{f.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="mx-auto max-w-[1120px] px-5 pb-28 sm:px-8">
        <div className="grid gap-10 rounded-3xl border border-line bg-[linear-gradient(160deg,rgba(180,187,130,0.06),transparent_45%)] p-8 sm:p-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-olive-300/20 bg-olive-300/10 text-olive-200">
              <Lock className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <h2 className="mt-6 font-display text-[38px] leading-[1.08] text-ink sm:text-[44px]">
              Where your data lives — <span className="italic text-olive-200">exactly.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-ink-2">
              Not a privacy promise, just the facts. Every line here matches what the code does.
            </p>
          </div>
          <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {PRIVACY.map((p) => (
              <li key={p.title}>
                <div className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
                  <Check className="h-4 w-4 text-olive-300" strokeWidth={2.4} />
                  {p.title}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Install */}
      <section className="mx-auto max-w-[1120px] px-5 pb-28 sm:px-8">
        <SectionHeading eyebrow="Install" title="Up and running in under a minute." />
        <div className="mt-10">
          <InstallCard onOpenDownload={onOpenDownload} />
        </div>
        <p className="mt-5 text-center text-[12.5px] text-ink-3">
          Built with Tauri 2, Rust and React · Llama 3.3 70B on Groq · Win32 clipboard &amp; window APIs
        </p>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1120px] px-5 pb-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface px-8 py-16 text-center shadow-card sm:py-20">
          <div className="absolute inset-0 bg-grid opacity-[0.05]" aria-hidden="true" />
          <div className="absolute left-1/2 top-0 h-64 w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(180,187,130,0.22),transparent)] blur-2xl" aria-hidden="true" />
          <div className="relative">
            <LogoMark size={44} className="mx-auto" />
            <h2 className="mx-auto mt-6 max-w-xl font-display text-[40px] leading-[1.05] text-ink text-balance sm:text-[52px]">
              Stop copying tasks by hand.
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="primary" size="lg" onClick={onOpenDownload}>
                <Download className="h-4 w-4" />
                Download for Windows
              </Button>
              <Button variant="ghost" size="lg" onClick={onOpenDashboard}>
                Open Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-4 px-5 py-8 text-[12.5px] text-ink-3 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <LogoMark size={18} />
            <span>TaskCatch v{version} · Free and open source</span>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => open(GITHUB_URL)} className="inline-flex items-center gap-1.5 transition hover:text-ink">
              <Github className="h-3.5 w-3.5" /> GitHub
            </button>
            <button type="button" onClick={() => open(RELEASES_URL)} className="transition hover:text-ink">
              Releases
            </button>
            <button type="button" onClick={onOpenDashboard} className="transition hover:text-ink">
              Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
