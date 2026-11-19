import express from 'express';
import {
  register,
  login,
  adminLogin,
  departmentLogin,
  policeLogin,
  logout,
  getMe,
  changePassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/admin/login', authLimiter, adminLogin);
router.post('/department/login', authLimiter, departmentLogin);
router.post('/police/login', authLimiter, policeLogin);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

export default router;

