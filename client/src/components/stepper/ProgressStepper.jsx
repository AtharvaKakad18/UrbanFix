import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

export const ProgressStepper = ({
  steps = [],
  currentStep = 0,
  isStatusFlow = false,
  status = null,
  className = '',
}) => {
  // If rendering Report Lifecycle Flow
  if (isStatusFlow) {
    const statusOrder = [
      'Reported',
      ['AI Verified', 'Verification Required', 'Manual Verification Required'],
      'Department Assigned',
      'Work Started',
      ['Resolved', 'Citizen Verification'],
      'Closed',
    ];

    const getActiveIndex = (currentStatus) => {
      if (currentStatus === 'Rejected') return -1;
      if (currentStatus === 'Reopened') return 3; // back in work/action
      for (let i = 0; i < statusOrder.length; i++) {
        const item = statusOrder[i];
        if (Array.isArray(item)) {
          if (item.includes(currentStatus)) return i;
        } else if (item === currentStatus) {
          return i;
        }
      }
      return 0;
    };

    const activeIndex = getActiveIndex(status);
    const isRejected = status === 'Rejected';

    return (
      <div className={`w-full overflow-x-auto py-2 ${className}`}>
        <div className="flex items-center justify-between min-w-[500px]">
          {steps.map((step, idx) => {
            const isCompleted = !isRejected && idx < activeIndex;
            const isCurrent = !isRejected && idx === activeIndex;

            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center text-center relative z-10 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-soft'
                        : isCurrent
                        ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950/60 shadow-glow'
                        : isRejected
                        ? 'bg-rose-100 text-rose-500 border border-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : isRejected && idx === 0 ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-semibold ${
                      isCurrent
                        ? 'text-brand-600 dark:text-brand-400'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.desc && (
                    <span className="text-[10px] text-slate-400 hidden sm:block max-w-[90px] leading-tight mt-0.5">
                      {step.desc}
                    </span>
                  )}
                </div>

                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-all duration-300 -mt-6 ${
                      idx < activeIndex && !isRejected
                        ? 'bg-emerald-600'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Report Creation 4-Step Stepper
  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center text-center relative z-10 flex-1">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    isCompleted
                      ? 'bg-brand-600 text-white shadow-soft'
                      : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950/60 shadow-glow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold ${
                    isCurrent
                      ? 'text-brand-600 dark:text-brand-400'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label || step}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-all duration-300 -mt-6 ${
                    idx < currentStep ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
