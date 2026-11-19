import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinOff, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 text-center space-y-4">
      <div className="p-4 rounded-3xl bg-brand-50 dark:bg-brand-950 text-brand-600 ring-8 ring-brand-50/50">
        <MapPinOff className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
        404 — Route Not Found
      </h1>
      <p className="text-sm text-slate-500 max-w-sm">
        The coordinates or page URL you navigated to does not exist in our municipal roadmap.
      </p>
      <div className="flex items-center gap-3 pt-2">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-soft flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
};
