import { Report } from '../models/Report.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { STATUSES, PRIORITIES, ROLES, POLICE_ACTION_TYPES } from '../constants/index.js';
import { createNotification, notifyAdmins } from '../services/notificationService.js';
import { logActivity } from '../services/activityService.js';
import { uploadImage } from '../services/storageService.js';
import { preprocessPhoto } from '../services/imageService.js';

// Helper to find police department
const getPoliceDept = async () => {
  return (
    (await Department.findOne({ type: 'police' })) ||
    (await Department.findOne({ code: 'TRAFFIC_POLICE' }))
  );
};

export const getPoliceReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority, search, category } = req.query;
    const policeDept = await getPoliceDept();

    if (!policeDept) {
      return res.json({
        success: true,
        data: {
          reports: [],
          kpis: { newCases: 0, acknowledged: 0, inProgress: 0, resolvedToday: 0, critical: 0, total: 0 },
          pagination: { total: 0, page: 1, pages: 0, limit: 20 },
        },
      });
    }

    const query = {
      assignedDepartment: policeDept._id,
      isDeleted: false,
    };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    if (search) {
      query.$or = [
        { reportCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch reports
    // Prioritize urgent categories: Traffic Accident, Road Blockage, and High Priority
    const allMatching = await Report.find(query)
      .populate('reporter', 'name email avatar phone trustScore')
      .populate('assignedTo', 'name email badgeNumber station')
      .populate('duplicateGroup', 'totalReports')
      .sort({ createdAt: -1 });

    // Urgent sorting: Traffic Accident & Road Blockage first, then priorityScore desc, then createdAt desc
    const urgentCategories = ['Traffic Accident', 'Road Blockage'];
    const sortedReports = allMatching.sort((a, b) => {
      const aUrgent = urgentCategories.includes(a.category) ? 1 : 0;
      const bUrgent = urgentCategories.includes(b.category) ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      if (b.priorityScore !== a.priorityScore) return (b.priorityScore || 0) - (a.priorityScore || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const paginatedReports = sortedReports.slice(skip, skip + parseInt(limit));
    const total = sortedReports.length;

    // KPI Metrics calculation
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const newCases = await Report.countDocuments({
      assignedDepartment: policeDept._id,
      status: STATUSES.DEPARTMENT_ASSIGNED,
    });

    const acknowledged = await Report.countDocuments({
      assignedDepartment: policeDept._id,
      'workLogs.stage': 'Acknowledged',
      status: { $ne: STATUSES.RESOLVED },
    });

    const inProgress = await Report.countDocuments({
      assignedDepartment: policeDept._id,
      status: STATUSES.WORK_STARTED,
    });

    const resolvedToday = await Report.countDocuments({
      assignedDepartment: policeDept._id,
      status: { $in: [STATUSES.RESOLVED, STATUSES.CLOSED] },
      'resolution.resolvedAt': { $gte: startOfDay },
    });

    const critical = await Report.countDocuments({
      assignedDepartment: policeDept._id,
      priority: PRIORITIES.CRITICAL,
      status: { $nin: [STATUSES.RESOLVED, STATUSES.CLOSED] },
    });

    res.json({
      success: true,
      data: {
        reports: paginatedReports,
        kpis: {
          newCases,
          acknowledged,
          inProgress,
          resolvedToday,
          critical,
          total,
        },
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

export const acknowledgeReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.workLogs.push({
      stage: 'Acknowledged',
      remarks: `Case acknowledged by Police Officer ${req.user.name} (Badge: ${req.user.badgeNumber || 'N/A'})`,
      actor: req.user._id,
      timestamp: new Date(),
    });

    if (report.status === STATUSES.DEPARTMENT_ASSIGNED) {
      report.status = STATUSES.WORK_STARTED;
    }

    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'POLICE_ACKNOWLEDGE',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Case acknowledged.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const dispatchReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { officerId, notes } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    let assignedOfficer = null;
    if (officerId) {
      assignedOfficer = await User.findById(officerId);
      if (assignedOfficer) {
        report.assignedTo = assignedOfficer._id;
      }
    }

    const officerDetails = assignedOfficer
      ? `${assignedOfficer.name} (Badge: ${assignedOfficer.badgeNumber || 'N/A'}, Station: ${assignedOfficer.station || 'N/A'})`
      : 'Duty Patrol Officer';

    report.status = STATUSES.WORK_STARTED;
    report.workLogs.push({
      stage: 'Dispatched',
      remarks: `Dispatched to ${officerDetails}. Notes: ${notes || 'Immediate response dispatched.'}`,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'POLICE_DISPATCH',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode, officer: officerDetails, notes },
      req,
    });

    res.json({
      success: true,
      data: {
        message: `Case dispatched to ${officerDetails}.`,
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.workLogs.push({
      stage: 'Progress Update',
      remarks: remarks || 'Officer updated case progress on site.',
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    res.json({
      success: true,
      data: {
        message: 'Progress recorded.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const recordPoliceAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actionType, remarks, officerBadge } = req.body;

    if (!actionType) {
      return res.status(400).json({
        success: false,
        error: { message: 'actionType is required (vehicle_cleared, towed, challan_issued, signal_reported, other).' },
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.policeAction = {
      actionType,
      remarks: remarks || '',
      officerBadge: officerBadge || req.user.badgeNumber || '',
      timestamp: new Date(),
    };

    report.workLogs.push({
      stage: 'Police Action Taken',
      remarks: `Action Taken: ${actionType.toUpperCase().replace(/_/g, ' ')}. Remarks: ${remarks || 'None'} (Officer Badge: ${officerBadge || req.user.badgeNumber || 'N/A'})`,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'POLICE_ACTION_TAKEN',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode, actionType, remarks },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Police action recorded.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks, beforePhoto, afterPhoto } = req.body;
    const files = req.files || [];

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    let beforeUrl = beforePhoto || (report.media[0] ? report.media[0].url : '');
    let afterUrl = afterPhoto || '';

    // Handle uploaded files if any
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const processed = await preprocessPhoto(files[i].buffer);
        const uploaded = await uploadImage(processed.buffer, {
          folder: `urbanfix/reports/${report.reportCode}/police_resolution`,
        });
        if (i === 0 && !afterUrl) {
          afterUrl = uploaded.url;
        } else if (i === 1) {
          beforeUrl = uploaded.url;
        }
      }
    }

    report.status = STATUSES.RESOLVED;
    report.resolution = {
      beforePhoto: beforeUrl,
      afterPhoto: afterUrl,
      description: 'Police resolved incident and cleared violation.',
      remarks: remarks || 'Resolved on site by Police personnel.',
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
    };
    report.citizenVerification = {
      accepted: null,
      comment: '',
      at: null,
    };

    report.workLogs.push({
      stage: 'Resolved',
      remarks: remarks || 'Police action completed and case marked resolved.',
      photoUrl: afterUrl,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    // Notify citizen reporter
    await createNotification({
      userId: report.reporter,
      type: 'RESOLVED',
      message: `Your report ${report.reportCode} (${report.category}) has been resolved by Police. Please verify the resolution.`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'POLICE_RESOLVE',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode, remarks },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Report resolved successfully.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const reopenReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.status = STATUSES.REOPENED;
    report.workLogs.push({
      stage: 'Reopened',
      remarks: remarks || 'Case reopened by Police for further monitoring or action.',
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'POLICE_REOPEN',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode, remarks },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Case reopened.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const notPoliceMatter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'A reason must be provided when returning a case as not a police matter.' },
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    report.assignedDepartment = null;
    report.department = null;
    report.assignmentSource = 'not-police-matter';
    report.status = STATUSES.AI_VERIFIED;
    report.policeNeedsVerification = false;

    report.workLogs.push({
      stage: 'Not Police Matter',
      remarks: `Returned to Admin Queue by Police: ${reason.trim()}`,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await notifyAdmins({
      type: 'REPORT_WAITING_ASSIGNMENT',
      message: `Report ${report.reportCode} returned by Police to Admin Queue: "${reason.trim()}".`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'NOT_POLICE_MATTER',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode, reason },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Report returned to Admin assignment queue.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getPoliceOfficers = async (req, res, next) => {
  try {
    const officers = await User.find({ role: ROLES.POLICE, isActive: true })
      .select('name email badgeNumber station avatar')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: { officers },
    });
  } catch (err) {
    next(err);
  }
};

export const getPoliceHotspots = async (req, res, next) => {
  try {
    const policeDept = await getPoliceDept();
    if (!policeDept) {
      return res.json({ success: true, data: { points: [] } });
    }

    const reports = await Report.find({
      assignedDepartment: policeDept._id,
      isDeleted: false,
      status: { $nin: [STATUSES.CLOSED, STATUSES.REJECTED] },
    }).select('location priority category reportCode priorityScore status policeAction');

    const points = reports.map((r) => ({
      id: r._id,
      reportCode: r.reportCode,
      lat: r.location.coordinates[1],
      lng: r.location.coordinates[0],
      intensity: (r.priorityScore || 50) / 100,
      category: r.category,
      priority: r.priority,
      status: r.status,
    }));

    res.json({
      success: true,
      data: { points },
    });
  } catch (err) {
    next(err);
  }
};
