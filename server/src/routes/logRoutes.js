import express from 'express';
import { listLogs } from '../controllers/logController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.get('/', authenticate, authorize(ROLES.ADMIN), listLogs);

export default router;
