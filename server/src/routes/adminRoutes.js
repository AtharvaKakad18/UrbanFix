import express from 'express';
import {
  getAdminSummary,
  getChartAnalytics,
  getHotspots,
  getMismatches,
  getLowConfidence,
  getSuspicious,
  getUnassignedReports,
  assignReport,
  bulkAssignReports,
  unassignReport,
  softDeleteReport,
  restoreReport,
  permanentDeleteReport,
  getTrashReports,
  getReassignmentRequests,
  approveReassignment,
  declineReassignment,
  getPoliceRoutingSetting,
  updatePoliceRoutingSetting,
  updateCategoryPoliceRouting,
  getAllReportsAdmin,
  verifyReportAdmin,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

// Analytics
router.get('/analytics/summary', getAdminSummary);
router.get('/analytics/charts', getChartAnalytics);
router.get('/analytics/hotspots', getHotspots);
router.get('/analytics/mismatches', getMismatches);
router.get('/analytics/low-confidence', getLowConfidence);
router.get('/analytics/suspicious', getSuspicious);

// Reports Management & Assignment
router.get('/reports/all', getAllReportsAdmin);
router.get('/reports', getAllReportsAdmin);
router.patch('/reports/:id/verify', verifyReportAdmin);
router.post('/reports/:id/verify', verifyReportAdmin);
router.put('/reports/:id/verify', verifyReportAdmin);
router.get('/reports/unassigned', getUnassignedReports);
router.get('/queue', getUnassignedReports);
router.patch('/reports/:id/assign', assignReport);
router.post('/reports/:id/assign', assignReport);
router.put('/reports/:id/assign', assignReport);
router.post('/reports/bulk-assign', bulkAssignReports);
router.patch('/reports/:id/unassign', unassignReport);
router.post('/reports/:id/unassign', unassignReport);

// Soft Delete & Trash
router.delete('/reports/:id', softDeleteReport);
router.post('/reports/:id/restore', restoreReport);
router.delete('/reports/:id/permanent', permanentDeleteReport);
router.get('/reports/trash', getTrashReports);
router.get('/trash', getTrashReports);
router.post('/trash/:id/restore', restoreReport);
router.delete('/trash/:id/permanent', permanentDeleteReport);

// Reassignment Requests
router.get('/reassignment-requests', getReassignmentRequests);
router.post('/reassignment-requests/:id/approve', approveReassignment);
router.post('/reassignment-requests/:id/decline', declineReassignment);

// Settings
router.get('/settings/police-routing', getPoliceRoutingSetting);
router.put('/settings/police-routing', updatePoliceRoutingSetting);
router.patch('/categories/:id/police-routing', updateCategoryPoliceRouting);

export default router;

