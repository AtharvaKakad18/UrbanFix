import { Report } from '../models/Report.js';
import { DuplicateGroup } from '../models/DuplicateGroup.js';
import { calculateImageSimilarity } from './imageService.js';
import { calculateDistanceMeters } from './priorityEngine.js';
import { STATUSES, areCategoriesCompatible } from '../constants/index.js';

// Text Jaccard similarity between two descriptions
export const calculateTextSimilarity = (text1 = '', text2 = '') => {
  const tokenize = (text) => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  };

  const set1 = tokenize(text1);
  const set2 = tokenize(text2);

  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
};

/**
 * Check if the user is submitting an identical photo within 10 minutes
 */
export const checkDoubleSubmission = async ({ reporterId, phash }) => {
  if (!reporterId || !phash) return false;

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const existing = await Report.findOne({
    reporter: reporterId,
    createdAt: { $gte: tenMinutesAgo },
    'media.phash': phash,
  });

  return !!existing;
};

/**
 * Duplicate Grouping Engine
 */
export const processDuplicateGrouping = async (report) => {
  const radiusMeters = parseFloat(process.env.DUPLICATE_RADIUS_METERS || '40');
  const [lng, lat] = report.location.coordinates;

  // Active statuses to consider for duplicates
  const activeStatuses = [
    STATUSES.REPORTED,
    STATUSES.AI_VERIFIED,
    STATUSES.VERIFICATION_REQUIRED,
    STATUSES.MANUAL_VERIFICATION_REQUIRED,
    STATUSES.DEPARTMENT_ASSIGNED,
    STATUSES.WORK_STARTED,
  ];

  // Query reports within radius using 2dsphere index
  const candidates = await Report.find({
    _id: { $ne: report._id },
    status: { $in: activeStatuses },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: radiusMeters,
      },
    },
  }).populate('duplicateGroup');

  let bestMatch = null;
  let highestScore = 0;

  const reportPhash = report.media?.[0]?.phash || '';

  for (const candidate of candidates) {
    // Category check: exact match or compatible pair
    const isCatCompatible =
      candidate.category === report.category ||
      areCategoriesCompatible(candidate.category, report.category);

    if (!isCatCompatible) continue;

    // 1. Proximity score: 0m -> 1.0, radiusMeters -> 0.0
    const distance = calculateDistanceMeters(report.location.coordinates, candidate.location.coordinates);
    const proximityScore = Math.max(0, 1 - distance / radiusMeters);

    // 2. Description similarity: 0.0 to 1.0
    const textSim = calculateTextSimilarity(report.description, candidate.description);

    // 3. Image similarity using perceptual hash Hamming distance
    const candidatePhash = candidate.media?.[0]?.phash || '';
    const imgSim = (reportPhash && candidatePhash)
      ? calculateImageSimilarity(reportPhash, candidatePhash)
      : 0.5; // neutral fallback if either has no photo

    // Combined score: 0.4 * proximity + 0.3 * text + 0.3 * image
    const combinedScore = 0.4 * proximityScore + 0.3 * textSim + 0.3 * imgSim;

    if (combinedScore > highestScore) {
      highestScore = combinedScore;
      bestMatch = candidate;
    }
  }

  // Threshold is 0.6 per specification
  if (highestScore >= 0.6 && bestMatch) {
    let group = bestMatch.duplicateGroup;

    if (!group) {
      // Create duplicate group from bestMatch
      group = await DuplicateGroup.create({
        mainReport: bestMatch._id,
        reports: [bestMatch._id, report._id],
        category: bestMatch.category,
        centroid: bestMatch.location,
        totalPhotos: (bestMatch.media?.length || 0) + (report.media?.length || 0),
        totalReports: 2,
        priority: bestMatch.priority,
        status: bestMatch.status,
      });

      bestMatch.duplicateGroup = group._id;
      await bestMatch.save();
    } else {
      // Attach to existing group
      group.reports.push(report._id);
      group.totalReports = group.reports.length;
      group.totalPhotos += report.media?.length || 0;
      await group.save();
    }

    report.duplicateGroup = group._id;
    await report.save();

    return { isDuplicate: true, group, score: highestScore };
  }

  // Otherwise, create an independent DuplicateGroup for this report
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

  return { isDuplicate: false, group: newGroup, score: 0 };
};
