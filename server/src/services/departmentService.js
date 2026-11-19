import { Department } from '../models/Department.js';
import { CATEGORY_DEPARTMENT_MAP } from '../constants/index.js';

export const recommendDepartmentForCategory = async (category) => {
  const deptCode = CATEGORY_DEPARTMENT_MAP[category] || 'ROAD_DEPT';
  const dept = await Department.findOne({ code: deptCode, isActive: true });
  return dept;
};
