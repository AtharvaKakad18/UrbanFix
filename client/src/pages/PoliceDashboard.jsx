import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Car,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Flame,
  Search,
  Filter,
  MapPin,
  User,
  Users,
  Send,
  Camera,
  RotateCcw,
  X,
  Radio,
  FileCheck,
  ChevronRight,
  ExternalLink,
  Phone,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { StatusBadge } from '../components/badges/StatusBadge.jsx';
import { PriorityBadge } from '../components/badges/PriorityBadge.jsx';
import { CategoryChip } from '../components/badges/CategoryChip.jsx';
import { ConfidenceMeter } from '../components/badges/ConfidenceMeter.jsx';
import { MapView } from '../components/map/MapView.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { STATUSES, PRIORITIES } from '../utils/constants.js';

export const PoliceDashboard = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [kpis, setKpis] = useState({
    newCases: 0,
    acknowledged: 0,
    inProgress: 0,
    resolvedToday: 0,
    critical: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'map' | 'officers'
  const [selectedReport, setSelectedReport] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [hotspotPoints, setHotspotPoints] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Action modals
  const [activeModal, setActiveModal] = useState(null); // 'dispatch' | 'progress' | 'action' | 'resolve' | 'reopen' | 'not_police'
  const [modalLoading, setModalLoading] = useState(false);

  // Form states
  const [dispatchOfficerId, setDispatchOfficerId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [policeActionType, setPoliceActionType] = useState('vehicle_cleared');
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionBadge, setActionBadge] = useState(user?.badgeNumber || '');
  const [resolveRemarks, setResolveRemarks] = useState('');
  const [resolvePhoto, setResolvePhoto] = useState(null);
  const [notPoliceReason, setNotPoliceReason] = useState('');

  const fetchPoliceData = async () => {
    setLoading(true);
    try {
      const [repRes, offRes, hotRes] = await Promise.all([
        api.get('/police/reports', {
          params: {
            search: search || undefined,
            category: categoryFilter || undefined,
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
          },
        }),
        api.get('/police/officers'),
        api.get('/police/hotspots'),
      ]);

      setReports(repRes.data?.data?.reports || []);
      setKpis(repRes.data?.data?.kpis || {});
      setOfficers(offRes.data?.data?.officers || []);
      setHotspotPoints(hotRes.data?.data?.points || []);
    } catch (err) {
      console.error('Failed to load police cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoliceData();
  }, [categoryFilter, statusFilter, priorityFilter]);

  // Acknowledge report
  const handleAcknowledge = async (reportId) => {
    setModalLoading(true);
    try {
      await api.post(`/police/reports/${reportId}/acknowledge`);
      await fetchPoliceData();
      if (selectedReport?._id === reportId) {
        const updated = await api.get(`/reports/${reportId}`);
        setSelectedReport(updated.data?.data?.report);
      }
      alert('Case acknowledged.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Acknowledge failed');
    } finally {
      setModalLoading(false);
    }
  };

  // Submit Modal Action
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    setModalLoading(true);

    try {
      const id = selectedReport._id;

      if (activeModal === 'dispatch') {
        await api.post(`/police/reports/${id}/dispatch`, {
          officerId: dispatchOfficerId || undefined,
          notes: dispatchNotes,
        });
        alert('Patrol officer dispatched.');
      } else if (activeModal === 'progress') {
        await api.post(`/police/reports/${id}/progress`, {
          remarks: actionRemarks,
        });
        alert('Progress recorded.');
      } else if (activeModal === 'action') {
        await api.post(`/police/reports/${id}/action-taken`, {
          actionType: policeActionType,
          remarks: actionRemarks,
          officerBadge: actionBadge || user?.badgeNumber,
        });
        alert('Enforcement action logged.');
      } else if (activeModal === 'resolve') {
        const formData = new FormData();
        if (resolvePhoto) formData.append('photos', resolvePhoto);
        formData.append('remarks', resolveRemarks || 'Police resolution completed.');
        await api.post(`/police/reports/${id}/resolve`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alert('Incident resolved and sent for citizen verification.');
      } else if (activeModal === 'reopen') {
        await api.post(`/police/reports/${id}/reopen`, { remarks: actionRemarks });
        alert('Incident reopened.');
      } else if (activeModal === 'not_police') {
        await api.post(`/police/reports/${id}/not-police-matter`, {
          reason: notPoliceReason,
        });
        alert('Report returned to Municipal Administrator queue.');
        setSelectedReport(null);
      }

      setActiveModal(null);
      setActionRemarks('');
      setDispatchNotes('');
      setResolveRemarks('');
      setResolvePhoto(null);
      setNotPoliceReason('');
      await fetchPoliceData();

      if (activeModal !== 'not_police') {
        const updated = await api.get(`/reports/${id}`);
        setSelectedReport(updated.data?.data?.report);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Operation failed');
    } finally {
      setModalLoading(false);
    }
  };

  // Urgent Emergency Reports: Traffic Accident & Road Blockage
  const urgentReports = reports.filter(
    (r) =>
      ['Traffic Accident', 'Road Blockage'].includes(r.category) &&
      r.status !== STATUSES.RESOLVED &&
      r.status !== STATUSES.CLOSED
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Police Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              Traffic Enforcement Division
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Traffic Police Dispatch & Incident Command
          </h1>
          <p className="text-xs text-slate-400">
            Real-time urban mobility violations, emergency road blockages, vehicle towing, and patrol officer dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-xs">
            <span className="font-bold block text-slate-100">{user?.name || 'Traffic Officer'}</span>
            <span className="text-blue-400 font-mono text-[11px] block">
              Badge: {user?.badgeNumber || 'TP-8492'} • {user?.station || 'Central Division'}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner for Urgent Incidents */}
      {urgentReports.length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 rounded-2xl shadow-glow space-y-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
            <span>URGENT TRAFFIC HAZARDS REQUIRING IMMEDIATE DISPATCH ({urgentReports.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentReports.map((urg) => (
              <div
                key={urg._id}
                onClick={() => setSelectedReport(urg)}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between cursor-pointer hover:border-rose-500 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs text-rose-600">{urg.reportCode}</span>
                    <CategoryChip category={urg.category} />
                    <StatusBadge status={urg.status} size="xs" />
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1">{urg.description}</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{urg.address || 'Central Metro'}</span>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs shrink-0 shadow-sm"
                >
                  Respond
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="New Incidents"
          value={kpis.newCases}
          icon={Radio}
          trend="Waiting review"
          trendUp={false}
          variant="brand"
        />
        <StatCard
          title="Acknowledged"
          value={kpis.acknowledged}
          icon={Clock}
          trend="Officer noted"
          trendUp={true}
          variant="default"
        />
        <StatCard
          title="In Progress"
          value={kpis.inProgress}
          icon={Car}
          trend="Patrol dispatched"
          trendUp={true}
          variant="warning"
        />
        <StatCard
          title="Resolved Today"
          value={kpis.resolvedToday}
          icon={CheckCircle2}
          trend="Violation cleared"
          trendUp={true}
          variant="success"
        />
        <StatCard
          title="Critical Alerts"
          value={kpis.critical}
          icon={Flame}
          trend="Safety hazard"
          trendUp={false}
          variant="danger"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'cases'
              ? 'bg-blue-600 text-white shadow-soft'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Incoming Police Cases ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'map'
              ? 'bg-blue-600 text-white shadow-soft'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Violation Hotspot Heatmap
        </button>
        <button
          onClick={() => setActiveTab('officers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'officers'
              ? 'bg-blue-600 text-white shadow-soft'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Officer Patrol Roster ({officers.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CASES TABLE */}
      {/* ========================================================================= */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-soft flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search incident, vehicle, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPoliceData()}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <option value="">All Categories</option>
              <option value="Vehicle Blocking Footpath">Vehicle Blocking Footpath</option>
              <option value="No Parking">No Parking</option>
              <option value="Traffic Accident">Traffic Accident</option>
              <option value="Road Blockage">Road Blockage</option>
              <option value="Broken Traffic Signal">Broken Traffic Signal</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <option value="">All Statuses</option>
              <option value={STATUSES.DEPARTMENT_ASSIGNED}>New Assigned</option>
              <option value={STATUSES.WORK_STARTED}>In Progress</option>
              <option value={STATUSES.RESOLVED}>Resolved</option>
              <option value={STATUSES.REOPENED}>Reopened</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <button
              onClick={fetchPoliceData}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
            >
              Filter
            </button>
          </div>

          {/* Cases Table */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft">
            {reports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No police cases matching criteria found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3">Incident Code</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Location & Details</th>
                      <th className="p-3">Assigned Patrol</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reports.map((r) => {
                      const isUrgent = ['Traffic Accident', 'Road Blockage'].includes(r.category);
                      return (
                        <tr
                          key={r._id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                            isUrgent ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                          }`}
                          onClick={() => setSelectedReport(r)}
                        >
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              {r.media?.[0]?.url && (
                                <img
                                  src={r.media[0].url}
                                  alt=""
                                  className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                />
                              )}
                              <div>
                                <span>{r.reportCode}</span>
                                {isUrgent && (
                                  <span className="block text-[9px] font-extrabold uppercase text-rose-600">
                                    🚨 Priority Incident
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <CategoryChip category={r.category} />
                          </td>
                          <td className="p-3">
                            <PriorityBadge priority={r.priority} score={r.priorityScore} size="xs" />
                          </td>
                          <td className="p-3">
                            <StatusBadge status={r.status} size="xs" />
                          </td>
                          <td className="p-3 max-w-xs truncate text-slate-600 dark:text-slate-300">
                            <span className="font-semibold block truncate">{r.description}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{r.address || 'Pune Metro'}</span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {r.assignedTo ? (
                              <span className="font-semibold">{r.assignedTo.name} ({r.assignedTo.badgeNumber || 'Officer'})</span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned Patrol</span>
                            )}
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5">
                              {r.status === STATUSES.DEPARTMENT_ASSIGNED && (
                                <button
                                  type="button"
                                  onClick={() => handleAcknowledge(r._id)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs cursor-pointer"
                                >
                                  Acknowledge
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedReport(r)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 cursor-pointer"
                              >
                                View Case
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HOTSPOT HEATMAP */}
      {/* ========================================================================= */}
      {activeTab === 'map' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600" />
              <span>Traffic & Encroachment Violation Hotspots</span>
            </h3>
            <p className="text-xs text-slate-500">
              Density clustering for illegal parking, footpath obstructions, and signal failures across ward corridors.
            </p>
          </div>
          <div className="h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <MapView hotspots={hotspotPoints} initialZoom={13} interactive={true} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PATROL ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'officers' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Active Traffic Police Personnel & Patrol Officers ({officers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {officers.map((off) => (
              <div
                key={off._id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                  {off.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{off.name}</h4>
                  <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 block">
                    Badge: {off.badgeNumber || 'TP-8492'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {off.station || 'Central Traffic Division'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASE DRAWER */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto p-6 space-y-6">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {selectedReport.reportCode}
                  </span>
                  <StatusBadge status={selectedReport.status} size="sm" />
                </div>
                <div className="flex items-center gap-2">
                  <CategoryChip category={selectedReport.category} />
                  <PriorityBadge priority={selectedReport.priority} score={selectedReport.priorityScore} size="xs" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Police Incident Actions
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedReport.status === STATUSES.DEPARTMENT_ASSIGNED && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(selectedReport._id)}
                    disabled={modalLoading}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    ✓ Acknowledge Case
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModal('dispatch')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  🚓 Dispatch Patrol
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('action')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  ⚡ Record Action Taken
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('progress')}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  📝 Progress Update
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('resolve')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  ✅ Resolve Incident
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('reopen')}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                  Reopen
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('not_police')}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 dark:bg-rose-950/40 cursor-pointer"
                >
                  ✕ Not Police Matter
                </button>
              </div>
            </div>

            {/* Recorded Police Action Card (if any) */}
            {selectedReport.policeAction?.actionType && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-100">
                  <span>Enforcement Action Recorded:</span>
                  <span className="uppercase text-[11px] bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded">
                    {selectedReport.policeAction.actionType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  "{selectedReport.policeAction.remarks || 'No remarks provided'}"
                </p>
                <div className="text-[10px] text-slate-400">
                  Officer Badge: {selectedReport.policeAction.officerBadge || 'TP-8492'} •{' '}
                  {selectedReport.policeAction.timestamp ? new Date(selectedReport.policeAction.timestamp).toLocaleString() : ''}
                </div>
              </div>
            )}

            {/* Photos Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Violation Evidence Photos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedReport.media?.map((m, i) => (
                  <img
                    key={i}
                    src={m.url}
                    alt="Defect"
                    className="w-full h-36 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
                  />
                ))}
              </div>
            </div>

            {/* AI Diagnostics Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">AI Media Confidence:</span>
                <ConfidenceMeter confidence={selectedReport.aiMedia?.confidence || 0.85} showLabel={false} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {selectedReport.aiMedia?.rawSummary || 'AI classified severity and mobility impairment.'}
              </p>
            </div>

            {/* Incident Location Map */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Location & Coordinates
              </h4>
              <div className="h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <MapView
                  reports={[selectedReport]}
                  center={[
                    selectedReport.location?.coordinates[1] || 18.5204,
                    selectedReport.location?.coordinates[0] || 73.8567,
                  ]}
                  zoom={16}
                />
              </div>
              <span className="text-[11px] text-slate-500 block pt-1">
                📍 {selectedReport.address || 'Address registered on Pune Metro Map'}
              </span>
            </div>

            {/* Citizen Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Citizen Statement:
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                "{selectedReport.description}"
              </p>
            </div>

            {/* Reporter details */}
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Reported by: <strong>{selectedReport.reporter?.name || 'Citizen'}</strong></span>
              <span>Trust: {selectedReport.reporter?.trustScore || 100}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION DIALOG MODALS */}
      {/* ========================================================================= */}
      {activeModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              {activeModal === 'dispatch' && 'Dispatch Patrol Officer'}
              {activeModal === 'action' && 'Record Police Action Taken'}
              {activeModal === 'progress' && 'Post Investigation Progress'}
              {activeModal === 'resolve' && 'Resolve Incident & Submit Proof'}
              {activeModal === 'reopen' && 'Reopen Incident'}
              {activeModal === 'not_police' && 'Return to Admin: Not a Police Matter'}
            </h3>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              {/* DISPATCH MODAL */}
              {activeModal === 'dispatch' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Select Duty Officer
                    </label>
                    <select
                      value={dispatchOfficerId}
                      onChange={(e) => setDispatchOfficerId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <option value="">Duty Patrol Team (General Dispatch)</option>
                      {officers.map((off) => (
                        <option key={off._id} value={off._id}>
                          {off.name} (Badge: {off.badgeNumber || 'N/A'}) - {off.station}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dispatch Instructions / Priority Notes
                    </label>
                    <textarea
                      rows={3}
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      placeholder="e.g. Unit 4 dispatched to clear vehicle obstructing pedestrian egress..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </>
              )}

              {/* ACTION TAKEN MODAL */}
              {activeModal === 'action' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Action Type Taken
                    </label>
                    <select
                      value={policeActionType}
                      onChange={(e) => setPoliceActionType(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <option value="vehicle_cleared">Vehicle Cleared from Footpath / Road</option>
                      <option value="towed">Vehicle Towed to Impound</option>
                      <option value="challan_issued">Traffic Violation Challan / Fine Issued</option>
                      <option value="signal_reported">Traffic Signal Maintenance Crew Alerted</option>
                      <option value="other">Other Police Enforcement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Officer Badge Number
                    </label>
                    <input
                      type="text"
                      value={actionBadge}
                      onChange={(e) => setActionBadge(e.target.value)}
                      placeholder="e.g. TP-8492"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Action Details & Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      placeholder="e.g. Vehicle MH-12-AB-1234 issued e-challan and moved away from pedestrian path..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </>
              )}

              {/* PROGRESS MODAL */}
              {activeModal === 'progress' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    On-Site Progress Remarks
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    placeholder="e.g. Officer arrived on scene, contacting vehicle owner..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {/* RESOLVE MODAL */}
              {activeModal === 'resolve' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Upload Resolution Photo Proof (Cleared Site)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setResolvePhoto(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Resolution Description
                    </label>
                    <textarea
                      rows={3}
                      value={resolveRemarks}
                      onChange={(e) => setResolveRemarks(e.target.value)}
                      placeholder="e.g. Footpath completely cleared. Two-wheelers removed and traffic flow restored..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </>
              )}

              {/* REOPEN MODAL */}
              {activeModal === 'reopen' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reopen Reason
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    placeholder="e.g. Violation recurred at the same location, dispatching patrol again..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {/* NOT POLICE MATTER MODAL */}
              {activeModal === 'not_police' && (
                <>
                  <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
                    This incident will be removed from the Police Dashboard and returned to the Municipal Administrator's Assignment Queue with your reason.
                  </p>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Reason not a Police Matter <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={notPoliceReason}
                      onChange={(e) => setNotPoliceReason(e.target.value)}
                      placeholder="e.g. This obstruction is caused by construction debris from utility works, which falls under Municipal Civic Enforcement, not Traffic Police..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {modalLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
