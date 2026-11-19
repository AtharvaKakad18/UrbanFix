import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Report } from '../models/Report.js';
import { DuplicateGroup } from '../models/DuplicateGroup.js';
import { Notification } from '../models/Notification.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { PriorityRule } from '../models/PriorityRule.js';

const cleanData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Cleanup] Connected to MongoDB Atlas. Purging dummy data...');

    // 1. Delete all reports
    const deletedReports = await Report.deleteMany({});
    console.log('Deleted reports:', deletedReports.deletedCount);

    // 2. Delete all duplicate groups
    const deletedDup = await DuplicateGroup.deleteMany({});
    console.log('Deleted duplicate groups:', deletedDup.deletedCount);

    // 3. Delete all notifications & activity logs
    const deletedNotif = await Notification.deleteMany({});
    const deletedLogs = await ActivityLog.deleteMany({});
    console.log('Deleted notifications:', deletedNotif.deletedCount, 'Deleted logs:', deletedLogs.deletedCount);

    // 4. Remove all dummy demo users except atharvakakad57@gmail.com
    const deletedUsers = await User.deleteMany({ email: { $ne: 'atharvakakad57@gmail.com' } });
    console.log('Deleted dummy users:', deletedUsers.deletedCount);

    // 5. Promote atharvakakad57@gmail.com to Admin
    const adminUser = await User.findOneAndUpdate(
      { email: 'atharvakakad57@gmail.com' },
      { role: 'admin', trustScore: 100 },
      { new: true }
    );
    console.log('Promoted user to Admin:', adminUser ? { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role } : 'USER NOT FOUND!');

    // 6. Clean dangling staff references in departments
    await Department.updateMany({}, { $set: { staffMembers: [] } });
    console.log('Reset department staffMembers to clean state.');

    // 7. Verify remaining counts
    console.log('\n--- Final Database Status ---');
    console.log({
      users: await User.countDocuments(),
      reports: await Report.countDocuments(),
      duplicateGroups: await DuplicateGroup.countDocuments(),
      notifications: await Notification.countDocuments(),
      activityLogs: await ActivityLog.countDocuments(),
      departments: await Department.countDocuments(),
      categories: await Category.countDocuments(),
      priorityRules: await PriorityRule.countDocuments(),
    });

    const remainingUsers = await User.find({}, 'name email role');
    console.log('Active users:', remainingUsers);

    await mongoose.disconnect();
    console.log('[Cleanup] Database cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('[Cleanup] Error:', err);
    process.exit(1);
  }
};

cleanData();
