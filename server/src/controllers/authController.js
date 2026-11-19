import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ROLES } from '../constants/index.js';
import { logActivity } from '../services/activityService.js';

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'super_secret_urbanfix_jwt_key_987654321_civic_platform';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    secret,
    { expiresIn }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, email, and password are required.' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long.' },
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'An account with this email already exists.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Citizen is the default role on public registration per specification
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phone ? phone.trim() : '',
      role: ROLES.CITIZEN,
      trustScore: 100,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    const token = generateToken(user);

    await logActivity({
      actor: user._id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user._id,
      meta: { email: user.email, role: user.role },
      req,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user,
      },
    });
  } catch (err) {
    next(err);
  }
};

const handlePortalLogin = async (req, res, next, expectedRole, portalName) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide both email and password.' },
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('department');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials or account is deactivated.' },
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    // Role check: ensure account role matches the portal
    if (expectedRole && user.role !== expectedRole) {
      let friendlyMsg = `Access denied. Your account role (${user.role}) does not have permission to access the ${portalName}.`;
      if (expectedRole === ROLES.CITIZEN) {
        friendlyMsg = 'This login portal is for Citizens. Please use the Admin Console, Department Hub, or Police Dashboard below.';
      } else if (expectedRole === ROLES.ADMIN) {
        friendlyMsg = 'Access denied. This portal is restricted to Administrator accounts.';
      } else if (expectedRole === ROLES.STAFF) {
        friendlyMsg = 'Access denied. This portal is restricted to Department Staff accounts.';
      } else if (expectedRole === ROLES.POLICE) {
        friendlyMsg = 'Access denied. This portal is restricted to Police personnel.';
      }

      return res.status(403).json({
        success: false,
        error: { message: friendlyMsg },
      });
    }

    const token = generateToken(user);

    await logActivity({
      actor: user._id,
      action: 'USER_LOGIN',
      entityType: 'Auth',
      entityId: user._id,
      meta: { email: user.email, role: user.role, portal: portalName },
      req,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.json({
      success: true,
      data: {
        token,
        user,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = (req, res, next) => handlePortalLogin(req, res, next, ROLES.CITIZEN, 'Citizen Portal');
export const adminLogin = (req, res, next) => handlePortalLogin(req, res, next, ROLES.ADMIN, 'Admin Console');
export const departmentLogin = (req, res, next) => handlePortalLogin(req, res, next, ROLES.STAFF, 'Department Hub');
export const policeLogin = (req, res, next) => handlePortalLogin(req, res, next, ROLES.POLICE, 'Police Dashboard');


export const logout = async (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    data: { message: 'Logged out successfully.' },
  });
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current password and new password are required.' },
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'New password must be at least 6 characters long.' },
      });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current password is incorrect.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logActivity({
      actor: user._id,
      action: 'PASSWORD_CHANGE',
      entityType: 'User',
      entityId: user._id,
      req,
    });

    res.json({
      success: true,
      data: { message: 'Password updated successfully.' },
    });
  } catch (err) {
    next(err);
  }
};

export const switchRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['citizen', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid role. Must be citizen, staff, or admin.' },
      });
    }

    const user = await User.findById(req.user._id).populate('department');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' },
      });
    }

    user.role = role;
    await user.save();

    const token = generateToken(user);

    await logActivity({
      actor: user._id,
      action: 'ROLE_SWITCH',
      entityType: 'User',
      entityId: user._id,
      meta: { newRole: role },
      req,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.json({
      success: true,
      data: {
        token,
        user,
      },
    });
  } catch (err) {
    next(err);
  }
};
