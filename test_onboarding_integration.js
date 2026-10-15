import { connectToDatabase, closeDatabaseConnection } from './packages/db/mongodb.js';

const AUTH_BASE = 'http://127.0.0.1:5000/api/auth';
const LEARNER_BASE = 'http://127.0.0.1:5001/api/v1/learners';

async function runOnboardingE2ETests() {
  console.log('--- STARTING LEARNER ONBOARDING E2E INTEGRATION TEST SUITE ---');

  const db = await connectToDatabase();
  const usersCol = db.collection('users');
  const sessionsCol = db.collection('sessions');
  const learnersCol = db.collection('learners');
  const onboardingCol = db.collection('learner_onboarding');
  const questionnairesCol = db.collection('learner_questionnaires');
  const assessmentsCol = db.collection('learner_assessments');

  const parentEmail = `e2e_ob_parent_${Date.now()}@example.com`;
  const parentBEmail = `e2e_ob_parent_b_${Date.now()}@example.com`;
  const teacherEmail = `e2e_ob_teacher_${Date.now()}@example.com`;
  const password = 'Password123';

  let parentCookie = '';
  let parentBCookie = '';
  let teacherCookie = '';
  let learnerId = '';

  try {
    // 1. Register Parent A
    console.log('\n[1] Register Parent A...');
    const resA = await fetch(`${AUTH_BASE}/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'parent',
        fullName: 'E2E Onboarding Parent',
        email: parentEmail,
        password,
        acceptedTerms: true,
      }),
    });
    if (resA.status !== 201) throw new Error(`Parent A signup failed: ${resA.status}`);
    const resSignInA = await fetch(`${AUTH_BASE}/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: parentEmail, password, rememberMe: false }),
    });
    parentCookie = resSignInA.headers.get('set-cookie')?.split(';')[0] || '';

    // 2. Register Parent B (for cross-parent security test)
    console.log('[2] Register Parent B...');
    const resB = await fetch(`${AUTH_BASE}/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'parent',
        fullName: 'E2E Cross Parent',
        email: parentBEmail,
        password,
        acceptedTerms: true,
      }),
    });
    if (resB.status !== 201) throw new Error(`Parent B signup failed: ${resB.status}`);
    const resSignInB = await fetch(`${AUTH_BASE}/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: parentBEmail, password, rememberMe: false }),
    });
    parentBCookie = resSignInB.headers.get('set-cookie')?.split(';')[0] || '';

    // 3. Register Teacher (for role-guard security test)
    console.log('[3] Register Teacher...');
    const resT = await fetch(`${AUTH_BASE}/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'teacher',
        fullName: 'E2E Teacher',
        email: teacherEmail,
        password,
        acceptedTerms: true,
      }),
    });
    if (resT.status !== 201) throw new Error(`Teacher signup failed: ${resT.status}`);
    const resSignInT = await fetch(`${AUTH_BASE}/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: teacherEmail, password, rememberMe: false }),
    });
    teacherCookie = resSignInT.headers.get('set-cookie')?.split(';')[0] || '';

    // 4. Create Child Learner under Parent A (Grade 2)
    console.log('\n[4] Create Child Learner (Grade 2)...');
    const resChild = await fetch(LEARNER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        firstName: 'Dulari',
        preferredName: 'Dula',
        age: 7,
        grade: 2,
        preferredLanguage: 'Sinhala',
        avatarId: 'avatar_rabbit',
      }),
    });
    const childData = await resChild.json();
    if (resChild.status !== 201 || !childData.data?.learnerId) {
      throw new Error(`Child creation failed: ${JSON.stringify(childData)}`);
    }
    learnerId = childData.data.learnerId;
    console.log(`✅ Child created: ${learnerId} (onboardingStatus: ${childData.data.onboardingStatus})`);

    // 5. Test GET onboarding progress (Initial)
    console.log('\n[5] Fetch initial onboarding progress...');
    const resProg = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding`, {
      headers: { cookie: parentCookie },
    });
    const progData = await resProg.json();
    if (resProg.status !== 200 || progData.data.currentStep !== 'preferences') {
      throw new Error(`Progress retrieval failed: ${JSON.stringify(progData)}`);
    }
    console.log('✅ Initial progress retrieved: currentStep = preferences');

    // 6. Security Check: Parent B cannot access Parent A child onboarding
    console.log('\n[6] Security: Verify Parent B is rejected with 403 Forbidden...');
    const resCross = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding`, {
      headers: { cookie: parentBCookie },
    });
    if (resCross.status !== 403) {
      throw new Error(`Expected 403 for Parent B, got ${resCross.status}`);
    }
    console.log('✅ Cross-parent access strictly rejected with HTTP 403.');

    // 7. Security Check: Teacher cannot access parent-only onboarding
    console.log('\n[7] Security: Verify Teacher is rejected with 403 Forbidden...');
    const resTeacher = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding`, {
      headers: { cookie: teacherCookie },
    });
    if (resTeacher.status !== 403) {
      throw new Error(`Expected 403 for Teacher, got ${resTeacher.status}`);
    }
    console.log('✅ Teacher access rejected with HTTP 403.');

    // 8. Step 1: Save Learning Preferences
    console.log('\n[8] Step 1: Save Learning Preferences...');
    const resPref = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        version: 'LEARNING-PREF-v1.0',
        visualAssistance: 'always',
        audioAssistance: 'read_everything',
        activityPace: 'calm_step_by_step',
        hintStyle: 'visual_clue',
        celebrationStyle: 'gentle_star',
      }),
    });
    const prefJson = await resPref.json();
    if (resPref.status !== 200 || prefJson.data.nextStep !== 'snap_iv') {
      throw new Error(`Preferences save failed: ${JSON.stringify(prefJson)}`);
    }
    console.log('✅ Learning preferences saved successfully.');

    // 9. Step 2: Submit SNAP-IV (18 items)
    console.log('\n[9] Step 2: Submit 18-item SNAP-IV...');
    // Items 1-9: Inattention (score = 2) => total 18, avg 2.0
    // Items 10-18: Hyperactivity (score = 1) => total 9, avg 1.0
    const snapResponses = [];
    for (let i = 1; i <= 18; i++) {
      snapResponses.push({ itemId: i, score: i <= 9 ? 2 : 1 });
    }
    const resSnap = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding/snap-iv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        version: 'SNAP-IV-18-v1.0',
        responses: snapResponses,
        respondentRelation: 'parent',
      }),
    });
    const snapJson = await resSnap.json();
    if (resSnap.status !== 200) {
      throw new Error(`SNAP-IV submission failed: ${JSON.stringify(snapJson)}`);
    }
    const snapData = snapJson.data;
    if (
      snapData.inattentionTotal !== 18 ||
      snapData.inattentionAverage !== 2.0 ||
      snapData.hyperactivityTotal !== 9 ||
      snapData.hyperactivityAverage !== 1.0 ||
      snapData.totalScore !== 27
    ) {
      throw new Error(`SNAP-IV scoring calculation error: ${JSON.stringify(snapData)}`);
    }
    console.log(`✅ SNAP-IV scored correctly: Inattention=${snapData.inattentionTotal}/27, Hyperactivity=${snapData.hyperactivityTotal}/27, Total=${snapData.totalScore}/54`);

    // 10. Step 3: Save Social Context
    console.log('\n[10] Step 3: Save Social Context...');
    const resSoc = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding/social-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        version: 'SOCIAL-CONTEXT-v1.0',
        learningEnvironment: 'quiet_room',
        peerCollaboration: 'independent_first',
        parentInvolvement: 'guided_together',
        challengingTaskSupport: 'take_a_break',
      }),
    });
    if (resSoc.status !== 200) throw new Error(`Social context failed: ${resSoc.status}`);
    console.log('✅ Social learning context saved.');

    // 11. Step 4: Fetch Grade-Specific Math Questions
    console.log('\n[11] Step 4: Fetch Grade 2 Math Questions...');
    const resQ = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding/math-questions`, {
      headers: { cookie: parentCookie },
    });
    const qJson = await resQ.json();
    const questions = qJson.data;
    if (resQ.status !== 200 || !Array.isArray(questions) || questions.length < 3) {
      throw new Error(`Question bank fetch failed: ${JSON.stringify(qJson)}`);
    }
    // Verify no answer leak
    for (const q of questions) {
      if (q.correctAnswer !== undefined || q.explanationEn !== undefined) {
        throw new Error(`SECURITY LEAK: Question bank exposed answer to client!`);
      }
    }
    console.log(`✅ Retrieved ${questions.length} Grade 2 questions without answer leakage.`);

    // 12. Step 5: Submit Math Assessment
    console.log('\n[12] Step 5: Submit Math Assessment answers...');
    const answers = [
      { questionId: 'g2_add_2digit_01', userAnswer: 'opt_37', attempts: 1, responseTimesSeconds: 7.0 },
      { questionId: 'g2_mult_groups_02', userAnswer: 'opt_12', attempts: 1, responseTimesSeconds: 10.0 },
      { questionId: 'g2_num_compare_03', userAnswer: 'opt_82', attempts: 1, responseTimesSeconds: 4.5 },
      { questionId: 'g2_word_sub_04', userAnswer: 15, attempts: 1, responseTimesSeconds: 11.0 },
    ];
    const resMath = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding/math-assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: parentCookie,
      },
      body: JSON.stringify({
        version: 'MATH-QB-v1.0',
        grade: 2,
        answers,
      }),
    });
    const mathJson = await resMath.json();
    if (resMath.status !== 200) throw new Error(`Math submission failed: ${JSON.stringify(mathJson)}`);
    const mathSummary = mathJson.data;
    if (mathSummary.accuracyPercentage !== 100 || mathSummary.evidenceLevel !== 'SUFFICIENT') {
      throw new Error(`Math scoring unexpected: ${JSON.stringify(mathSummary)}`);
    }
    console.log(`✅ Math assessment evaluated: ${mathSummary.correctAnswers}/${mathSummary.totalQuestions} (${mathSummary.accuracyPercentage}%), Evidence: ${mathSummary.evidenceLevel}`);

    // 13. Step 6: Verify Final Summary & MongoDB Completion
    console.log('\n[13] Verify Consolidated Summary & Profile Status...');
    const resSummary = await fetch(`${LEARNER_BASE}/${learnerId}/onboarding/summary`, {
      headers: { cookie: parentCookie },
    });
    const sumJson = await resSummary.json();
    const finalSummary = sumJson.data;
    if (
      finalSummary.learner.onboardingStatus !== 'COMPLETED' ||
      finalSummary.progress.status !== 'COMPLETED'
    ) {
      throw new Error(`Profile not marked completed: ${JSON.stringify(finalSummary)}`);
    }
    console.log(`✅ Child onboardingStatus updated to: ${finalSummary.learner.onboardingStatus}`);

    console.log('\n=============================================================');
    console.log('🎉 ALL 13 ONBOARDING E2E INTEGRATION TESTS PASSED 100%! 🎉');
    console.log('=============================================================\n');
  } finally {
    // Clean up temporary test data
    console.log('Cleaning up temporary onboarding E2E test data from MongoDB Atlas...');
    await usersCol.deleteMany({ email: { $in: [parentEmail, parentBEmail, teacherEmail] } });
    if (learnerId) {
      await learnersCol.deleteMany({ learnerId });
      await onboardingCol.deleteMany({ learnerId });
      await questionnairesCol.deleteMany({ learnerId });
      await assessmentsCol.deleteMany({ learnerId });
    }
    await closeDatabaseConnection();
    console.log('Clean up complete.');
  }
}

runOnboardingE2ETests().catch((err) => {
  console.error('Onboarding E2E test failed:', err);
  process.exit(1);
});
