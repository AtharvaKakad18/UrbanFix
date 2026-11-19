import { PriorityRule } from '../models/PriorityRule.js';
import { logActivity } from '../services/activityService.js';

export const getPriorityRules = async (req, res, next) => {
  try {
    let rule = await PriorityRule.findOne({ isActive: true });
    if (!rule) {
      rule = await PriorityRule.create({
        weights: {
          safetyRisk: 25,
          severity: 20,
          reportCount: 15,
          citizenConfirmations: 15,
          ageDays: 10,
          locationImportance: 15,
        },
        thresholds: {
          low: 25,
          medium: 50,
          high: 75,
          critical: 85,
        },
        highImportanceLocations: [],
      });
    }

    res.json({
      success: true,
      data: { rule },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePriorityRules = async (req, res, next) => {
  try {
    const { weights, thresholds, highImportanceLocations } = req.body;

    let rule = await PriorityRule.findOne({ isActive: true });
    if (!rule) {
      rule = new PriorityRule({ isActive: true });
    }

    if (weights) rule.weights = { ...rule.weights, ...weights };
    if (thresholds) rule.thresholds = { ...rule.thresholds, ...thresholds };
    if (highImportanceLocations) rule.highImportanceLocations = highImportanceLocations;

    await rule.save();

    await logActivity({
      actor: req.user._id,
      action: 'UPDATE_PRIORITY_RULES',
      entityType: 'PriorityRule',
      entityId: rule._id,
      meta: req.body,
      req,
    });

    res.json({
      success: true,
      data: { rule },
    });
  } catch (err) {
    next(err);
  }
};
