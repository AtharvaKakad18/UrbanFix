import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Please log in.' },
      });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_urbanfix_jwt_key_987654321_civic_platform';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).populate('department');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found or account is deactivated.' },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Session expired. Please log in again.' },
      });
    }
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid authentication token.' },
    });
  }
};

// Optional auth: attaches req.user if token is present, does not block if not
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const secret = process.env.JWT_SECRET || 'super_secret_urbanfix_jwt_key_987654321_civic_platform';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).populate('department');
      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    // Silently continue without user
    next();
  }
};
