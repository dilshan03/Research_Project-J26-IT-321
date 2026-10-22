/**
 * Research & Model Analytics route access and routing helpers (usability layer; the server enforces access).
 * Run: node --experimental-strip-types --test tests/admin-research/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accessFromResponse,
  parseTab,
  researchPath,
  shouldCheckResearchAccess,
} from '../../src/features/admin/research/access.ts';
import { RESEARCH_COMPONENTS, findResearchComponent } from '../../src/features/admin/research/registry.ts';

test('only admins trigger a server access check', () => {
  assert.equal(shouldCheckResearchAccess('admin'), true);
  for (const role of ['parent', 'teacher', 'student', undefined]) assert.equal(shouldCheckResearchAccess(role), false);
});

test('access is granted only for HTTP 200 with granted === true', () => {
  assert.equal(accessFromResponse({ ok: true, status: 200, data: { granted: true } }), 'granted');
  assert.equal(accessFromResponse({ ok: true, status: 200, data: { granted: 'true' } }), 'denied');
  assert.equal(accessFromResponse({ ok: true, status: 200, data: {} }), 'denied');
  assert.equal(accessFromResponse({ ok: false, status: 403 }), 'denied');
  assert.equal(accessFromResponse({ ok: false, status: 401 }), 'denied');
});

test('service failures are reported as unavailable, never as granted', () => {
  assert.equal(accessFromResponse({ ok: false }), 'unavailable');
  assert.equal(accessFromResponse({ ok: false, status: 500 }), 'unavailable');
});

test('tab segments are validated and default to the overview', () => {
  assert.equal(parseTab(undefined), 'overview');
  assert.equal(parseTab('evaluation'), 'evaluation');
  assert.equal(parseTab('explainability'), 'explainability');
  assert.equal(parseTab('predict'), 'overview');
  assert.equal(parseTab('../admin'), 'overview');
});

test('research paths match the /admin/research/:componentId/:tab? routes', () => {
  assert.equal(researchPath(), '/admin/research');
  assert.equal(researchPath('learner-profile'), '/admin/research/learner-profile');
  assert.equal(researchPath('learner-profile', 'overview'), '/admin/research/learner-profile');
  assert.equal(researchPath('learner-profile', 'models'), '/admin/research/learner-profile/models');
});

test('all four research components are registered; only the learner profile has a dedicated page', () => {
  assert.deepEqual(RESEARCH_COMPONENTS.map((c) => c.id), ['learner-profile', 'behaviour-signal', 'content-adaptation', 'pedagogical-engine']);
  assert.equal(findResearchComponent('learner-profile')?.page, 'learner-profile');
  for (const id of ['behaviour-signal', 'content-adaptation', 'pedagogical-engine']) assert.equal(findResearchComponent(id)?.page, 'generic');
  assert.equal(findResearchComponent('unknown'), undefined);
});
