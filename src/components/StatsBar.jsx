import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

function Stat({ icon: Icon, label, value, hint, tone = 'default' }) {
  const toneClass = {
    default: 'text-ink',
    danger: value > 0 ? 'text-danger' : 'text-ink',
    muted: 'text-ink-2',
  }[tone];
  const iconClass = tone === 'danger' && value > 0 ? 'text-danger' : 'text-ink-3';

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between text-[12.5px] font-medium text-ink-2">
        <span>{label}</span>
        <Icon className={`h-4 w-4 ${iconClass}`} strokeWidth={1.8} />
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${toneClass}`}>{value}</span>
        <span className="text-[12px] text-ink-3">{hint}</span>
      </div>
    </div>
  );
}

export function StatsBar({ activeCount, totalCount, due48hCount, overdueCount, completedCount }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat icon={Activity} label="Active" value={activeCount} hint={`of ${totalCount}`} />
      <Stat icon={Clock} label="Due in 48h" value={due48hCount} hint="upcoming" />
      <Stat icon={AlertTriangle} label="Past due" value={overdueCount} hint="need attention" tone="danger" />
      <Stat icon={CheckCircle2} label="Completed" value={completedCount} hint="done" tone="muted" />
    </div>
  );
}
