/**
 * Legacy (Grades 2–5) onboarding answer building: no invented times, no unseen questions.
 * Run: node --experimental-strip-types --test tests/onboarding/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegacyItemTracker, buildLegacyAnswers } from '../../src/features/learner-profile/components/onboarding/legacyAnswers.ts';

const fakeClock = () => {
  let t = 0;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
};

test('unseen questions are never submitted', () => {
  const tracker = new LegacyItemTracker(() => 0);
  tracker.show('q1');
  const out = buildLegacyAnswers(['q1', 'q2', 'q3'], tracker, () => ({ userAnswer: 'opt_1' }));
  assert.deepEqual(out.map((a) => a.questionId), ['q1']);
});

test('presented but unanswered questions are sent as skipped with no time or answer', () => {
  const clock = fakeClock();
  const tracker = new LegacyItemTracker(clock.now);
  tracker.show('q1');
  clock.advance(8000);
  tracker.leave();
  const [a] = buildLegacyAnswers(['q1'], tracker, () => ({ hintUsed: true }));
  assert.equal(a.responseStatus, 'skipped');
  assert.equal(a.userAnswer, '');
  assert.equal(a.hintUsed, true);
  assert.equal('responseTimeSeconds' in a, false);
  assert.equal('isFirstResponseCorrect' in a, false);
});

test('response time is the measured time to the first answer, never a default', () => {
  const clock = fakeClock();
  const tracker = new LegacyItemTracker(clock.now);
  tracker.show('q1');
  clock.advance(3400);
  tracker.answered('q1');
  clock.advance(5000);
  tracker.answered('q1'); // later changes do not move the first-answer time
  const [a] = buildLegacyAnswers(['q1'], tracker, () => ({ userAnswer: 4, attempts: 2 }));
  assert.equal(a.responseTimeSeconds, 3.4);
  assert.equal(a.attempts, 2);
  assert.equal(a.responseStatus, undefined);
});

test('time accumulates across visits until the first answer', () => {
  const clock = fakeClock();
  const tracker = new LegacyItemTracker(clock.now);
  tracker.show('q1');
  clock.advance(2000);
  tracker.show('q2'); // leaves q1
  clock.advance(10000);
  tracker.show('q1'); // back to q1
  clock.advance(1500);
  tracker.answered('q1');
  assert.equal(tracker.responseSeconds('q1'), 3.5);
  assert.equal(tracker.responseSeconds('q2'), undefined);
});

test('an answer for a question that is not on screen does not set a time', () => {
  const tracker = new LegacyItemTracker(() => 0);
  tracker.show('q1');
  tracker.answered('q2');
  assert.equal(tracker.responseSeconds('q2'), undefined);
});

test('answered items without a measured time omit responseTimeSeconds', () => {
  const tracker = new LegacyItemTracker(() => 0);
  tracker.show('q1');
  const [a] = buildLegacyAnswers(['q1'], tracker, () => ({ userAnswer: 'opt_2' }));
  assert.equal('responseTimeSeconds' in a, false);
});

test('only collected evidence fields are passed through', () => {
  const tracker = new LegacyItemTracker(() => 0);
  tracker.show('c');
  tracker.answered('c');
  const [a] = buildLegacyAnswers(['c'], tracker, () => ({
    userAnswer: 'opt_5', attempts: 2, hintUsed: false, firstConfirmedResponse: 'opt_4',
    isFirstResponseCorrect: false, demonstrationUsed: true, selfCorrectionsCount: 1,
  }));
  assert.equal(a.firstConfirmedResponse, 'opt_4');
  assert.equal(a.isFirstResponseCorrect, false);
  assert.equal(a.demonstrationUsed, true);
  assert.equal(a.selfCorrectionsCount, 1);
  const [b] = buildLegacyAnswers(['c'], tracker, () => ({ userAnswer: 'opt_5' }));
  for (const key of ['firstConfirmedResponse', 'isFirstResponseCorrect', 'demonstrationUsed', 'selfCorrectionsCount']) {
    assert.equal(key in b, false, key);
  }
});
