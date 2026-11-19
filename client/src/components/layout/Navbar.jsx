import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin,
  Sun,
  Moon,
  PlusCircle,
  Map,
  LayoutDashboard,
  ShieldAlert,
  LogOut,
  User,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { NotificationBell } from './NotificationBell.jsx';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isCitizen = user?.role === 'citizen';
  const isStaff = user?.role === 'staff';
  const isPolice = user?.role === 'police';
  const isAdmin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-slate-100 font-sans leading-none">
              Urban<span className="text-brand-600 dark:text-brand-400">Fix</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Civic Mobility Platform
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Link
            to="/map"
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${
              location.pathname === '/map'
                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Live Map</span>
          </Link>

          {/* Citizen Navigation: strictly Citizen Feed & My Reports */}
          {isAuthenticated && isCitizen && (
            <>
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Citizen Reporting & Community Feed"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Community Feed</span>
              </Link>

              <Link
                to="/my-reports"
                className={`px-3 py-2 rounded-xl transition-colors ${
                  location.pathname === '/my-reports'
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                My Reports
              </Link>
            </>
          )}

          {/* Staff Navigation: strictly Department Hub */}
          {isAuthenticated && isStaff && (
            <Link
              to="/department"
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${
                location.pathname.startsWith('/department')
                  ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Department Work Orders & Field Dispatch"
            >
              <Building className="w-4 h-4" />
              <span>Department Hub</span>
            </Link>
          )}

          {/* Police Navigation: strictly Police Dashboard */}
          {isAuthenticated && isPolice && (
            <Link
              to="/police"
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${
                location.pathname.startsWith('/police')
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Police Dashboard & Traffic Incidents"
            >
              <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Police Dashboard</span>
            </Link>
          )}

          {/* Admin Navigation: Admin Console, Dept Hub, Police Dashboard */}
          {isAuthenticated && isAdmin && (
            <>
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Municipal Admin & Assignment Control"
              >
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Admin Console</span>
              </Link>
              <Link
                to="/department"
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${
                  location.pathname.startsWith('/department')
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Dept Hub</span>
              </Link>
              <Link
                to="/police"
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${
                  location.pathname.startsWith('/police')
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Police</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User role pill indicator (display only, no switcher) */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {isAdmin && <span className="text-rose-600 dark:text-rose-400 font-bold">Admin Console</span>}
              {isStaff && <span className="text-amber-600 dark:text-amber-400 font-bold">Dept Staff: {user?.department?.name || 'Civic'}</span>}
              {isPolice && <span className="text-blue-600 dark:text-blue-400 font-bold">Traffic Police: {user?.badgeNumber || 'Officer'}</span>}
              {isCitizen && <span className="text-brand-600 dark:text-brand-400 font-bold">Citizen</span>}
            </div>
          )}

          {/* Quick Report CTA */}
          <Link
            to="/report/new"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-glow transition-all"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Report Issue</span>
            <span className="sm:hidden">Report</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <NotificationBell />

              {/* User Avatar & Profile Link */}
              <Link
                to="/profile"
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-brand-500"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden md:inline max-w-[100px] truncate">
                  {user.name}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline px-3.5 py-2 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/60 rounded-xl transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
