import { connectToDatabase } from './packages/db/mongodb.js';

const API_BASE = 'http://localhost:5000/api/auth';

async function runTests() {
    console.log('--- STARTING TC TEST SUITE ---');
    const db = await connectToDatabase();
    const usersCol = db.collection('users');
    const sessionsCol = db.collection('sessions');

    // Clean up any test users from prior runs
    await usersCol.deleteMany({ email: { $in: ['tc_parent@example.com', 'tc_teacher@example.com'] } });
    await sessionsCol.deleteMany({});

    // TC_001: Register a Parent account
    console.log('\n[TC_001] Register a Parent account...');
    const resParent = await fetch(`${API_BASE}/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role: 'parent',
            fullName: 'Kamal Bandara',
            email: 'tc_parent@example.com',
            password: 'ParentPassword123',
            acceptedTerms: true,
        }),
    });
    const dataParent = await resParent.json();
    const docParent = await usersCol.findOne({ email: 'tc_parent@example.com' });
    if (resParent.status === 201 && docParent && docParent.role === 'parent' && docParent.fullName === 'Kamal Bandara') {
        console.log('✅ TC_001 PASSED: Parent account saved in MongoDB with ID:', docParent._id.toString());
    } else {
        console.error('❌ TC_001 FAILED:', resParent.status, dataParent);
    }

    // TC_002: Register a Teacher account
    console.log('\n[TC_002] Register a Teacher account...');
    const resTeacher = await fetch(`${API_BASE}/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role: 'teacher',
            fullName: 'Anula Jayawardena',
            email: 'tc_teacher@example.com',
            password: 'TeacherPassword123',
            acceptedTerms: true,
        }),
    });
    const dataTeacher = await resTeacher.json();
    const docTeacher = await usersCol.findOne({ email: 'tc_teacher@example.com' });
    if (resTeacher.status === 201 && docTeacher && docTeacher.role === 'teacher' && docTeacher.fullName === 'Anula Jayawardena') {
        console.log('✅ TC_002 PASSED: Teacher account saved in MongoDB with ID:', docTeacher._id.toString());
    } else {
        console.error('❌ TC_002 FAILED:', resTeacher.status, dataTeacher);
    }

    // TC_003: Register with an existing email
    console.log('\n[TC_003] Register with an existing email...');
    const resDup = await fetch(`${API_BASE}/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role: 'parent',
            fullName: 'Duplicate Kamal',
            email: 'tc_parent@example.com',
            password: 'ParentPassword123',
            acceptedTerms: true,
        }),
    });
    const dataDup = await resDup.json();
    if (resDup.status === 409 && dataDup.success === false) {
        console.log('✅ TC_003 PASSED: Duplicate registration rejected with HTTP 409:', dataDup.message);
    } else {
        console.error('❌ TC_003 FAILED:', resDup.status, dataDup);
    }

    // TC_004: Register with invalid email
    console.log('\n[TC_004] Register with invalid email...');
    const resInvEmail = await fetch(`${API_BASE}/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role: 'parent',
            fullName: 'Invalid Email User',
            email: 'not-an-email',
            password: 'ValidPassword123',
            acceptedTerms: true,
        }),
    });
    const dataInvEmail = await resInvEmail.json();
    if (resInvEmail.status === 400 && dataInvEmail.success === false) {
        console.log('✅ TC_004 PASSED: Validation error displayed for invalid email:', dataInvEmail.message);
    } else {
        console.error('❌ TC_004 FAILED:', resInvEmail.status, dataInvEmail);
    }

    // TC_005: Register with invalid password
    console.log('\n[TC_005] Register with invalid password...');
    const resInvPass = await fetch(`${API_BASE}/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role: 'parent',
            fullName: 'Weak Password User',
            email: 'weakpass@example.com',
            password: 'weak',
            acceptedTerms: true,
        }),
    });
    const dataInvPass = await resInvPass.json();
    if (resInvPass.status === 400 && dataInvPass.success === false) {
        console.log('✅ TC_005 PASSED: Validation error displayed for weak password:', dataInvPass.message);
    } else {
        console.error('❌ TC_005 FAILED:', resInvPass.status, dataInvPass);
    }

    // TC_006: Register without accepting terms
    console.log('\n[TC_006] Register without accepting terms...');
    const resNoTerms = await fetch(`${API_BASE}/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role: 'parent',
            fullName: 'No Terms User',
            email: 'noterms@example.com',
            password: 'ValidPassword123',
            acceptedTerms: false,
        }),
    });
    const dataNoTerms = await resNoTerms.json();
    if (resNoTerms.status === 400 && dataNoTerms.success === false) {
        console.log('✅ TC_006 PASSED: Registration blocked without terms:', dataNoTerms.message);
    } else {
        console.error('❌ TC_006 FAILED:', resNoTerms.status, dataNoTerms);
    }

    // TC_007: Sign in with valid credentials
    console.log('\n[TC_007] Sign in with valid credentials...');
    const resSignIn = await fetch(`${API_BASE}/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'tc_parent@example.com',
            password: 'ParentPassword123',
            rememberMe: true,
        }),
    });
    const cookieHeader = resSignIn.headers.get('set-cookie');
    const dataSignIn = await resSignIn.json();
    if (resSignIn.status === 200 && dataSignIn.success && cookieHeader?.includes('mathquest_session=')) {
        console.log('✅ TC_007 PASSED: User authenticated, session cookie set.');
    } else {
        console.error('❌ TC_007 FAILED:', resSignIn.status, dataSignIn);
    }

    // TC_008: Sign in with incorrect password
    console.log('\n[TC_008] Sign in with incorrect password...');
    const resWrongPass = await fetch(`${API_BASE}/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'tc_parent@example.com',
            password: 'WrongPassword999',
            rememberMe: false,
        }),
    });
    const dataWrongPass = await resWrongPass.json();
    if (resWrongPass.status === 401 && dataWrongPass.success === false) {
        console.log('✅ TC_008 PASSED: Authentication rejected on incorrect password:', dataWrongPass.message);
    } else {
        console.error('❌ TC_008 FAILED:', resWrongPass.status, dataWrongPass);
    }

    // TC_009: Sign in with unregistered email
    console.log('\n[TC_009] Sign in with unregistered email...');
    const resUnreg = await fetch(`${API_BASE}/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'unknown_ghost@example.com',
            password: 'Password123',
            rememberMe: false,
        }),
    });
    const dataUnreg = await resUnreg.json();
    if (resUnreg.status === 401 && dataUnreg.success === false) {
        console.log('✅ TC_009 PASSED: Authentication rejected on unregistered email:', dataUnreg.message);
    } else {
        console.error('❌ TC_009 FAILED:', resUnreg.status, dataUnreg);
    }

    // TC_010: Refresh after successful Sign In (verify session with cookie)
    console.log('\n[TC_010] Refresh after successful Sign In...');
    const resSession = await fetch(`${API_BASE}/session`, {
        headers: { cookie: cookieHeader },
    });
    const dataSession = await resSession.json();
    if (resSession.status === 200 && dataSession.success && dataSession.data?.user?.email === 'tc_parent@example.com') {
        console.log('✅ TC_010 PASSED: Valid session restored from cookie for user:', dataSession.data.user.fullName);
    } else {
        console.error('❌ TC_010 FAILED:', resSession.status, dataSession);
    }

    // TC_011: Sign out (invalidate session)
    console.log('\n[TC_011] Sign out...');
    const resSignOut = await fetch(`${API_BASE}/sign-out`, {
        method: 'POST',
        headers: { cookie: cookieHeader },
    });
    const dataSignOut = await resSignOut.json();
    const resCheckAfterOut = await fetch(`${API_BASE}/session`, {
        headers: { cookie: cookieHeader },
    });
    if (resSignOut.status === 200 && resCheckAfterOut.status === 401) {
        console.log('✅ TC_011 PASSED: Session cleanly invalidated in MongoDB; subsequent check returns 401.');
    } else {
        console.error('❌ TC_011 FAILED:', resSignOut.status, dataSignOut, 'check:', resCheckAfterOut.status);
    }

    // TC_014: Inspect saved user document (verify password hashing, no plaintext)
    console.log('\n[TC_014] Inspect saved user document...');
    const savedDoc = await usersCol.findOne({ email: 'tc_parent@example.com' });
    const isHashed = savedDoc?.passwordHash && savedDoc.passwordHash.startsWith('$2');
    const hasPlaintext = 'password' in savedDoc || 'confirmPassword' in savedDoc;
    if (isHashed && !hasPlaintext) {
        console.log('✅ TC_014 PASSED: Password stored as bcrypt hash; plaintext and confirmPassword are NOT stored.');
    } else {
        console.error('❌ TC_014 FAILED: isHashed:', isHashed, 'hasPlaintext:', hasPlaintext);
    }

    console.log('\n--- ALL AUTOMATED BACKEND TEST CASES COMPLETE ---');
    process.exit(0);
}

runTests().catch(e => {
    console.error('Error running test suite:', e);
    process.exit(1);
});
