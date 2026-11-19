import express from 'express';
import {
  startWork,
  updateProgress,
  resolveReport,
  rejectReport,
  reopenReport,
} from '../controllers/statusController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { uploadPhotos } from '../middleware/multerUpload.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.post('/:id/start-work', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), startWork);
router.post('/:id/progress', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), uploadPhotos.array('photos', 1), updateProgress);
router.post('/:id/resolve', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), uploadPhotos.array('photos', 1), resolveReport);
router.post('/:id/reject', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), rejectReport);
router.post('/:id/reopen', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), reopenReport);

export default router;
