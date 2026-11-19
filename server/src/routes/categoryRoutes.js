import express from 'express';
import { listCategories, createCategory, updateCategory } from '../controllers/categoryController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.get('/', listCategories);
router.post('/', authenticate, authorize(ROLES.ADMIN), createCategory);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), updateCategory);

export default router;
