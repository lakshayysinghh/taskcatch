import React from 'react';
import { Activity, ArrowUpWideNarrow, Clock, CheckCheck } from 'lucide-react';
import { Task } from '../lib/types';

interface StatsBarProps {
  tasks: Task[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ tasks }) => {
  const total = tasks.length;
  const active = tasks.filter((t) => !t.is_completed).length;
  const highPriority = tasks.filter((t) => (t.priority === 'urgent' || t.priority === 'high') && !t.is_completed).length;
  const completed = tasks.filter((t) => t.is_completed).length;

  const now = new Date().getTime();
  const in48h = now + 48 * 3600 * 1000;
  const dueSoon = tasks.filter((t) => {
    if (!t.deadline || t.is_completed) return false;
    const d = new Date(t.deadline).getTime();
    return d >= now && d <= in48h;
  }).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] mb-[28px]">
      {/* 1. Active Tasks */}
      <div className="relative overflow-hidden bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] hover:border-[rgba(168,173,122,0.28)] transition-all rounded-[12px] p-[18px] group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#33361f] to-[#a8ad7a]" />
        <div className="flex items-center justify-between mb-[10px]">
          <div className="text-[12px] text-[#93958a] font-normal flex items-center gap-1.5">
            <span>Active tasks</span>
          </div>
          <div className="p-1 rounded-[6px] bg-[rgba(168,173,122,0.08)] text-[#a8ad7a] group-hover:bg-[rgba(168,173,122,0.16)] transition-colors">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-[26px] font-bold text-[#f2f2ec] leading-none">
            {active}
          </span>
          <span className="text-[12px] text-[#93958a] ml-[6px] font-normal">
            / {total} total
          </span>
        </div>
      </div>

      {/* 2. High Priority */}
      <div className="relative overflow-hidden bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] hover:border-[rgba(168,173,122,0.28)] transition-all rounded-[12px] p-[18px] group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#33361f] to-[#a8ad7a]" />
        <div className="flex items-center justify-between mb-[10px]">
          <div className="text-[12px] text-[#93958a] font-normal flex items-center gap-1.5">
            <span>High priority</span>
          </div>
          <div className="p-1 rounded-[6px] bg-[rgba(168,173,122,0.08)] text-[#a8ad7a] group-hover:bg-[rgba(168,173,122,0.16)] transition-colors">
            {/* Custom Priority Sort / Rank Icon matching user specification */}
            <ArrowUpWideNarrow className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-[26px] font-bold bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] bg-clip-text text-transparent leading-none">
            {highPriority}
          </span>
          <span className="text-[12px] text-[#93958a] ml-[6px] font-normal">
            urgent
          </span>
        </div>
      </div>

      {/* 3. Due in 48h */}
      <div className="relative overflow-hidden bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] hover:border-[rgba(168,173,122,0.28)] transition-all rounded-[12px] p-[18px] group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#33361f] to-[#a8ad7a]" />
        <div className="flex items-center justify-between mb-[10px]">
          <div className="text-[12px] text-[#93958a] font-normal flex items-center gap-1.5">
            <span>Due in 48h</span>
          </div>
          <div className="p-1 rounded-[6px] bg-[rgba(168,173,122,0.08)] text-[#a8ad7a] group-hover:bg-[rgba(168,173,122,0.16)] transition-colors">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-[26px] font-bold text-[#f2f2ec] leading-none">
            {dueSoon}
          </span>
          <span className="text-[12px] text-[#93958a] ml-[6px] font-normal">
            upcoming
          </span>
        </div>
      </div>

      {/* 4. Completed */}
      <div className="relative overflow-hidden bg-[rgba(19,20,16,0.72)] backdrop-blur-[14px] border border-[rgba(168,173,122,0.14)] hover:border-[rgba(168,173,122,0.28)] transition-all rounded-[12px] p-[18px] group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#33361f] to-[#a8ad7a]" />
        <div className="flex items-center justify-between mb-[10px]">
          <div className="text-[12px] text-[#93958a] font-normal flex items-center gap-1.5">
            <span>Completed</span>
          </div>
          <div className="p-1 rounded-[6px] bg-[rgba(168,173,122,0.08)] text-[#93958a] group-hover:bg-[rgba(168,173,122,0.16)] group-hover:text-[#a8ad7a] transition-colors">
            <CheckCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-[26px] font-bold text-[#93958a] leading-none">
            {completed}
          </span>
          <span className="text-[12px] text-[#93958a] ml-[6px] font-normal">
            done
          </span>
        </div>
      </div>
    </div>
  );
};
