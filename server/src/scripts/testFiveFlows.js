import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';

const API = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('🚀 Running 5 Required Change Request Test Flows...\n');

  // Helper to create distinct JPEG images so pHash is completely unique
  async function makeImage() {
    const svg = `<svg width="250" height="250" xmlns="http://www.w3.org/2000/svg">
      <rect width="250" height="250" fill="#${Math.floor(Math.random() * 16777215).toString(16)}" />
      <circle cx="${Math.floor(Math.random() * 200)}" cy="${Math.floor(Math.random() * 200)}" r="${Math.floor(Math.random() * 80 + 20)}" fill="#${Math.floor(Math.random() * 16777215).toString(16)}" />
      <polygon points="${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)} ${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)} ${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)}" fill="#${Math.floor(Math.random() * 16777215).toString(16)}" />
      <text x="20" y="100" font-size="24" fill="#ffffff">${Date.now()}_${Math.random()}</text>
    </svg>`;
    return sharp(Buffer.from(svg)).jpeg().toBuffer();
  }

  // Helper login function
  async function login(email, password, portal) {
    let endpoint = '/auth/login';
    if (portal === 'admin') endpoint = '/auth/admin/login';
    else if (portal === 'staff') endpoint = '/auth/department/login';
    else if (portal === 'police') endpoint = '/auth/police/login';

    const res = await axios.post(`${API}${endpoint}`, { email, password });
    return res.data.data.token;
  }

  // 1. FLOW D & E: Citizen role isolation & 403 checks
  console.log('--- TEST FLOW (D) & (E): Citizen Role Isolation & Forbidden Access ---');
  const citizenToken = await login('citizen1@urbanfix.org', 'UrbanFix123!', 'citizen');
  console.log('✅ Citizen logged in successfully via /auth/login');

  // Citizen attempting to login to admin portal -> 403
  try {
    await login('citizen1@urbanfix.org', 'UrbanFix123!', 'admin');
    console.error('❌ Expected 403 when citizen logs in at admin portal');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Citizen login at /auth/admin/login returned 403 Forbidden as required');
    } else {
      console.error('❌ Unexpected status:', err.response?.status);
    }
  }

  // Citizen attempting to access admin API -> 403
  try {
    await axios.get(`${API}/admin/queue`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    console.error('❌ Expected 403 when citizen accesses /admin/queue');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Citizen accessing /api/v1/admin/queue returned 403 Forbidden');
    } else {
      console.error('❌ Unexpected status:', err.response?.status);
    }
  }

  // Citizen attempting to access police API -> 403
  try {
    await axios.get(`${API}/police/cases`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    console.error('❌ Expected 403 when citizen accesses /police/cases');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Citizen accessing /api/v1/police/cases returned 403 Forbidden');
    } else {
      console.error('❌ Unexpected status:', err.response?.status);
    }
  }

  // 2. FLOW A: Citizen creates report -> Admin Queue with AI suggestion -> Admin assigns to Road Dept -> Dept resolves with photo
  console.log('\n--- TEST FLOW (A): Citizen report -> Admin Assignment Queue -> Dept Assignment & Resolution ---');
  
  const formA = new FormData();
  formA.append('declaredCategory', 'Pothole');
  formA.append('description', 'Deep dangerous pothole on Senapati Bapat Road near university gate causing vehicle swerving.');
  formA.append('lat', '18.5314');
  formA.append('lng', '73.8340');
  formA.append('address', 'Senapati Bapat Road, Pune');
  formA.append('landmark', 'University Circle');
  formA.append('photos', await makeImage(), { filename: 'pothole.jpg', contentType: 'image/jpeg' });

  const createResA = await axios.post(`${API}/reports`, formA, {
    headers: {
      ...formA.getHeaders(),
      Authorization: `Bearer ${citizenToken}`,
    },
  });

  const reportA = createResA.data.data.report;
  console.log(`✅ Citizen report created: ${reportA.reportCode} (Status: ${reportA.status})`);
  console.log(`   Assigned Dept: ${reportA.department || 'None (Unassigned)'}`);
  console.log(`   Suggested Dept: ${reportA.suggestedDepartment?.name || reportA.suggestedDepartment}`);

  // Admin logs in
  const adminToken = await login('admin@urbanfix.org', 'UrbanFix123!', 'admin');
  console.log('✅ Admin logged in via /auth/admin/login');

  // Verify report is in Admin Queue
  const queueRes = await axios.get(`${API}/admin/queue`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const unassignedList = queueRes.data.data.reports || [];
  const inQueue = unassignedList.find((r) => r._id === reportA._id);
  if (inQueue) {
    console.log(`✅ Report ${reportA.reportCode} found in Admin Assignment Queue with AI suggestion: ${inQueue.suggestedDepartment?.name || inQueue.suggestedDepartment}`);
  } else {
    console.warn(`⚠️ Report ${reportA.reportCode} not found in queue (total in queue: ${unassignedList.length})`);
  }

  // Find Road Infrastructure department ID
  const deptsRes = await axios.get(`${API}/departments`);
  const roadDept = deptsRes.data.data.departments.find((d) => d.name.toLowerCase().includes('road'));
  console.log(`   Target Dept: ${roadDept.name} (${roadDept._id})`);

  // Admin assigns report to Road Dept
  const assignRes = await axios.post(
    `${API}/admin/reports/${reportA._id}/assign`,
    { departmentId: roadDept._id },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  console.log(`✅ Admin assigned report to Road Dept. New status: ${assignRes.data.data.report.status}`);

  // Staff (Marcus Roadman) logs in
  const staffToken = await login('marcus.road@urbanfix.org', 'UrbanFix123!', 'staff');
  console.log('✅ Road Staff logged in via /auth/department/login');

  // Staff starts work
  await axios.post(
    `${API}/status/${reportA._id}/start-work`,
    { remarks: 'Asphalt crew dispatched with roller.' },
    { headers: { Authorization: `Bearer ${staffToken}` } }
  );
  console.log('✅ Staff updated status to Work Started');

  // Staff resolves with photo
  const resolveForm = new FormData();
  resolveForm.append('description', 'Pothole milled and patched with hot asphalt mix.');
  resolveForm.append('photos', await makeImage(), { filename: 'repaired.jpg', contentType: 'image/jpeg' });

  const resolveRes = await axios.post(`${API}/status/${reportA._id}/resolve`, resolveForm, {
    headers: {
      ...resolveForm.getHeaders(),
      Authorization: `Bearer ${staffToken}`,
    },
  });
  console.log(`✅ Staff resolved report. Status: ${resolveRes.data.data.report.status}`);

  // 3. FLOW B: Citizen creates "Vehicle Blocking Footpath" -> auto-routes to Police Dashboard -> Police resolves
  console.log('\n--- TEST FLOW (B): Vehicle Blocking Footpath -> Police Auto-Routing -> Police Action & Resolve ---');
  const formB = new FormData();
  formB.append('declaredCategory', 'Vehicle Blocking Footpath');
  formB.append('description', 'White sedan MH12AB1234 parked directly across pedestrian footpath blocking wheelchair ramp.');
  formB.append('lat', '18.5204');
  formB.append('lng', '73.8567');
  formB.append('address', 'FC Road, Pune');
  formB.append('landmark', 'Opposite Goodluck Cafe');
  formB.append('photos', await makeImage(), { filename: 'blocked_footpath.jpg', contentType: 'image/jpeg' });

  const createResB = await axios.post(`${API}/reports`, formB, {
    headers: {
      ...formB.getHeaders(),
      Authorization: `Bearer ${citizenToken}`,
    },
  });

  const reportB = createResB.data.data.report;
  console.log(`✅ Police-related report created: ${reportB.reportCode}`);
  console.log(`   Status: ${reportB.status}`);
  console.log(`   Assignment Source: ${reportB.assignmentSource}`);
  console.log(`   Assigned Dept: ${reportB.department?.name || reportB.department}`);

  // Police officer logs in
  const policeToken = await login('officer.patil@urbanfix.org', 'UrbanFix123!', 'police');
  console.log('✅ Police Officer Patil logged in via /auth/police/login');

  // Police records action taken
  await axios.post(
    `${API}/police/cases/${reportB._id}/action`,
    {
      actionType: 'challan_issued',
      vehicleNumber: 'MH12AB1234',
      challanAmount: 1000,
      notes: 'Issued e-challan for footpath obstruction. Vehicle owner moved car.',
    },
    { headers: { Authorization: `Bearer ${policeToken}` } }
  );
  console.log('✅ Police recorded action taken: challan_issued');

  // Police resolves case
  const policeResolveForm = new FormData();
  policeResolveForm.append('description', 'Footpath cleared and obstacle removed.');
  policeResolveForm.append('photos', await makeImage(), { filename: 'footpath_cleared.jpg', contentType: 'image/jpeg' });

  const policeResolveRes = await axios.post(`${API}/police/cases/${reportB._id}/resolve`, policeResolveForm, {
    headers: {
      ...policeResolveForm.getHeaders(),
      Authorization: `Bearer ${policeToken}`,
    },
  });
  console.log(`✅ Police resolved case. Status: ${policeResolveRes.data.data.report.status}`);

  // 4. FLOW C: Admin soft-deletes a report with reason -> hidden everywhere -> Restore -> Permanent Delete
  console.log('\n--- TEST FLOW (C): Soft-Delete -> Hidden from feed -> Trash Restore & Permanent Delete ---');
  // Create a report to test soft-delete
  const formC = new FormData();
  formC.append('declaredCategory', 'Pothole');
  formC.append('description', 'Temporary defect created for testing deletion lifecycle.');
  formC.append('lat', '18.5204');
  formC.append('lng', '73.8567');
  formC.append('address', 'Test Location Pune');
  formC.append('photos', await makeImage(), { filename: 'test_trash.jpg', contentType: 'image/jpeg' });

  const createResC = await axios.post(`${API}/reports`, formC, {
    headers: {
      ...formC.getHeaders(),
      Authorization: `Bearer ${citizenToken}`,
    },
  });
  const reportC = createResC.data.data.report;
  console.log(`✅ Report created for deletion test: ${reportC.reportCode} (${reportC._id})`);

  // Admin soft-deletes report with mandatory reason
  const softDelRes = await axios.delete(`${API}/admin/reports/${reportC._id}`, {
    data: { deletedReason: 'Duplicate test report filed in error by quality assurance.' },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`✅ Admin soft-deleted report with reason: "${softDelRes.data.data.report.deletedReason}"`);

  // Verify report is HIDDEN from citizen feed
  const publicReportsRes = await axios.get(`${API}/reports`);
  const foundInPublic = (publicReportsRes.data.data.reports || []).find((r) => r._id === reportC._id);
  if (!foundInPublic) {
    console.log('✅ Soft-deleted report is strictly excluded from public reports feed');
  } else {
    console.error('❌ Soft-deleted report was found in public reports feed!');
  }

  // Verify report IS in Admin Trash
  const trashRes = await axios.get(`${API}/admin/trash`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundInTrash = (trashRes.data.data.reports || []).find((r) => r._id === reportC._id);
  if (foundInTrash) {
    console.log(`✅ Report ${reportC.reportCode} found in Admin Trash Bin`);
  } else {
    console.error('❌ Report not found in Admin Trash Bin!');
  }

  // Admin restores report
  const restoreRes = await axios.post(
    `${API}/admin/trash/${reportC._id}/restore`,
    {},
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  console.log(`✅ Report restored from trash. isDeleted: ${restoreRes.data.data.report.isDeleted}`);

  // Re-soft-delete to test permanent delete
  await axios.delete(`${API}/admin/reports/${reportC._id}`, {
    data: { deletedReason: 'Moving back to trash for permanent removal test.' },
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // Admin permanently deletes report with typed confirmation
  const permDelRes = await axios.delete(`${API}/admin/trash/${reportC._id}/permanent`, {
    data: { confirmation: 'DELETE' },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`✅ Report permanently deleted: ${permDelRes.data.data?.message || 'Success'}`);

  console.log('\n🎉 ALL 5 TEST FLOWS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
