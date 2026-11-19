import express from 'express';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, listNotifications);
router.put('/:id/read', authenticate, markNotificationRead);
router.put('/read-all', authenticate, markAllNotificationsRead);

export default router;
