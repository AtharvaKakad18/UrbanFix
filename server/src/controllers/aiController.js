import axios from 'axios';
import { Report } from '../models/Report.js';
import { runAiPipeline } from '../services/aiPipeline.js';
import { calculateReportPriority } from '../services/priorityEngine.js';
import { recommendDepartmentForCategory } from '../services/departmentService.js';
import { logActivity } from '../services/activityService.js';

export const reanalyzeReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found.' },
      });
    }

    let imageBuffer = null;
    if (report.media?.length > 0 && report.media[0].url) {
      try {
        const photoUrl = report.media[0].url;
        // If absolute http url, fetch it; if local /uploads, fetch or read
        if (photoUrl.startsWith('http')) {
          const imgRes = await axios.get(photoUrl, { responseType: 'arraybuffer' });
          imageBuffer = Buffer.from(imgRes.data);
        }
      } catch (fetchErr) {
        console.warn('[AI Controller] Could not fetch remote photo for reanalysis:', fetchErr.message);
      }
    }

    const aiResult = await runAiPipeline({
      imageBuffer,
      description: report.description,
      declaredCategory: report.category,
    });

    report.aiMedia = aiResult.aiMedia;
    report.aiText = aiResult.aiText;
    report.crossValidation = aiResult.crossValidation;
    report.category = aiResult.finalCategory;

    // Recommend department
    const recommendedDept = await recommendDepartmentForCategory(report.category);
    if (recommendedDept && !report.assignedDepartment) {
      report.department = recommendedDept._id;
      report.assignedDepartment = recommendedDept._id;
    }

    // Recalculate priority
    const prio = await calculateReportPriority(report);
    report.priorityScore = prio.priorityScore;
    report.priority = prio.priority;

    await report.save();

    await logActivity({
      actor: req.user._id,
      action: 'REANALYZE_REPORT',
      entityType: 'Report',
      entityId: report._id,
      meta: { newCategory: report.category, confidence: aiResult.aiMedia?.confidence },
      req,
    });

    res.json({
      success: true,
      data: { report, aiResult },
    });
  } catch (err) {
    next(err);
  }
};
