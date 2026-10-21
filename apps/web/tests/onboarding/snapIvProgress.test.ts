/**
 * Parent SNAP-IV history display helpers (SNAPIV-PROGRESS).
 * Run: node --experimental-strip-types --test tests/onboarding/snapIvProgress.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  directionArrow,
  formatAverage,
  nearestScaleStep,
  snapIvChartPoints,
  snapIvDate,
} from '../../src/features/learner-profile/utils/snapIvProgress.ts';

// Shape returned by GET /support-information: newest first
const history = [
  { completedAt: '2026-10-01T08:00:00+00:00', inattention: { total: 9, average: 1.0 }, hyperactivity: { total: 10, average: 1.11 } },
  { completedAt: '2026-07-01T08:00:00+00:00', inattention: { total: 18, average: 2.0 }, hyperactivity: { total: 9, average: 1.0 } },
  { completedAt: '2025-01-05T08:00:00+00:00', inattention: null, hyperactivity: null }, // legacy record without answers
];

test('chart points run oldest to newest and keep missing scores as gaps, not zeros', () => {
  const points = snapIvChartPoints(history);
  assert.deepEqual(points.map((p) => p.completedAt?.slice(0, 10)), ['2025-01-05', '2026-07-01', '2026-10-01']);
  assert.deepEqual(points.map((p) => p.inattention), [null, 2.0, 1.0]);
  assert.deepEqual(points.map((p) => p.hyperactivity), [null, 1.0, 1.11]);
  assert.deepEqual(history[0].inattention, { total: 9, average: 1.0 }); // input not mutated
  assert.deepEqual(snapIvChartPoints(undefined), []);
});

test('averages and dates are formatted for parents', () => {
  assert.equal(formatAverage(1.56), '1.6');
  assert.equal(formatAverage(2), '2.0');
  assert.equal(formatAverage(null), '—');
  assert.equal(snapIvDate('2026-07-01T08:00:00+00:00'), '2026-07-01');
  assert.equal(snapIvDate(null), '—');
  assert.equal(snapIvDate('not a date'), '—');
});

test('directions get neutral arrows only (no better/worse meaning)', () => {
  assert.equal(directionArrow('LOWER'), '↓');
  assert.equal(directionArrow('HIGHER'), '↑');
  assert.equal(directionArrow('SIMILAR'), '≈');
  assert.equal(directionArrow('NOT_COMPARABLE'), '–');
});

test('nearest answer step stays on the 0–3 SNAP-IV scale', () => {
  assert.equal(nearestScaleStep(1.44), 1);
  assert.equal(nearestScaleStep(1.56), 2);
  assert.equal(nearestScaleStep(-1), 0);
  assert.equal(nearestScaleStep(9), 3);
});
