import React from 'react';

export const ConfidenceMeter = ({ confidence = 0, showLabel = true, className = '' }) => {
  const percentage = Math.round(Math.min(1, Math.max(0, confidence)) * 100);

  let barColor = 'bg-rose-500';
  let badgeText = 'Low Confidence';
  let badgeColor = 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';

  if (percentage >= 75) {
    barColor = 'bg-teal-500';
    badgeText = 'High Confidence';
    badgeColor = 'text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
  } else if (percentage >= 60) {
    barColor = 'bg-amber-500';
    badgeText = 'Moderate Confidence';
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-400">AI Confidence</span>
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${badgeColor}`}>
            {percentage}% — {badgeText}
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
