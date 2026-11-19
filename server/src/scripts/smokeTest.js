import axios from 'axios';
import sharp from 'sharp';

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

const runSmokeTest = async () => {
  console.log('======================================================');
  console.log('🧪 Starting UrbanFix End-to-End Automated Smoke Test');
  console.log(`🎯 Target API: ${BASE_URL}`);
  console.log('======================================================\n');

  try {
    // 0. Health check
    console.log('[Step 0] Verifying Backend Health...');
    const healthRes = await axios.get('http://localhost:5000/health');
    if (healthRes.data?.status !== 'ok') throw new Error('Health check returned non-ok status');
    console.log('  ✅ Backend is healthy. MongoDB:', healthRes.data.database);

    // 1. Citizen login
    console.log('\n[Step 1] Citizen Login (citizen1@urbanfix.org)...');
    const citizenLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'citizen1@urbanfix.org',
      password: 'UrbanFix123!',
    });
    const citizenToken = citizenLoginRes.data?.data?.token;
    const citizenUser = citizenLoginRes.data?.data?.user;
    if (!citizenToken) throw new Error('Citizen login failed to return token');
    console.log(`  ✅ Citizen logged in: ${citizenUser.name} (${citizenUser.role})`);

    // 2. Generate a valid JPEG in-memory for testing photo upload
    console.log('\n[Step 2] Generating test defect photo with Sharp...');
    const randR = Math.floor(Math.random() * 200) + 20;
    const randG = Math.floor(Math.random() * 200) + 20;
    const randB = Math.floor(Math.random() * 200) + 20;
    const svgOverlay = Buffer.from(
      `<svg width="640" height="480"><circle cx="${Math.floor(Math.random() * 400) + 100}" cy="${Math.floor(Math.random() * 200) + 100}" r="80" fill="#ffffff" /><text x="50" y="50" font-size="40" fill="#000">${Date.now()}</text></svg>`
    );
    const testImageBuffer = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: randR, g: randG, b: randB },
      },
    })
      .composite([{ input: svgOverlay }])
      .jpeg()
      .toBuffer();
    console.log(`  ✅ Test photo generated (${testImageBuffer.length} bytes)`);

    // 3. Create Report (Multipart Form-Data)
    console.log('\n[Step 3] Submitting new Pothole report with GPS coordinates & photo...');
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('photos', testImageBuffer, { filename: 'pothole_smoke_test.jpg', contentType: 'image/jpeg' });
    form.append('lat', '18.5204');
    form.append('lng', '73.8567');
    form.append('address', 'MG Road, Metro Pillar 44, Central Pune');
    form.append('landmark', 'Opposite Metro Gate 2');
    form.append('declaredCategory', 'Pothole');
    form.append('description', 'Deep crater pothole in central driving lane causing vehicle rim damage.');

    const createReportRes = await axios.post(`${BASE_URL}/reports`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${citizenToken}`,
      },
    });

    const report = createReportRes.data?.data?.report;
    const aiCard = createReportRes.data?.data?.aiAnalysisCard;
    if (!report || !report._id) throw new Error('Report creation failed');

    console.log(`  ✅ Report created: ${report.reportCode}`);
    console.log(`     Category: ${report.category} | Initial Status: ${report.status}`);
    console.log(`     Calculated Priority Score: ${report.priorityScore} (${report.priority})`);
    console.log(`     Assigned Department: ${report.assignedDepartment?.name || 'Road Infrastructure'}`);
    console.log(`     AI Pipeline Result: ${aiCard.flag} (Confidence: ${Math.round(aiCard.confidence * 100)}%)`);

    const reportId = report._id;

    // 4. Staff Login (Road Department)
    console.log('\n[Step 4] Staff Login (marcus.road@urbanfix.org)...');
    const staffLoginRes = await axios.post(`${BASE_URL}/auth/department/login`, {
      email: 'marcus.road@urbanfix.org',
      password: 'UrbanFix123!',
    });
    const staffToken = staffLoginRes.data?.data?.token;
    const staffUser = staffLoginRes.data?.data?.user;
    if (!staffToken) throw new Error('Staff login failed');
    console.log(`  ✅ Staff logged in: ${staffUser.name} (${staffUser.department?.name || 'Road Dept'})`);

    // 4b. Department Assignment
    console.log('\n[Step 4b] Staff Assigns Field Officer to Report...');
    const assignRes = await axios.put(
      `${BASE_URL}/assignments/${reportId}`,
      { staffId: staffUser._id, remarks: 'Assigned Marcus Roadman for hot-mix asphalt patching.' },
      { headers: { Authorization: `Bearer ${staffToken}` } }
    );
    const assignedReport = assignRes.data?.data?.report;
    console.log(`  ✅ Report assigned to ${staffUser.name} | Status: '${assignedReport.status}'`);

    // 5. Staff Starts Work
    console.log('\n[Step 5] Staff Transition: Start Work (Work Started)...');
    const startWorkRes = await axios.post(
      `${BASE_URL}/status/${reportId}/start-work`,
      { remarks: 'Hot-mix asphalt patch crew deployed to MG Road.' },
      { headers: { Authorization: `Bearer ${staffToken}` } }
    );
    const inProgressReport = startWorkRes.data?.data?.report;
    if (inProgressReport.status !== 'Work Started') throw new Error(`Expected 'Work Started', got ${inProgressReport.status}`);
    console.log(`  ✅ Report status is now: '${inProgressReport.status}'`);

    // 6. Staff Updates Progress
    console.log('\n[Step 6] Staff Post Progress Update...');
    const progressRes = await axios.post(
      `${BASE_URL}/status/${reportId}/progress`,
      { remarks: 'Sub-base aggregate compacted. Laying bitumen surface course.' },
      { headers: { Authorization: `Bearer ${staffToken}` } }
    );
    console.log('  ✅ Progress remarks recorded in work logs.');

    // 7. Staff Resolves Report with Before/After Proof
    console.log('\n[Step 7] Staff Resolves Report with Resolution Evidence...');
    const resolveRes = await axios.post(
      `${BASE_URL}/status/${reportId}/resolve`,
      {
        description: 'Pothole excavation backfilled with asphalt concrete, compacted, and sealed.',
        remarks: 'Signed off by Marcus Roadman, Road Dept.',
        afterPhoto: 'https://images.unsplash.com/photo-1584463699039-4412f1dbb157?w=800&auto=format&fit=crop&q=80',
      },
      { headers: { Authorization: `Bearer ${staffToken}` } }
    );
    const resolvedReport = resolveRes.data?.data?.report;
    if (resolvedReport.status !== 'Resolved') throw new Error(`Expected 'Resolved', got ${resolvedReport.status}`);
    console.log(`  ✅ Report status is now: '${resolvedReport.status}'`);

    // 8. Citizen Verifies and Accepts Resolution
    console.log('\n[Step 8] Citizen Verification & Acceptance (Closing Report)...');
    const verifyRes = await axios.post(
      `${BASE_URL}/verification/${reportId}`,
      {
        accepted: true,
        comment: 'Road patch is level and safe for scooters. Thank you UrbanFix team!',
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    const closedReport = verifyRes.data?.data?.report;
    if (closedReport.status !== 'Closed') throw new Error(`Expected 'Closed', got ${closedReport.status}`);
    console.log(`  ✅ Report status officially verified and transitioned to: '${closedReport.status}'`);

    // 9. State Machine 409 Validation Check (Illegal Transition)
    console.log('\n[Step 9] State Machine Enforcement Test (Illegal transition should return 409)...');
    try {
      await axios.post(
        `${BASE_URL}/status/${reportId}/start-work`,
        { remarks: 'Illegal attempt to start work on a closed ticket' },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      throw new Error('State machine failed to reject illegal transition!');
    } catch (err) {
      if (err.response?.status === 409) {
        console.log('  ✅ State machine correctly blocked illegal transition with HTTP 409 Conflict!');
      } else {
        throw err;
      }
    }

    console.log('\n======================================================');
    console.log('🎉 ALL SMOKE TEST STEPS PASSED SUCCESSFULLY!');
    console.log('   The complete UrbanFix citizen-to-municipal resolution');
    console.log('   lifecycle is 100% verified and operational.');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Smoke Test Failed:', err.response?.data || err.message);
    process.exit(1);
  }
};

runSmokeTest();
