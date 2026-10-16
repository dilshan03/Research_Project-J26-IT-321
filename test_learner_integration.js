import { connectToDatabase, closeDatabaseConnection } from './packages/db/mongodb.js';

const AUTH_BASE = 'http://127.0.0.1:5000/api/auth';
const LEARNER_BASE = 'http://127.0.0.1:5001/api/v1/learners';

async function runLearnerIntegrationTests() {
  console.log('--- STARTING LEARNER PROFILE END-TO-END INTEGRATION TEST SUITE ---');

  const db = await connectToDatabase();
  const usersCol = db.collection('users');
  const sessionsCol = db.collection('sessions');
  const learnersCol = db.collection('learners');

  // Test accounts
  const parentEmail = `e2e_parent_${Date.now()}@example.com`;
  const parentBEmail = `e2e_parent_b_${Date.now()}@example.com`;
  const teacherEmail = `e2e_teacher_${Date.now()}@example.com`;
  const password = 'Password123';

  let parentCookie = '';
  let parentBCookie = '';
  let teacherCookie = '';
  let createdLearnerId1 = '';
  let createdLearnerId2 = '';

  try {
    // 1. Register Parent A
    console.log('\n[E2E_001] Register and Sign In Parent A...');
    const resSignUpA = await fetch(`${AUTH_BASE}/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'parent',
        fullName: 'E2E Parent Alpha',
        email: parentEmail,
        password,
        acceptedTerms: true,
      }),
    });
    if (resSignUpA.status !== 201) throw new Error(`Parent A signup failed: ${resSignUpA.status}`);

    const resSignInA = await fetch(`${AUTH_BASE}/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: parentEmail, password, rememberMe: false }),
    });
    parentCookie = resSignInA.headers.get('set-cookie')?.split(';')[0] || '';
    if (!parentCookie.includes('mathquest_session=')) throw new Error('Parent A cookie not received');
    console.log('✅ Parent A authenticated with cookie.');

    // 2. Register Parent B
    console.log('\n[E2E_002] Register and Sign In Parent B...');
    await fetch(`${AUTH_BASE}/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'parent',
        fullName: 'E2E Parent Beta',
        email: parentBEmail,
        password,
        acceptedTerms: true,
      }),
    });
    const resSignInB = await fetch(`${AUTH_BASE}/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: parentBEmail, password, rememberMe: false }),
    });
    parentBCookie = resSignInB.headers.get('set-cookie')?.split(';')[0] || '';
    console.log('✅ Parent B authenticated with cookie.');

    // 3. Register Teacher
    console.log('\n[E2E_003] Register and Sign In Teacher...');
    await fetch(`${AUTH_BASE}/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'teacher',
        fullName: 'E2E Teacher Gamma',
        email: teacherEmail,
        password,
        acceptedTerms: true,
      }),
    });
    const resSignInT = await fetch(`${AUTH_BASE}/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: teacherEmail, password, rememberMe: false }),
    });
    teacherCookie = resSignInT.headers.get('set-cookie')?.split(';')[0] || '';
    console.log('✅ Teacher authenticated with cookie.');

    // Test 1: Parent A creates child 1
    console.log('\n[Test 1] Parent creates learner successfully...');
    const resCreate1 = await fetch(LEARNER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        firstName: 'Nimali',
        preferredName: 'Nimi',
        age: 7,
        grade: 2,
        preferredLanguage: 'Sinhala',
        avatarId: 'avatar_rabbit',
      }),
    });
    const data1 = await resCreate1.json();
    if (resCreate1.status === 201 && data1.success && data1.data?.learnerId) {
      createdLearnerId1 = data1.data.learnerId;
      console.log('✅ Test 1 PASSED: Child created successfully with ID:', createdLearnerId1);
    } else {
      throw new Error(`Test 1 FAILED: ${resCreate1.status} ${JSON.stringify(data1)}`);
    }

    // Test 2: Parent A creates multiple learners (child 2)
    console.log('\n[Test 2] Parent can create multiple learners...');
    const resCreate2 = await fetch(LEARNER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        firstName: 'Sandun',
        age: 9,
        grade: 4,
        avatarId: 'avatar_lion',
      }),
    });
    const data2 = await resCreate2.json();
    if (resCreate2.status === 201 && data2.success && data2.data?.learnerId) {
      createdLearnerId2 = data2.data.learnerId;
      console.log('✅ Test 2 PASSED: Second child created with ID:', createdLearnerId2);
    } else {
      throw new Error(`Test 2 FAILED: ${resCreate2.status} ${JSON.stringify(data2)}`);
    }

    // Test 3: Parent retrieves their learner list
    console.log('\n[Test 3] Parent retrieves their learner list...');
    const resList = await fetch(LEARNER_BASE, {
      method: 'GET',
      headers: { cookie: parentCookie },
    });
    const dataList = await resList.json();
    const ids = (dataList.data || []).map((c) => c.learnerId);
    if (resList.status === 200 && ids.includes(createdLearnerId1) && ids.includes(createdLearnerId2)) {
      console.log(`✅ Test 3 PASSED: Parent retrieved ${dataList.total} children correctly.`);
    } else {
      throw new Error(`Test 3 FAILED: ${resList.status} ${JSON.stringify(dataList)}`);
    }

    // Test 4: Parent can edit their learner
    console.log('\n[Test 4] Parent can edit their learner...');
    const resEdit = await fetch(`${LEARNER_BASE}/${createdLearnerId1}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        preferredName: 'Nim-Nim',
        grade: 3,
        age: 8,
      }),
    });
    const dataEdit = await resEdit.json();
    if (
      resEdit.status === 200 &&
      dataEdit.data?.preferredName === 'Nim-Nim' &&
      dataEdit.data?.grade === 3 &&
      dataEdit.data?.age === 8
    ) {
      console.log('✅ Test 4 PASSED: Child details updated successfully.');
    } else {
      throw new Error(`Test 4 FAILED: ${resEdit.status} ${JSON.stringify(dataEdit)}`);
    }

    // Test 5: Invalid age and grade values are rejected
    console.log('\n[Test 5] Invalid age and grade values are rejected...');
    const resInvalidAge = await fetch(LEARNER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        firstName: 'InvalidChild',
        age: 4, // Too young (must be 6-10)
        grade: 1,
      }),
    });
    const resInvalidGrade = await fetch(LEARNER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        firstName: 'InvalidChild',
        age: 7,
        grade: 6, // Too high (must be 1-5)
      }),
    });
    if (resInvalidAge.status === 422 && resInvalidGrade.status === 422) {
      console.log('✅ Test 5 PASSED: Both invalid age (4) and invalid grade (6) rejected with HTTP 422.');
    } else {
      throw new Error(`Test 5 FAILED: age status=${resInvalidAge.status}, grade status=${resInvalidGrade.status}`);
    }

    // Test 6: Unauthenticated requests are rejected
    console.log('\n[Test 6] Unauthenticated requests are rejected...');
    const resNoAuthGet = await fetch(LEARNER_BASE);
    const resNoAuthPost = await fetch(LEARNER_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'NoAuth', age: 7, grade: 2 }),
    });
    if (resNoAuthGet.status === 401 && resNoAuthPost.status === 401) {
      console.log('✅ Test 6 PASSED: Unauthenticated requests correctly rejected with HTTP 401.');
    } else {
      throw new Error(`Test 6 FAILED: GET=${resNoAuthGet.status}, POST=${resNoAuthPost.status}`);
    }

    // Test 7: Parent B cannot access or edit Parent A's learner
    console.log('\n[Test 7] A parent cannot access another parent\'s learner...');
    const resCrossGet = await fetch(`${LEARNER_BASE}/${createdLearnerId1}`, {
      headers: { cookie: parentBCookie },
    });
    const resCrossPatch = await fetch(`${LEARNER_BASE}/${createdLearnerId1}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentBCookie,
      },
      body: JSON.stringify({ firstName: 'StolenChild' }),
    });
    if (resCrossGet.status === 403 && resCrossPatch.status === 403) {
      console.log('✅ Test 7 PASSED: Cross-parent GET and PATCH rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`Test 7 FAILED: GET=${resCrossGet.status}, PATCH=${resCrossPatch.status}`);
    }

    // Test 8: Teacher cannot use parent-only learner creation endpoints
    console.log('\n[Test 8] A teacher cannot use parent-only learner creation endpoints...');
    const resTeacherPost = await fetch(LEARNER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: teacherCookie,
      },
      body: JSON.stringify({ firstName: 'StudentX', age: 8, grade: 3 }),
    });
    if (resTeacherPost.status === 403) {
      console.log('✅ Test 8 PASSED: Teacher rejected from parent-only endpoint with HTTP 403 Forbidden.');
    } else {
      throw new Error(`Test 8 FAILED: status=${resTeacherPost.status}`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL 8 CROSS-SERVICE INTEGRATION TESTS PASSED 100%! 🎉');
    console.log('======================================================\n');
  } finally {
    // Clean up temporary test data
    console.log('Cleaning up temporary E2E test data from MongoDB Atlas...');
    await usersCol.deleteMany({ email: { $in: [parentEmail, parentBEmail, teacherEmail] } });
    if (createdLearnerId1 || createdLearnerId2) {
      await learnersCol.deleteMany({ learnerId: { $in: [createdLearnerId1, createdLearnerId2] } });
    }
    await closeDatabaseConnection();
    console.log('Clean up complete.');
  }
}

runLearnerIntegrationTests().catch((err) => {
  console.error('E2E integration test failed:', err);
  process.exit(1);
});
