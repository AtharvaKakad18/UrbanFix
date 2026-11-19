import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { Setting } from '../models/Setting.js';
import { preprocessPhoto } from '../services/imageService.js';
import { uploadImage } from '../services/storageService.js';
import { runAiPipeline } from '../services/aiPipeline.js';
import { calculateReportPriority } from '../services/priorityEngine.js';
import { processDuplicateGrouping, checkDoubleSubmission } from '../services/duplicateEngine.js';
import { recommendDepartmentForCategory } from '../services/departmentService.js';
import { createNotification, notifyAdmins, notifyPolice } from '../services/notificationService.js';
import { logActivity } from '../services/activityService.js';
import { STATUSES, CATEGORIES, POLICE_DEFAULT_CATEGORIES, ROLES } from '../constants/index.js';


// Generate sequential or timestamped REP code safely avoiding soft-deleted duplicates
const generateReportCode = async () => {
  const allDocs = await Report.collection
    .find({}, { projection: { reportCode: 1 } })
    .toArray();

  let maxNum = 1000;
  for (const doc of allDocs) {
    if (doc.reportCode) {
      const match = doc.reportCode.match(/^REP-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  while (await Report.collection.findOne({ reportCode: `REP-${nextNum}` })) {
    nextNum++;
  }
  return `REP-${nextNum}`;
};

export const createReport = async (req, res, next) => {
  try {
    const { description, lat, lng, address, landmark, declaredCategory } = req.body;
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'At least one photo (1 to 3 images) is required.' },
      });
    }

    if (!description || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: { message: 'A descriptive summary of at least 5 characters is required.' },
      });
    }

    if (lat == null || lng == null || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res.status(400).json({
        success: false,
        error: { message: 'Valid GPS coordinates (lat, lng) are required.' },
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Rate check: citizen cannot submit more than 25 reports in 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await Report.countDocuments({
      reporter: req.user._id,
      createdAt: { $gte: oneHourAgo },
    });
    if (recentCount >= 25) {
      return res.status(429).json({
        success: false,
        error: { message: 'Hourly report limit reached. Please try again later.' },
      });
    }

    const reportCode = await generateReportCode();

    // 1. Preprocess each photo with sharp (strip EXIF, auto-rotate, max 1280px, pHash)
    const processedPhotos = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const processed = await preprocessPhoto(file.buffer);

      // Check double submission on the first photo
      if (i === 0) {
        const isDouble = await checkDoubleSubmission({
          reporterId: req.user._id,
          phash: processed.phash,
        });
        if (isDouble) {
          return res.status(409).json({
            success: false,
            error: {
              message: 'Duplicate submission: you have already submitted this photo in the last 10 minutes.',
            },
          });
        }
      }

      // Upload to Cloudinary (or local fallback storage)
      const uploadRes = await uploadImage(processed.buffer, {
        folder: `urbanfix/reports/${reportCode}`,
        filename: `${reportCode}_${i + 1}`,
      });

      processedPhotos.push({
        url: uploadRes.url,
        publicId: uploadRes.publicId,
        phash: processed.phash,
        originalName: file.originalname,
        width: processed.width,
        height: processed.height,
        buffer: processed.buffer,
      });
    }

    // 2. Run AI pipeline: Media analysis -> Text analysis -> Cross validation -> Final Category
    const aiResult = await runAiPipeline({
      imageBuffer: processedPhotos[0]?.buffer || files[0].buffer,
      description,
      declaredCategory: declaredCategory || 'Pothole',
    });

    // 3. Recommend & evaluate department assignment
    const recommendedDept = await recommendDepartmentForCategory(aiResult.finalCategory);

    // Initial report object to compute priority
    const tempReport = {
      aiMedia: aiResult.aiMedia,
      location: { coordinates: [longitude, latitude] },
      createdAt: new Date(),
      confirmations: 0,
      supporters: [],
      duplicateGroupCount: 1,
    };

    const { priorityScore, priority } = await calculateReportPriority(tempReport);

    // Spam flag check
    const spamFlags = [];
    if (aiResult.aiText?.isSpamLikely) {
      spamFlags.push({ reason: 'AI detected suspicious or spam-like text description', flaggedAt: new Date() });
      await User.findByIdAndUpdate(req.user._id, { $inc: { trustScore: -5 } });
    }
    if (!aiResult.aiMedia?.isMobilityProblem) {
      spamFlags.push({ reason: 'AI detected image is not an urban mobility problem', flaggedAt: new Date() });
    }

    // Check if category is police-related
    const categoryDoc = await Category.findOne({ name: aiResult.finalCategory });
    const isPoliceCategory = (categoryDoc && categoryDoc.routeToPolice) || POLICE_DEFAULT_CATEGORIES.includes(aiResult.finalCategory);

    const policeSetting = await Setting.findOne({ key: 'policeAutoRouting' });
    const isAutoRoutingEnabled = policeSetting ? policeSetting.value !== false : true;

    let initialStatus = aiResult.status;
    let assignedDepartment = null;
    let assignedAt = null;
    let assignmentSource = '';
    let policeNeedsVerification = false;

    // Police Department lookup
    let policeDept = null;
    if (isPoliceCategory) {
      policeDept = await Department.findOne({ type: 'police' }) || await Department.findOne({ code: 'TRAFFIC_POLICE' });
    }

    // Determine the respective department for this report
    const targetDept = isPoliceCategory && policeDept ? policeDept : recommendedDept;
    const suggestedDepartment = targetDept ? targetDept._id : null;

    if (targetDept) {
      // Automatically assign and route to respective dashboard (Department or Police)
      assignedDepartment = targetDept._id;
      initialStatus = STATUSES.DEPARTMENT_ASSIGNED;
      assignedAt = new Date();
      assignmentSource = isPoliceCategory ? 'police-auto-route' : 'department-auto-route';
    }

    // 4. Save Report to Database
    const report = await Report.create({
      reportCode,
      reporter: req.user._id,
      media: processedPhotos,
      description: description.trim(),
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      address: address || '',
      landmark: landmark || '',
      aiMedia: aiResult.aiMedia,
      aiText: aiResult.aiText,
      crossValidation: aiResult.crossValidation,
      category: aiResult.finalCategory,
      status: initialStatus,
      priorityScore,
      priority,
      department: assignedDepartment,
      suggestedDepartment,
      assignedDepartment,
      assignedAt,
      assignmentSource,
      policeNeedsVerification,
      supporters: [req.user._id],
      confirmations: 1,
      spamFlags,
    });

    // 5. Run Duplicate Detection Engine
    const duplicateResult = await processDuplicateGrouping(report);

    // If duplicate group has multiple reports, recalculate priority score
    if (duplicateResult.isDuplicate && duplicateResult.group) {
      const updatedPrio = await calculateReportPriority({
        ...tempReport,
        duplicateGroupCount: duplicateResult.group.totalReports,
      });
      report.priorityScore = updatedPrio.priorityScore;
      report.priority = updatedPrio.priority;
      await report.save();
    }

    // 6. Create Notifications
    await createNotification({
      userId: req.user._id,
      type: 'REPORT_SUBMITTED',
      message: `Your report ${report.reportCode} (${report.category}) has been submitted and is currently ${report.status}.`,
      reportId: report._id,
    });

    if (assignmentSource === 'police-auto-route') {
      await notifyPolice({
        type: 'POLICE_CASE_NEW',
        message: `New police case ${report.reportCode} (${report.category}) auto-routed to Police Dashboard.`,
        reportId: report._id,
      });
    } else if (assignedDepartment && targetDept) {
      await createNotification({
        departmentId: assignedDepartment,
        type: 'DEPARTMENT_ASSIGNED',
        message: `New defect report ${report.reportCode} (${report.category}) assigned to ${targetDept.name}.`,
        reportId: report._id,
      });
    } else {
      const reasonSuffix = policeNeedsVerification ? ' (Police-related, needs verification)' : '';
      await notifyAdmins({
        type: 'REPORT_WAITING_ASSIGNMENT',
        message: `New report ${report.reportCode} (${report.category}) is waiting in the Assignment Queue${reasonSuffix}.`,
        reportId: report._id,
      });
    }

    // 7. Audit log
    await logActivity({
      actor: req.user._id,
      action: 'REPORT_CREATED',
      entityType: 'Report',
      entityId: report._id,
      meta: {
        reportCode: report.reportCode,
        category: report.category,
        status: report.status,
        isDuplicate: duplicateResult.isDuplicate,
        assignmentSource,
      },
      req,
    });

    // Populate relations for response
    const populatedReport = await Report.findById(report._id)
      .populate('reporter', 'name email avatar trustScore')
      .populate('department')
      .populate('assignedDepartment')
      .populate('duplicateGroup');

    res.status(201).json({
      success: true,
      data: {
        report: populatedReport,
        aiAnalysisCard: {
          detectedCategory: aiResult.finalCategory,
          confidence: aiResult.aiMedia?.confidence || 0,
          severity: aiResult.aiMedia?.severity || 1,
          safetyRisk: aiResult.aiMedia?.safetyRisk || 1,
          textSummary: aiResult.aiText?.summary || '',
          mediaSummary: aiResult.aiMedia?.rawSummary || '',
          isMatch: aiResult.crossValidation?.match,
          flag: aiResult.crossValidation?.flag,
          status: report.status,
          recommendedDepartment: recommendedDept?.name || 'Road Department',
          isDuplicate: duplicateResult.isDuplicate,
          duplicateGroupId: duplicateResult.group?._id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      status,
      priority,
      department,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // Department staff can only see reports assigned to their department
    if (req.user && req.user.role === ROLES.STAFF && req.user.department) {
      const deptId = req.user.department._id || req.user.department;
      query.assignedDepartment = deptId;
    } else if (department) {
      query.assignedDepartment = department;
    }

    if (category) query.category = category;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { reportCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await Report.find(query)
      .populate('reporter', 'name email avatar')
      .populate('department', 'name code')
      .populate('assignedDepartment', 'name code')
      .populate('assignedTo', 'name email')
      .populate('duplicateGroup', 'totalReports totalPhotos')
      .sort(sortOptions)
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

export const getMyReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { reporter: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reports = await Report.find(query)
      .populate('department', 'name code')
      .populate('assignedDepartment', 'name code')
      .populate('duplicateGroup', 'totalReports')
      .sort({ createdAt: -1 })
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

export const getNearbyReports = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000, category, status } = req.query;

    if (lat == null || lng == null) {
      return res.status(400).json({
        success: false,
        error: { message: 'Latitude and Longitude query parameters are required.' },
      });
    }

    const maxDistanceMeters = parseFloat(radius);
    const filter = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    };

    if (category) filter.category = category;
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate('reporter', 'name avatar')
      .populate('department', 'name code')
      .populate('assignedDepartment', 'name code')
      .populate('duplicateGroup', 'totalReports')
      .limit(100);

    res.json({
      success: true,
      data: {
        reports,
        count: reports.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReportDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id)
      .populate('reporter', 'name email avatar trustScore')
      .populate('department')
      .populate('assignedDepartment')
      .populate('assignedTo', 'name email phone')
      .populate('resolution.resolvedBy', 'name email')
      .populate({
        path: 'duplicateGroup',
        populate: {
          path: 'reports',
          select: 'reportCode description media location status createdAt',
          populate: { path: 'reporter', select: 'name avatar' },
        },
      });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    res.json({
      success: true,
      data: { report },
    });
  } catch (err) {
    next(err);
  }
};

// Citizen: Confirm report
export const confirmReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    if (report.supporters.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'You have already confirmed/supported this report.' },
      });
    }

    report.supporters.push(req.user._id);
    report.confirmations += 1;

    // Recalculate priority
    const updatedPrio = await calculateReportPriority(report);
    report.priorityScore = updatedPrio.priorityScore;
    report.priority = updatedPrio.priority;

    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'REPORT_CONFIRM',
      entityType: 'Report',
      entityId: report._id,
      req,
    });

    res.json({
      success: true,
      data: {
        confirmations: report.confirmations,
        priority: report.priority,
        priorityScore: report.priorityScore,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Citizen: Upvote report
export const upvoteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    const alreadySupported = report.supporters.some((u) => u.toString() === req.user._id.toString());
    if (alreadySupported) {
      // Toggle off upvote
      report.supporters = report.supporters.filter((u) => u.toString() !== req.user._id.toString());
      if (report.confirmations > 0) report.confirmations -= 1;
    } else {
      report.supporters.push(req.user._id);
      report.confirmations += 1;
    }

    const updatedPrio = await calculateReportPriority(report);
    report.priorityScore = updatedPrio.priorityScore;
    report.priority = updatedPrio.priority;
    await report.save();

    res.json({
      success: true,
      data: {
        upvoted: !alreadySupported,
        confirmations: report.confirmations,
        priority: report.priority,
        priorityScore: report.priorityScore,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Citizen: Still Exists flag
export const stillExistsReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    report.stillExistsCount += 1;
    const updatedPrio = await calculateReportPriority(report);
    report.priorityScore = updatedPrio.priorityScore;
    report.priority = updatedPrio.priority;
    await report.save();

    res.json({
      success: true,
      data: {
        stillExistsCount: report.stillExistsCount,
        priority: report.priority,
        priorityScore: report.priorityScore,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Citizen: Add supplementary evidence
export const addEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const files = req.files || [];

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    }

    let evidencePhotoUrl = '';
    if (files.length > 0) {
      const processed = await preprocessPhoto(files[0].buffer);
      const uploadRes = await uploadImage(processed.buffer, {
        folder: `urbanfix/reports/${report.reportCode}/evidence`,
      });
      evidencePhotoUrl = uploadRes.url;
      report.media.push({
        url: uploadRes.url,
        publicId: uploadRes.publicId,
        phash: processed.phash,
        originalName: files[0].originalname,
        width: processed.width,
        height: processed.height,
      });
    }

    report.workLogs.push({
      stage: 'Citizen Evidence Added',
      remarks: remarks || 'Citizen uploaded supplementary evidence.',
      photoUrl: evidencePhotoUrl,
      actor: req.user._id,
      timestamp: new Date(),
    });

    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'ADD_EVIDENCE',
      entityType: 'Report',
      entityId: report._id,
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

export const requestReassignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'A reason for reassignment is required.' },
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    // Check staff department authorization
    if (req.user.role === ROLES.STAFF) {
      const userDeptId = req.user.department?._id?.toString() || req.user.department?.toString();
      const reportDeptId = report.assignedDepartment?.toString();
      if (!userDeptId || userDeptId !== reportDeptId) {
        return res.status(403).json({
          success: false,
          error: { message: 'You can only request reassignment for reports assigned to your department.' },
        });
      }
    }

    report.reassignmentRequest = {
      requested: true,
      reason: reason.trim(),
      requestedBy: req.user._id,
      requestedAt: new Date(),
      status: 'pending',
    };

    await report.save();

    await notifyAdmins({
      type: 'REASSIGNMENT_REQUESTED',
      message: `Reassignment requested for ${report.reportCode}: "${reason.trim()}"`,
      reportId: report._id,
    });

    await logActivity({
      actor: req.user._id,
      action: 'REASSIGNMENT_REQUESTED',
      entityType: 'Report',
      entityId: report._id,
      meta: { reportCode: report.reportCode, reason },
      req,
    });

    res.json({
      success: true,
      data: {
        message: 'Reassignment request submitted to Admin queue.',
        report,
      },
    });
  } catch (err) {
    next(err);
  }
};

