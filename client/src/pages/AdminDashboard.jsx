import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ShieldAlert,
  Users,
  Building,
  Layers,
  Sliders,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Flame,
  Search,
  Plus,
  ArrowRight,
  ExternalLink,
  Split,
  Merge,
  Inbox,
  Trash2,
  RotateCcw,
  Sparkles,
  Check,
  X,
  FileText,
  Shield,
  Car,
  BadgeAlert,
  Send,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api.js';
import { StatCard } from '../components/ui/StatCard.jsx';
import { StatusBadge } from '../components/badges/StatusBadge.jsx';
import { PriorityBadge } from '../components/badges/PriorityBadge.jsx';
import { CategoryChip } from '../components/badges/CategoryChip.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { MapView } from '../components/map/MapView.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { CATEGORIES, STATUSES, PRIORITIES } from '../utils/constants.js';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('reports'); // Default to All Reports so admin sees everything!
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  // All Reports states
  const [allReports, setAllReports] = useState([]);
  const [allReportsLoading, setAllReportsLoading] = useState(false);
  const [reportsSearch, setReportsSearch] = useState('');
  const [reportsCategory, setReportsCategory] = useState('');
  const [reportsStatus, setReportsStatus] = useState('');
  const [reportsPriority, setReportsPriority] = useState('');
  const [reportsDeptId, setReportsDeptId] = useState('');
  const [reportsPagination, setReportsPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [allSelectedReportIds, setAllSelectedReportIds] = useState([]);

  // Queue states
  const [unassignedReports, setUnassignedReports] = useState([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [reassignmentRequests, setReassignmentRequests] = useState([]);

  // Trash states
  const [trashReports, setTrashReports] = useState([]);
  const [trashSearch, setTrashSearch] = useState('');

  // Modals & Action states
  const [assignModal, setAssignModal] = useState({ open: false, report: null, isBulk: false });
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [deleteModal, setDeleteModal] = useState({ open: false, reportId: null, reportCode: '' });
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [permDeleteModal, setPermDeleteModal] = useState({ open: false, reportId: null, reportCode: '' });
  const [confirmInput, setConfirmInput] = useState('');
  const [isPermDeleting, setIsPermDeleting] = useState(false);

  // Routing settings states
  const [policeRoutingEnabled, setPoliceRoutingEnabled] = useState(true);
  const [categoriesList, setCategoriesList] = useState([]);

  // Audit table states
  const [mismatches, setMismatches] = useState([]);
  const [lowConfidence, setLowConfidence] = useState([]);
  const [suspicious, setSuspicious] = useState([]);

  // Management states
  const [usersList, setUsersList] = useState([]);
  const [priorityRules, setPriorityRules] = useState(null);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // User modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    department: '',
    badgeNumber: '',
    station: '',
  });

  const fetchQueue = async () => {
    try {
      const [queueRes, reassignRes] = await Promise.all([
        api.get(`/admin/reports/unassigned?search=${encodeURIComponent(queueSearch)}`),
        api.get('/admin/reassignment-requests'),
      ]);
      setUnassignedReports(queueRes.data?.data?.reports || []);
      setReassignmentRequests(reassignRes.data?.data?.reports || []);
    } catch (e) {
      console.error('Failed to load queue', e);
    }
  };

  const fetchTrash = async () => {
    try {
      const res = await api.get(`/admin/reports/trash?search=${encodeURIComponent(trashSearch)}`);
      setTrashReports(res.data?.data?.reports || []);
    } catch (e) {
      console.error('Failed to load trash', e);
    }
  };

  const fetchCategoriesAndRouting = async () => {
    try {
      const [catRes, routeRes] = await Promise.all([
        api.get('/categories'),
        api.get('/admin/settings/police-routing'),
      ]);
      setCategoriesList(catRes.data?.data?.categories || []);
      setPoliceRoutingEnabled(routeRes.data?.data?.enabled ?? true);
    } catch (e) {
      console.error('Failed to load routing settings', e);
    }
  };

  const fetchAllReports = async (page = 1) => {
    setAllReportsLoading(true);
    try {
      const res = await api.get('/admin/reports/all', {
        params: {
          page,
          limit: 20,
          search: reportsSearch || undefined,
          category: reportsCategory || undefined,
          status: reportsStatus || undefined,
          priority: reportsPriority || undefined,
          departmentId: reportsDeptId || undefined,
        },
      });
      setAllReports(res.data?.data?.reports || []);
      setReportsPagination(res.data?.data?.pagination || { total: 0, page: 1, pages: 1 });
    } catch (e) {
      console.error('Failed to load all reports', e);
    } finally {
      setAllReportsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports(1);
  }, [reportsSearch, reportsCategory, reportsStatus, reportsPriority, reportsDeptId]);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const [sumRes, chartsRes, hotRes, misRes, lowRes, suspRes, usersRes, rulesRes, dupRes, deptRes] =
          await Promise.allSettled([
            api.get('/admin/analytics/summary'),
            api.get('/admin/analytics/charts'),
            api.get('/admin/analytics/hotspots'),
            api.get('/admin/analytics/mismatches'),
            api.get('/admin/analytics/low-confidence'),
            api.get('/admin/analytics/suspicious'),
            api.get('/users?limit=50'),
            api.get('/priority-rules'),
            api.get('/duplicates?minReports=1'),
            api.get('/departments'),
          ]);

        if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data?.data);
        if (chartsRes.status === 'fulfilled') setChartData(chartsRes.value.data?.data);
        if (hotRes.status === 'fulfilled') setHotspots(hotRes.value.data?.data?.points || []);
        if (misRes.status === 'fulfilled') setMismatches(misRes.value.data?.data?.reports || []);
        if (lowRes.status === 'fulfilled') setLowConfidence(lowRes.value.data?.data?.reports || []);
        if (suspRes.status === 'fulfilled') setSuspicious(suspRes.value.data?.data?.reports || []);
        if (usersRes.status === 'fulfilled') setUsersList(usersRes.value.data?.data?.users || []);
        if (rulesRes.status === 'fulfilled') setPriorityRules(rulesRes.value.data?.data?.rule);
        if (dupRes.status === 'fulfilled') setDuplicateGroups(dupRes.value.data?.data?.groups || []);
        if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data?.data?.departments || []);

        await Promise.allSettled([
          fetchQueue(),
          fetchTrash(),
          fetchCategoriesAndRouting(),
          fetchAllReports(1),
        ]);
      } catch (err) {
        console.error('Failed to load admin analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  // Open Assign Modal with default department pre-selected
  const openAssignModal = (report) => {
    const rawDefault =
      report?.assignedDepartment?._id ||
      report?.assignedDepartment ||
      report?.suggestedDepartment?._id ||
      report?.suggestedDepartment;
    const defaultId = rawDefault ? (typeof rawDefault === 'object' ? rawDefault._id : String(rawDefault)) : '';
    const matched = departments.find((d) => String(d._id) === String(defaultId));
    setSelectedDeptId(matched ? String(matched._id) : (departments[0]?._id ? String(departments[0]._id) : ''));
    setAssignNote('');
    setAssignModal({ open: true, report, isBulk: false });
  };

  const openBulkAssignModal = (reportIds) => {
    setSelectedDeptId(departments[0]?._id ? String(departments[0]._id) : '');
    setAssignNote('');
    setAssignModal({ open: true, report: null, isBulk: true, reportIds });
  };

  // Admin Verification of Report
  const handleVerifyReport = async (report) => {
    try {
      const rawDeptId =
        report.suggestedDepartment?._id ||
        report.suggestedDepartment ||
        report.assignedDepartment?._id ||
        report.assignedDepartment;
      const targetDeptId = rawDeptId
        ? (typeof rawDeptId === 'object' ? rawDeptId._id : String(rawDeptId))
        : undefined;

      const res = await api.patch(`/admin/reports/${report._id}/verify`, {
        departmentId: targetDeptId,
        note: 'Verified and approved by Administrator.',
      });
      toast.success(res.data?.message || `Report ${report.reportCode} verified successfully.`);

      // Optimistically update lists
      setAllReports((prev) =>
        prev.map((r) =>
          r._id === report._id
            ? {
                ...r,
                status: res.data?.data?.report?.status || 'Department Assigned',
                assignedDepartment: res.data?.data?.report?.assignedDepartment || r.assignedDepartment,
                policeNeedsVerification: false,
              }
            : r
        )
      );
      setQueueReports((prev) => prev.filter((r) => r._id !== report._id));

      Promise.allSettled([
        fetchAllReports(reportsPagination.page),
        fetchQueue(),
        api.get('/admin/analytics/summary').then((r) => setSummary(r.data?.data)),
      ]).catch(() => {});
    } catch (err) {
      console.error('Verify error:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Verification failed');
    }
  };

  // Quick Accept Suggestion shortcut
  const handleAcceptSuggestion = async (report) => {
    const rawDeptId = report.suggestedDepartment?._id || report.suggestedDepartment;
    const targetDeptId = rawDeptId ? (typeof rawDeptId === 'object' ? rawDeptId._id : String(rawDeptId)) : null;
    if (!targetDeptId) {
      toast.error('No suggested department available for this report.');
      return;
    }
    try {
      const res = await api.patch(`/admin/reports/${report._id}/assign`, {
        departmentId: targetDeptId,
        note: 'Accepted AI suggested department assignment.',
      });
      toast.success(res.data?.message || `Report ${report.reportCode} assigned to ${report.suggestedDepartment?.name || 'department'}.`);
      setQueueReports((prev) => prev.filter((r) => r._id !== report._id));
      Promise.allSettled([
        fetchQueue(),
        fetchAllReports(reportsPagination.page),
        api.get('/admin/analytics/summary').then((r) => setSummary(r.data?.data)),
      ]).catch(() => {});
    } catch (err) {
      console.error('Accept suggestion error:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Assignment failed');
    }
  };

  // Perform single or bulk assign
  const handleConfirmAssign = async (e) => {
    e.preventDefault();
    if (!selectedDeptId) {
      toast.error('Please select a department or Police.');
      return;
    }

    setIsAssigning(true);
    try {
      if (assignModal.isBulk) {
        const idsToAssign = assignModal.reportIds || selectedReportIds || allSelectedReportIds;
        if (!idsToAssign || idsToAssign.length === 0) {
          toast.error('No reports selected for assignment.');
          setIsAssigning(false);
          return;
        }
        const res = await api.post('/admin/reports/bulk-assign', {
          reportIds: idsToAssign,
          departmentId: selectedDeptId,
          note: assignNote,
        });
        setSelectedReportIds([]);
        setAllSelectedReportIds([]);
        toast.success(res.data?.message || `Successfully bulk-assigned ${idsToAssign.length} reports!`);
      } else {
        if (!assignModal.report?._id) {
          toast.error('No report selected for assignment.');
          setIsAssigning(false);
          return;
        }
        const res = await api.patch(`/admin/reports/${assignModal.report._id}/assign`, {
          departmentId: selectedDeptId,
          note: assignNote,
        });
        toast.success(res.data?.message || `Report ${assignModal.report.reportCode} assigned successfully.`);
      }
      setAssignModal({ open: false, report: null, isBulk: false });
      setSelectedDeptId('');
      setAssignNote('');

      Promise.allSettled([
        fetchQueue(),
        fetchAllReports(reportsPagination.page),
        api.get('/admin/analytics/summary').then((r) => setSummary(r.data?.data)),
      ]).catch(() => {});
    } catch (err) {
      console.error('Assign error:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  // Pull back to queue
  const handleUnassign = async (reportId) => {
    if (!window.confirm('Pull this report back into the unassigned queue?')) return;
    try {
      await api.patch(`/admin/reports/${reportId}/unassign`);
      toast.success('Report pulled back to assignment queue.');
      Promise.allSettled([
        fetchQueue(),
        fetchAllReports(reportsPagination.page),
        api.get('/admin/analytics/summary').then((r) => setSummary(r.data?.data)),
      ]).catch(() => {});
    } catch (err) {
      console.error('Unassign error:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to unassign report');
    }
  };

  // Soft delete
  const handleConfirmSoftDelete = async (e) => {
    e.preventDefault();
    if (!deleteReason.trim()) {
      alert('Please specify a deletion reason.');
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/admin/reports/${deleteModal.reportId}`, {
        data: { deletedReason: deleteReason.trim() },
      });
      setDeleteModal({ open: false, reportId: null, reportCode: '' });
      setDeleteReason('');
      await fetchQueue();
      await fetchTrash();
      alert('Report moved to Trash bin.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore from trash
  const handleRestore = async (reportId) => {
    try {
      await api.post(`/admin/reports/${reportId}/restore`);
      await fetchTrash();
      await fetchQueue();
      alert('Report successfully restored!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Restore failed');
    }
  };

  // Permanent Delete
  const handleConfirmPermanentDelete = async (e) => {
    e.preventDefault();
    if (confirmInput !== 'DELETE') {
      alert('You must type DELETE exactly to confirm permanent deletion.');
      return;
    }

    setIsPermDeleting(true);
    try {
      await api.delete(`/admin/reports/${permDeleteModal.reportId}/permanent`, {
        data: { confirmation: 'DELETE' },
      });
      setPermDeleteModal({ open: false, reportId: null, reportCode: '' });
      setConfirmInput('');
      await fetchTrash();
      alert('Report and photos permanently deleted.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Permanent delete failed');
    } finally {
      setIsPermDeleting(false);
    }
  };

  // Approve Reassignment
  const handleApproveReassignment = async (reportId, newDeptId = null) => {
    try {
      await api.post(`/admin/reassignment-requests/${reportId}/approve`, {
        newDepartmentId: newDeptId,
      });
      await fetchQueue();
      alert('Reassignment request approved.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action failed');
    }
  };

  // Decline Reassignment
  const handleDeclineReassignment = async (reportId) => {
    try {
      await api.post(`/admin/reassignment-requests/${reportId}/decline`);
      await fetchQueue();
      alert('Reassignment request declined.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action failed');
    }
  };

  // Police Auto-Routing Toggle
  const handleTogglePoliceRouting = async () => {
    const nextVal = !policeRoutingEnabled;
    try {
      await api.put('/admin/settings/police-routing', { enabled: nextVal });
      setPoliceRoutingEnabled(nextVal);
    } catch (err) {
      alert('Failed to update police routing setting');
    }
  };

  // Category Police Flag Toggle
  const handleToggleCategoryPolice = async (catId, currentVal) => {
    try {
      await api.patch(`/admin/categories/${catId}/police-routing`, {
        routeToPolice: !currentVal,
      });
      await fetchCategoriesAndRouting();
    } catch (err) {
      alert('Failed to update category routing');
    }
  };

  // Save rules
  const handleSaveRules = async (e) => {
    e.preventDefault();
    setIsSavingRules(true);
    try {
      const res = await api.put('/priority-rules', priorityRules);
      setPriorityRules(res.data?.data?.rule);
      alert('Priority rules updated successfully!');
    } catch (err) {
      alert('Failed to update priority rules');
    } finally {
      setIsSavingRules(false);
    }
  };

  // Add user
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', newUserData);
      setShowAddUserModal(false);
      setNewUserData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        department: '',
        badgeNumber: '',
        station: '',
      });
      const refreshed = await api.get('/users?limit=50');
      setUsersList(refreshed.data?.data?.users || []);
      alert('User created successfully!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create user');
    }
  };

  const tabs = [
    { key: 'reports', label: 'All Reports', icon: FileText, count: reportsPagination.total || summary?.totalReports || 0 },
    { key: 'queue', label: 'Assignment Queue', icon: Inbox, count: unassignedReports.length },
    { key: 'trash', label: 'Trash Bin', icon: Trash2, count: trashReports.length },
    { key: 'routing', label: 'Police & Routing', icon: Shield },
    { key: 'overview', label: 'Executive KPIs', icon: TrendingUp },
    { key: 'charts', label: 'Analytics', icon: BarChart },
    { key: 'audit', label: 'AI Quality Audit', icon: ShieldAlert },
    { key: 'users', label: 'Personnel & Users', icon: Users },
    { key: 'duplicates', label: 'Duplicate Clusters', icon: Copy },
    { key: 'rules', label: 'Priority Rules', icon: Sliders },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      </div>
    );
  }

  const kpis = summary || {
    totalReports: 25,
    activeReports: 11,
    resolvedReports: 14,
    pendingVerification: 2,
    criticalReports: 4,
    duplicateGroups: 2,
    resolutionRate: 56,
    avgResolutionHours: 18.5,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
            Municipal Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Admin Console & Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch queue, soft-delete trash recovery, police auto-routing, and governance audit.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-soft">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      tab.key === 'trash'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-brand-600 text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: ALL REPORTS & DISPATCH */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header & Filter Controls */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-600" />
                  <span>All Urban Mobility Reports ({reportsPagination.total})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Full registry across all departments. Search, manually assign/reassign, or verify any civic problem.
                </p>
              </div>

              {allSelectedReportIds.length > 0 && (
                <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-950/60 p-2 rounded-xl border border-brand-200 dark:border-brand-800">
                  <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                    {allSelectedReportIds.length} Selected
                  </span>
                  <button
                    onClick={() => {
                      setSelectedReportIds(allSelectedReportIds);
                      openBulkAssignModal(allSelectedReportIds);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold shadow-sm hover:bg-brand-700 cursor-pointer"
                  >
                    Bulk Assign
                  </button>
                  <button
                    onClick={() => setAllSelectedReportIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 px-1 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, text, address..."
                  value={reportsSearch}
                  onChange={(e) => setReportsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <select
                  value={reportsCategory}
                  onChange={(e) => setReportsCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={reportsStatus}
                  onChange={(e) => setReportsStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">All Statuses</option>
                  {Object.values(STATUSES).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={reportsPriority}
                  onChange={(e) => setReportsPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">All Priorities</option>
                  {Object.values(PRIORITIES).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={reportsDeptId}
                  onChange={(e) => setReportsDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">All Departments</option>
                  <option value="unassigned">⚠️ Unassigned</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.type === 'police' ? '🚔 ' : '🏢 '}
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(reportsSearch || reportsCategory || reportsStatus || reportsPriority || reportsDeptId) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setReportsSearch('');
                    setReportsCategory('');
                    setReportsStatus('');
                    setReportsPriority('');
                    setReportsDeptId('');
                  }}
                  className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            {allReportsLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading reports registry...</div>
            ) : allReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No reports matched the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={allSelectedReportIds.length === allReports.length && allReports.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setAllSelectedReportIds(allReports.map((r) => r._id));
                            else setAllSelectedReportIds([]);
                          }}
                        />
                      </th>
                      <th className="p-3">Report Code</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Assigned Department</th>
                      <th className="p-3">Description & Location</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allReports.map((r) => {
                      const isSelected = allSelectedReportIds.includes(r._id);
                      const currentDept = r.assignedDepartment || r.department;
                      const needsVerify =
                        r.status === STATUSES.VERIFICATION_REQUIRED ||
                        r.status === STATUSES.MANUAL_VERIFICATION_REQUIRED ||
                        r.status === STATUSES.REPORTED ||
                        r.policeNeedsVerification;

                      return (
                        <tr key={r._id} className={isSelected ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setAllSelectedReportIds([...allSelectedReportIds, r._id]);
                                else setAllSelectedReportIds(allSelectedReportIds.filter((id) => id !== r._id));
                              }}
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              {r.media?.[0]?.url && (
                                <img
                                  src={r.media[0].url}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200"
                                />
                              )}
                              <a
                                href={`/reports/${r._id}`}
                                className="hover:underline text-brand-600 dark:text-brand-400"
                              >
                                {r.reportCode}
                              </a>
                            </div>
                            {r.policeNeedsVerification && (
                              <span className="block mt-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded w-fit">
                                Police-related, needs verification
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <CategoryChip category={r.category} />
                          </td>
                          <td className="p-3">
                            <StatusBadge status={r.status} size="xs" />
                          </td>
                          <td className="p-3">
                            <PriorityBadge priority={r.priority} score={r.priorityScore} />
                          </td>
                          <td className="p-3">
                            {currentDept ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  {currentDept.name}
                                </span>
                              </div>
                            ) : r.suggestedDepartment ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Suggested: {r.suggestedDepartment.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="p-3 max-w-xs text-slate-600 dark:text-slate-300 truncate">
                            <span className="font-semibold block truncate">{r.description}</span>
                            {r.address && <span className="block text-[10px] text-slate-400 truncate">{r.address}</span>}
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {needsVerify && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifyReport(r)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Verify Report"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verify</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openAssignModal(r)}
                                className="px-2.5 py-1 rounded-lg bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 shadow-xs cursor-pointer"
                              >
                                {currentDept ? 'Reassign' : 'Assign'}
                              </button>
                              <a
                                href={`/reports/${r._id}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Inspect Details"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setDeleteModal({ open: true, reportId: r._id, reportCode: r.reportCode })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Move to Trash (Soft Delete)"
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Pagination Controls */}
            {reportsPagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500">
                  Showing {(reportsPagination.page - 1) * 20 + 1} to{' '}
                  {Math.min(reportsPagination.page * 20, reportsPagination.total)} of{' '}
                  {reportsPagination.total} reports
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={reportsPagination.page <= 1}
                    onClick={() => fetchAllReports(reportsPagination.page - 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Page {reportsPagination.page} of {reportsPagination.pages}
                  </span>
                  <button
                    disabled={reportsPagination.page >= reportsPagination.pages}
                    onClick={() => fetchAllReports(reportsPagination.page + 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ASSIGNMENT QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Reassignment Requests Alert Banner */}
          {reassignmentRequests.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl shadow-soft space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Staff Reassignment Requests Pending Review ({reassignmentRequests.length})</span>
              </div>
              <div className="divide-y divide-amber-200 dark:divide-amber-800">
                {reassignmentRequests.map((req) => (
                  <div key={req._id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-mono font-bold text-amber-900 dark:text-amber-100 mr-2">{req.reportCode}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Category: {req.category}</span>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                        <strong className="text-amber-700 dark:text-amber-300">Staff Reason:</strong> "{req.reassignmentRequest?.reason}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveReassignment(req._id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Pull to Queue
                      </button>
                      <button
                        onClick={() => handleDeclineReassignment(req._id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk Action Header Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search queue by code, description, category..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchQueue()}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <button
                onClick={fetchQueue}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200"
              >
                Search
              </button>
            </div>

            {selectedReportIds.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto bg-brand-50 dark:bg-brand-950/60 p-2 rounded-xl border border-brand-200 dark:border-brand-800">
                <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                  {selectedReportIds.length} Selected
                </span>
                <button
                  onClick={() => openBulkAssignModal(selectedReportIds)}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold shadow-sm hover:bg-brand-700"
                >
                  Bulk Assign to Department
                </button>
                <button
                  onClick={() => setSelectedReportIds([])}
                  className="text-xs text-slate-500 hover:text-slate-800 px-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Unassigned Reports Table */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-brand-600" />
                  <span>Incoming Reports Awaiting Department Assignment ({unassignedReports.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  New reports are held here under "Received, under review" status until assigned by the Administrator.
                </p>
              </div>
            </div>

            {unassignedReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No unassigned reports waiting in queue. All incoming reports have been dispatched!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedReportIds.length === unassignedReports.length && unassignedReports.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedReportIds(unassignedReports.map((r) => r._id));
                            else setSelectedReportIds([]);
                          }}
                        />
                      </th>
                      <th className="p-3">Report Code</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">AI Suggested Department</th>
                      <th className="p-3">Description & Address</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {unassignedReports.map((r) => {
                      const isSelected = selectedReportIds.includes(r._id);
                      return (
                        <tr key={r._id} className={isSelected ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedReportIds([...selectedReportIds, r._id]);
                                else setSelectedReportIds(selectedReportIds.filter((id) => id !== r._id));
                              }}
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              {r.media?.[0]?.url && (
                                <img
                                  src={r.media[0].url}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200"
                                />
                              )}
                              <span>{r.reportCode}</span>
                            </div>
                            {r.policeNeedsVerification && (
                              <span className="block mt-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded w-fit">
                                Police-related, needs verification
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <CategoryChip category={r.category} />
                          </td>
                          <td className="p-3">
                            <PriorityBadge priority={r.priority} score={r.priorityScore} />
                          </td>
                          <td className="p-3">
                            {r.suggestedDepartment ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                  {r.suggestedDepartment.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptSuggestion(r)}
                                  className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="Accept suggestion in 1 click"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Accept</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">None suggested</span>
                            )}
                          </td>
                          <td className="p-3 max-w-xs text-slate-600 dark:text-slate-300 truncate">
                            <span className="font-semibold">{r.description}</span>
                            {r.address && <span className="block text-[10px] text-slate-400 truncate">{r.address}</span>}
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {(r.status === STATUSES.VERIFICATION_REQUIRED ||
                                r.status === STATUSES.MANUAL_VERIFICATION_REQUIRED ||
                                r.status === STATUSES.REPORTED ||
                                r.policeNeedsVerification) && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifyReport(r)}
                                  className="px-2 py-1 rounded-lg bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-xs flex items-center gap-1 cursor-pointer"
                                  title="Verify Report"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verify</span>
                                </button>
                              )}
                              <button
                                onClick={() => openAssignModal(r)}
                                className="px-2.5 py-1 rounded-lg bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 shadow-xs cursor-pointer"
                              >
                                Assign
                              </button>
                              <button
                                onClick={() => setDeleteModal({ open: true, reportId: r._id, reportCode: r.reportCode })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Move to Trash (Soft Delete)"
                              >
                                <Trash2 className="w-4 h-4" />
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
      {/* TAB 2: TRASH BIN & RESTORE */}
      {/* ========================================================================= */}
      {activeTab === 'trash' && (
        <div className="space-y-6">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-soft flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search trash by code, reason..."
                value={trashSearch}
                onChange={(e) => setTrashSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTrash()}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <button
              onClick={fetchTrash}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200"
            >
              Refresh Trash
            </button>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Soft-Deleted Reports Bin ({trashReports.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Reports hidden from citizens, maps, and analytics. Restore them or permanently erase with evidence media.
                </p>
              </div>
            </div>

            {trashReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Trash bin is empty. No deleted reports found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3">Report Code</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Deleted Reason</th>
                      <th className="p-3">Deleted By</th>
                      <th className="p-3">Deleted At</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {trashReports.map((t) => (
                      <tr key={t._id}>
                        <td className="p-3 font-mono font-bold">{t.reportCode}</td>
                        <td className="p-3"><CategoryChip category={t.category} /></td>
                        <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">"{t.deletedReason || 'N/A'}"</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{t.deletedBy?.name || 'Administrator'}</td>
                        <td className="p-3 text-slate-400">{t.deletedAt ? new Date(t.deletedAt).toLocaleString() : '—'}</td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleRestore(t._id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => setPermDeleteModal({ open: true, reportId: t._id, reportCode: t.reportCode })}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <span>Permanent Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POLICE & CATEGORIES ROUTING */}
      {/* ========================================================================= */}
      {activeTab === 'routing' && (
        <div className="space-y-6">
          {/* Master Police Auto Routing Toggle Card */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Police Auto-Routing Engine
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                When enabled, AI-Verified reports matching police categories bypass the Admin queue and route straight to the Police Dashboard. Verification-needed cases still route to the Admin queue with a badge.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTogglePoliceRouting}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                policeRoutingEnabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {policeRoutingEnabled ? '✓ Auto-Routing Enabled' : '✕ Auto-Routing Disabled'}
            </button>
          </div>

          {/* Category Routing Flags Table */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Category Police Routing Rules ({categoriesList.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Toggle which categories route directly to Police Enforcement.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Category Name</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Default Severity</th>
                    <th className="p-3">Safety Risk</th>
                    <th className="p-3">Route to Police</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {categoriesList.map((cat) => (
                    <tr key={cat._id}>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{cat.name}</td>
                      <td className="p-3 font-mono text-slate-500">{cat.code}</td>
                      <td className="p-3 font-bold">{cat.baseSeverity} / 5</td>
                      <td className="p-3 font-bold">{cat.safetyRisk} / 5</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.routeToPolice
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}
                        >
                          {cat.routeToPolice ? 'Police Enforcement' : 'Civic Department'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleCategoryPolice(cat._id, cat.routeToPolice)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            cat.routeToPolice
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40'
                          }`}
                        >
                          {cat.routeToPolice ? 'Route to Civic' : 'Route to Police'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXECUTIVE OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Mobility Reports"
              value={kpis.totalReports}
              icon={TrendingUp}
              trend="+12% from last week"
              trendUp={true}
              variant="default"
            />
            <StatCard
              title="Active Work Orders"
              value={kpis.activeReports}
              icon={Clock}
              trend="In progress or assigned"
              trendUp={false}
              variant="brand"
            />
            <StatCard
              title="Resolved SLA Rate"
              value={`${kpis.resolutionRate}%`}
              icon={CheckCircle2}
              trend={`Avg ${kpis.avgResolutionHours}h turnaround`}
              trendUp={true}
              variant="success"
            />
            <StatCard
              title="Critical Priority"
              value={kpis.criticalReports}
              icon={Flame}
              trend="Immediate safety hazards"
              trendUp={false}
              variant="danger"
            />
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Defect Hotspots Heatmap & Severity Concentration</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Computed via weighted priority scores and density clustering.
                </p>
              </div>
            </div>
            <div className="h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <MapView hotspots={hotspots} initialZoom={13} interactive={true} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ANALYTICS CHARTS */}
      {/* ========================================================================= */}
      {activeTab === 'charts' && chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              14-Day Submission & Resolution Influx
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.reportsByDay}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" stroke="#0284c7" strokeWidth={2} name="Reported" />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Department Workload & SLA Efficiency
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.departmentWorkload}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="code" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="assigned" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Assigned" />
                  <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AI QUALITY AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-8">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>AI / Text Cross-Validation Discrepancies ({mismatches.length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">AI Media Category</th>
                    <th className="p-2.5">Citizen Text</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mismatches.map((m) => (
                    <tr key={m._id}>
                      <td className="p-2.5 font-mono font-bold">{m.reportCode}</td>
                      <td className="p-2.5"><CategoryChip category={m.aiMedia?.category || m.category} /></td>
                      <td className="p-2.5 max-w-xs truncate text-slate-600 dark:text-slate-300">"{m.description}"</td>
                      <td className="p-2.5"><StatusBadge status={m.status} size="xs" /></td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyReport(m)}
                            className="px-2 py-0.5 rounded bg-teal-600 text-white font-bold text-[10px] hover:bg-teal-700 shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Verify Report"
                          >
                            <Check className="w-3 h-3" />
                            <span>Verify</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openAssignModal(m)}
                            className="px-2 py-0.5 rounded bg-brand-600 text-white font-bold text-[10px] hover:bg-brand-700 shadow-xs cursor-pointer"
                          >
                            Assign
                          </button>
                          <a href={`/reports/${m._id}`} target="_blank" rel="noreferrer" className="text-brand-600 font-bold hover:underline">
                            Inspect
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: USERS MANAGEMENT (Admin creates staff/admin/police) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Municipal Personnel, Police Officers & Citizens ({usersList.length})
              </h3>
              <p className="text-xs text-slate-500">
                Staff, admin, and police accounts are created by the Administrator here.
              </p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" />
              <span>Create Official Account</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                <tr>
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Email</th>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5">Department / Badge</th>
                  <th className="p-2.5">Trust Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((u) => (
                  <tr key={u._id}>
                    <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{u.name}</td>
                    <td className="p-2.5 text-slate-500">{u.email}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : u.role === 'police'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : u.role === 'staff'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">
                      {u.role === 'police'
                        ? `Badge: ${u.badgeNumber || 'N/A'} • ${u.station || 'Traffic Division'}`
                        : u.department?.name || '—'}
                    </td>
                    <td className="p-2.5 font-bold text-emerald-600">{u.trustScore}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: DUPLICATE GROUPS */}
      {/* ========================================================================= */}
      {activeTab === 'duplicates' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Proximity Duplicate Clusters ({duplicateGroups.length})
          </h3>
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <div
                key={group._id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-brand-600" />
                    <span className="font-mono text-xs font-bold">Group ID: {group._id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 text-xs font-bold">
                      {group.totalReports} reports grouped
                    </span>
                  </div>
                  <CategoryChip category={group.category} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: PRIORITY RULES ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'rules' && priorityRules && (
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Calibrate Priority Formula Weights
          </h3>
          <form onSubmit={handleSaveRules} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Safety Hazard Risk Weight
                </label>
                <input
                  type="number"
                  value={priorityRules.weights?.safetyRisk || 25}
                  onChange={(e) =>
                    setPriorityRules({
                      ...priorityRules,
                      weights: { ...priorityRules.weights, safetyRisk: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Defect Severity Weight
                </label>
                <input
                  type="number"
                  value={priorityRules.weights?.severity || 20}
                  onChange={(e) =>
                    setPriorityRules({
                      ...priorityRules,
                      weights: { ...priorityRules.weights, severity: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSavingRules}
              className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700"
            >
              Save Calibration
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ASSIGN REPORT / BULK ASSIGN */}
      {/* ========================================================================= */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {assignModal.isBulk
                  ? `Bulk Assign ${(assignModal.reportIds || selectedReportIds || allSelectedReportIds).length} Reports`
                  : `Assign Report: ${assignModal.report?.reportCode}`}
              </h3>
              <button
                onClick={() => setAssignModal({ open: false, report: null, isBulk: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAssign} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Department or Police
                </label>
                <select
                  required
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Choose department or police...</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.type === 'police' ? '🚔 ' : '🏢 '}
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. Priority dispatch for pothole patch crew..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModal({ open: false, report: null, isBulk: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SOFT DELETE (Requires deletedReason) */}
      {/* ========================================================================= */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Move to Trash: {deleteModal.reportCode}</span>
              </h3>
              <button
                onClick={() => setDeleteModal({ open: false, reportId: null, reportCode: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              This report will be soft-deleted and hidden from citizen feeds, maps, and analytics. The citizen will be notified with your deletion reason.
            </p>

            <form onSubmit={handleConfirmSoftDelete} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Deletion <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Duplicate of REP-1001, private property issue, or spam..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, reportId: null, reportCode: '' })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700"
                >
                  {isDeleting ? 'Moving to Trash...' : 'Move to Trash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PERMANENT DELETE (Requires typing DELETE) */}
      {/* ========================================================================= */}
      {permDeleteModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Permanently Erase: {permDeleteModal.reportCode}</span>
              </h3>
              <button
                onClick={() => setPermDeleteModal({ open: false, reportId: null, reportCode: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Warning: This action CANNOT be undone! The report, audit logs, and Cloudinary image assets will be permanently destroyed.
            </p>

            <form onSubmit={handleConfirmPermanentDelete} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-rose-300 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPermDeleteModal({ open: false, reportId: null, reportCode: '' })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmInput !== 'DELETE' || isPermDeleting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-40"
                >
                  {isPermDeleting ? 'Erasing...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE OFFICIAL USER (Staff, Admin, Police) */}
      {/* ========================================================================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Create Staff / Admin / Police Officer
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="Officer / Engineer Name"
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="officer@urbanfix.org"
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200"
                >
                  <option value="staff">Department Staff</option>
                  <option value="police">Police Officer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {newUserData.role === 'staff' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newUserData.department}
                    onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200"
                  >
                    <option value="">Select department...</option>
                    {departments.filter(d => d.type !== 'police').map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {newUserData.role === 'police' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Badge Number</label>
                    <input
                      type="text"
                      placeholder="e.g. TP-8492"
                      value={newUserData.badgeNumber}
                      onChange={(e) => setNewUserData({ ...newUserData, badgeNumber: e.target.value })}
                      className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Police Station / Division</label>
                    <input
                      type="text"
                      placeholder="e.g. Central Traffic Division"
                      value={newUserData.station}
                      onChange={(e) => setNewUserData({ ...newUserData, station: e.target.value })}
                      className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700"
                >
                  Create Official
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
