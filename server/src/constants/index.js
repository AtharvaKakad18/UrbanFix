export const ROLES = {
  CITIZEN: 'citizen',
  STAFF: 'staff',
  ADMIN: 'admin',
  POLICE: 'police',
};

export const POLICE_DEFAULT_CATEGORIES = [
  'Vehicle Blocking Footpath',
  'No Parking',
  'Traffic Accident',
  'Road Blockage',
  'Broken Traffic Signal',
];

export const POLICE_ACTION_TYPES = [
  'vehicle_cleared',
  'towed',
  'challan_issued',
  'signal_reported',
  'other',
];

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

export const DEPARTMENT_CODES = {
  ROAD_DEPT: 'ROAD_DEPT',
  TRAFFIC_POLICE: 'TRAFFIC_POLICE',
  MUNICIPAL_DRAINAGE: 'MUNICIPAL_DRAINAGE',
  TREE_DEPT: 'TREE_DEPT',
  ENFORCEMENT: 'ENFORCEMENT',
};

// Department recommendation mapping based on category
export const CATEGORY_DEPARTMENT_MAP = {
  'Pothole': DEPARTMENT_CODES.ROAD_DEPT,
  'Damaged Road': DEPARTMENT_CODES.ROAD_DEPT,
  'Broken Footpath': DEPARTMENT_CODES.ROAD_DEPT,
  'Blocked Footpath': DEPARTMENT_CODES.ENFORCEMENT,
  'Vehicle Blocking Footpath': DEPARTMENT_CODES.TRAFFIC_POLICE,
  'No Parking': DEPARTMENT_CODES.TRAFFIC_POLICE,
  'Footpath Encroachment': DEPARTMENT_CODES.ENFORCEMENT,
  'Construction Obstruction': DEPARTMENT_CODES.ENFORCEMENT,
  'Road Blockage': DEPARTMENT_CODES.TRAFFIC_POLICE,
  'Fallen Tree': DEPARTMENT_CODES.TREE_DEPT,
  'Fallen Branch': DEPARTMENT_CODES.TREE_DEPT,
  'Waterlogging': DEPARTMENT_CODES.MUNICIPAL_DRAINAGE,
  'Traffic Accident': DEPARTMENT_CODES.TRAFFIC_POLICE,
  'Broken Traffic Signal': DEPARTMENT_CODES.TRAFFIC_POLICE,
  'Other Mobility Problem': DEPARTMENT_CODES.ROAD_DEPT,
};

// Compatible pairs for cross-validation and duplicate matching
export const COMPATIBLE_CATEGORY_PAIRS = [
  ['Pothole', 'Damaged Road'],
  ['Broken Footpath', 'Blocked Footpath'],
  ['Blocked Footpath', 'Footpath Encroachment'],
  ['Vehicle Blocking Footpath', 'No Parking'],
  ['Fallen Tree', 'Fallen Branch'],
  ['Road Blockage', 'Construction Obstruction'],
];

export const areCategoriesCompatible = (cat1, cat2) => {
  if (!cat1 || !cat2) return false;
  if (cat1 === cat2) return true;
  return COMPATIBLE_CATEGORY_PAIRS.some(
    ([a, b]) => (a === cat1 && b === cat2) || (a === cat2 && b === cat1)
  );
};
