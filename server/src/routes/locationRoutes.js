import express from 'express';
import { searchLocations, reverseLocation } from '../controllers/locationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', authenticate, searchLocations);
router.get('/reverse', authenticate, reverseLocation);

export default router;
