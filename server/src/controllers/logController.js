import { ActivityLog } from '../models/ActivityLog.js';

export const listLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entityType, action } = req.query;
    const query = {};

    if (entityType) query.entityType = entityType;
    if (action) query.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await ActivityLog.find(query)
      .populate('actor', 'name email role avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
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
