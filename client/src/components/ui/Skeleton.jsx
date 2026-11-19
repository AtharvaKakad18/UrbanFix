import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`}
    />
  );
};

export const CardSkeleton = () => (
  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-soft space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <Skeleton className="h-44 w-full rounded-xl" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <div className="flex items-center justify-between pt-2">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-soft">
    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-6 w-1/4" />
    </div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-3 flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

export const MapSkeleton = () => (
  <div className="w-full h-full min-h-[450px] bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse flex flex-col items-center justify-center p-6 text-slate-400">
    <div className="w-12 h-12 rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-brand-500 animate-spin mb-4" />
    <p className="text-sm font-medium">Initializing high-contrast GIS map layers...</p>
  </div>
);
