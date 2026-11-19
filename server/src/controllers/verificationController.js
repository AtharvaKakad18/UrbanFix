import { Report } from '../models/Report.js';
import { validateTransition } from '../services/stateMachine.js';
import { createNotification } from '../services/notificationService.js';
import { logActivity } from '../services/activityService.js';
import { STATUSES } from '../constants/index.js';

export const verifyResolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accepted, comment } = req.body;

    if (accepted === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: "'accepted' (boolean) is required." },
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    // Must be in Resolved or Citizen Verification state
    if (report.status !== STATUSES.RESOLVED && report.status !== STATUSES.CITIZEN_VERIFICATION) {
      return res.status(400).json({
        success: false,
        error: { message: `Report must be in 'Resolved' status to verify, currently '${report.status}'.` },
      });
    }

    const isReporter = report.reporter.toString() === req.user._id.toString();
    const isSupporter = report.supporters.some((u) => u.toString() === req.user._id.toString());

    if (!isReporter && !isSupporter && req.user.role === 'citizen') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the reporter or supporters can verify this resolution.' },
      });
    }

    report.citizenVerification = {
      accepted: Boolean(accepted),
      comment: comment ? comment.trim() : '',
      at: new Date(),
    };

    if (accepted) {
      validateTransition(report.status, STATUSES.CLOSED);
      report.status = STATUSES.CLOSED;
      report.workLogs.push({
        stage: STATUSES.CLOSED,
        remarks: `Resolution verified & accepted by citizen: ${comment || 'Work approved.'}`,
        actor: req.user._id,
        timestamp: new Date(),
      });

      await createNotification({
        userId: report.reporter,
        type: 'CLOSED',
        message: `Report ${report.reportCode} has been officially closed following citizen verification.`,
        reportId: report._id,
      });
    } else {
      validateTransition(report.status, STATUSES.REOPENED);
      report.status = STATUSES.REOPENED;
      report.workLogs.push({
        stage: STATUSES.REOPENED,
        remarks: `Citizen rejected resolution: ${comment || 'Issue still exists or unsatisfactory repair.'}`,
        actor: req.user._id,
        timestamp: new Date(),
      });

      await createNotification({
        userId: report.assignedTo || report.reporter,
        type: 'REOPENED',
        message: `Citizen rejected resolution on report ${report.reportCode}. Remarks: ${comment || 'Requires rework.'}`,
        reportId: report._id,
      });
    }

    await report.save();

    await logActivity({
      actor: req.user._id,
      action: accepted ? 'CITIZEN_VERIFY_ACCEPT' : 'CITIZEN_VERIFY_REJECT',
      entityType: 'Report',
      entityId: report._id,
      meta: { accepted, comment },
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
