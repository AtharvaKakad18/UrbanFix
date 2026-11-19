import { ActivityLog } from '../models/ActivityLog.js';

export const logActivity = async ({ actor = null, action, entityType, entityId = '', meta = {}, req = null }) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    const actorId = actor || (req?.user?._id || null);

    await ActivityLog.create({
      actor: actorId,
      action,
      entityType,
      entityId: String(entityId),
      meta,
      ip: typeof ip === 'string' ? ip.split(',')[0].trim() : '',
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to log activity:', err.message);
  }
};
