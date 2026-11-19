import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ROLES } from '../constants/index.js';

export const createNotification = async ({ userId, type, message, reportId = null }) => {
  try {
    if (!userId) return null;
    const notification = await Notification.create({
      user: userId,
      type,
      message,
      report: reportId,
    });
    return notification;
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err.message);
    return null;
  }
};

export const notifyAdmins = async ({ type, message, reportId = null }) => {
  try {
    const admins = await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id');
    const notifications = await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin._id,
          type,
          message,
          reportId,
        })
      )
    );
    return notifications;
  } catch (err) {
    console.error('[Notification] Failed to notify admins:', err.message);
    return [];
  }
};

export const notifyPolice = async ({ type, message, reportId = null }) => {
  try {
    const officers = await User.find({ role: ROLES.POLICE, isActive: true }).select('_id');
    const notifications = await Promise.all(
      officers.map((officer) =>
        createNotification({
          userId: officer._id,
          type,
          message,
          reportId,
        })
      )
    );
    return notifications;
  } catch (err) {
    console.error('[Notification] Failed to notify police:', err.message);
    return [];
  }
};

export const notifyDepartmentStaff = async ({ departmentId, type, message, reportId = null }) => {
  try {
    if (!departmentId) return [];
    const staff = await User.find({ department: departmentId, isActive: true }).select('_id');
    const notifications = await Promise.all(
      staff.map((member) =>
        createNotification({
          userId: member._id,
          type,
          message,
          reportId,
        })
      )
    );
    return notifications;
  } catch (err) {
    console.error('[Notification] Failed to notify department staff:', err.message);
    return [];
  }
};
