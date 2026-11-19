import { PriorityRule } from '../models/PriorityRule.js';
import { PRIORITIES } from '../constants/index.js';

// Calculate distance in meters between two [lng, lat] pairs
export const calculateDistanceMeters = (coord1, coord2) => {
  if (!coord1 || !coord2) return Infinity;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Map score to priority band
export const scoreToPriority = (score, thresholds) => {
  const { medium = 50, high = 75, critical = 85 } = thresholds;
  if (score >= critical) return PRIORITIES.CRITICAL;
  if (score >= high) return PRIORITIES.HIGH;
  if (score >= medium) return PRIORITIES.MEDIUM;
  return PRIORITIES.LOW;
};

/**
 * Calculate Priority Score (0 to 100) based on weighted formula & admin rules
 */
export const calculateReportPriority = async (reportData) => {
  // Fetch active priority rule
  let rule = await PriorityRule.findOne({ isActive: true });
  if (!rule) {
    rule = {
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
    };
  }

  const { weights, thresholds, highImportanceLocations = [] } = rule;

  // 1. Safety Risk factor: scale 1-5 to 0-1
  const safetyRiskVal = (reportData.aiMedia?.safetyRisk || 3) / 5;
  const safetyScore = safetyRiskVal * (weights.safetyRisk || 25);

  // 2. Severity factor: scale 1-5 to 0-1
  const severityVal = (reportData.aiMedia?.severity || 3) / 5;
  const severityScore = severityVal * (weights.severity || 20);

  // 3. Report Count factor: capped at 10 reports
  const reportCount = reportData.duplicateGroupCount || 1;
  const reportCountVal = Math.min(reportCount, 10) / 10;
  const reportCountScore = reportCountVal * (weights.reportCount || 15);

  // 4. Citizen Confirmations & Upvotes factor: capped at 20
  const confirmations = (reportData.confirmations || 0) + (reportData.supporters?.length || 0);
  const confirmationVal = Math.min(confirmations, 20) / 20;
  const confirmationScore = confirmationVal * (weights.citizenConfirmations || 15);

  // 5. Age factor in days: capped at 14 days
  const createdAt = reportData.createdAt ? new Date(reportData.createdAt) : new Date();
  const ageInDays = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const ageVal = Math.min(ageInDays, 14) / 14;
  const ageScore = ageVal * (weights.ageDays || 10);

  // 6. Location Importance factor (near hospital, school, junction, main road)
  let isNearImportantLocation = false;
  const coordinates = reportData.location?.coordinates;
  if (coordinates && highImportanceLocations.length > 0) {
    for (const loc of highImportanceLocations) {
      const dist = calculateDistanceMeters(coordinates, loc.coordinates);
      if (dist <= (loc.radiusMeters || 250)) {
        isNearImportantLocation = true;
        break;
      }
    }
  }
  const locationImportanceScore = isNearImportantLocation ? (weights.locationImportance || 15) : 0;

  // Total raw score (0-100)
  const totalScore = Math.min(
    100,
    Math.round(safetyScore + severityScore + reportCountScore + confirmationScore + ageScore + locationImportanceScore)
  );

  const priorityBand = scoreToPriority(totalScore, thresholds);

  return {
    priorityScore: totalScore,
    priority: priorityBand,
  };
};
