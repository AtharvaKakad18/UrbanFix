import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { Report } from '../models/Report.js';
import { Setting } from '../models/Setting.js';
import { ROLES, POLICE_DEFAULT_CATEGORIES } from '../constants/index.js';

const runMigration = async () => {
  try {
    await connectDB();
    console.log('[Migration] Connected to database.');

    // 1. Ensure Police Department exists with type: 'police'
    let policeDept = await Department.findOne({
      $or: [{ code: 'TRAFFIC_POLICE' }, { type: 'police' }],
    });

    if (!policeDept) {
      policeDept = await Department.create({
        name: 'Traffic Police & Safety Enforcement',
        code: 'TRAFFIC_POLICE',
        type: 'police',
        categoriesHandled: [
          'Vehicle Blocking Footpath',
          'No Parking',
          'Road Blockage',
          'Traffic Accident',
          'Broken Traffic Signal',
        ],
        isActive: true,
      });
      console.log('[Migration] Created Police department:', policeDept.name);
    } else {
      policeDept.type = 'police';
      await policeDept.save();
      console.log('[Migration] Updated Police department type to "police".');
    }

    // 2. Ensure categories have routeToPolice set properly
    for (const catName of POLICE_DEFAULT_CATEGORIES) {
      await Category.updateOne(
        { name: catName },
        { $set: { routeToPolice: true, defaultDepartment: policeDept._id } }
      );
    }
    console.log('[Migration] Updated police default categories with routeToPolice=true.');

    // 3. Ensure policeAutoRouting setting exists
    await Setting.findOneAndUpdate(
      { key: 'policeAutoRouting' },
      {
        value: true,
        description: 'Automatically route AI Verified police issues directly to Police',
      },
      { upsert: true }
    );
    console.log('[Migration] Initialized policeAutoRouting setting.');

    // 4. Seed 2 police officers if they don't already exist
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('UrbanFix123!', salt);

    const officersData = [
      {
        name: 'Officer Vikram Patil',
        email: 'officer.patil@urbanfix.org',
        badgeNumber: 'TP-8492',
        station: 'Central Traffic Division',
        role: ROLES.POLICE,
        department: policeDept._id,
        phone: '+91-98200-11223',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      {
        name: 'Officer Ananya Deshmukh',
        email: 'officer.deshmukh@urbanfix.org',
        badgeNumber: 'TP-5130',
        station: 'West Metro Traffic Post',
        role: ROLES.POLICE,
        department: policeDept._id,
        phone: '+91-98200-44556',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      },
    ];

    for (const off of officersData) {
      const existing = await User.findOne({ email: off.email });
      if (!existing) {
        await User.create({
          ...off,
          passwordHash,
          trustScore: 100,
        });
        console.log(`[Migration] Created police officer: ${off.name} (${off.email})`);
      } else {
        existing.role = ROLES.POLICE;
        existing.badgeNumber = off.badgeNumber;
        existing.station = off.station;
        existing.department = policeDept._id;
        await existing.save();
        console.log(`[Migration] Updated police officer: ${off.name}`);
      }
    }

    // 5. Update existing reports: set isDeleted to false where missing/null, ensure assignedDepartment is preserved
    const reportUpdates = await Report.updateMany(
      { isDeleted: { $ne: true } },
      { $set: { isDeleted: false } }
    );
    console.log(`[Migration] Ensured isDeleted=false on active reports (updated ${reportUpdates.modifiedCount} reports).`);

    // Ensure suggestedDepartment is populated on existing reports
    const reportsWithoutSuggested = await Report.find({ suggestedDepartment: null, assignedDepartment: { $ne: null } });
    for (const r of reportsWithoutSuggested) {
      r.suggestedDepartment = r.assignedDepartment;
      await r.save();
    }
    console.log(`[Migration] Backfilled suggestedDepartment on ${reportsWithoutSuggested.length} existing reports.`);

    console.log('[Migration] Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Migration failed:', err);
    process.exit(1);
  }
};

runMigration();
