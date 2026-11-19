import express from 'express';
import { reanalyzeReport } from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.post('/reanalyze/:id', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), reanalyzeReport);

export default router;
