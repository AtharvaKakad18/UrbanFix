import express from 'express';
import { listDepartments, createDepartment, updateDepartment } from '../controllers/departmentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.get('/', listDepartments);
router.post('/', authenticate, authorize(ROLES.ADMIN), createDepartment);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), updateDepartment);

export default router;
