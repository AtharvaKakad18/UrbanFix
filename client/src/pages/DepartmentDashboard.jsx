import React, { useState, useEffect } from 'react';
import {
  Building2,
  Kanban as KanbanIcon,
  Table as TableIcon,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ArrowRight,
  Upload,
  X,
  ExternalLink,
  ChevronRight,
  Check,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { StatusBadge } from '../components/badges/StatusBadge.jsx';
import { PriorityBadge } from '../components/badges/PriorityBadge.jsx';
import { CategoryChip } from '../components/badges/CategoryChip.jsx';
import { ConfidenceMeter } from '../components/badges/ConfidenceMeter.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FilterBar } from '../components/ui/FilterBar.jsx';
import { MapView } from '../components/map/MapView.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { STATUSES } from '../utils/constants.js';

export const DepartmentDashboard = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  // Action Modals & Form State
  const [activeModal, setActiveModal] = useState(null); // 'assign' | 'progress' | 'resolve' | 'reject' | 'reopen'
  const [assignStaffId, setAssignStaffId] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionPhoto, setActionPhoto] = useState(null);

  const fetchDepartmentReports = async () => {
    setLoading(true);
    try {
      const deptId = user?.department?._id || user?.department;
      const res = await api.get('/reports', {
        params: {
          department: deptId || undefined,
          limit: 100,
        },
      });
      setReports(res.data?.data?.reports || []);

      // Fetch users for staff assignment
      const usersRes = await api.get('/users?role=staff');
      setStaffList(usersRes.data?.data?.users || []);
    } catch (err) {
      console.error('Failed to load department work items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentReports();
  }, [user]);

  // KPIs
  const assignedCount = reports.filter((r) => r.status === STATUSES.DEPARTMENT_ASSIGNED).length;
  const inProgressCount = reports.filter((r) => r.status === STATUSES.WORK_STARTED).length;
  const resolvedCount = reports.filter((r) => r.status === STATUSES.RESOLVED || r.status === STATUSES.CLOSED).length;
  const criticalCount = reports.filter((r) => r.priority === 'Critical').length;

  const filteredReports = reports.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      const codeMatch = r.reportCode?.toLowerCase().includes(q);
      const descMatch = r.description?.toLowerCase().includes(q);
      const addrMatch = r.address?.toLowerCase().includes(q);
      if (!codeMatch && !descMatch && !addrMatch) return false;
    }
    if (category && r.category !== category) return false;
    if (status && r.status !== status) return false;
    if (priority && r.priority !== priority) return false;
    return true;
  });

  const handleStartWork = async (reportId) => {
    setActionLoading(true);
    try {
      await api.post(`/status/${reportId}/start-work`, { remarks: 'Crew dispatched to repair site.' });
      await fetchDepartmentReports();
      if (selectedReport?._id === reportId) {
        const updated = await api.get(`/reports/${reportId}`);
        setSelectedReport(updated.data?.data?.report);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Could not start work');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionModalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    setActionLoading(true);

    try {
      const id = selectedReport._id;

      if (activeModal === 'assign') {
        await api.put(`/assignments/${id}`, {
          staffId: assignStaffId || undefined,
          remarks: actionRemarks,
        });
      } else if (activeModal === 'progress') {
        const formData = new FormData();
        if (actionPhoto) formData.append('photos', actionPhoto);
        formData.append('remarks', actionRemarks);
        await api.post(`/status/${id}/progress`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (activeModal === 'resolve') {
        const formData = new FormData();
        if (actionPhoto) formData.append('photos', actionPhoto);
        formData.append('description', actionRemarks || 'Repair work certified complete.');
        formData.append('remarks', 'Field operations completed.');
        await api.post(`/status/${id}/resolve`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (activeModal === 'reject') {
        await api.post(`/status/${id}/reject`, { reason: actionRemarks });
      } else if (activeModal === 'reopen') {
        await api.post(`/status/${id}/reopen`, { reason: actionRemarks });
      } else if (activeModal === 'reassign_request') {
        await api.post(`/reports/${id}/request-reassignment`, { reason: actionRemarks });
        alert('Reassignment request submitted to Admin queue.');
      }

      setActiveModal(null);
      setActionRemarks('');
      setActionPhoto(null);
      await fetchDepartmentReports();
      const updated = await api.get(`/reports/${id}`);
      setSelectedReport(updated.data?.data?.report);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const kanbanColumns = [
    { key: STATUSES.DEPARTMENT_ASSIGNED, title: 'Department Assigned', color: 'border-indigo-500' },
    { key: STATUSES.WORK_STARTED, title: 'Work In Progress', color: 'border-purple-500' },
    { key: STATUSES.RESOLVED, title: 'Resolved & Awaiting Sign-off', color: 'border-emerald-500' },
  ];

  const tableColumns = [
    {
      header: 'Code',
      accessor: 'reportCode',
      sortable: true,
      cell: (row) => (
        <span
          onClick={() => setSelectedReport(row)}
          className="font-mono font-bold text-brand-600 dark:text-brand-400 cursor-pointer hover:underline"
        >
          {row.reportCode}
        </span>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      cell: (row) => <CategoryChip category={row.category} />,
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status} size="xs" />,
    },
    {
      header: 'Priority',
      accessor: 'priority',
      cell: (row) => <PriorityBadge priority={row.priority} score={row.priorityScore} size="xs" />,
    },
    {
      header: 'Assigned To',
      accessor: 'assignedTo',
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {row.assignedTo?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: (row) => (
        <button
          onClick={() => setSelectedReport(row)}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-600 text-slate-700 dark:text-slate-300 transition-colors"
        >
          View Details
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Municipal Operations Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {user?.department?.name || 'Department Work Orders'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage field dispatches, assign crew members, post repair updates, and submit resolution proof.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-soft">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'kanban'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KanbanIcon className="w-4 h-4" />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'table'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>Table View</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Assigned to Dept" value={assignedCount} icon={Building2} color="brand" />
        <StatCard title="In Progress" value={inProgressCount} icon={Wrench} color="purple" />
        <StatCard title="Resolved Work" value={resolvedCount} icon={CheckCircle2} color="emerald" />
        <StatCard title="Critical Incidents" value={criticalCount} icon={AlertTriangle} color="rose" />
      </div>

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        onReset={() => {
          setSearch('');
          setCategory('');
          setStatus('');
          setPriority('');
        }}
      />

      {/* Main View Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {kanbanColumns.map((col) => {
            const colReports = filteredReports.filter((r) => r.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-4"
              >
                <div className={`flex items-center justify-between pb-3 border-b-2 ${col.color}`}>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {col.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {colReports.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colReports.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No reports in this stage.
                    </div>
                  ) : (
                    colReports.map((report) => (
                      <div
                        key={report._id}
                        onClick={() => setSelectedReport(report)}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:shadow-soft-lg hover:border-brand-500/50 transition-all cursor-pointer space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                            {report.reportCode}
                          </span>
                          <PriorityBadge priority={report.priority} score={report.priorityScore} size="xs" />
                        </div>

                        {report.media?.[0]?.url && (
                          <img
                            src={report.media[0].url}
                            alt="Defect"
                            className="w-full h-28 object-cover rounded-xl"
                          />
                        )}

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {report.description}
                        </p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate max-w-[140px]">
                            {report.assignedTo?.name || 'Unassigned'}
                          </span>
                          <CategoryChip category={report.category} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable columns={tableColumns} data={filteredReports} />
      )}

      {/* Work Detail Drawer (Modal Slide-out) */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-black text-slate-900 dark:text-slate-100">
                    {selectedReport.reportCode}
                  </span>
                  <StatusBadge status={selectedReport.status} size="sm" />
                </div>
                <p className="text-xs text-slate-500">{selectedReport.address}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department Work Actions Toolbar */}
            <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-850 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300 block">
                Work Dispatch Actions
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveModal('assign')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-brand-100"
                >
                  👤 Assign Staff
                </button>

                {selectedReport.status === STATUSES.DEPARTMENT_ASSIGNED && (
                  <button
                    onClick={() => handleStartWork(selectedReport._id)}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Start Work</span>
                  </button>
                )}

                {selectedReport.status === STATUSES.WORK_STARTED && (
                  <>
                    <button
                      onClick={() => setActiveModal('progress')}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
                    >
                      📝 Post Progress
                    </button>
                    <button
                      onClick={() => setActiveModal('resolve')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                    >
                      ✅ Mark Resolved
                    </button>
                  </>
                )}

                <button
                  onClick={() => setActiveModal('reopen')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                  Reopen
                </button>

                <button
                  onClick={() => setActiveModal('reject')}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold"
                >
                  <XCircle className="w-3.5 h-3.5 inline mr-1" />
                  Reject
                </button>

                <button
                  onClick={() => setActiveModal('reassign_request')}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100"
                >
                  Request Reassignment
                </button>
              </div>
            </div>

            {/* Photos & AI Result */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Defect Photos</h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedReport.media?.map((m, i) => (
                  <img
                    key={i}
                    src={m.url}
                    alt="Defect"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                ))}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">AI Confidence:</span>
                  <ConfidenceMeter confidence={selectedReport.aiMedia?.confidence || 0.8} showLabel={false} />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {selectedReport.aiMedia?.rawSummary || 'AI classified severity and risk.'}
                </p>
              </div>

              <div className="h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <MapView
                  reports={[selectedReport]}
                  center={[selectedReport.location?.coordinates[1] || 18.5204, selectedReport.location?.coordinates[0] || 73.8567]}
                  zoom={16}
                />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Citizen Claim:</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                  "{selectedReport.description}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog Form Modal */}
      {activeModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              {activeModal === 'assign' && 'Assign Report to Staff'}
              {activeModal === 'progress' && 'Update Field Progress'}
              {activeModal === 'resolve' && 'Submit Resolution & Before/After Proof'}
              {activeModal === 'reject' && 'Reject Report'}
              {activeModal === 'reopen' && 'Reopen Report'}
              {activeModal === 'reassign_request' && 'Request Reassignment by Admin'}
            </h3>

            <form onSubmit={handleActionModalSubmit} className="space-y-4">
              {activeModal === 'reassign_request' && (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                  Submit a reassignment request explaining why this report does not fall under your department's jurisdiction. The Municipal Administrator will review it in the Assignment Queue.
                </p>
              )}

              {activeModal === 'assign' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Staff Member
                  </label>
                  <select
                    value={assignStaffId}
                    onChange={(e) => setAssignStaffId(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="">Select crew officer...</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(activeModal === 'progress' || activeModal === 'resolve') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Upload Field Evidence Photo
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setActionPhoto(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {activeModal === 'reject'
                    ? 'Rejection Reason *'
                    : activeModal === 'reassign_request'
                    ? 'Reason for Reassignment *'
                    : 'Remarks / Work Description'}
                </label>
                <textarea
                  rows={3}
                  required={activeModal === 'reject' || activeModal === 'reassign_request'}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder={
                    activeModal === 'reassign_request'
                      ? 'Explain why this report belongs to another department (e.g. Broken water line belongs to Drainage, not Roads)...'
                      : 'Enter details here...'
                  }
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
