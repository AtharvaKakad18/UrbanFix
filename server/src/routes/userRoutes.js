import express from 'express';
import { getProfile, updateProfile, listUsers, createUser, updateUser } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

// Current user profile
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

// User management
router.get('/', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), listUsers);
router.post('/', authenticate, authorize(ROLES.ADMIN), createUser);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), updateUser);

export default router;
