import express from 'express';
import { getPriorityRules, updatePriorityRules } from '../controllers/priorityRuleController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.get('/', authenticate, authorize(ROLES.ADMIN), getPriorityRules);
router.put('/', authenticate, authorize(ROLES.ADMIN), updatePriorityRules);

export default router;
