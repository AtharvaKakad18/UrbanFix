import { Category } from '../models/Category.js';
import { logActivity } from '../services/activityService.js';

export const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate('defaultDepartment', 'name code').sort({ name: 1 });
    res.json({
      success: true,
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, code, defaultDepartment, baseSeverity, safetyRisk } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Category name and code are required.' },
      });
    }

    const category = await Category.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      defaultDepartment: defaultDepartment || null,
      baseSeverity: baseSeverity || 3,
      safetyRisk: safetyRisk || 3,
    });

    await logActivity({
      actor: req.user._id,
      action: 'CREATE_CATEGORY',
      entityType: 'Category',
      entityId: category._id,
      meta: { name: category.name },
      req,
    });

    res.status(201).json({
      success: true,
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, defaultDepartment, baseSeverity, safetyRisk } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, error: { message: 'Category not found.' } });
    }

    if (name) category.name = name.trim();
    if (defaultDepartment !== undefined) category.defaultDepartment = defaultDepartment || null;
    if (baseSeverity !== undefined) category.baseSeverity = baseSeverity;
    if (safetyRisk !== undefined) category.safetyRisk = safetyRisk;

    await category.save();

    await logActivity({
      actor: req.user._id,
      action: 'UPDATE_CATEGORY',
      entityType: 'Category',
      entityId: category._id,
      meta: req.body,
      req,
    });

    res.json({
      success: true,
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};
