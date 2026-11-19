import express from 'express';
import { assignReport } from '../controllers/assignmentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.put('/:id', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), assignReport);

export default router;
