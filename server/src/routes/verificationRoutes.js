import express from 'express';
import { verifyResolution } from '../controllers/verificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/:id', authenticate, verifyResolution);

export default router;
