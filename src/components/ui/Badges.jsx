import React from 'react';
import { Code2, Landmark, Shield, User, Hash } from 'lucide-react';

const PRIORITY = {
  Urgent: 'text-danger bg-danger/10 border-danger/20',
  High: 'text-warning bg-warning/10 border-warning/20',
  Medium: 'text-olive-200 bg-olive-300/10 border-olive-300/20',
  Low: 'text-ink-2 bg-white/[0.04] border-line-strong',
};

const PRIORITY_DOT = {
  Urgent: 'bg-danger',
  High: 'bg-warning',
  Medium: 'bg-olive-300',
  Low: 'bg-ink-3',
};

export function PriorityBadge({ priority = 'Medium' }) {
  const style = PRIORITY[priority] || PRIORITY.Medium;
  return (
    <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-full border px-2 text-[11.5px] font-medium ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority] || PRIORITY_DOT.Medium}`} />
      {priority}
    </span>
  );
}

export const CATEGORY_ICONS = {
  Development: Code2,
  Finance: Landmark,
  Security: Shield,
  Personal: User,
  General: Hash,
};

export function CategoryTag({ category = 'General' }) {
  const Icon = CATEGORY_ICONS[category] || Hash;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-2">
      <Icon className="h-3.5 w-3.5 text-ink-3" strokeWidth={1.8} />
      {category}
    </span>
  );
}

export function priorityDotClass(priority) {
  return PRIORITY_DOT[priority] || PRIORITY_DOT.Medium;
}
