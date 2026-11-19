import React from 'react';
import { ShieldAlert, AlertCircle, Flame, CheckCircle } from 'lucide-react';

const PRIORITY_CONFIG = {
  Low: {
    label: 'Low',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: CheckCircle,
  },
  Medium: {
    label: 'Medium',
    bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: AlertCircle,
  },
  High: {
    label: 'High',
    bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    icon: Flame,
  },
  Critical: {
    label: 'Critical',
    bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800',
    icon: ShieldAlert,
  },
};

export const PriorityBadge = ({ priority = 'Low', score = null, size = 'sm', className = '' }) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Low;
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-2',
  }[size] || 'px-2 py-0.5 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border transition-colors ${config.bg} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
      {score != null && (
        <span className="text-[10px] opacity-75 font-mono ml-0.5">({score})</span>
      )}
    </span>
  );
};
