export const ROLES = {
  CITIZEN: 'citizen',
  STAFF: 'staff',
  ADMIN: 'admin',
  POLICE: 'police',
};

export const CATEGORIES = [
  'Pothole',
  'Damaged Road',
  'Broken Footpath',
  'Blocked Footpath',
  'Vehicle Blocking Footpath',
  'No Parking',
  'Footpath Encroachment',
  'Construction Obstruction',
  'Road Blockage',
  'Fallen Tree',
  'Fallen Branch',
  'Waterlogging',
  'Traffic Accident',
  'Broken Traffic Signal',
  'Other Mobility Problem',
];

export const STATUSES = {
  REPORTED: 'Reported',
  AI_VERIFIED: 'AI Verified',
  VERIFICATION_REQUIRED: 'Verification Required',
  MANUAL_VERIFICATION_REQUIRED: 'Manual Verification Required',
  DEPARTMENT_ASSIGNED: 'Department Assigned',
  WORK_STARTED: 'Work Started',
  RESOLVED: 'Resolved',
  CITIZEN_VERIFICATION: 'Citizen Verification',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  REJECTED: 'Rejected',
};

export const PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const LIFECYCLE_STEPS = [
  { key: 'Reported', label: 'Reported', desc: 'Submitted by citizen' },
  { key: 'AI Verified', label: 'AI Analysis', desc: 'Media & text validated' },
  { key: 'Department Assigned', label: 'Assigned', desc: 'Routing to department' },
  { key: 'Work Started', label: 'In Progress', desc: 'Field repair active' },
  { key: 'Resolved', label: 'Resolved', desc: 'Before/after verified' },
  { key: 'Closed', label: 'Closed', desc: 'Citizen confirmed fix' },
];
