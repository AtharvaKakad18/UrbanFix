import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { PriorityRule } from '../models/PriorityRule.js';
import { Report } from '../models/Report.js';
import { DuplicateGroup } from '../models/DuplicateGroup.js';
import { Notification } from '../models/Notification.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Setting } from '../models/Setting.js';
import { ROLES, STATUSES, PRIORITIES, CATEGORIES, POLICE_DEFAULT_CATEGORIES } from '../constants/index.js';


const CITY_CENTER = {
  lat: 18.5204,
  lng: 73.8567,
  city: 'Pune Metro',
};

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Category.deleteMany({}),
      PriorityRule.deleteMany({}),
      Report.deleteMany({}),
      DuplicateGroup.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);

    console.log('[Seed] Existing collections cleared.');

    // 1. Create Default Priority Rule
    const priorityRule = await PriorityRule.create({
      weights: {
        safetyRisk: 25,
        severity: 20,
        reportCount: 15,
        citizenConfirmations: 15,
        ageDays: 10,
        locationImportance: 15,
      },
      thresholds: {
        low: 25,
        medium: 50,
        high: 75,
        critical: 85,
      },
      highImportanceLocations: [
        {
          name: 'City General Hospital',
          type: 'hospital',
          coordinates: [CITY_CENTER.lng + 0.005, CITY_CENTER.lat + 0.004],
          radiusMeters: 300,
        },
        {
          name: 'Central High School & Academy',
          type: 'school',
          coordinates: [CITY_CENTER.lng - 0.008, CITY_CENTER.lat - 0.006],
          radiusMeters: 250,
        },
        {
          name: 'Metropolitan Central Junction',
          type: 'junction',
          coordinates: [CITY_CENTER.lng, CITY_CENTER.lat],
          radiusMeters: 200,
        },
      ],
      isActive: true,
    });

    // 2. Create Departments
    const deptData = [
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
        name: 'Civic Enforcement & Anti-Encroachment',
        code: 'ENFORCEMENT',
        type: 'civic',
        categoriesHandled: ['Blocked Footpath', 'Footpath Encroachment', 'Construction Obstruction'],
      },
    ];

    const departments = await Department.insertMany(deptData);
    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.code] = d;
    });

    // 3. Create Categories
    const categoryDocs = [
      { name: 'Pothole', code: 'POTHOLE', defaultDepartment: deptMap.ROAD_DEPT._id, baseSeverity: 4, safetyRisk: 4, routeToPolice: false },
      { name: 'Damaged Road', code: 'DAMAGED_ROAD', defaultDepartment: deptMap.ROAD_DEPT._id, baseSeverity: 3, safetyRisk: 3, routeToPolice: false },
      { name: 'Broken Footpath', code: 'BROKEN_FOOTPATH', defaultDepartment: deptMap.ROAD_DEPT._id, baseSeverity: 3, safetyRisk: 2, routeToPolice: false },
      { name: 'Blocked Footpath', code: 'BLOCKED_FOOTPATH', defaultDepartment: deptMap.ENFORCEMENT._id, baseSeverity: 3, safetyRisk: 3, routeToPolice: false },
      { name: 'Vehicle Blocking Footpath', code: 'VEHICLE_BLOCKING_FOOTPATH', defaultDepartment: deptMap.TRAFFIC_POLICE._id, baseSeverity: 2, safetyRisk: 3, routeToPolice: true },
      { name: 'No Parking', code: 'NO_PARKING', defaultDepartment: deptMap.TRAFFIC_POLICE._id, baseSeverity: 2, safetyRisk: 2, routeToPolice: true },
      { name: 'Footpath Encroachment', code: 'FOOTPATH_ENCROACHMENT', defaultDepartment: deptMap.ENFORCEMENT._id, baseSeverity: 3, safetyRisk: 2, routeToPolice: false },
      { name: 'Construction Obstruction', code: 'CONSTRUCTION_OBSTRUCTION', defaultDepartment: deptMap.ENFORCEMENT._id, baseSeverity: 3, safetyRisk: 4, routeToPolice: false },
      { name: 'Road Blockage', code: 'ROAD_BLOCKAGE', defaultDepartment: deptMap.TRAFFIC_POLICE._id, baseSeverity: 4, safetyRisk: 4, routeToPolice: true },
      { name: 'Fallen Tree', code: 'FALLEN_TREE', defaultDepartment: deptMap.TREE_DEPT._id, baseSeverity: 4, safetyRisk: 5, routeToPolice: false },
      { name: 'Fallen Branch', code: 'FALLEN_BRANCH', defaultDepartment: deptMap.TREE_DEPT._id, baseSeverity: 3, safetyRisk: 3, routeToPolice: false },
      { name: 'Waterlogging', code: 'WATERLOGGING', defaultDepartment: deptMap.MUNICIPAL_DRAINAGE._id, baseSeverity: 4, safetyRisk: 4, routeToPolice: false },
      { name: 'Traffic Accident', code: 'TRAFFIC_ACCIDENT', defaultDepartment: deptMap.TRAFFIC_POLICE._id, baseSeverity: 5, safetyRisk: 5, routeToPolice: true },
      { name: 'Broken Traffic Signal', code: 'BROKEN_TRAFFIC_SIGNAL', defaultDepartment: deptMap.TRAFFIC_POLICE._id, baseSeverity: 4, safetyRisk: 5, routeToPolice: true },
      { name: 'Other Mobility Problem', code: 'OTHER_MOBILITY_PROBLEM', defaultDepartment: deptMap.ROAD_DEPT._id, baseSeverity: 2, safetyRisk: 2, routeToPolice: false },
    ];
    await Category.insertMany(categoryDocs);

    // 4. Create Settings
    await Setting.create({
      key: 'policeAutoRouting',
      value: true,
      description: 'Automatically route AI Verified police issues directly to Police',
    });

    // 5. Create Users (1 Admin, 8 Staff, 2 Police Officers, 3 Citizens)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('UrbanFix123!', salt);

    // Admin
    const admin = await User.create({
      name: 'Elena Vance (Admin)',
      email: 'admin@urbanfix.org',
      passwordHash,
      role: ROLES.ADMIN,
      phone: '+1-555-0100',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      trustScore: 100,
    });

    // 2 Police Officers
    const policeOfficers = await User.insertMany([
      {
        name: 'Officer Vikram Patil',
        email: 'officer.patil@urbanfix.org',
        passwordHash,
        role: ROLES.POLICE,
        department: deptMap.TRAFFIC_POLICE._id,
        badgeNumber: 'TP-8492',
        station: 'Central Traffic Division',
        phone: '+91-98200-11223',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
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
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        trustScore: 100,
      },
    ]);

    for (const po of policeOfficers) {
      await Department.findByIdAndUpdate(deptMap.TRAFFIC_POLICE._id, { $push: { staffMembers: po._id } });
    }

    // 8 Civic Staff (2 per civic dept)
    const staffMembers = [];
    const staffSpecs = [
      { name: 'Marcus Roadman', email: 'marcus.road@urbanfix.org', dept: deptMap.ROAD_DEPT },
      { name: 'Sarah Asphalt', email: 'sarah.road@urbanfix.org', dept: deptMap.ROAD_DEPT },
      { name: 'David Drain', email: 'david.drainage@urbanfix.org', dept: deptMap.MUNICIPAL_DRAINAGE },
      { name: 'Priya Flood', email: 'priya.drainage@urbanfix.org', dept: deptMap.MUNICIPAL_DRAINAGE },
      { name: 'Arbor Tom Woods', email: 'tom.tree@urbanfix.org', dept: deptMap.TREE_DEPT },
      { name: 'Chloe Green', email: 'chloe.tree@urbanfix.org', dept: deptMap.TREE_DEPT },
      { name: 'Vikram Enforce', email: 'vikram.enforce@urbanfix.org', dept: deptMap.ENFORCEMENT },
      { name: 'Zoe Sidewalk', email: 'zoe.enforce@urbanfix.org', dept: deptMap.ENFORCEMENT },
    ];

    for (const spec of staffSpecs) {
      const user = await User.create({
        name: spec.name,
        email: spec.email,
        passwordHash,
        role: ROLES.STAFF,
        department: spec.dept._id,
        phone: '+1-555-0200',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(spec.name)}`,
        trustScore: 100,
      });
      staffMembers.push(user);
      await Department.findByIdAndUpdate(spec.dept._id, { $push: { staffMembers: user._id } });
    }


    // 3 Citizens
    const citizens = await User.insertMany([
      {
        name: 'Aarav Sharma',
        email: 'citizen1@urbanfix.org',
        passwordHash,
        role: ROLES.CITIZEN,
        phone: '+1-555-0301',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        trustScore: 95,
      },
      {
        name: 'Maya Patel',
        email: 'citizen2@urbanfix.org',
        passwordHash,
        role: ROLES.CITIZEN,
        phone: '+1-555-0302',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        trustScore: 98,
      },
      {
        name: 'Jordan Lee',
        email: 'citizen3@urbanfix.org',
        passwordHash,
        role: ROLES.CITIZEN,
        phone: '+1-555-0303',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        trustScore: 92,
      },
    ]);

    // 5. Create ~25 Realistic Reports with duplicate groups around the City Center
    const samplePhotos = {
      pothole: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
      potholeFixed: 'https://images.unsplash.com/photo-1584463699039-4412f1dbb157?w=800&auto=format&fit=crop&q=80',
      footpath: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80',
      waterlogging: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80',
      fallenTree: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
      trafficSignal: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=800&auto=format&fit=crop&q=80',
      illegalParking: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop&q=80',
    };

    const reportDefinitions = [
      // Cluster 1: Deep Potholes on MG Road (Duplicate Group of 3 reports)
      {
        code: 'REP-1001',
        category: 'Pothole',
        desc: 'Deep dangerous pothole right in front of Metro Station Exit 2. Several two-wheelers nearly crashed.',
        deltaLat: 0.0012,
        deltaLng: 0.0015,
        address: 'MG Road, Metro Exit 2, Central Ward',
        status: STATUSES.WORK_STARTED,
        priority: PRIORITIES.CRITICAL,
        priorityScore: 88,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: staffMembers[0],
        reporter: citizens[0],
        photo: samplePhotos.pothole,
        isDupCluster: 1,
      },
      {
        code: 'REP-1002',
        category: 'Pothole',
        desc: 'Big pothole on MG Road near the metro pillar. Traffic is braking violently.',
        deltaLat: 0.0013,
        deltaLng: 0.0016, // within 20m of REP-1001
        address: 'MG Road, Metro Pillar 44, Central Ward',
        status: STATUSES.WORK_STARTED,
        priority: PRIORITIES.CRITICAL,
        priorityScore: 86,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: staffMembers[0],
        reporter: citizens[1],
        photo: samplePhotos.pothole,
        isDupCluster: 1,
      },
      {
        code: 'REP-1003',
        category: 'Damaged Road',
        desc: 'Road surface completely cracked open near metro exit 2, exposed asphalt gravel creating skidding risk.',
        deltaLat: 0.00125,
        deltaLng: 0.00155,
        address: 'MG Road, opposite City Mart, Central Ward',
        status: STATUSES.WORK_STARTED,
        priority: PRIORITIES.HIGH,
        priorityScore: 82,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: staffMembers[0],
        reporter: citizens[2],
        photo: samplePhotos.pothole,
        isDupCluster: 1,
      },

      // Cluster 2: Waterlogging near River Bridge (Duplicate Group of 2 reports)
      {
        code: 'REP-1004',
        category: 'Waterlogging',
        desc: 'Severe knee-deep water accumulation after morning shower. Storm drain appears completely clogged.',
        deltaLat: -0.0045,
        deltaLng: 0.0032,
        address: 'Riverbed Causeway Road, Pier 3',
        status: STATUSES.DEPARTMENT_ASSIGNED,
        priority: PRIORITIES.CRITICAL,
        priorityScore: 89,
        dept: deptMap.MUNICIPAL_DRAINAGE,
        assignedStaff: staffMembers[4],
        reporter: citizens[1],
        photo: samplePhotos.waterlogging,
        isDupCluster: 2,
      },
      {
        code: 'REP-1005',
        category: 'Waterlogging',
        desc: 'Flooded road along River Causeway. Vehicles cannot cross and bus route 14 is diverted.',
        deltaLat: -0.0046,
        deltaLng: 0.0033,
        address: 'Riverbed Causeway Road, Near Old Bridge',
        status: STATUSES.DEPARTMENT_ASSIGNED,
        priority: PRIORITIES.CRITICAL,
        priorityScore: 87,
        dept: deptMap.MUNICIPAL_DRAINAGE,
        assignedStaff: staffMembers[4],
        reporter: citizens[0],
        photo: samplePhotos.waterlogging,
        isDupCluster: 2,
      },

      // Resolved Report with Before/After Slider evidence
      {
        code: 'REP-1006',
        category: 'Pothole',
        desc: 'Wide crater near city bus terminus repaired by hot-mix asphalt asphalt crew.',
        deltaLat: -0.002,
        deltaLng: -0.003,
        address: 'Station Road, North Terminal Gate',
        status: STATUSES.RESOLVED,
        priority: PRIORITIES.HIGH,
        priorityScore: 78,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: staffMembers[1],
        reporter: citizens[2],
        photo: samplePhotos.pothole,
        resolvedPhoto: samplePhotos.potholeFixed,
        hasResolution: true,
      },

      // Closed Report (citizen confirmed)
      {
        code: 'REP-1007',
        category: 'Fallen Branch',
        desc: 'Large heavy bough fell across pedestrian walkway after heavy wind.',
        deltaLat: 0.006,
        deltaLng: -0.004,
        address: 'Park Avenue, Near Joggers Circle',
        status: STATUSES.CLOSED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 54,
        dept: deptMap.TREE_DEPT,
        assignedStaff: staffMembers[6],
        reporter: citizens[0],
        photo: samplePhotos.fallenTree,
        resolvedPhoto: samplePhotos.footpath,
        hasResolution: true,
        verifiedByCitizen: true,
      },

      // Verification Required (AI / Text Mismatch for testing table)
      {
        code: 'REP-1008',
        category: 'Broken Traffic Signal',
        desc: 'Pothole on the road (user text says pothole but photo was traffic signal)',
        deltaLat: 0.003,
        deltaLng: 0.002,
        address: 'Commercial Plaza Crossing, Central Hub',
        status: STATUSES.VERIFICATION_REQUIRED,
        priority: PRIORITIES.HIGH,
        priorityScore: 72,
        dept: deptMap.TRAFFIC_POLICE,
        assignedStaff: staffMembers[2],
        reporter: citizens[1],
        photo: samplePhotos.trafficSignal,
        mismatchFlag: true,
      },

      // Manual Verification Required (Low confidence AI for testing table)
      {
        code: 'REP-1009',
        category: 'Broken Footpath',
        desc: 'Uneven paving slabs with loose bricks causing pedestrians to trip.',
        deltaLat: -0.0015,
        deltaLng: 0.0065,
        address: 'Heritage Market Walkway, Shop 12',
        status: STATUSES.MANUAL_VERIFICATION_REQUIRED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 48,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: null,
        reporter: citizens[2],
        photo: samplePhotos.footpath,
        lowConfidence: true,
      },

      // AI Verified newly reported
      {
        code: 'REP-1010',
        category: 'Fallen Tree',
        desc: 'Uprooted banyan tree blocking both lanes of North Ring Road.',
        deltaLat: 0.008,
        deltaLng: 0.005,
        address: 'North Ring Road, Near Milestone 12',
        status: STATUSES.AI_VERIFIED,
        priority: PRIORITIES.CRITICAL,
        priorityScore: 92,
        dept: deptMap.TREE_DEPT,
        assignedStaff: null,
        reporter: citizens[0],
        photo: samplePhotos.fallenTree,
      },

      // Miscellaneous realistic reports (11 to 25)
      {
        code: 'REP-1011',
        category: 'Vehicle Blocking Footpath',
        desc: 'Commercial delivery vans persistently parked across sidewalk forcing elderly onto road.',
        deltaLat: 0.0025,
        deltaLng: -0.0035,
        address: 'Market Street, Sector 4',
        status: STATUSES.DEPARTMENT_ASSIGNED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 56,
        dept: deptMap.TRAFFIC_POLICE,
        assignedStaff: staffMembers[3],
        reporter: citizens[1],
        photo: samplePhotos.illegalParking,
      },
      {
        code: 'REP-1012',
        category: 'Footpath Encroachment',
        desc: 'Permanent tin shed erected right over public pedestrian walkway.',
        deltaLat: 0.004,
        deltaLng: -0.002,
        address: 'Old Bazaar Road, Near Post Office',
        status: STATUSES.WORK_STARTED,
        priority: PRIORITIES.HIGH,
        priorityScore: 68,
        dept: deptMap.ENFORCEMENT,
        assignedStaff: staffMembers[8],
        reporter: citizens[2],
        photo: samplePhotos.footpath,
      },
      {
        code: 'REP-1013',
        category: 'Construction Obstruction',
        desc: 'Building material debris and gravel dumped unbarricaded in bike lane.',
        deltaLat: -0.003,
        deltaLng: 0.001,
        address: 'Outer Ring Bypass, Site 104',
        status: STATUSES.REPORTED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 52,
        dept: deptMap.ENFORCEMENT,
        assignedStaff: null,
        reporter: citizens[0],
        photo: samplePhotos.pothole,
      },
      {
        code: 'REP-1014',
        category: 'Broken Traffic Signal',
        desc: 'Traffic light flashing error in all directions at busy 4-way intersection.',
        deltaLat: 0.0005,
        deltaLng: 0.0045,
        address: 'Liberty Circle Intersection',
        status: STATUSES.WORK_STARTED,
        priority: PRIORITIES.CRITICAL,
        priorityScore: 94,
        dept: deptMap.TRAFFIC_POLICE,
        assignedStaff: staffMembers[2],
        reporter: citizens[1],
        photo: samplePhotos.trafficSignal,
      },
      {
        code: 'REP-1015',
        category: 'No Parking',
        desc: 'Double parking blocking emergency lane near city clinic.',
        deltaLat: 0.0055,
        deltaLng: 0.0042, // near hospital
        address: 'Clinic Avenue, City General Hospital lane',
        status: STATUSES.AI_VERIFIED,
        priority: PRIORITIES.HIGH,
        priorityScore: 84,
        dept: deptMap.TRAFFIC_POLICE,
        assignedStaff: staffMembers[3],
        reporter: citizens[2],
        photo: samplePhotos.illegalParking,
      },
      {
        code: 'REP-1016',
        category: 'Pothole',
        desc: 'Sharp-edged pothole damaging car rims on flyover descent.',
        deltaLat: -0.005,
        deltaLng: -0.002,
        address: 'South Flyover Ramp, Lane 2',
        status: STATUSES.DEPARTMENT_ASSIGNED,
        priority: PRIORITIES.HIGH,
        priorityScore: 79,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: staffMembers[0],
        reporter: citizens[0],
        photo: samplePhotos.pothole,
      },
      {
        code: 'REP-1017',
        category: 'Waterlogging',
        desc: 'Standing water ponding under railway underpass, pedestrian walkway submerged.',
        deltaLat: 0.0022,
        deltaLng: 0.007,
        address: 'Railway Underbridge 11',
        status: STATUSES.WORK_STARTED,
        priority: PRIORITIES.HIGH,
        priorityScore: 76,
        dept: deptMap.MUNICIPAL_DRAINAGE,
        assignedStaff: staffMembers[5],
        reporter: citizens[1],
        photo: samplePhotos.waterlogging,
      },
      {
        code: 'REP-1018',
        category: 'Road Blockage',
        desc: 'Broken down flatbed truck abandoned across dual carriageway.',
        deltaLat: -0.0065,
        deltaLng: 0.004,
        address: 'Industrial Expressway, Exit 4',
        status: STATUSES.WORK_STARTED,
        priority: PRIORITIES.CRITICAL,
        priorityScore: 91,
        dept: deptMap.TRAFFIC_POLICE,
        assignedStaff: staffMembers[2],
        reporter: citizens[2],
        photo: samplePhotos.pothole,
      },
      {
        code: 'REP-1019',
        category: 'Damaged Road',
        desc: 'Extensive bitumen stripping along 200m stretch causing extreme vibrations.',
        deltaLat: 0.0075,
        deltaLng: -0.006,
        address: 'West Ridge Road, Sector 8',
        status: STATUSES.REPORTED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 46,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: null,
        reporter: citizens[0],
        photo: samplePhotos.pothole,
      },
      {
        code: 'REP-1020',
        category: 'Broken Footpath',
        desc: 'Missing storm drain cover leaving an open 4-foot deep drop in the middle of sidewalk.',
        deltaLat: -0.008,
        deltaLng: -0.005,
        address: 'School Road, 50m from Central Academy Gate',
        status: STATUSES.DEPARTMENT_ASSIGNED,
        priority: PRIORITIES.CRITICAL,
        priorityScore: 93,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: staffMembers[1],
        reporter: citizens[1],
        photo: samplePhotos.footpath,
      },
      {
        code: 'REP-1021',
        category: 'Fallen Branch',
        desc: 'Dry branch snapped and resting on overhead telephone cables.',
        deltaLat: 0.0018,
        deltaLng: -0.005,
        address: 'Gulmohar Lane, Block C',
        status: STATUSES.DEPARTMENT_ASSIGNED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 58,
        dept: deptMap.TREE_DEPT,
        assignedStaff: staffMembers[7],
        reporter: citizens[2],
        photo: samplePhotos.fallenTree,
      },
      {
        code: 'REP-1022',
        category: 'Vehicle Blocking Footpath',
        desc: 'Motorbikes parked in a row on sidewalk outside coffee shop.',
        deltaLat: 0.0035,
        deltaLng: -0.001,
        address: 'FC Road, Cafe Corridor',
        status: STATUSES.RESOLVED,
        priority: PRIORITIES.LOW,
        priorityScore: 32,
        dept: deptMap.TRAFFIC_POLICE,
        assignedStaff: staffMembers[3],
        reporter: citizens[0],
        photo: samplePhotos.illegalParking,
        resolvedPhoto: samplePhotos.footpath,
        hasResolution: true,
      },
      {
        code: 'REP-1023',
        category: 'Pothole',
        desc: 'Sunken manhole frame creating severe bump for cycling commuters.',
        deltaLat: -0.001,
        deltaLng: 0.005,
        address: 'Model Colony Main Road',
        status: STATUSES.REOPENED,
        priority: PRIORITIES.HIGH,
        priorityScore: 74,
        dept: deptMap.ROAD_DEPT,
        assignedStaff: staffMembers[0],
        reporter: citizens[1],
        photo: samplePhotos.pothole,
      },
      {
        code: 'REP-1024',
        category: 'Footpath Encroachment',
        desc: 'Illegal advertisement billboard anchored in sidewalk blocking wheelchair access.',
        deltaLat: 0.005,
        deltaLng: 0.001,
        address: 'University Road, Pillar 10',
        status: STATUSES.DEPARTMENT_ASSIGNED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 61,
        dept: deptMap.ENFORCEMENT,
        assignedStaff: staffMembers[9],
        reporter: citizens[2],
        photo: samplePhotos.footpath,
      },
      {
        code: 'REP-1025',
        category: 'Waterlogging',
        desc: 'Recurrent puddles standing for days due to reverse road gradient.',
        deltaLat: -0.004,
        deltaLng: -0.007,
        address: 'South Park Gate, Boulevard',
        status: STATUSES.REPORTED,
        priority: PRIORITIES.LOW,
        priorityScore: 28,
        dept: deptMap.MUNICIPAL_DRAINAGE,
        assignedStaff: null,
        reporter: citizens[0],
        photo: samplePhotos.waterlogging,
      },
      // Unassigned Reports for Admin Assignment Queue
      {
        code: 'REP-1026',
        category: 'Pothole',
        desc: 'Severe crater on University Flyover approach. Needs immediate patch before rush hour.',
        deltaLat: 0.003,
        deltaLng: 0.004,
        address: 'University Flyover North Approach',
        status: STATUSES.AI_VERIFIED,
        priority: PRIORITIES.HIGH,
        priorityScore: 78,
        dept: null,
        suggestedDept: deptMap.ROAD_DEPT,
        unassigned: true,
        assignedStaff: null,
        reporter: citizens[1],
        photo: samplePhotos.pothole,
      },
      {
        code: 'REP-1027',
        category: 'Broken Footpath',
        desc: 'Broken pavers and exposed rebar on North Avenue shopping promenade tripping pedestrians.',
        deltaLat: -0.002,
        deltaLng: 0.003,
        address: 'North Avenue Commercial Strip',
        status: STATUSES.AI_VERIFIED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 55,
        dept: null,
        suggestedDept: deptMap.ROAD_DEPT,
        unassigned: true,
        assignedStaff: null,
        reporter: citizens[2],
        photo: samplePhotos.footpath,
      },
      {
        code: 'REP-1028',
        category: 'Blocked Footpath',
        desc: 'Commercial generator parked on pedestrian sidewalk forcing citizens into traffic.',
        deltaLat: 0.002,
        deltaLng: -0.003,
        address: 'Market Lane Crossway',
        status: STATUSES.AI_VERIFIED,
        priority: PRIORITIES.MEDIUM,
        priorityScore: 52,
        dept: null,
        suggestedDept: deptMap.ENFORCEMENT,
        unassigned: true,
        assignedStaff: null,
        reporter: citizens[0],
        photo: samplePhotos.footpath,
      },
      {
        code: 'REP-1029',
        category: 'Waterlogging',
        desc: 'Storm drain clogged with debris causing ankle-deep water on pedestrian crossing.',
        deltaLat: -0.005,
        deltaLng: 0.002,
        address: 'Hospital Square South Crossing',
        status: STATUSES.AI_VERIFIED,
        priority: PRIORITIES.HIGH,
        priorityScore: 72,
        dept: null,
        suggestedDept: deptMap.MUNICIPAL_DRAINAGE,
        unassigned: true,
        assignedStaff: null,
        reporter: citizens[1],
        photo: samplePhotos.waterlogging,
      },
    ];


    const createdReports = [];
    const dupCluster1 = [];
    const dupCluster2 = [];

    for (const def of reportDefinitions) {
      const lng = CITY_CENTER.lng + def.deltaLng;
      const lat = CITY_CENTER.lat + def.deltaLat;

      const confidence = def.lowConfidence ? 0.42 : 0.91;
      const isMismatch = !!def.mismatchFlag;

      const report = await Report.create({
        reportCode: def.code,
        reporter: def.reporter._id,
        media: [
          {
            url: def.photo,
            publicId: `seed_${def.code}`,
            phash: 'a8b7c6d5e4f30123',
            originalName: `${def.code}_evidence.jpg`,
            width: 1280,
            height: 720,
          },
        ],
        description: def.desc,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        address: def.address,
        landmark: 'Near City Landmark',
        aiMedia: {
          category: def.category,
          confidence,
          severity: def.priority === PRIORITIES.CRITICAL ? 5 : def.priority === PRIORITIES.HIGH ? 4 : 3,
          safetyRisk: def.priority === PRIORITIES.CRITICAL ? 5 : 3,
          rawSummary: `AI detected ${def.category.toLowerCase()} with ${Math.round(confidence * 100)}% confidence.`,
          isMobilityProblem: true,
        },
        aiText: {
          category: isMismatch ? 'Pothole' : def.category,
          confidence: 0.88,
          summary: def.desc,
          isSpamLikely: false,
        },
        crossValidation: {
          match: !isMismatch,
          finalCategory: def.category,
          finalConfidence: confidence,
          flag: isMismatch ? 'CATEGORY_MISMATCH' : def.lowConfidence ? 'LOW_CONFIDENCE' : 'AI_VERIFIED_MATCH',
        },
        category: def.category,
        status: def.status,
        priorityScore: def.priorityScore,
        department: def.unassigned ? null : (def.dept ? def.dept._id : null),
        suggestedDepartment: def.suggestedDept ? def.suggestedDept._id : (def.dept ? def.dept._id : null),
        assignedDepartment: def.unassigned ? null : (def.dept ? def.dept._id : null),
        isDeleted: false,
        assignedTo: def.assignedStaff ? def.assignedStaff._id : null,
        supporters: [def.reporter._id],
        confirmations: Math.floor(Math.random() * 5) + 1,
        stillExistsCount: def.status === STATUSES.REOPENED ? 3 : 0,
        resolution: def.hasResolution
          ? {
              beforePhoto: def.photo,
              afterPhoto: def.resolvedPhoto,
              description: 'Completed repair work conforming to urban mobility guidelines.',
              remarks: 'Field inspection signed off.',
              resolvedBy: def.assignedStaff?._id || admin._id,
              resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            }
          : {},
        citizenVerification: def.verifiedByCitizen
          ? {
              accepted: true,
              comment: 'Repair completed cleanly! Thank you UrbanFix team.',
              at: new Date(),
            }
          : {},
        workLogs: [
          {
            stage: STATUSES.REPORTED,
            remarks: 'Citizen filed mobility issue report.',
            actor: def.reporter._id,
            timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
          },
          ...(def.status !== STATUSES.REPORTED
            ? [
                {
                  stage: def.status,
                  remarks: `Status updated to ${def.status}.`,
                  actor: def.assignedStaff?._id || admin._id,
                  timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
                },
              ]
            : []),
        ],
      });

      createdReports.push(report);

      if (def.isDupCluster === 1) dupCluster1.push(report);
      if (def.isDupCluster === 2) dupCluster2.push(report);
    }

    // 6. Create Duplicate Groups for Cluster 1 and Cluster 2
    if (dupCluster1.length > 0) {
      const g1 = await DuplicateGroup.create({
        mainReport: dupCluster1[0]._id,
        reports: dupCluster1.map((r) => r._id),
        category: dupCluster1[0].category,
        centroid: dupCluster1[0].location,
        totalPhotos: dupCluster1.length,
        totalReports: dupCluster1.length,
        priority: PRIORITIES.CRITICAL,
        status: dupCluster1[0].status,
      });
      for (const r of dupCluster1) {
        r.duplicateGroup = g1._id;
        await r.save();
      }
    }

    if (dupCluster2.length > 0) {
      const g2 = await DuplicateGroup.create({
        mainReport: dupCluster2[0]._id,
        reports: dupCluster2.map((r) => r._id),
        category: dupCluster2[0].category,
        centroid: dupCluster2[0].location,
        totalPhotos: dupCluster2.length,
        totalReports: dupCluster2.length,
        priority: PRIORITIES.CRITICAL,
        status: dupCluster2[0].status,
      });
      for (const r of dupCluster2) {
        r.duplicateGroup = g2._id;
        await r.save();
      }
    }

    // Wrap remaining single reports into their own DuplicateGroups
    for (const r of createdReports) {
      if (!r.duplicateGroup) {
        const group = await DuplicateGroup.create({
          mainReport: r._id,
          reports: [r._id],
          category: r.category,
          centroid: r.location,
          totalPhotos: r.media.length,
          totalReports: 1,
          priority: r.priority,
          status: r.status,
        });
        r.duplicateGroup = group._id;
        await r.save();
      }
    }

    // 7. Seed Initial Notifications
    for (const citizen of citizens) {
      await Notification.create({
        user: citizen._id,
        type: 'REPORT_SUBMITTED',
        message: 'Welcome to UrbanFix! Your citizen account is verified and ready.',
      });
    }

    // 8. Seed Activity Logs
    await ActivityLog.create({
      actor: admin._id,
      action: 'SYSTEM_SEEDED',
      entityType: 'User',
      entityId: admin._id,
      meta: { totalReports: createdReports.length, city: CITY_CENTER.city },
    });

    console.log('\n======================================================');
    console.log('🎉 UrbanFix Seed Complete!');
    console.log('======================================================');
    console.log('Demo Login Credentials:');
    console.log('  Admin:');
    console.log('    Email:    admin@urbanfix.org');
    console.log('    Password: UrbanFix123!');
    console.log('  Staff:');
    console.log('    Road Dept:        marcus.road@urbanfix.org / UrbanFix123!');
    console.log('    Traffic Police:   ryan.traffic@urbanfix.org / UrbanFix123!');
    console.log('    Municipal Drain:  david.drainage@urbanfix.org / UrbanFix123!');
    console.log('    Tree Dept:        tom.tree@urbanfix.org / UrbanFix123!');
    console.log('    Enforcement:      vikram.enforce@urbanfix.org / UrbanFix123!');
    console.log('  Citizens:');
    console.log('    Citizen 1:        citizen1@urbanfix.org / UrbanFix123!');
    console.log('    Citizen 2:        citizen2@urbanfix.org / UrbanFix123!');
    console.log('    Citizen 3:        citizen3@urbanfix.org / UrbanFix123!');
    console.log(`\nCreated ${createdReports.length} reports across ${departments.length} departments.`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error] Failed to seed database:', err);
    process.exit(1);
  }
};

seedDatabase();
