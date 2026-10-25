import { expect, test, type Page } from '@playwright/test';

/**
 * Three basic E2E tests on synthetic data: parent login, child onboarding, learner profile display.
 * They run in order and share one synthetic parent and child created for this run.
 */
const PROFILE_API = 'http://localhost:5101/api/v1';
const PASSWORD = 'Pp1Demo2026';
const RUN = Date.now();
const parentEmail = `pw.parent.${RUN}@example.test`;
const childName = `PW Child ${RUN % 100000}`;
let learnerId = '';

test.describe.configure({ mode: 'serial' });

/** Only the isolated stack is reachable from the browser (fonts excepted). */
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const { host, hostname } = new URL(route.request().url());
    const allowed = ['localhost:5174', '127.0.0.1:5174', 'localhost:5101', '127.0.0.1:5101'].includes(host)
      || hostname.endsWith('fonts.googleapis.com') || hostname.endsWith('fonts.gstatic.com');
    return allowed ? route.continue() : route.abort();
  });
});

async function signInViaApi(page: Page) {
  const res = await page.request.post('/api/auth/sign-in', { data: { email: parentEmail, password: PASSWORD } });
  expect(res.status()).toBe(200);
}

test('1. parent can sign in through the login page', async ({ page, context }) => {
  const signUp = await page.request.post('/api/auth/sign-up', {
    data: { role: 'parent', fullName: 'PW Parent', email: parentEmail, password: PASSWORD, acceptedTerms: true },
  });
  expect([200, 201]).toContain(signUp.status());
  await context.clearCookies();

  await page.goto('/sign-in');
  await page.fill('#signInEmail', parentEmail);
  await page.fill('#signInPassword', PASSWORD);
  await page.getByRole('button', { name: /^(Sign In|පිවිසෙන්න)$/ }).click();

  await expect.poll(async () => (await context.cookies()).some((c) => c.name === 'mathquest_session')).toBe(true);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('2. Grade 2 child completes onboarding', async ({ page }) => {
  await signInViaApi(page);

  // Parent part through the real API (the UI for these steps is not what this test targets)
  const created = await page.request.post(`${PROFILE_API}/learners`, {
    data: { firstName: childName, age: 7, grade: 2, preferredLanguage: 'Sinhala', avatarId: 'avatar_lion' },
  });
  expect(created.status()).toBe(201);
  learnerId = (await created.json()).data.learnerId;
  const steps: [string, object | undefined][] = [
    ['adhd-information', { diagnosisStatus: 'no' }],
    ['snap-iv/skip', undefined],
    ['preferences', { version: 'LEARNING-PREF-v1.0', visualAssistance: 'always', audioAssistance: 'read_on_click',
      activityPace: 'calm_step_by_step', hintStyle: 'visual_clue', celebrationStyle: 'gentle_star' }],
    ['social-context', { version: 'SOCIAL-CONTEXT-v1.0', learningEnvironment: 'quiet_room',
      peerCollaboration: 'independent_first', parentInvolvement: 'guided_together', challengingTaskSupport: 'take_a_break' }],
  ];
  for (const [path, data] of steps) {
    const r = await page.request.post(`${PROFILE_API}/learners/${learnerId}/onboarding/${path}`, data ? { data } : {});
    expect(r.status(), path).toBe(200);
  }

  // Child journey through the UI (Grade 2 onboarding-v2, Sinhala)
  await page.goto(`/learners/${learnerId}/onboarding`);
  await page.getByRole('button', { name: 'ක්‍රියාකාරකම අරඹමු' }).click();
  await page.getByRole('radio', { name: /බකමූණා/ }).click();
  await page.getByRole('radio', { name: /සත්ව යාළුවෝ/ }).click();
  await page.getByRole('radio', { name: /නිහඬව/ }).click();
  await page.getByRole('button', { name: /පටන් ගමු/ }).click();
  await page.getByRole('button', { name: 'රතු ඇපල්' }).click();
  await page.getByRole('button', { name: 'අලියා' }).click();
  await page.getByRole('button', { name: /ඊළඟට/ }).click();

  const ten = page.getByRole('button', { name: 'දහයේ කූර', exact: true });
  const one = page.getByRole('button', { name: 'එකේ කැටය', exact: true });
  const tray = page.getByRole('button', { name: 'තැටිය', exact: true });
  const done = () => page.getByRole('button', { name: /ඉවරයි/ }).click();
  for (let i = 0; i < 4; i++) { await ten.click(); await tray.click(); }
  await page.getByRole('button', { name: /දහයේ කූර අයින්/ }).first().click();     // self-correction: take one ten back
  for (let i = 0; i < 4; i++) { await one.click(); await tray.click(); }
  await done();                                                                  // builds 34
  await page.getByRole('radio', { name: '74' }).click();
  await page.getByRole('radio', { name: '47' }).click(); await done();           // answer changed before confirming
  await page.getByRole('radio', { name: 'කූරු 5, කැට 2' }).click(); await done();
  await page.getByRole('button', { name: 'නැවත බලන්න', exact: true }).click();   // instruction replay
  await page.getByRole('radio', { name: '35' }).click(); await done();
  await page.getByRole('radio', { name: '46' }).click(); await done();           // addition pre-probe wrong
  await page.getByRole('radio', { name: '56' }).click(); await done();           // guided support: wrong -> next level
  await page.getByRole('radio', { name: '57' }).click(); await done();
  await page.getByRole('radio', { name: '67' }).click(); await done();           // new transfer item
  await page.getByRole('button', { name: /අවසන් කරන්න/ }).click();

  await expect(page.getByText('ස්ථානීය අගය').first()).toBeVisible({ timeout: 15_000 });
  const learner = await (await page.request.get(`${PROFILE_API}/learners/${learnerId}`)).json();
  expect(learner.data.onboardingStatus).toBe('COMPLETED');
});

test('3. learner profile is displayed to the parent', async ({ page }) => {
  test.skip(!learnerId, 'needs the child onboarded in test 2');
  await signInViaApi(page);
  await page.goto('/parent/dashboard/learner-profiles');

  await expect(page.getByText(childName).first()).toBeVisible();
  await expect(page.getByText('ආරම්භක ඇගයීම සම්පූර්ණයි').first()).toBeVisible();   // "initial assessment complete"
  await expect(page.getByText('ගණිත කුසලතා').first()).toBeVisible({ timeout: 15_000 }); // "maths skills"

  const profile = await (await page.request.get(`${PROFILE_API}/learners/${learnerId}/profile`)).json();
  const skills = Object.fromEntries(profile.skillEstimates.map((s: { skillId: string }) => [s.skillId, s]));
  expect(skills.place_value?.isEvidenceSufficient).toBe(true);
  expect(profile.structuredRecommendations?.length ?? 0).toBeGreaterThan(0);
});
