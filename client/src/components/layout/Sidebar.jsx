import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building,
  Kanban,
  Files,
  Copy,
  BarChart3,
  Users,
  Sliders,
  FileText,
  Map,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Sidebar = ({ className = '' }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isPolice = user?.role === 'police';

  const staffNavItems = [
    { to: '/department', label: 'Department Overview', icon: Building },
    { to: '/department?view=kanban', label: 'Kanban Work Board', icon: Kanban },
    { to: '/department?view=table', label: 'Work Orders Table', icon: Files },
    { to: '/map', label: 'Live Field Map', icon: Map },
    { to: '/duplicates', label: 'Duplicate Clusters', icon: Copy },
  ];

  const policeNavItems = [
    { to: '/police', label: 'Incoming Cases', icon: Shield },
    { to: '/map', label: 'Live City Map', icon: Map },
  ];

  const adminNavItems = [
    { to: '/admin', label: 'Executive Analytics', icon: BarChart3 },
    { to: '/admin?tab=queue', label: 'Assignment Queue', icon: Files },
    { to: '/admin?tab=users', label: 'User Directory', icon: Users },
    { to: '/admin?tab=departments', label: 'Departments', icon: Building },
    { to: '/admin?tab=categories', label: 'Categories', icon: Layers },
    { to: '/admin?tab=duplicates', label: 'Duplicate Merge/Split', icon: Copy },
    { to: '/admin?tab=police', label: 'Police & Routing', icon: Shield },
    { to: '/admin?tab=trash', label: 'Trash Bin', icon: Sliders },
  ];

  return (
    <aside
      className={`w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between hidden lg:flex ${className}`}
    >
      <div className="space-y-6">
        {/* Role Badge Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg text-white flex items-center justify-center font-bold text-sm ${
              isAdmin ? 'bg-rose-600' : isPolice ? 'bg-blue-600' : 'bg-brand-600'
            }`}
          >
            {isAdmin ? <Shield className="w-5 h-5" /> : isPolice ? <Shield className="w-5 h-5" /> : <Building className="w-5 h-5" />}
          </div>
          <div className="truncate">
            <span
              className={`text-xs uppercase font-bold tracking-wider block ${
                isAdmin ? 'text-rose-600 dark:text-rose-400' : isPolice ? 'text-blue-600 dark:text-blue-400' : 'text-brand-600 dark:text-brand-400'
              }`}
            >
              {isAdmin ? 'Administrator' : isPolice ? 'Police Officer' : 'Staff Member'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
              {isPolice
                ? `Badge #${user?.badgeNumber || '00'} • ${user?.station || 'Traffic Div'}`
                : user?.department?.name || 'Municipal Control'}
            </span>
          </div>
        </div>

        {/* Police Hub Navigation */}
        {isPolice && (
          <div className="space-y-1">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 block mb-2">
              Law Enforcement & Traffic
            </span>
            {policeNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/police'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Staff Hub Navigation */}
        {isStaff && (
          <div className="space-y-1">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Operations & Work
            </span>
            {staffNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/department'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Admin Navigation */}
        {isAdmin && (
          <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-rose-500 block mb-2">
              Administration & Policy
            </span>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
        UrbanFix v1.0 • Civic Tech
      </div>
    </aside>
  );
};
