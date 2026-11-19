import { Report } from '../models/Report.js';
import { validateTransition } from '../services/stateMachine.js';
import { preprocessPhoto } from '../services/imageService.js';
import { uploadImage } from '../services/storageService.js';
import { createNotification } from '../services/notificationService.js';
import { logActivity } from '../services/activityService.js';
import { STATUSES } from '../constants/index.js';

export const startWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    // Validate state machine transition (throws 409 if illegal)
    validateTransition(report.status, STATUSES.WORK_STARTED);

    report.status = STATUSES.WORK_STARTED;
    if (!report.assignedTo) {
      report.assignedTo = req.user._id;
    }

    report.workLogs.push({
      stage: STATUSES.WORK_STARTED,
      remarks: remarks || 'Department crew initiated field operations.',
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await createNotification({
      userId: report.reporter,
      type: 'WORK_STARTED',
      message: `Work has officially started on your report ${report.reportCode} (${report.category}).`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'WORK_STARTED',
      entityType: 'Report',
      entityId: report._id,
      meta: { remarks },
      req,
    });

    res.json({
      success: true,
      data: { report },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const file = req.files?.[0];

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    let progressPhotoUrl = '';
    if (file) {
      const processed = await preprocessPhoto(file.buffer);
      const uploadRes = await uploadImage(processed.buffer, {
        folder: `urbanfix/reports/${report.reportCode}/progress`,
      });
      progressPhotoUrl = uploadRes.url;
    }

    report.workLogs.push({
      stage: 'Work Progress Update',
      remarks: remarks || 'Progress update recorded by department staff.',
      photoUrl: progressPhotoUrl,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await createNotification({
      userId: report.reporter,
      type: 'WORK_PROGRESS',
      message: `Progress update on report ${report.reportCode}: ${remarks || 'Field work continuing.'}`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'WORK_PROGRESS',
      entityType: 'Report',
      entityId: report._id,
      meta: { remarks, hasPhoto: !!progressPhotoUrl },
      req,
    });

    res.json({
      success: true,
      data: { report },
    });
  } catch (err) {
    next(err);
  }
};

export const resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, remarks } = req.body;
    const files = req.files || [];

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    validateTransition(report.status, STATUSES.RESOLVED);

    // Initial before photo comes from original report
    let beforePhoto = report.media?.[0]?.url || '';
    let afterPhoto = '';

    // If staff uploads resolution evidence photos
    if (files.length > 0) {
      const processed = await preprocessPhoto(files[0].buffer);
      const uploadRes = await uploadImage(processed.buffer, {
        folder: `urbanfix/reports/${report.reportCode}/resolution`,
      });
      afterPhoto = uploadRes.url;
    }

    // Allow passing afterPhoto url directly if already uploaded
    if (req.body.afterPhoto) {
      afterPhoto = req.body.afterPhoto;
    }

    report.status = STATUSES.RESOLVED;
    report.resolution = {
      beforePhoto,
      afterPhoto,
      description: description || 'Work completed in accordance with municipal standards.',
      remarks: remarks || '',
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
    };

    report.workLogs.push({
      stage: STATUSES.RESOLVED,
      remarks: `Issue marked resolved by ${req.user.name}. Awaiting citizen verification.`,
      photoUrl: afterPhoto,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await createNotification({
      userId: report.reporter,
      type: 'RESOLVED',
      message: `Good news! Your report ${report.reportCode} has been marked as RESOLVED. Please inspect and verify the outcome.`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'REPORT_RESOLVED',
      entityType: 'Report',
      entityId: report._id,
      meta: { resolvedBy: req.user._id },
      req,
    });

    res.json({
      success: true,
      data: { report },
    });
  } catch (err) {
    next(err);
  }
};

export const rejectReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { message: 'A rejection reason is required.' },
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    validateTransition(report.status, STATUSES.REJECTED);

    report.status = STATUSES.REJECTED;
    report.workLogs.push({
      stage: STATUSES.REJECTED,
      remarks: `Report rejected: ${reason}`,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await createNotification({
      userId: report.reporter,
      type: 'REOPENED',
      message: `Your report ${report.reportCode} was rejected. Reason: ${reason}`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'REPORT_REJECTED',
      entityType: 'Report',
      entityId: report._id,
      meta: { reason },
      req,
    });

    res.json({
      success: true,
      data: { report },
    });
  } catch (err) {
    next(err);
  }
};

export const reopenReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    validateTransition(report.status, STATUSES.REOPENED);

    report.status = STATUSES.REOPENED;
    report.workLogs.push({
      stage: STATUSES.REOPENED,
      remarks: reason || 'Report reopened for municipal review.',
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await createNotification({
      userId: report.reporter,
      type: 'REOPENED',
      message: `Report ${report.reportCode} has been reopened. Reason: ${reason || 'Reopened for inspection.'}`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'REPORT_REOPENED',
      entityType: 'Report',
      entityId: report._id,
      meta: { reason },
      req,
    });

    res.json({
      success: true,
      data: { report },
    });
  } catch (err) {
    next(err);
  }
};
