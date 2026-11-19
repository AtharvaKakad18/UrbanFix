import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Filter,
  Layers,
  LocateFixed,
  Eye,
  EyeOff,
  Flame,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import api from '../services/api.js';
import { MapView } from '../components/map/MapView.jsx';
import { StatusBadge } from '../components/badges/StatusBadge.jsx';
import { PriorityBadge } from '../components/badges/PriorityBadge.jsx';
import { CategoryChip } from '../components/badges/CategoryChip.jsx';
import { CATEGORIES, STATUSES, PRIORITIES } from '../utils/constants.js';

export const LiveMapPage = () => {
  const [reports, setReports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [hideResolved, setHideResolved] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [search, setSearch] = useState('');

  // Map state & selected report
  const [center, setCenter] = useState([18.5204, 73.8567]);
  const [zoom, setZoom] = useState(13);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports', {
        params: {
          limit: 100,
          category: category || undefined,
          department: department || undefined,
          priority: priority || undefined,
          status: status || undefined,
        },
      });
      setReports(res.data?.data?.reports || []);
    } catch (err) {
      console.error('Failed to load reports for live map', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [category, department, priority, status]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data?.data?.departments || []);
      } catch (err) {
        // ignore
      }
    };
    fetchDepts();
  }, []);

  const handleNearbyGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCenter = [pos.coords.latitude, pos.coords.longitude];
        setCenter(newCenter);
        setZoom(15);
      },
      () => alert('Could not detect your GPS location.')
    );
  };

  const visibleReports = reports.filter((r) => {
    if (hideResolved && (r.status === 'Resolved' || r.status === 'Closed')) return false;
    if (search) {
      const q = search.toLowerCase();
      const codeMatch = r.reportCode?.toLowerCase().includes(q);
      const descMatch = r.description?.toLowerCase().includes(q);
      const addrMatch = r.address?.toLowerCase().includes(q);
      if (!codeMatch && !descMatch && !addrMatch) return false;
    }
    return true;
  });

  const handleSelectReport = (report) => {
    setSelectedReport(report);
    if (report.location?.coordinates) {
      setCenter([report.location.coordinates[1], report.location.coordinates[0]]);
      setZoom(16);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Top Map Controls Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Filter Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-soft">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search map..."
              className="pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 w-32 sm:w-44"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer hidden sm:block"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer hidden sm:block"
          >
            <option value="">All Priorities</option>
            {Object.values(PRIORITIES).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Mute Resolved Toggle */}
          <button
            type="button"
            onClick={() => setHideResolved(!hideResolved)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
              hideResolved
                ? 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle hiding resolved reports"
          >
            {hideResolved ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{hideResolved ? 'Hide Resolved' : 'Show All'}</span>
          </button>
        </div>

        {/* Right Floating Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleNearbyGps}
            className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-brand-600 dark:text-brand-400 text-xs font-bold shadow-soft hover:bg-brand-50 flex items-center gap-1.5 transition-colors"
          >
            <LocateFixed className="w-4 h-4" />
            <span className="hidden sm:inline">Nearby GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-soft hover:bg-slate-100 transition-colors"
            title="Toggle list"
          >
            {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Map & Synced Side List */}
      <div className="relative w-full h-full flex overflow-hidden">
        {/* Full-Screen Map Container */}
        <div className="flex-1 w-full h-full relative z-0">
          <MapView
            reports={visibleReports}
            center={center}
            zoom={zoom}
            onSelectReport={handleSelectReport}
            showHeatmap={showHeatmap}
            className="w-full h-full rounded-none"
          />
        </div>

        {/* Synced Side List Drawer */}
        {isSidebarOpen && (
          <aside className="w-80 sm:w-96 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-10 flex flex-col shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Street Problems ({visibleReports.length})
                </h3>
                <span className="text-[11px] text-slate-400">Click a card to center map</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
              {visibleReports.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No issues found matching your current filter.
                </div>
              ) : (
                visibleReports.map((report) => {
                  const isSelected = selectedReport?._id === report._id;
                  const dupCount = report.duplicateGroup?.totalReports || 1;

                  return (
                    <div
                      key={report._id}
                      onClick={() => handleSelectReport(report)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-brand-50/60 dark:bg-brand-950/40 border-brand-400 dark:border-brand-800 shadow-soft'
                          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-brand-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                              {report.reportCode}
                            </span>
                            <CategoryChip category={report.category} />
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {report.description}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{report.address || 'Pune Metro'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <PriorityBadge priority={report.priority} size="xs" />
                          <StatusBadge status={report.status} size="xs" />
                          {dupCount > 1 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                              {dupCount} grouped
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {report.confirmations || 1} supporter(s)
                        </span>
                        <Link
                          to={`/reports/${report._id}`}
                          className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>Full Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
