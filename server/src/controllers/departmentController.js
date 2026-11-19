import { Department } from '../models/Department.js';
import { logActivity } from '../services/activityService.js';

export const listDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('staffMembers', 'name email avatar role')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: { departments },
    });
  } catch (err) {
    next(err);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, categoriesHandled } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Department name and code are required.' },
      });
    }

    const dept = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      categoriesHandled: categoriesHandled || [],
    });

    await logActivity({
      actor: req.user._id,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: dept._id,
      meta: { name: dept.name, code: dept.code },
      req,
    });

    res.status(201).json({
      success: true,
      data: { department: dept },
    });
  } catch (err) {
    next(err);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, categoriesHandled, isActive, staffMembers } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ success: false, error: { message: 'Department not found.' } });
    }

    if (name) dept.name = name.trim();
    if (categoriesHandled) dept.categoriesHandled = categoriesHandled;
    if (isActive !== undefined) dept.isActive = isActive;
    if (staffMembers) dept.staffMembers = staffMembers;

    await dept.save();

    await logActivity({
      actor: req.user._id,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: dept._id,
      meta: req.body,
      req,
    });

    res.json({
      success: true,
      data: { department: dept },
    });
  } catch (err) {
    next(err);
  }
};
