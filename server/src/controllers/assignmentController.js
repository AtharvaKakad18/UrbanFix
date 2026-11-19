import { Report } from '../models/Report.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { validateTransition } from '../services/stateMachine.js';
import { createNotification } from '../services/notificationService.js';
import { logActivity } from '../services/activityService.js';
import { STATUSES } from '../constants/index.js';

export const assignReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { departmentId, staffId, remarks } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return res.status(404).json({ success: false, error: { message: 'Department not found.' } });
      }
      report.assignedDepartment = dept._id;
    }

    if (staffId) {
      const staff = await User.findById(staffId);
      if (!staff || staff.role === 'citizen') {
        return res.status(400).json({ success: false, error: { message: 'Invalid staff user.' } });
      }
      report.assignedTo = staff._id;
    }

    // If report is in Reported or AI Verified state, transition to Department Assigned
    if (
      report.status === STATUSES.REPORTED ||
      report.status === STATUSES.AI_VERIFIED ||
      report.status === STATUSES.VERIFICATION_REQUIRED ||
      report.status === STATUSES.MANUAL_VERIFICATION_REQUIRED
    ) {
      validateTransition(report.status, STATUSES.DEPARTMENT_ASSIGNED);
      report.status = STATUSES.DEPARTMENT_ASSIGNED;
    }

    report.workLogs.push({
      stage: 'Assignment Updated',
      remarks: remarks || `Report assigned by ${req.user.name}`,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    if (report.assignedTo) {
      await createNotification({
        userId: report.assignedTo,
        type: 'DEPARTMENT_ASSIGNED',
        message: `You have been assigned to urban mobility report ${report.reportCode} (${report.category}).`,
        reportId: report._id,
      });
    }

    await createNotification({
      userId: report.reporter,
      type: 'DEPARTMENT_ASSIGNED',
      message: `Your report ${report.reportCode} has been assigned to department for action.`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'ASSIGN_REPORT',
      entityType: 'Report',
      entityId: report._id,
      meta: { departmentId, staffId, remarks },
      req,
    });

    const populated = await Report.findById(report._id)
      .populate('department')
      .populate('assignedDepartment')
      .populate('assignedTo');

    res.json({
      success: true,
      data: { report: populated },
    });
  } catch (err) {
    next(err);
  }
};
