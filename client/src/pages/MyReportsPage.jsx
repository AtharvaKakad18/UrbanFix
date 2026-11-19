import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Table as TableIcon, Plus, MapPin, Calendar } from 'lucide-react';
import api from '../services/api.js';
import { StatusBadge } from '../components/badges/StatusBadge.jsx';
import { PriorityBadge } from '../components/badges/PriorityBadge.jsx';
import { CategoryChip } from '../components/badges/CategoryChip.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FilterBar } from '../components/ui/FilterBar.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';

export const MyReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchReports = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/reports/mine', {
        params: {
          page,
          limit: 12,
          category: category || undefined,
          status: status || undefined,
        },
      });
      setReports(res.data?.data?.reports || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load my reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
  }, [category, status]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setPriority('');
  };

  const filteredReports = reports.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      const matchCode = r.reportCode?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchAddr = r.address?.toLowerCase().includes(q);
      if (!matchCode && !matchDesc && !matchAddr) return false;
    }
    if (priority && r.priority !== priority) return false;
    return true;
  });

  const tableColumns = [
    {
      header: 'Report Code',
      accessor: 'reportCode',
      sortable: true,
      cell: (row) => (
        <Link
          to={`/reports/${row._id}`}
          className="font-mono font-bold text-brand-600 dark:text-brand-400 hover:underline"
        >
          {row.reportCode}
        </Link>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      cell: (row) => <CategoryChip category={row.category} />,
    },
    {
      header: 'Description',
      accessor: 'description',
      cell: (row) => (
        <span className="line-clamp-1 max-w-[240px] text-slate-700 dark:text-slate-300">
          {row.description}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <StatusBadge
          status={row.status}
          isCitizenView={true}
          departmentName={row.assignedDepartment?.name || row.department?.name}
          size="xs"
        />
      ),
    },
    {
      header: 'Priority',
      accessor: 'priority',
      cell: (row) => <PriorityBadge priority={row.priority} score={row.priorityScore} size="xs" />,
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      cell: (row) => (
        <span className="text-xs text-slate-400">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header and Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            My Submitted Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track all urban mobility issues you have reported across the city.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Card / Table View Toggle */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'cards'
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Card grid view"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Table view"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <Link
            to="/report/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-soft transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Report</span>
          </Link>
        </div>
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
        onReset={handleResetFilters}
      />

      {/* Content: Cards or Table */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title="No reports match your filters"
          description="Try adjusting your status or category filters, or submit a new problem report."
          action={
            <Link
              to="/report/new"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-xs"
            >
              File a Report
            </Link>
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <Link
              key={report._id}
              to={`/reports/${report._id}`}
              className="block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft hover:shadow-soft-lg hover:border-brand-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Photo Preview */}
                <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {report.media?.[0]?.url ? (
                    <img
                      src={report.media[0].url}
                      alt={report.category}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      No Photo Evidence
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5">
                    <StatusBadge
                      status={report.status}
                      isCitizenView={true}
                      departmentName={report.assignedDepartment?.name || report.department?.name}
                      size="xs"
                    />
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <PriorityBadge priority={report.priority} score={report.priorityScore} size="xs" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {report.reportCode}
                    </span>
                    <CategoryChip category={report.category} />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{report.address || 'Geotagged Coordinates'}</span>
                  </div>
                </div>
              </div>

              {/* Footer info */}
              <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <span>{report.confirmations || 1} supporter(s)</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          data={filteredReports}
          pagination={pagination}
          onPageChange={(page) => fetchReports(page)}
        />
      )}
    </div>
  );
};
