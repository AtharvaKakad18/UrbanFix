import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ThumbsUp,
  CheckCircle2,
  AlertTriangle,
  Upload,
  MapPin,
  Calendar,
  Building,
  User,
  Sparkles,
  Copy,
  ChevronRight,
  Clock,
  Check,
  X,
  Share2,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from '../components/badges/StatusBadge.jsx';
import { PriorityBadge } from '../components/badges/PriorityBadge.jsx';
import { CategoryChip } from '../components/badges/CategoryChip.jsx';
import { ConfidenceMeter } from '../components/badges/ConfidenceMeter.jsx';
import { ProgressStepper } from '../components/stepper/ProgressStepper.jsx';
import { BeforeAfterSlider } from '../components/media/BeforeAfterSlider.jsx';
import { MapView } from '../components/map/MapView.jsx';
import { CardSkeleton } from '../components/ui/Skeleton.jsx';
import { LIFECYCLE_STEPS } from '../utils/constants.js';

export const ReportDetailsPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Evidence upload state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceRemarks, setEvidenceRemarks] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);

  // Citizen verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyAccepted, setVerifyAccepted] = useState(true);
  const [verifyComment, setVerifyComment] = useState('');

  const fetchReport = async () => {
    try {
      const res = await api.get(`/reports/${id}`);
      setReport(res.data?.data?.report);
    } catch (err) {
      console.error('Failed to load report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const handleAction = async (actionType) => {
    if (!isAuthenticated) return;
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      if (actionType === 'confirm') {
        const res = await api.post(`/reports/${id}/confirm`);
        setReport((prev) => ({
          ...prev,
          confirmations: res.data?.data?.confirmations,
          priority: res.data?.data?.priority,
          priorityScore: res.data?.data?.priorityScore,
        }));
        setFeedbackMsg('Thank you for confirming this civic defect!');
      } else if (actionType === 'upvote') {
        const res = await api.post(`/reports/${id}/upvote`);
        setReport((prev) => ({
          ...prev,
          confirmations: res.data?.data?.confirmations,
          priority: res.data?.data?.priority,
          priorityScore: res.data?.data?.priorityScore,
        }));
        setFeedbackMsg(res.data?.data?.upvoted ? 'Upvoted report to boost priority!' : 'Upvote removed.');
      } else if (actionType === 'still-exists') {
        const res = await api.post(`/reports/${id}/still-exists`);
        setReport((prev) => ({
          ...prev,
          stillExistsCount: res.data?.data?.stillExistsCount,
          priority: res.data?.data?.priority,
          priorityScore: res.data?.data?.priorityScore,
        }));
        setFeedbackMsg('Recorded! Our priority engine updated this report score.');
      }
    } catch (err) {
      setFeedbackMsg(err.response?.data?.error?.message || 'Action could not be completed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvidenceSubmit = async (e) => {
    e.preventDefault();
    if (!evidenceFile && !evidenceRemarks) return;

    setActionLoading(true);
    try {
      const formData = new FormData();
      if (evidenceFile) formData.append('photos', evidenceFile);
      formData.append('remarks', evidenceRemarks);

      await api.post(`/reports/${id}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowEvidenceModal(false);
      setEvidenceFile(null);
      setEvidenceRemarks('');
      setFeedbackMsg('Supplementary evidence added successfully!');
      fetchReport();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to upload evidence');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCitizenVerification = async () => {
    setActionLoading(true);
    try {
      await api.post(`/verification/${id}`, {
        accepted: verifyAccepted,
        comment: verifyComment,
      });

      setShowVerifyModal(false);
      setVerifyComment('');
      setFeedbackMsg(
        verifyAccepted
          ? 'Resolution verified and accepted. Report closed!'
          : 'Rejection submitted. Report reopened for rework.'
      );
      fetchReport();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Verification submission failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Report Not Found</h2>
        <p className="text-sm text-slate-500">The requested report could not be found or has been removed.</p>
        <Link to="/map" className="inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold">
          Back to Live Map
        </Link>
      </div>
    );
  }

  const isResolved = report.status === 'Resolved';
  const hasResolutionPhotos = Boolean(report.resolution?.afterPhoto);
  const duplicateGroup = report.duplicateGroup;
  const isReporter = user?._id === report.reporter?._id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="p-4 bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold text-brand-800 dark:text-brand-300">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="p-1 hover:text-brand-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {report.reportCode}
              </span>
              <CategoryChip category={report.category} />
              <StatusBadge
                status={report.status}
                isCitizenView={!user || user.role === 'citizen'}
                departmentName={report.assignedDepartment?.name || report.department?.name}
                size="sm"
              />
              <PriorityBadge priority={report.priority} score={report.priorityScore} size="sm" />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                {report.address || 'Geotagged Location'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(report.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Reported by {report.reporter?.name || 'Citizen'}
              </span>
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-brand-600" />
                {report.assignedDepartment?.name || report.department?.name ? (
                  <span>Assigned to: <strong>{report.assignedDepartment?.name || report.department?.name}</strong></span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Received, under review</span>
                )}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons for Citizens */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAction('upvote')}
              disabled={actionLoading || !isAuthenticated}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-700 dark:text-slate-300 hover:text-brand-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Upvote to raise civic priority"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Upvote ({report.confirmations || 1})</span>
            </button>

            <button
              onClick={() => handleAction('still-exists')}
              disabled={actionLoading || !isAuthenticated}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-200 dark:border-amber-800"
              title="Flag that this issue has not been solved"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Still Exists ({report.stillExistsCount || 0})</span>
            </button>

            <button
              onClick={() => setShowEvidenceModal(true)}
              disabled={!isAuthenticated}
              className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Add Evidence</span>
            </button>
          </div>
        </div>

        {/* Status Lifecycle Stepper */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Lifecycle Progress Flow
          </span>
          <ProgressStepper
            steps={LIFECYCLE_STEPS}
            isStatusFlow={true}
            status={report.status}
          />
        </div>
      </div>

      {/* Citizen Verification Prompt (if in Resolved state) */}
      {isResolved && (
        <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
              Action Required: Citizen Verification
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Department Crew Marked this Problem as Resolved
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Inspect the resolution photo below. If the road or sidewalk repair is satisfactory, approve it to close the report.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setVerifyAccepted(true);
                setShowVerifyModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Accept & Close</span>
            </button>
            <button
              onClick={() => {
                setVerifyAccepted(false);
                setShowVerifyModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Reject (Needs Rework)</span>
            </button>
          </div>
        </div>
      )}

      {/* Before / After Slider Section (if resolution evidence exists) */}
      {hasResolutionPhotos && (
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Field Repair Proof (Before vs After)</span>
            </h3>
            <span className="text-xs text-slate-400">Drag vertical divider to compare</span>
          </div>

          <BeforeAfterSlider
            beforeImage={report.resolution.beforePhoto || report.media?.[0]?.url}
            afterImage={report.resolution.afterPhoto}
            beforeLabel="Original Defect"
            afterLabel="Department Repair"
          />

          {report.resolution?.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              "{report.resolution.description}"
            </p>
          )}
        </div>
      )}

      {/* Main Grid: Images + Map vs AI Card & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Photos Gallery & Map */}
        <div className="space-y-6">
          {/* Photos */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Uploaded Photo Evidence ({report.media?.length || 0})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.media?.map((m, idx) => (
                <div
                  key={idx}
                  className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                >
                  <img
                    src={m.url}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-[10px] text-white font-medium">
                    Evidence #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Map Preview */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Defect Location Coordinates
              </h3>
              <span className="font-mono text-xs text-slate-500">
                {report.location?.coordinates[1]?.toFixed(5)}, {report.location?.coordinates[0]?.toFixed(5)}
              </span>
            </div>
            <div className="h-[280px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <MapView
                reports={[report]}
                center={[report.location.coordinates[1], report.location.coordinates[0]]}
                zoom={16}
              />
            </div>
          </div>

          {/* Duplicate Group Summary if linked */}
          {duplicateGroup && duplicateGroup.totalReports > 1 && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-3">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Duplicate Cluster ({duplicateGroup.totalReports} Reports Grouped)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multiple citizens reported defects within 40m. All reports are consolidated to accelerate department dispatch.
              </p>
              <div className="space-y-2 pt-2">
                {duplicateGroup.reports?.map((sibling) => (
                  <Link
                    key={sibling._id}
                    to={`/reports/${sibling._id}`}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      sibling._id === report._id
                        ? 'bg-brand-50/50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-800'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{sibling.reportCode}</span>
                      <span className="text-slate-500 line-clamp-1 max-w-[200px]">
                        {sibling.description}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Analysis Card + Description + Activity Timeline */}
        <div className="space-y-6">
          {/* AI Analysis Result Card */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  AI Multi-Modal Verification
                </h3>
              </div>
              <StatusBadge
                status={report.status}
                isCitizenView={!user || user.role === 'citizen'}
                departmentName={report.assignedDepartment?.name || report.department?.name}
                size="xs"
              />
            </div>

            <ConfidenceMeter confidence={report.aiMedia?.confidence || 0.8} />

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  AI Vision Assessment:
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {report.aiMedia?.rawSummary || 'Automated feature extraction detected road surface distortion.'}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                  <span>Severity: <strong>{report.aiMedia?.severity || 3}/5</strong></span>
                  <span>Safety Hazard: <strong>{report.aiMedia?.safetyRisk || 3}/5</strong></span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Cross-Validation Status:
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {report.crossValidation?.match
                    ? '✅ Image features match citizen report description.'
                    : '⚠️ Image and text had minor discrepancy; routing safely.'}
                </p>
              </div>
            </div>
          </div>

          {/* Citizen Description Card */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Citizen Description
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              "{report.description}"
            </p>
            {report.landmark && (
              <p className="text-xs text-slate-500">
                Landmark Reference: <strong>{report.landmark}</strong>
              </p>
            )}
          </div>

          {/* Activity Logs & Work Timeline */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-soft space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Activity Timeline & Work Logs</span>
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {report.workLogs && report.workLogs.length > 0 ? (
                report.workLogs.map((log, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-600 ring-4 ring-white dark:ring-slate-900" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {log.stage}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                        {log.remarks}
                      </p>
                      {log.photoUrl && (
                        <img
                          src={log.photoUrl}
                          alt="Log snapshot"
                          className="mt-2 w-32 h-20 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                        />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No activity logs recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Evidence */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add Supplementary Evidence
              </h3>
              <button onClick={() => setShowEvidenceModal(false)} className="p-1 hover:text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEvidenceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Upload Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  value={evidenceRemarks}
                  onChange={(e) => setEvidenceRemarks(e.target.value)}
                  placeholder="e.g., Pothole expanded after rain; cones were displaced..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs"
                >
                  {actionLoading ? 'Uploading...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Citizen Verification */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {verifyAccepted ? 'Accept & Confirm Resolution' : 'Reject Resolution & Request Rework'}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {verifyAccepted
                ? 'Confirming closure certifies that the defect has been properly fixed according to municipal standards.'
                : 'Please explain why the repair is unsatisfactory so the department crew can address it.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Citizen Comments {verifyAccepted ? '(Optional)' : '(Required)'}
              </label>
              <textarea
                rows={3}
                value={verifyComment}
                onChange={(e) => setVerifyComment(e.target.value)}
                placeholder={verifyAccepted ? 'e.g., Road is smooth, thank you!' : 'e.g., Asphalt is uneven, drain remains blocked...'}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCitizenVerification}
                disabled={actionLoading || (!verifyAccepted && !verifyComment.trim())}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs ${
                  verifyAccepted ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading ? 'Submitting...' : verifyAccepted ? 'Confirm & Close' : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
