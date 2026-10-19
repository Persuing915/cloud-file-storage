const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log(`\nStarting Cloud File Storage System Test Suite against ${BASE_URL}...\n`);

  const timestamp = Date.now();
  const user1Email = `tester1_${timestamp}@example.com`;
  const user2Email = `tester2_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  let token1 = '';
  let token2 = '';
  let user1FileId = '';
  let user2FileId = '';

  // 1. Health check
  console.log('1. Health Check Endpoint');
  try {
    const res = await fetch(`${BASE_URL}/api/test`);
    const data = await res.json();
    assert(res.status === 200, 'GET /api/test returns HTTP 200');
    assert(data.message === 'Cloud File Storage backend is running', 'Health check returns expected message');
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // 2. Registration Validation & Success
  console.log('\n2. User Registration & Validation');
  try {
    // Missing fields
    const resMissing = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email })
    });
    assert(resMissing.status === 400, 'Rejects registration with missing fields (HTTP 400)');

    // Invalid email format
    const resBadEmail = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'not-an-email', password: testPassword })
    });
    assert(resBadEmail.status === 400, 'Rejects invalid email format (HTTP 400)');

    // Short password (<6 chars)
    const resShortPass = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: user1Email, password: '123' })
    });
    assert(resShortPass.status === 400, 'Rejects short password (HTTP 400)');

    // Valid User 1 registration
    const resReg1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User One', email: user1Email, password: testPassword })
    });
    const regData1 = await resReg1.json();
    assert(resReg1.status === 201, 'Registers User 1 successfully (HTTP 201)');
    assert(regData1.user && !regData1.user.password, 'User response does not expose password or hash');

    // Duplicate email registration
    const resDup = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User One Dup', email: user1Email, password: testPassword })
    });
    assert(resDup.status === 400, 'Rejects duplicate email registration (HTTP 400)');

    // Valid User 2 registration
    const resReg2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User Two', email: user2Email, password: testPassword })
    });
    assert(resReg2.status === 201, 'Registers User 2 successfully (HTTP 201)');
  } catch (err) {
    assert(false, `Registration tests threw error: ${err.message}`);
  }

  // 3. User Login & Token Verification
  console.log('\n3. User Login & JWT Authentication');
  try {
    // Bad password
    const resBadLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'wrongPassword' })
    });
    assert(resBadLogin.status === 401, 'Rejects incorrect password (HTTP 401)');

    // Nonexistent email
    const resNoUser = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost_user@example.com', password: testPassword })
    });
    assert(resNoUser.status === 401, 'Rejects nonexistent email (HTTP 401)');

    // Valid login User 1
    const resLogin1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: testPassword })
    });
    const loginData1 = await resLogin1.json();
    assert(resLogin1.status === 200, 'Logs in User 1 successfully (HTTP 200)');
    assert(typeof loginData1.token === 'string' && loginData1.token.length > 20, 'Returns valid JWT token string');
    token1 = loginData1.token;

    // Valid login User 2
    const resLogin2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user2Email, password: testPassword })
    });
    const loginData2 = await resLogin2.json();
    token2 = loginData2.token;
  } catch (err) {
    assert(false, `Login tests threw error: ${err.message}`);
  }

  // 4. Protected Route: /api/auth/me
  console.log('\n4. Protected Profile Endpoint (/api/auth/me)');
  try {
    // Missing token
    const resNoToken = await fetch(`${BASE_URL}/api/auth/me`);
    assert(resNoToken.status === 401, 'Rejects request without Authorization header (HTTP 401)');

    // Invalid token
    const resBadToken = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid.fake.token' }
    });
    assert(resBadToken.status === 401, 'Rejects invalid JWT token (HTTP 401)');

    // Valid token
    const resMe = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const meData = await resMe.json();
    assert(resMe.status === 200, 'Accesses profile with valid Bearer token (HTTP 200)');
    assert(meData.user.email === user1Email, 'Returns correct authenticated user profile');
    assert(!meData.user.password, 'Profile does not contain password hash');
  } catch (err) {
    assert(false, `Profile tests threw error: ${err.message}`);
  }

  // 5. File Upload & Restrictions
  console.log('\n5. File Upload & Security Restrictions');
  const tempDir = path.join(__dirname, 'temp_test_files');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const validFilePath = path.join(tempDir, 'valid_doc.txt');
  fs.writeFileSync(validFilePath, 'Automated test file content for User 1', 'utf8');

  const user2FilePath = path.join(tempDir, 'user2_report.pdf');
  fs.writeFileSync(user2FilePath, '%PDF-1.4 automated test pdf content for User 2', 'utf8');

  const badFilePath = path.join(tempDir, 'dangerous.exe');
  fs.writeFileSync(badFilePath, 'MZ dummy executable header', 'utf8');

  try {
    // Missing authentication on upload
    const resUploadNoAuth = await fetch(`${BASE_URL}/api/files/upload`, { method: 'POST' });
    assert(resUploadNoAuth.status === 401, 'Blocks upload without authentication (HTTP 401)');

    // Upload unsupported file (.exe)
    const formBad = new FormData();
    formBad.append('file', new Blob([fs.readFileSync(badFilePath)], { type: 'application/octet-stream' }), 'dangerous.exe');
    const resBadUpload = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: formBad
    });
    assert(resBadUpload.status === 400, 'Rejects unsupported file type .exe (HTTP 400)');

    // Valid upload by User 1
    const form1 = new FormData();
    form1.append('file', new Blob([fs.readFileSync(validFilePath)], { type: 'text/plain' }), 'valid_doc.txt');
    const resUp1 = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: form1
    });
    const dataUp1 = await resUp1.json();
    assert(resUp1.status === 201, 'Uploads valid text file for User 1 (HTTP 201)');
    assert(dataUp1.file && dataUp1.file.originalName === 'valid_doc.txt', 'Preserves original filename in metadata');
    user1FileId = dataUp1.file.id;

    // Valid upload by User 2
    const form2 = new FormData();
    form2.append('file', new Blob([fs.readFileSync(user2FilePath)], { type: 'application/pdf' }), 'user2_report.pdf');
    const resUp2 = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: form2
    });
    const dataUp2 = await resUp2.json();
    assert(resUp2.status === 201, 'Uploads valid PDF file for User 2 (HTTP 201)');
    user2FileId = dataUp2.file.id;
  } catch (err) {
    assert(false, `Upload tests threw error: ${err.message}`);
  }

  // 6. File Listing & Isolation
  console.log('\n6. File Listing & Multi-User Isolation');
  try {
    const resList1 = await fetch(`${BASE_URL}/api/files`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const listData1 = await resList1.json();
    assert(resList1.status === 200, 'User 1 successfully lists files (HTTP 200)');
    const user1HasOwn = listData1.files.some((f) => f.id === user1FileId);
    const user1HasOther = listData1.files.some((f) => f.id === user2FileId);
    assert(user1HasOwn, 'User 1 sees their own uploaded file');
    assert(!user1HasOther, 'User 1 CANNOT see User 2 files (Data Isolation)');

    const resList2 = await fetch(`${BASE_URL}/api/files`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const listData2 = await resList2.json();
    const user2HasOwn = listData2.files.some((f) => f.id === user2FileId);
    const user2HasOther = listData2.files.some((f) => f.id === user1FileId);
    assert(user2HasOwn, 'User 2 sees their own uploaded file');
    assert(!user2HasOther, 'User 2 CANNOT see User 1 files (Data Isolation)');
  } catch (err) {
    assert(false, `Listing tests threw error: ${err.message}`);
  }

  // 7. File Details & Cross-User Security
  console.log('\n7. File Details & Cross-User Security');
  try {
    // Invalid ObjectId format
    const resBadId = await fetch(`${BASE_URL}/api/files/invalid-format-id`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(resBadId.status === 400, 'Rejects invalid ObjectId format with HTTP 400');

    // User 1 accesses own file
    const resDetail1 = await fetch(`${BASE_URL}/api/files/${user1FileId}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const detailData1 = await resDetail1.json();
    assert(resDetail1.status === 200, 'User 1 retrieves details for their own file (HTTP 200)');
    assert(!detailData1.file.storageName && !detailData1.file.path, 'Does not expose internal server paths');

    // User 2 attempts to access User 1 file details
    const resCrossDetail = await fetch(`${BASE_URL}/api/files/${user1FileId}`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(resCrossDetail.status === 404, 'Blocks User 2 from viewing User 1 file details (HTTP 404)');
  } catch (err) {
    assert(false, `Detail tests threw error: ${err.message}`);
  }

  // 8. File Download & Cross-User Protection
  console.log('\n8. File Download & Cross-User Protection');
  try {
    // User 1 downloads own file
    const resDl1 = await fetch(`${BASE_URL}/api/files/${user1FileId}/download`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const dlText1 = await resDl1.text();
    const contentDisposition = resDl1.headers.get('content-disposition');
    assert(resDl1.status === 200, 'User 1 downloads own file (HTTP 200)');
    assert(contentDisposition && contentDisposition.includes('valid_doc.txt'), 'Content-Disposition header includes original filename');
    assert(dlText1 === 'Automated test file content for User 1', 'Downloaded file content matches uploaded bytes');

    // User 2 attempts to download User 1 file
    const resCrossDl = await fetch(`${BASE_URL}/api/files/${user1FileId}/download`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(resCrossDl.status === 404, 'Blocks User 2 from downloading User 1 file (HTTP 404)');
  } catch (err) {
    assert(false, `Download tests threw error: ${err.message}`);
  }

  // 9. File Deletion & Cross-User Protection
  console.log('\n9. File Deletion & Cross-User Protection');
  try {
    // User 2 attempts to delete User 1 file
    const resCrossDel = await fetch(`${BASE_URL}/api/files/${user1FileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(resCrossDel.status === 404, 'Blocks User 2 from deleting User 1 file (HTTP 404)');

    // User 1 deletes own file
    const resDel1 = await fetch(`${BASE_URL}/api/files/${user1FileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(resDel1.status === 200, 'User 1 deletes own file (HTTP 200)');

    // Verify file is gone from listing
    const resVerifyList = await fetch(`${BASE_URL}/api/files`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const verifyData = await resVerifyList.json();
    assert(!verifyData.files.some((f) => f.id === user1FileId), 'Deleted file is absent from user file list');

    // User 2 deletes User 2 file to clean up
    await fetch(`${BASE_URL}/api/files/${user2FileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token2}` }
    });
  } catch (err) {
    assert(false, `Deletion tests threw error: ${err.message}`);
  }

  // Cleanup temp files
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (_) {}

  console.log('\n======================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
