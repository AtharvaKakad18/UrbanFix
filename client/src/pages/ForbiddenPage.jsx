import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, Shield, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const ForbiddenPage = () => {
  const { switchRole } = useAuth();
  const navigate = useNavigate();

  const handleSwitch = async (role, path) => {
    try {
      await switchRole(role);
      navigate(path);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 text-center space-y-4">
      <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950 text-rose-600 ring-8 ring-rose-50/50">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
        403 — Access Restricted
      </h1>
      <p className="text-sm text-slate-500 max-w-md">
        This section requires elevated credentials. As a developer or tester, you can switch your active role below:
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleSwitch('staff', '/department')}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-soft flex items-center gap-2 transition-all"
        >
          <Wrench className="w-4 h-4" />
          <span>Switch to Staff (Department Hub)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSwitch('admin', '/admin')}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-soft flex items-center gap-2 transition-all"
        >
          <Shield className="w-4 h-4" />
          <span>Switch to Admin (Admin Console)</span>
        </button>
        <Link
          to="/dashboard"
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-soft flex items-center gap-2 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Citizen Feed</span>
        </Link>
      </div>
    </div>
  );
};
