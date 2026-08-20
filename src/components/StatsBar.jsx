import React from 'react';
import { Clock, CheckCircle2, Activity, Flame } from 'lucide-react';

export function StatsBar({ activeCount, totalCount, highPriorityCount, due48hCount, completedCount }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-7">
      {/* 1. Active Tasks */}
      <div className="bg-[var(--surface-glass)] backdrop-blur-[14px] border border-[var(--border-subtle)] rounded-xl p-[18px] relative overflow-hidden flex flex-col justify-between">
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, var(--olive-900), var(--olive-300))' }}
        />
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2.5 font-medium">
          <span>Active tasks</span>
          <Activity className="w-3.5 h-3.5 text-[#60a5fa] drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
        </div>
        <div className="text-[26px] font-bold text-[#f2f2ec] flex items-baseline">
          {activeCount}
          <span className="text-xs text-[var(--text-secondary)] font-normal ml-1.5">/ {totalCount} total</span>
        </div>
      </div>

      {/* 2. High Priority */}
      <div className="bg-[var(--surface-glass)] backdrop-blur-[14px] border border-[var(--border-subtle)] rounded-xl p-[18px] relative overflow-hidden flex flex-col justify-between">
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, var(--olive-900), var(--olive-300))' }}
        />
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2.5 font-medium">
          <span>High priority</span>
          <Flame className="w-3.5 h-3.5 text-[var(--status-warning)] drop-shadow-[0_0_8px_var(--status-warning)]" />
        </div>
        <div className="text-[26px] font-bold flex items-baseline">
          <span
            style={{
              background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {highPriorityCount}
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-normal ml-1.5">urgent</span>
        </div>
      </div>

      {/* 3. Due in 48h */}
      <div className="bg-[var(--surface-glass)] backdrop-blur-[14px] border border-[var(--border-subtle)] rounded-xl p-[18px] relative overflow-hidden flex flex-col justify-between">
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, var(--olive-900), var(--olive-300))' }}
        />
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2.5 font-medium">
          <span>Due in 48h</span>
          <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </div>
        <div className="text-[26px] font-bold text-[#f2f2ec] flex items-baseline">
          {due48hCount}
          <span className="text-xs text-[var(--text-secondary)] font-normal ml-1.5">upcoming</span>
        </div>
      </div>

      {/* 4. Completed */}
      <div className="bg-[var(--surface-glass)] backdrop-blur-[14px] border border-[var(--border-subtle)] rounded-xl p-[18px] relative overflow-hidden flex flex-col justify-between">
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, var(--olive-900), var(--olive-300))' }}
        />
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2.5 font-medium">
          <span>Completed</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)]" />
        </div>
        <div className="text-[26px] font-bold text-[var(--text-secondary)] flex items-baseline">
          {completedCount}
          <span className="text-xs text-[var(--text-secondary)] font-normal ml-1.5">done</span>
        </div>
      </div>
    </div>
  );
}
