import React from 'react';
import {
  Clock,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  Building2,
  Wrench,
  CheckCircle2,
  UserCheck,
  Archive,
  RotateCcw,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG = {
  Reported: {
    label: 'Reported',
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: Clock,
  },
  'AI Verified': {
    label: 'AI Verified',
    bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    icon: Sparkles,
  },
  'Verification Required': {
    label: 'Verification Required',
    bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: AlertTriangle,
  },
  'Manual Verification Required': {
    label: 'Manual Review',
    bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    icon: HelpCircle,
  },
  'Department Assigned': {
    label: 'Assigned',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    icon: Building2,
  },
  'Work Started': {
    label: 'In Progress',
    bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: Wrench,
  },
  Resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  'Citizen Verification': {
    label: 'Citizen Review',
    bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    icon: UserCheck,
  },
  Closed: {
    label: 'Closed',
    bg: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-700',
    icon: Archive,
  },
  Reopened: {
    label: 'Reopened',
    bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: RotateCcw,
  },
  Rejected: {
    label: 'Rejected',
    bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800',
    icon: XCircle,
  },
};

export const StatusBadge = ({
  status,
  departmentName = null,
  isCitizenView = false,
  size = 'sm',
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Reported;
  const Icon = config.icon;

  let displayLabel = config.label;
  let displayBg = config.bg;

  if (isCitizenView) {
    if (
      status === 'Reported' ||
      status === 'AI Verified' ||
      status === 'Verification Required' ||
      status === 'Manual Verification Required'
    ) {
      displayLabel = 'Received, under review';
      displayBg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    } else if (status === 'Department Assigned') {
      displayLabel = departmentName ? `Assigned to ${departmentName}` : 'Assigned to Department';
      displayBg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    }
  } else if (status === 'Department Assigned' && departmentName) {
    displayLabel = `Assigned: ${departmentName}`;
  }

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
  }[size] || 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-xs transition-colors ${displayBg} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{displayLabel}</span>
    </span>
  );
};

