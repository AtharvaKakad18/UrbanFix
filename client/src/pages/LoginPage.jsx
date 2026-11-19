import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  ShieldAlert,
  Users,
  AlertCircle,
  ArrowLeft,
  BadgeAlert,
  Car,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const LoginPage = ({ initialPortal = null }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine portal from prop or pathname
  const detectPortal = () => {
    if (initialPortal) return initialPortal;
    if (location.pathname.includes('/admin')) return 'admin';
    if (location.pathname.includes('/department')) return 'staff';
    if (location.pathname.includes('/police')) return 'police';
    return 'citizen';
  };

  const [activePortal, setActivePortal] = useState(detectPortal);
  const [authError, setAuthError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setActivePortal(detectPortal());
    setAuthError(null);
  }, [location.pathname, initialPortal]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const portalConfig = {
    citizen: {
      title: 'Citizen Sign In',
      subtitle: 'Sign in to file reports, verify civic repairs, and track mobility fixes.',
      badgeText: 'Citizen Portal',
      badgeColor: 'bg-brand-500/10 text-brand-600 border-brand-200 dark:border-brand-800',
      demoUser: 'citizen1@urbanfix.org',
      demoLabel: 'Citizen Demo',
      redirectTo: '/dashboard',
    },
    admin: {
      title: 'Admin Console Login',
      subtitle: 'Municipal policy management, assignment queue, trash bin & system audit.',
      badgeText: 'Municipal Administration',
      badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800',
      demoUser: 'admin@urbanfix.org',
      demoLabel: 'Admin Demo',
      redirectTo: '/admin',
    },
    staff: {
      title: 'Department Hub Login',
      subtitle: 'Department staff work orders, dispatching, and field progress tracking.',
      badgeText: 'Department Staff',
      badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
      demoUser: 'marcus.road@urbanfix.org',
      demoLabel: 'Staff Demo',
      redirectTo: '/department',
    },
    police: {
      title: 'Police Dashboard Login',
      subtitle: 'Traffic incidents, vehicle clearance, road blockages & officer dispatch.',
      badgeText: 'Traffic Police & Enforcement',
      badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
      demoUser: 'officer.patil@urbanfix.org',
      demoLabel: 'Police Demo',
      redirectTo: '/police',
    },
  };

  const currentCfg = portalConfig[activePortal] || portalConfig.citizen;

  const onSubmit = async (data) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const user = await login(data.email, data.password, activePortal);
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'police') {
        navigate('/police');
      } else if (user.role === 'staff') {
        navigate('/department');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        'Login failed. Please verify your credentials or ensure your account matches this portal.';
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickFill = (email, password = 'UrbanFix123!') => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-1 shadow-sm">
            <span className={currentCfg.badgeColor}>{currentCfg.badgeText}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {currentCfg.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {currentCfg.subtitle}
          </p>
        </div>

        {/* Demo Fast Autofill Card */}
        <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold">{currentCfg.demoLabel}: {currentCfg.demoUser}</span>
              <span className="text-[10px] text-slate-400 block font-normal">Password: UrbanFix123!</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => quickFill(currentCfg.demoUser, 'UrbanFix123!')}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-medium text-xs hover:bg-brand-700 transition-colors shrink-0 shadow-sm"
          >
            Auto Fill
          </button>
        </div>

        {/* Form Card */}
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-soft">
          {authError && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Access Restricted</span>
                <span>{authError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-rose-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-rose-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm shadow-soft hover:shadow-glow flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to {currentCfg.badgeText}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {activePortal === 'citizen' ? (
            <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
              New citizen user?{' '}
              <Link
                to="/register"
                className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Create a citizen account
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="text-[11px] text-slate-400">Accounts created by Admin</span>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Citizen Login</span>
              </button>
            </div>
          )}
        </div>

        {/* Portal Tiles Section (ONLY ON LOGIN PAGE) */}
        <div className="pt-2">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Department & Staff Portals
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            Authorized municipal, department, and traffic police personnel: access your designated portal below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tile 1: Admin Console */}
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className={`p-3.5 rounded-xl border text-left transition-all group flex flex-col justify-between ${
                activePortal === 'admin'
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-400 dark:hover:border-rose-600'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                  Admin Console
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Queue, trash & policy
                </span>
              </div>
            </button>

            {/* Tile 2: Department Hub */}
            <button
              type="button"
              onClick={() => navigate('/department/login')}
              className={`p-3.5 rounded-xl border text-left transition-all group flex flex-col justify-between ${
                activePortal === 'staff'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-400 dark:hover:border-amber-600'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                  Department Hub
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Work orders & repairs
                </span>
              </div>
            </button>

            {/* Tile 3: Police Dashboard */}
            <button
              type="button"
              onClick={() => navigate('/police/login')}
              className={`p-3.5 rounded-xl border text-left transition-all group flex flex-col justify-between ${
                activePortal === 'police'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                  Police Dashboard
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Incidents & clearance
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
