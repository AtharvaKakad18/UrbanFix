import express from 'express';
import {
  getPoliceReports,
  acknowledgeReport,
  dispatchReport,
  updateProgress,
  recordPoliceAction,
  resolveReport,
  reopenReport,
  notPoliceMatter,
  getPoliceOfficers,
  getPoliceHotspots,
} from '../controllers/policeController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { uploadPhotos } from '../middleware/multerUpload.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

// Police portal access: allow POLICE and ADMIN roles
router.use(authenticate, authorize(ROLES.POLICE, ROLES.ADMIN));

// Case retrieval and officer roster
router.get('/reports', getPoliceReports);
router.get('/cases', getPoliceReports);
router.get('/officers', getPoliceOfficers);
router.get('/hotspots', getPoliceHotspots);

// Actions on individual reports
router.post('/reports/:id/acknowledge', acknowledgeReport);
router.post('/reports/:id/dispatch', dispatchReport);
router.post('/reports/:id/progress', updateProgress);
router.post('/reports/:id/action-taken', recordPoliceAction);
router.post('/reports/:id/action', recordPoliceAction);
router.post('/reports/:id/resolve', uploadPhotos.array('photos', 2), resolveReport);
router.post('/reports/:id/reopen', reopenReport);
router.post('/reports/:id/not-police-matter', notPoliceMatter);

// Aliases for /cases prefix
router.post('/cases/:id/acknowledge', acknowledgeReport);
router.post('/cases/:id/dispatch', dispatchReport);
router.post('/cases/:id/progress', updateProgress);
router.post('/cases/:id/action-taken', recordPoliceAction);
router.post('/cases/:id/action', recordPoliceAction);
router.post('/cases/:id/resolve', uploadPhotos.array('photos', 2), resolveReport);
router.post('/cases/:id/reopen', reopenReport);
router.post('/cases/:id/not-police-matter', notPoliceMatter);

export default router;
