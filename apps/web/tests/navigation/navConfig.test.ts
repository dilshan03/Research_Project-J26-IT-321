/**
 * Role-based navigation (public navbar, mobile menu and profile dropdown).
 * Run: node --experimental-strip-types --test tests/navigation/navConfig.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PARENT_NAV,
  PUBLIC_NAV,
  TEACHER_NAV,
  isNavItemActive,
  navItemsFor,
} from '../../src/shared/components/navConfig.ts';

const labels = (items: { label: string }[]) => items.map((i) => i.label);

test('each role gets exactly the requested links', () => {
  assert.deepEqual(labels(navItemsFor(undefined, false)), ['Home', 'Features', 'How It Works', 'About', 'Contact']);
  assert.deepEqual(labels(navItemsFor('parent', true)), ['Dashboard', 'My Children', 'Progress', 'Recommendations', 'Profile']);
  assert.deepEqual(labels(navItemsFor('teacher', true)), ['Dashboard', 'My Students', 'Learner Profiles', 'Progress', 'Profile']);
});

test('admins and signed-out sessions keep the public links; there is no student role', () => {
  assert.equal(navItemsFor('admin', true), PUBLIC_NAV);
  assert.equal(navItemsFor('parent', false), PUBLIC_NAV);   // stale role without a session
});

test('links point at existing routes', () => {
  const existing = new Set([
    '/', '/learners', '/parent/dashboard', '/parent/dashboard/progress', '/parent/dashboard/recommendations',
    '/parent/dashboard/settings', '/teacher/dashboard', '/teacher/dashboard/learners', '/teacher/dashboard/learner-profiles',
    '/teacher/dashboard/progress', '/teacher/dashboard/settings',
  ]);
  for (const item of [...PARENT_NAV, ...TEACHER_NAV, ...PUBLIC_NAV]) {
    assert.ok(existing.has(item.to.split('#')[0] || '/'), item.to);
  }
});

test('active link highlighting', () => {
  const [home, features] = PUBLIC_NAV;
  assert.equal(isNavItemActive(home, '/', ''), true);
  assert.equal(isNavItemActive(home, '/', '#features'), false);
  assert.equal(isNavItemActive(features, '/', '#features'), true);
  assert.equal(isNavItemActive(features, '/learners', '#features'), false);

  const [dashboard, children, , , profile] = PARENT_NAV;
  assert.equal(isNavItemActive(dashboard, '/parent/dashboard', ''), true);
  assert.equal(isNavItemActive(dashboard, '/parent/dashboard/progress', ''), false);   // exact only
  assert.equal(isNavItemActive(children, '/learners/lrn_1/onboarding', ''), true);
  assert.equal(isNavItemActive(children, '/parent/dashboard/children', ''), true);
  assert.equal(isNavItemActive(profile, '/profile', ''), true);
  assert.equal(isNavItemActive(TEACHER_NAV[1], '/teacher/dashboard/learner-profiles', ''), false);
});
