import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  FileText,
  CheckCircle2,
  Clock,
  Shield,
  MapPin,
  ChevronRight,
  TrendingUp,
  Map as MapIcon,
  Compass,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { StatusBadge } from '../components/badges/StatusBadge.jsx';
import { PriorityBadge } from '../components/badges/PriorityBadge.jsx';
import { CategoryChip } from '../components/badges/CategoryChip.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';

export const CitizenDashboard = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [nearbyReports, setNearbyReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [profileRes, mineRes, nearbyRes] = await Promise.all([
          api.get('/users/profile'),
          api.get('/reports/mine?limit=4'),
          api.get('/reports?limit=4&sortBy=createdAt&sortOrder=desc'),
        ]);

        setProfileData(profileRes.data?.data);
        setRecentReports(mineRes.data?.data?.reports || []);
        setNearbyReports(nearbyRes.data?.data?.reports || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = profileData?.stats || {
    totalReports: 0,
    resolvedReports: 0,
    pendingReports: 0,
    trustScore: user?.trustScore || 100,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Quick Report Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-accent-600 text-white shadow-soft-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wide uppercase">
            Citizen Action Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {user?.name || 'Citizen'}!
          </h1>
          <p className="text-sm text-brand-100 max-w-xl leading-relaxed">
            Report road hazards, track municipal repair crews, and support fellow neighbors to improve city transit.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/report/new"
            className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-white text-brand-700 hover:bg-brand-50 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <PlusCircle className="w-5 h-5 text-brand-600" />
            <span>Report a Problem</span>
          </Link>
          <Link
            to="/map"
            className="px-4 py-3 rounded-2xl bg-brand-800/60 hover:bg-brand-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors border border-white/20"
          >
            <MapIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Live Map</span>
          </Link>
        </div>
      </div>

      {/* Citizen KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reported"
          value={stats.totalReports}
          icon={FileText}
          color="brand"
          subtitle="Issues you have filed"
        />
        <StatCard
          title="Resolved"
          value={stats.resolvedReports}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Verified fixes completed"
        />
        <StatCard
          title="Active In-Field"
          value={stats.pendingReports}
          icon={Clock}
          color="amber"
          subtitle="Under department review"
        />
        <StatCard
          title="Citizen Trust Score"
          value={`${stats.trustScore}%`}
          icon={Shield}
          color={stats.trustScore >= 80 ? 'emerald' : 'rose'}
          subtitle="Verified reporting credibility"
        />
      </div>

      {/* Main Content Grid: My Recent Reports vs Nearby Active Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: My Recent Reports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              My Recent Reports
            </h2>
            <Link
              to="/my-reports"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : recentReports.length === 0 ? (
            <EmptyState
              title="No reports submitted yet"
              description="Spotted a pothole or blocked sidewalk? Submit your first report in under 60 seconds."
              action={
                <Link
                  to="/report/new"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-xs"
                >
                  Create First Report
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <Link
                  key={report._id}
                  to={`/reports/${report._id}`}
                  className="block p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:shadow-soft-lg hover:border-brand-500/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {report.reportCode}
                        </span>
                        <CategoryChip category={report.category} />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{report.address || 'Geotagged Location'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge
                        status={report.status}
                        isCitizenView={true}
                        departmentName={report.assignedDepartment?.name || report.department?.name}
                        size="xs"
                      />
                      <PriorityBadge priority={report.priority} size="xs" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: City-Wide Active Mobility Issues */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Nearby Street Problems
            </h2>
            <Link
              to="/map"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>Explore Map</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : nearbyReports.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No active nearby reports"
              description="Your neighborhood roads look clear right now!"
            />
          ) : (
            <div className="space-y-3">
              {nearbyReports.map((report) => (
                <Link
                  key={report._id}
                  to={`/reports/${report._id}`}
                  className="block p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:shadow-soft-lg hover:border-brand-500/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {report.reportCode}
                        </span>
                        <CategoryChip category={report.category} />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{report.address || 'Pune Metro'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge
                        status={report.status}
                        isCitizenView={true}
                        departmentName={report.assignedDepartment?.name || report.department?.name}
                        size="xs"
                      />
                      <span className="text-[11px] font-medium text-slate-400">
                        {report.confirmations || 1} supporters
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
