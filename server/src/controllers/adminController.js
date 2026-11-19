import mongoose from 'mongoose';
import { Report } from '../models/Report.js';
import { Department } from '../models/Department.js';
import { DuplicateGroup } from '../models/DuplicateGroup.js';
import { Setting } from '../models/Setting.js';
import { Category } from '../models/Category.js';
import { User } from '../models/User.js';
import { STATUSES, PRIORITIES } from '../constants/index.js';
import { deleteImage } from '../services/storageService.js';
import { createNotification, notifyPolice, notifyDepartmentStaff } from '../services/notificationService.js';
import { recommendDepartmentForCategory } from '../services/departmentService.js';
import { logActivity } from '../services/activityService.js';

export const getAdminSummary = async (req, res, next) => {
  try {
    const totalReports = await Report.countDocuments();
    const resolvedReports = await Report.countDocuments({
      status: { $in: [STATUSES.RESOLVED, STATUSES.CLOSED] },
    });
    const activeReports = await Report.countDocuments({
      status: {
        $in: [
          STATUSES.REPORTED,
          STATUSES.AI_VERIFIED,
          STATUSES.VERIFICATION_REQUIRED,
          STATUSES.MANUAL_VERIFICATION_REQUIRED,
          STATUSES.DEPARTMENT_ASSIGNED,
          STATUSES.WORK_STARTED,
          STATUSES.REOPENED,
        ],
      },
    });
    const pendingVerification = await Report.countDocuments({
      status: {
        $in: [STATUSES.VERIFICATION_REQUIRED, STATUSES.MANUAL_VERIFICATION_REQUIRED],
      },
    });
    const criticalReports = await Report.countDocuments({
      priority: PRIORITIES.CRITICAL,
      status: { $nin: [STATUSES.CLOSED, STATUSES.RESOLVED, STATUSES.REJECTED] },
    });
    const duplicateGroups = await DuplicateGroup.countDocuments({ totalReports: { $gt: 1 } });

    // Resolution rate
    const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;

    // Average resolution time (hours)
    const resolvedDocs = await Report.find({
      'resolution.resolvedAt': { $exists: true, $ne: null },
    }).select('createdAt resolution.resolvedAt');

    let avgResolutionHours = 0;
    if (resolvedDocs.length > 0) {
      const totalHours = resolvedDocs.reduce((acc, doc) => {
        const diff = (new Date(doc.resolution.resolvedAt).getTime() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60);
        return acc + Math.max(0, diff);
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedDocs.length) * 10) / 10;
    }

    res.json({
      success: true,
      data: {
        totalReports,
        activeReports,
        resolvedReports,
        pendingVerification,
        criticalReports,
        duplicateGroups,
        resolutionRate,
        avgResolutionHours,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getChartAnalytics = async (req, res, next) => {
  try {
    // 1. Reports over time (past 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const reportsByDay = await Report.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ['$status', [STATUSES.RESOLVED, STATUSES.CLOSED]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 2. Reports by category
    const reportsByCategory = await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // 3. Department workload & performance
    const departments = await Department.find({ isActive: true });
    const deptWorkload = [];

    for (const dept of departments) {
      const assigned = await Report.countDocuments({ assignedDepartment: dept._id });
      const completed = await Report.countDocuments({
        assignedDepartment: dept._id,
        status: { $in: [STATUSES.RESOLVED, STATUSES.CLOSED] },
      });
      const inProgress = await Report.countDocuments({
        assignedDepartment: dept._id,
        status: STATUSES.WORK_STARTED,
      });

      deptWorkload.push({
        name: dept.name,
        code: dept.code,
        assigned,
        completed,
        inProgress,
        efficiencyRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
      });
    }

    // 4. AI Confidence distribution
    const confidenceBuckets = await Report.aggregate([
      {
        $bucket: {
          groupBy: '$aiMedia.confidence',
          boundaries: [0, 0.5, 0.7, 0.85, 1.01],
          default: 'Unknown',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const formattedConfidence = [
      { range: '< 50%', count: confidenceBuckets.find((b) => b._id === 0)?.count || 0 },
      { range: '50-70%', count: confidenceBuckets.find((b) => b._id === 0.5)?.count || 0 },
      { range: '70-85%', count: confidenceBuckets.find((b) => b._id === 0.7)?.count || 0 },
      { range: '85-100%', count: confidenceBuckets.find((b) => b._id === 0.85)?.count || 0 },
    ];

    res.json({
      success: true,
      data: {
        reportsByDay: reportsByDay.map((r) => ({
          date: r._id,
          reports: r.count,
          resolved: r.resolved,
        })),
        reportsByCategory: reportsByCategory.map((c) => ({
          category: c._id,
          count: c.count,
        })),
        departmentWorkload: deptWorkload,
        confidenceDistribution: formattedConfidence,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getHotspots = async (req, res, next) => {
  try {
    const reports = await Report.find({
      status: { $nin: [STATUSES.CLOSED, STATUSES.REJECTED] },
    }).select('location priority category reportCode priorityScore');

    const points = reports.map((r) => ({
      id: r._id,
      reportCode: r.reportCode,
      lat: r.location.coordinates[1],
      lng: r.location.coordinates[0],
      intensity: (r.priorityScore || 50) / 100,
      category: r.category,
      priority: r.priority,
    }));

    res.json({
      success: true,
      data: { points },
    });
  } catch (err) {
    next(err);
  }
};

export const getMismatches = async (req, res, next) => {
  try {
    const reports = await Report.find({
      'crossValidation.flag': 'CATEGORY_MISMATCH',
    })
      .populate('reporter', 'name email avatar')
      .populate('department')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: { reports },
    });
  } catch (err) {
    next(err);
  }
};

export const getLowConfidence = async (req, res, next) => {
  try {
    const minConf = parseFloat(process.env.AI_MIN_CONFIDENCE || '0.6');
    const reports = await Report.find({
      'aiMedia.confidence': { $lt: minConf },
    })
      .populate('reporter', 'name email avatar')
      .populate('department')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: { reports },
    });
  } catch (err) {
    next(err);
  }
};

export const getSuspicious = async (req, res, next) => {
  try {
    const reports = await Report.find({
      $or: [
        { 'spamFlags.0': { $exists: true } },
        { 'aiText.isSpamLikely': true },
        { 'aiMedia.isMobilityProblem': false },
      ],
    })
      .populate('reporter', 'name email avatar trustScore')
      .populate('department')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: { reports },
    });
  } catch (err) {
    next(err);
  }
};

export const getUnassignedReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {
      $or: [
        { assignedDepartment: null },
        { assignedDepartment: { $exists: false } },
      ],
      isDeleted: false,
    };

    if (search) {
      query.$and = [
        {
          $or: [
            { reportCode: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reports = await Report.find(query)
      .populate('reporter', 'name email avatar')
      .populate('suggestedDepartment', 'name code type')
      .populate('duplicateGroup', 'totalReports')
      .sort({ priorityScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const assignReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { departmentId, note } = req.body;

    if (departmentId && typeof departmentId === 'object') {
      departmentId = departmentId._id;
    }

    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'A valid departmentId is required.' },
      });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: { message: 'Department not found.' },
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.assignedDepartment = department._id;
    report.department = department._id;
    report.status = STATUSES.DEPARTMENT_ASSIGNED;
    report.assignedTo = null; // Reset specific officer so new department can dispatch
    report.assignedBy = req.user?._id || null;
    report.assignedAt = new Date();
    report.assignmentSource = 'admin-manual';
    report.policeNeedsVerification = false;

    if (note && note.trim()) {
      report.workLogs.push({
        stage: 'Assigned',
        remarks: `Admin Assignment Note: ${note.trim()}`,
        actor: req.user?._id || null,
        timestamp: new Date(),
      });
    }

    if (report.reassignmentRequest?.requested) {
      report.reassignmentRequest.status = 'approved';
    }

    await report.save();

    try {
      await createNotification({
        userId: report.reporter,
        type: 'DEPARTMENT_ASSIGNED',
        message: `Your report ${report.reportCode} has been assigned to ${department.name}.`,
        reportId: report._id,
      });

      if (department.type === 'police') {
        await notifyPolice({
          type: 'POLICE_CASE_NEW',
          message: `Report ${report.reportCode} (${report.category}) assigned to Police Dashboard.`,
          reportId: report._id,
        });
      } else {
        await notifyDepartmentStaff({
          departmentId: department._id,
          type: 'DEPARTMENT_ASSIGNED',
          message: `Report ${report.reportCode} (${report.category}) assigned to ${department.name}.`,
          reportId: report._id,
        });
      }

      await logActivity({
        actor: req.user?._id,
        action: 'REPORT_ASSIGNED',
        entityType: 'Report',
        entityId: report._id,
        meta: {
          reportCode: report.reportCode,
          departmentId: department._id,
          departmentName: department.name,
          note,
        },
        req,
      });
    } catch (notifyErr) {
      console.warn('[Assign] Notification warning:', notifyErr.message);
    }

    const populated = await Report.findById(report._id)
      .populate('reporter', 'name email avatar phone')
      .populate('department', 'name code type')
      .populate('assignedDepartment', 'name code type')
      .populate('suggestedDepartment', 'name code type');

    res.json({
      success: true,
      message: `Report assigned to ${department.name}.`,
      data: {
        message: `Report assigned to ${department.name}.`,
        report: populated || report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const bulkAssignReports = async (req, res, next) => {
  try {
    let { reportIds, departmentId, note } = req.body;
    if (departmentId && typeof departmentId === 'object') {
      departmentId = departmentId._id;
    }

    if (!Array.isArray(reportIds) || reportIds.length === 0 || !departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Valid reportIds array and departmentId are required.' },
      });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: { message: 'Department not found.' },
      });
    }

    const reports = await Report.find({ _id: { $in: reportIds } });
    for (const report of reports) {
      report.assignedDepartment = department._id;
      report.department = department._id;
      report.status = STATUSES.DEPARTMENT_ASSIGNED;
      report.assignedTo = null;
      report.assignedBy = req.user?._id || null;
      report.assignedAt = new Date();
      report.assignmentSource = 'admin-manual';
      report.policeNeedsVerification = false;
      if (note && note.trim()) {
        report.workLogs.push({
          stage: 'Assigned',
          remarks: `Bulk Assignment: ${note.trim()}`,
          actor: req.user?._id || null,
          timestamp: new Date(),
        });
      }
      if (report.reassignmentRequest?.requested) {
        report.reassignmentRequest.status = 'approved';
      }
      await report.save();

      try {
        await createNotification({
          userId: report.reporter,
          type: 'DEPARTMENT_ASSIGNED',
          message: `Your report ${report.reportCode} has been assigned to ${department.name}.`,
          reportId: report._id,
        });

        if (department.type === 'police') {
          await notifyPolice({
            type: 'POLICE_CASE_NEW',
            message: `Report ${report.reportCode} (${report.category}) bulk-assigned to Police Dashboard.`,
            reportId: report._id,
          });
        } else {
          await notifyDepartmentStaff({
            departmentId: department._id,
            type: 'DEPARTMENT_ASSIGNED',
            message: `Report ${report.reportCode} (${report.category}) bulk-assigned to ${department.name}.`,
            reportId: report._id,
          });
        }
      } catch (notifyErr) {
        console.warn('[BulkAssign] Notification warning:', notifyErr.message);
      }
    }

    try {
      await logActivity({
        actor: req.user?._id,
        action: 'REPORT_BULK_ASSIGNED',
        entityType: 'Report',
        entityId: null,
        meta: {
          count: reports.length,
          departmentId: department._id,
          departmentName: department.name,
        },
        req,
      });
    } catch (logErr) {
      console.warn('[BulkAssign] Log activity warning:', logErr.message);
    }

    res.json({
      success: true,
      message: `Successfully assigned ${reports.length} reports to ${department.name}.`,
      data: {
        message: `Successfully assigned ${reports.length} reports to ${department.name}.`,
        count: reports.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const unassignReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.assignedDepartment = null;
    report.department = null;
    report.assignedBy = null;
    report.assignedAt = null;
    report.assignmentSource = 'unassigned';
    if (report.status === STATUSES.DEPARTMENT_ASSIGNED) {
      report.status = STATUSES.AI_VERIFIED;
    }
    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'REPORT_UNASSIGNED',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Report returned to assignment queue.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const softDeleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deletedReason } = req.body;

    if (!deletedReason || !deletedReason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'deletedReason is required to delete a report.' },
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.isDeleted = true;
    report.deletedBy = req.user._id;
    report.deletedReason = deletedReason.trim();
    report.deletedAt = new Date();
    await report.save();

    // Fix duplicate group
    if (report.duplicateGroup) {
      const remaining = await Report.find({
        duplicateGroup: report.duplicateGroup,
        isDeleted: false,
        _id: { $ne: report._id },
      }).sort({ createdAt: 1 });

      if (remaining.length === 0) {
        await DuplicateGroup.findByIdAndDelete(report.duplicateGroup);
      } else {
        const group = await DuplicateGroup.findById(report.duplicateGroup);
        if (group) {
          group.totalReports = remaining.length;
          group.reports = remaining.map((r) => r._id);
          if (group.mainReport?.equals(report._id)) {
            group.mainReport = remaining[0]._id;
          }
          await group.save();
        }
      }
    }

    // Notify citizen
    await createNotification({
      userId: report.reporter,
      type: 'REPORT_DELETED',
      message: `Your report ${report.reportCode} was removed by administration: "${deletedReason.trim()}".`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'REPORT_SOFT_DELETED',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode, deletedReason },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Report moved to trash.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const restoreReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findOne({ _id: id, isDeleted: true });
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found in trash.' },
      });
    }

    report.isDeleted = false;
    report.deletedBy = null;
    report.deletedReason = '';
    report.deletedAt = null;
    await report.save();

    if (report.duplicateGroup) {
      const group = await DuplicateGroup.findById(report.duplicateGroup);
      if (group) {
        const allActive = await Report.find({ duplicateGroup: group._id, isDeleted: false });
        group.totalReports = allActive.length;
        group.reports = allActive.map((r) => r._id);
        if (!group.mainReport) group.mainReport = report._id;
        await group.save();
      }
    }

    await createNotification({
      userId: report.reporter,
      type: 'REPORT_RESTORED',
      message: `Your report ${report.reportCode} has been restored.`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'REPORT_RESTORED',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Report restored successfully.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const permanentDeleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        success: false,
        error: { message: 'Please type DELETE to confirm permanent deletion.' },
      });
    }

    const report = await Report.findOne({ _id: id, isDeleted: true });
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found in trash.' },
      });
    }

    // Delete photos
    if (report.media && report.media.length > 0) {
      for (const item of report.media) {
        if (item.publicId) {
          await deleteImage(item.publicId);
        }
      }
    }
    if (report.resolution?.beforePhoto) {
      await deleteImage(report.resolution.beforePhoto);
    }
    if (report.resolution?.afterPhoto) {
      await deleteImage(report.resolution.afterPhoto);
    }

    // Fix duplicate group
    if (report.duplicateGroup) {
      const remaining = await Report.find({
        duplicateGroup: report.duplicateGroup,
        _id: { $ne: report._id },
      }).sort({ createdAt: 1 });

      if (remaining.length === 0) {
        await DuplicateGroup.findByIdAndDelete(report.duplicateGroup);
      } else {
        const group = await DuplicateGroup.findById(report.duplicateGroup);
        if (group) {
          group.totalReports = remaining.length;
          group.reports = remaining.map((r) => r._id);
          if (group.mainReport?.equals(report._id)) {
            group.mainReport = remaining[0]._id;
          }
          await group.save();
        }
      }
    }

    await Report.findByIdAndDelete(id);

    await logActivity({
      actor: req.user._id,
      action: 'REPORT_PERMANENT_DELETED',
      entityType: 'Report',
      entityId: id,
      meta: { reportCode: report.reportCode },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Report and associated media permanently deleted.',
        reportCode: report.reportCode,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getTrashReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { isDeleted: true };

    if (search) {
      query.$or = [
        { reportCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { deletedReason: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reports = await Report.find(query)
      .populate('reporter', 'name email avatar')
      .populate('deletedBy', 'name email')
      .populate('department', 'name code')
      .populate('assignedDepartment', 'name code')
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReassignmentRequests = async (req, res, next) => {
  try {
    const reports = await Report.find({
      'reassignmentRequest.requested': true,
      'reassignmentRequest.status': 'pending',
    })
      .populate('reporter', 'name email avatar')
      .populate('assignedDepartment', 'name code')
      .populate('reassignmentRequest.requestedBy', 'name email department')
      .sort({ 'reassignmentRequest.requestedAt': -1 });

    res.json({
      success: true,
      data: { reports },
    });
  } catch (err) {
    next(err);
  }
};

export const approveReassignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newDepartmentId } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.reassignmentRequest.status = 'approved';
    if (newDepartmentId) {
      report.assignedDepartment = newDepartmentId;
      report.department = newDepartmentId;
      report.assignedAt = new Date();
      report.assignedBy = req.user._id;
      report.assignmentSource = 'reassigned';
    } else {
      report.assignedDepartment = null;
      report.department = null;
      report.assignmentSource = 'unassigned';
      report.status = STATUSES.AI_VERIFIED;
    }
    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'REASSIGNMENT_APPROVED',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode, newDepartmentId },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Reassignment request approved.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const declineReassignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.reassignmentRequest.status = 'declined';
    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'REASSIGNMENT_DECLINED',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Reassignment request declined.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getPoliceRoutingSetting = async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: 'policeAutoRouting' });
    const enabled = setting ? setting.value !== false : true;
    res.json({
      success: true,
      data: { enabled },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePoliceRoutingSetting = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const setting = await Setting.findOneAndUpdate(
      { key: 'policeAutoRouting' },
      { value: Boolean(enabled), description: 'Automatically route AI Verified police issues directly to Police' },
      { upsert: true, new: true }
    );
    res.json({
      success: true,
      data: { enabled: setting.value },
    });
  } catch (err) {
    next(err);
  }
};

export const updateCategoryPoliceRouting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { routeToPolice } = req.body;
    const category = await Category.findByIdAndUpdate(
      id,
      { routeToPolice: Boolean(routeToPolice) },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found.' },
      });
    }
    res.json({
      success: true,
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const getAllReportsAdmin = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      category,
      status,
      priority,
      departmentId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { isDeleted: false };

    if (category) query.category = category;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (departmentId) {
      if (departmentId === 'unassigned') {
        query.$or = [{ assignedDepartment: null }, { assignedDepartment: { $exists: false } }];
      } else {
        query.assignedDepartment = departmentId;
      }
    }

    if (search) {
      query.$or = [
        { reportCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const reports = await Report.find(query)
      .populate('reporter', 'name email avatar phone trustScore')
      .populate('department', 'name code type')
      .populate('assignedDepartment', 'name code type')
      .populate('suggestedDepartment', 'name code type')
      .populate('assignedTo', 'name email badgeNumber')
      .populate('duplicateGroup', 'totalReports')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyReportAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { departmentId, note, verifiedCategory } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    if (verifiedCategory) {
      report.category = verifiedCategory;
    }

    // Determine target department safely
    let cleanDeptId = null;
    if (departmentId) {
      cleanDeptId = typeof departmentId === 'object' ? departmentId._id : departmentId;
    } else if (report.suggestedDepartment) {
      cleanDeptId = typeof report.suggestedDepartment === 'object' ? report.suggestedDepartment._id : report.suggestedDepartment;
    } else if (report.assignedDepartment) {
      cleanDeptId = typeof report.assignedDepartment === 'object' ? report.assignedDepartment._id : report.assignedDepartment;
    }

    let targetDept = null;
    if (cleanDeptId && mongoose.Types.ObjectId.isValid(cleanDeptId)) {
      targetDept = await Department.findById(cleanDeptId);
    }

    // If targetDept is still null, recommend department for report category
    if (!targetDept && report.category) {
      targetDept = await recommendDepartmentForCategory(report.category);
    }

    // If still null, fallback to any active civic/police department
    if (!targetDept) {
      targetDept = await Department.findOne({ isActive: true });
    }

    report.policeNeedsVerification = false;

    if (targetDept) {
      report.assignedDepartment = targetDept._id;
      report.department = targetDept._id;
      report.status = STATUSES.DEPARTMENT_ASSIGNED;
      report.assignedAt = new Date();
      report.assignmentSource = 'admin-verified';
      report.assignedTo = null;
    } else {
      report.status = STATUSES.AI_VERIFIED;
    }

    report.workLogs.push({
      stage: 'Verified',
      remarks: note?.trim() || `Report verified by Admin (${req.user?.name || 'Administrator'})`,
      actor: req.user?._id || null,
      timestamp: new Date(),
    });

    await report.save();

    // Create notifications safely
    try {
      await createNotification({
        userId: report.reporter,
        type: 'STATUS_CHANGED',
        message: `Your report ${report.reportCode} has been verified by municipal administration. Status: ${report.status}.`,
        reportId: report._id,
      });

      if (targetDept) {
        if (targetDept.type === 'police') {
          await notifyPolice({
            type: 'POLICE_CASE_NEW',
            message: `Verified police case ${report.reportCode} (${report.category}) assigned to Police Dashboard.`,
            reportId: report._id,
          });
        } else {
          await notifyDepartmentStaff({
            departmentId: targetDept._id,
            type: 'DEPARTMENT_ASSIGNED',
            message: `Verified report ${report.reportCode} (${report.category}) assigned to ${targetDept.name}.`,
            reportId: report._id,
          });
        }
      }

      await logActivity({
        actor: req.user?._id,
        action: 'REPORT_VERIFIED',
        entityType: 'Report',
        entityId: report._id,
        meta: {
          reportCode: report.reportCode,
          category: report.category,
          status: report.status,
          departmentId: targetDept?._id,
        },
        req,
      });
    } catch (notifyErr) {
      console.warn('[Verify] Notification warning:', notifyErr.message);
    }

    const populated = await Report.findById(report._id)
      .populate('reporter', 'name email avatar phone')
      .populate('department', 'name code type')
      .populate('assignedDepartment', 'name code type')
      .populate('suggestedDepartment', 'name code type');

    res.json({
      success: true,
      message: `Report ${report.reportCode} verified successfully.`,
      data: { report: populated || report },
    });
  } catch (err) {
    next(err);
  }
};

