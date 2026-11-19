import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { Setting } from '../models/Setting.js';
import { ROLES, POLICE_DEFAULT_CATEGORIES } from '../constants/index.js';

async function ensureData() {
  await connectDB();
  console.log('[Setup] Connected to Atlas DB.');

  // 1. Ensure Setting policeAutoRouting exists
  const existingSetting = await Setting.findOne({ key: 'policeAutoRouting' });
  if (!existingSetting) {
    await Setting.create({
      key: 'policeAutoRouting',
      value: true,
      description: 'Automatically route AI Verified police issues directly to Police',
    });
    console.log('[Setup] Created policeAutoRouting setting.');
  }

  // 2. Ensure Departments exist
  const deptDefs = [
    {
      name: 'Road Infrastructure Department',
      code: 'ROAD_DEPT',
      type: 'civic',
      categoriesHandled: ['Pothole', 'Damaged Road', 'Broken Footpath', 'Other Mobility Problem'],
    },
    {
      name: 'Traffic Police & Safety Enforcement',
      code: 'TRAFFIC_POLICE',
      type: 'police',
      categoriesHandled: ['Vehicle Blocking Footpath', 'No Parking', 'Road Blockage', 'Traffic Accident', 'Broken Traffic Signal'],
    },
    {
      name: 'Municipal Drainage & Water Management',
      code: 'MUNICIPAL_DRAINAGE',
      type: 'civic',
      categoriesHandled: ['Waterlogging'],
    },
    {
      name: 'Urban Forestry & Tree Department',
      code: 'TREE_DEPT',
      type: 'civic',
      categoriesHandled: ['Fallen Tree', 'Fallen Branch'],
    },
    {
      name: 'Civic Enforcement & Encroachment',
      code: 'ENFORCEMENT',
      type: 'civic',
      categoriesHandled: ['Blocked Footpath', 'Footpath Encroachment', 'Construction Obstruction'],
    },
  ];

  const deptMap = {};
  for (const def of deptDefs) {
    let dept = await Department.findOne({ code: def.code });
    if (!dept) {
      dept = await Department.create(def);
      console.log(`[Setup] Created department: ${def.name}`);
    } else {
      dept.type = def.type;
      await dept.save();
    }
    deptMap[def.code] = dept;
  }

  // 3. Ensure Categories have routeToPolice set
  for (const catName of POLICE_DEFAULT_CATEGORIES) {
    await Category.updateOne(
      { name: catName },
      { $set: { routeToPolice: true, defaultDepartment: deptMap.TRAFFIC_POLICE._id } },
      { upsert: true }
    );
  }
  const civicCategories = [
    'Pothole',
    'Damaged Road',
    'Broken Footpath',
    'Blocked Footpath',
    'Footpath Encroachment',
    'Construction Obstruction',
    'Fallen Tree',
    'Fallen Branch',
    'Waterlogging',
    'Other Mobility Problem',
  ];
  for (const catName of civicCategories) {
    await Category.updateOne(
      { name: catName },
      { $set: { routeToPolice: false } },
      { upsert: true }
    );
  }
  console.log('[Setup] Updated categories with routeToPolice flags.');

  // 4. Ensure demo users exist with password UrbanFix123!
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('UrbanFix123!', salt);

  const demoUsers = [
    {
      name: 'Elena Vance (Admin)',
      email: 'admin@urbanfix.org',
      passwordHash,
      role: ROLES.ADMIN,
      phone: '+1-555-0100',
      trustScore: 100,
    },
    {
      name: 'Officer Vikram Patil',
      email: 'officer.patil@urbanfix.org',
      passwordHash,
      role: ROLES.POLICE,
      department: deptMap.TRAFFIC_POLICE._id,
      badgeNumber: 'TP-8492',
      station: 'Central Traffic Division',
      phone: '+91-98200-11223',
      trustScore: 100,
    },
    {
      name: 'Officer Ananya Deshmukh',
      email: 'officer.deshmukh@urbanfix.org',
      passwordHash,
      role: ROLES.POLICE,
      department: deptMap.TRAFFIC_POLICE._id,
      badgeNumber: 'TP-5130',
      station: 'West Metro Traffic Post',
      phone: '+91-98200-44556',
      trustScore: 100,
    },
    {
      name: 'Marcus Roadman',
      email: 'marcus.road@urbanfix.org',
      passwordHash,
      role: ROLES.STAFF,
      department: deptMap.ROAD_DEPT._id,
      phone: '+1-555-0201',
      trustScore: 100,
    },
    {
      name: 'Aarav Sharma',
      email: 'citizen1@urbanfix.org',
      passwordHash,
      role: ROLES.CITIZEN,
      phone: '+1-555-0301',
      trustScore: 95,
    },
    {
      name: 'Maya Patel',
      email: 'citizen2@urbanfix.org',
      passwordHash,
      role: ROLES.CITIZEN,
      phone: '+1-555-0302',
      trustScore: 98,
    },
  ];

  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create(u);
      console.log(`[Setup] Created user: ${u.email} (${u.role})`);
    } else {
      existing.passwordHash = passwordHash;
      existing.role = u.role;
      if (u.department) existing.department = u.department;
      if (u.badgeNumber) existing.badgeNumber = u.badgeNumber;
      if (u.station) existing.station = u.station;
      await existing.save();
      console.log(`[Setup] Updated user password/role: ${u.email}`);
    }
  }

  // Also make sure user's personal admin account atharvakakad57@gmail.com has password updated or preserved
  console.log('[Setup] Demo users verified and ready.');
  await mongoose.disconnect();
}

ensureData().catch(console.error);
