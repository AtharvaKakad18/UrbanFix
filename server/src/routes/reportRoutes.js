import express from 'express';
import {
  createReport,
  getReports,
  getMyReports,
  getNearbyReports,
  getReportDetails,
  confirmReport,
  upvoteReport,
  stillExistsReport,
  addEvidence,
  requestReassignment,
} from '../controllers/reportController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { uploadPhotos } from '../middleware/multerUpload.js';
import { reportCreateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Report listing & retrieval
router.get('/', optionalAuth, getReports);
router.get('/mine', authenticate, getMyReports);
router.get('/nearby', optionalAuth, getNearbyReports);
router.get('/:id', optionalAuth, getReportDetails);

// Report creation (1 to 3 photos, memory upload)
router.post('/', authenticate, reportCreateLimiter, uploadPhotos.array('photos', 3), createReport);

// Citizen collaboration actions
router.post('/:id/confirm', authenticate, confirmReport);
router.post('/:id/upvote', authenticate, upvoteReport);
router.post('/:id/still-exists', authenticate, stillExistsReport);
router.post('/:id/evidence', authenticate, uploadPhotos.array('photos', 1), addEvidence);

// Department staff reassignment request
router.post('/:id/request-reassignment', authenticate, requestReassignment);

export default router;

