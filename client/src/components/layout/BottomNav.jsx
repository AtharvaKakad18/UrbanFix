import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Plus, ClipboardList, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const BottomNav = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Feed</span>
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          <Map className="w-5 h-5 mb-0.5" />
          <span>Live Map</span>
        </NavLink>

        {/* Center Report FAB */}
        <div className="flex-1 flex justify-center -mt-5">
          <NavLink
            to="/report/new"
            className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg hover:bg-brand-700 ring-4 ring-white dark:ring-slate-900 transition-transform active:scale-95"
            aria-label="Report new problem"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </NavLink>
        </div>

        {user?.role === 'admin' ? (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span>Admin</span>
          </NavLink>
        ) : user?.role === 'police' ? (
          <NavLink
            to="/police"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span>Police</span>
          </NavLink>
        ) : user?.role === 'staff' ? (
          <NavLink
            to="/department"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span>Dept Hub</span>
          </NavLink>
        ) : (
          <NavLink
            to="/my-reports"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span>My Reports</span>
          </NavLink>
        )}

        <NavLink
          to={isAuthenticated ? '/profile' : '/login'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
