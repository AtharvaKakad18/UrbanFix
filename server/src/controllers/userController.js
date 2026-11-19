import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Report } from '../models/Report.js';
import { STATUSES, ROLES } from '../constants/index.js';
import { logActivity } from '../services/activityService.js';

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('department');

    // Calculate user reporting stats
    const totalReports = await Report.countDocuments({ reporter: user._id });
    const resolvedReports = await Report.countDocuments({
      reporter: user._id,
      status: { $in: [STATUSES.RESOLVED, STATUSES.CLOSED] },
    });
    const pendingReports = await Report.countDocuments({
      reporter: user._id,
      status: {
        $in: [
          STATUSES.REPORTED,
          STATUSES.AI_VERIFIED,
          STATUSES.VERIFICATION_REQUIRED,
          STATUSES.MANUAL_VERIFICATION_REQUIRED,
          STATUSES.DEPARTMENT_ASSIGNED,
          STATUSES.WORK_STARTED,
        ],
      },
    });

    res.json({
      success: true,
      data: {
        user,
        stats: {
          totalReports,
          resolvedReports,
          pendingReports,
          trustScore: user.trustScore,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    await logActivity({
      actor: user._id,
      action: 'UPDATE_PROFILE',
      entityType: 'User',
      entityId: user._id,
      req,
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// Admin CRUD operations
export const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, department } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(filter)
      .populate('department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, email, password, and role are required.' },
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'User with this email already exists.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      department: department || null,
      phone: phone || '',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    await logActivity({
      actor: req.user._id,
      action: 'ADMIN_CREATE_USER',
      entityType: 'User',
      entityId: newUser._id,
      meta: { email: newUser.email, role: newUser.role },
      req,
    });

    res.status(201).json({
      success: true,
      data: { user: newUser },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, department, isActive, trustScore } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' },
      });
    }

    if (role) user.role = role;
    if (department !== undefined) user.department = department || null;
    if (isActive !== undefined) user.isActive = isActive;
    if (trustScore !== undefined) user.trustScore = trustScore;

    await user.save();

    await logActivity({
      actor: req.user._id,
      action: 'ADMIN_UPDATE_USER',
      entityType: 'User',
      entityId: user._id,
      meta: { changes: req.body },
      req,
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
