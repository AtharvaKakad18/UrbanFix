import { STATUSES } from '../constants/index.js';

export const ALLOWED_TRANSITIONS = {
  [STATUSES.REPORTED]: [
    STATUSES.AI_VERIFIED,
    STATUSES.VERIFICATION_REQUIRED,
    STATUSES.MANUAL_VERIFICATION_REQUIRED,
    STATUSES.DEPARTMENT_ASSIGNED,
    STATUSES.REJECTED,
  ],
  [STATUSES.AI_VERIFIED]: [
    STATUSES.DEPARTMENT_ASSIGNED,
    STATUSES.WORK_STARTED,
    STATUSES.REJECTED,
  ],
  [STATUSES.VERIFICATION_REQUIRED]: [
    STATUSES.AI_VERIFIED,
    STATUSES.DEPARTMENT_ASSIGNED,
    STATUSES.REJECTED,
  ],
  [STATUSES.MANUAL_VERIFICATION_REQUIRED]: [
    STATUSES.AI_VERIFIED,
    STATUSES.DEPARTMENT_ASSIGNED,
    STATUSES.REJECTED,
  ],
  [STATUSES.DEPARTMENT_ASSIGNED]: [
    STATUSES.WORK_STARTED,
    STATUSES.DEPARTMENT_ASSIGNED, // Reassignment
    STATUSES.REJECTED,
  ],
  [STATUSES.WORK_STARTED]: [
    STATUSES.RESOLVED,
    STATUSES.DEPARTMENT_ASSIGNED,
    STATUSES.REJECTED,
  ],
  [STATUSES.RESOLVED]: [
    STATUSES.CITIZEN_VERIFICATION,
    STATUSES.CLOSED,
    STATUSES.REOPENED,
  ],
  [STATUSES.CITIZEN_VERIFICATION]: [
    STATUSES.CLOSED,
    STATUSES.REOPENED,
  ],
  [STATUSES.CLOSED]: [
    STATUSES.REOPENED,
  ],
  [STATUSES.REOPENED]: [
    STATUSES.DEPARTMENT_ASSIGNED,
    STATUSES.WORK_STARTED,
    STATUSES.REJECTED,
  ],
  [STATUSES.REJECTED]: [
    STATUSES.REOPENED,
  ],
};

export const canTransition = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return Array.isArray(allowed) && allowed.includes(targetStatus);
};

export const validateTransition = (currentStatus, targetStatus) => {
  if (!canTransition(currentStatus, targetStatus)) {
    const error = new Error(
      `Illegal status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${(
        ALLOWED_TRANSITIONS[currentStatus] || []
      ).join(', ')}]`
    );
    error.statusCode = 409;
    throw error;
  }
};
