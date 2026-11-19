import express from 'express';
import {
  listDuplicateGroups,
  getDuplicateGroupDetails,
  mergeDuplicateGroups,
  splitDuplicateGroup,
} from '../controllers/duplicateController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { ROLES } from '../constants/index.js';

const router = express.Router();

router.get('/', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), listDuplicateGroups);
router.get('/:id', authenticate, authorize(ROLES.STAFF, ROLES.ADMIN), getDuplicateGroupDetails);
router.post('/merge', authenticate, authorize(ROLES.ADMIN), mergeDuplicateGroups);
router.post('/split', authenticate, authorize(ROLES.ADMIN), splitDuplicateGroup);

export default router;
