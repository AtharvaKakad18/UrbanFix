import { DuplicateGroup } from '../models/DuplicateGroup.js';
import { Report } from '../models/Report.js';
import { logActivity } from '../services/activityService.js';

export const listDuplicateGroups = async (req, res, next) => {
  try {
    const { minReports = 1, category, page = 1, limit = 20 } = req.query;
    const filter = { totalReports: { $gte: parseInt(minReports) } };
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const groups = await DuplicateGroup.find(filter)
      .populate('mainReport', 'reportCode description media category priority status createdAt')
      .populate({
        path: 'reports',
        select: 'reportCode description media category priority status reporter createdAt',
        populate: { path: 'reporter', select: 'name avatar' },
      })
      .sort({ totalReports: -1, updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DuplicateGroup.countDocuments(filter);

    res.json({
      success: true,
      data: {
        groups,
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

export const getDuplicateGroupDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await DuplicateGroup.findById(id)
      .populate('mainReport')
      .populate({
        path: 'reports',
        populate: { path: 'reporter', select: 'name email avatar' },
      });

    if (!group) {
      return res.status(404).json({ success: false, error: { message: 'Duplicate group not found.' } });
    }

    res.json({
      success: true,
      data: { group },
    });
  } catch (err) {
    next(err);
  }
};

export const mergeDuplicateGroups = async (req, res, next) => {
  try {
    const { targetGroupId, sourceGroupId } = req.body;

    if (!targetGroupId || !sourceGroupId) {
      return res.status(400).json({
        success: false,
        error: { message: 'targetGroupId and sourceGroupId are required.' },
      });
    }

    const targetGroup = await DuplicateGroup.findById(targetGroupId);
    const sourceGroup = await DuplicateGroup.findById(sourceGroupId);

    if (!targetGroup || !sourceGroup) {
      return res.status(404).json({ success: false, error: { message: 'One or both groups not found.' } });
    }

    // Move all reports from sourceGroup to targetGroup
    const reportIdsToMove = sourceGroup.reports;
    for (const reportId of reportIdsToMove) {
      if (!targetGroup.reports.includes(reportId)) {
        targetGroup.reports.push(reportId);
      }
      await Report.findByIdAndUpdate(reportId, { duplicateGroup: targetGroup._id });
    }

    targetGroup.totalReports = targetGroup.reports.length;
    targetGroup.totalPhotos += sourceGroup.totalPhotos;
    await targetGroup.save();

    await DuplicateGroup.findByIdAndDelete(sourceGroupId);

    await logActivity({
      actor: req.user._id,
      action: 'MERGE_DUPLICATE_GROUPS',
      entityType: 'DuplicateGroup',
      entityId: targetGroup._id,
      meta: { sourceGroupId, targetGroupId, totalReports: targetGroup.totalReports },
      req,
    });

    res.json({
      success: true,
      data: { group: targetGroup },
    });
  } catch (err) {
    next(err);
  }
};

export const splitDuplicateGroup = async (req, res, next) => {
  try {
    const { groupId, reportId } = req.body;

    if (!groupId || !reportId) {
      return res.status(400).json({
        success: false,
        error: { message: 'groupId and reportId are required.' },
      });
    }

    const group = await DuplicateGroup.findById(groupId);
    const report = await Report.findById(reportId);

    if (!group || !report) {
      return res.status(404).json({ success: false, error: { message: 'Group or Report not found.' } });
    }

    // Remove report from existing group
    group.reports = group.reports.filter((id) => id.toString() !== reportId.toString());
    group.totalReports = group.reports.length;
    group.totalPhotos = Math.max(0, group.totalPhotos - (report.media?.length || 0));

    // If mainReport was the one removed, assign new mainReport
    if (group.mainReport.toString() === reportId.toString() && group.reports.length > 0) {
      group.mainReport = group.reports[0];
    }
    await group.save();

    // Create a new individual DuplicateGroup for the detached report
    const newGroup = await DuplicateGroup.create({
      mainReport: report._id,
      reports: [report._id],
      category: report.category,
      centroid: report.location,
      totalPhotos: report.media?.length || 0,
      totalReports: 1,
      priority: report.priority,
      status: report.status,
    });

    report.duplicateGroup = newGroup._id;
    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'SPLIT_DUPLICATE_GROUP',
      entityType: 'DuplicateGroup',
      entityId: group._id,
      meta: { detachedReportId: reportId, newGroupId: newGroup._id },
      req,
    });

    res.json({
      success: true,
      data: { updatedGroup: group, newGroup },
    });
  } catch (err) {
    next(err);
  }
};
