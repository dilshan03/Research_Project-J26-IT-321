import assert from 'assert';
import { buildLearnerState } from '../src/engine/learnerStateBuilder.js';

console.log('Running LearnerStateBuilder Unit Tests...\n');

// Test 1: Empty interactions defaults
{
  const state = buildLearnerState([]);
  assert.strictEqual(state.cognitiveState, 'NORMAL');
  assert.strictEqual(state.flags.isFrustrated, false);
  assert.strictEqual(state.flags.isInattentive, false);
  console.log('✅ Test 1 Passed: Default state handles empty interaction array.');
}

// Test 2: Inattention detection (Severe Idle Time)
{
  const interactions = [
    {
      eventType: 'QUESTION_VIEW',
      idleTimeBeforeFirstActionMs: 22000,
      responseTimeMs: 24000,
      timestamp: '2026-10-16T04:00:00Z'
    }
  ];
  const state = buildLearnerState(interactions);
  assert.strictEqual(state.flags.isInattentive, true);
  assert.strictEqual(state.cognitiveState, 'INATTENTIVE_DRIFT');
  assert.strictEqual(state.recommendedIntervention.action, 'GENTLE_PROMPT');
  assert.strictEqual(state.recommendedIntervention.animation, 'wave');
  console.log('✅ Test 2 Passed: Inattention detected on prolonged idle latency.');
}

// Test 3: Frustration detection (2 Consecutive Errors)
{
  const interactions = [
    {
      eventType: 'ANSWER_SUBMIT',
      isCorrect: false,
      attemptNumber: 1,
      responseTimeMs: 4000,
      timestamp: '2026-10-16T04:01:00Z'
    },
    {
      eventType: 'ANSWER_SUBMIT',
      isCorrect: false,
      attemptNumber: 2,
      responseTimeMs: 3800,
      timestamp: '2026-10-16T04:01:10Z'
    }
  ];
  const state = buildLearnerState(interactions);
  assert.strictEqual(state.flags.isFrustrated, true);
  assert.strictEqual(state.cognitiveState, 'FRUSTRATED_STRUGGLE');
  assert.strictEqual(state.recommendedIntervention.action, 'OFFER_ASSISTANCE');
  assert.strictEqual(state.recommendedIntervention.animation, 'thinking');
  console.log('✅ Test 3 Passed: Frustration flagged on consecutive errors.');
}

// Test 4: Impulsive Guessing (< 1.5s wrong submission)
{
  const interactions = [
    {
      eventType: 'ANSWER_SUBMIT',
      isCorrect: false,
      attemptNumber: 1,
      responseTimeMs: 800,
      timestamp: '2026-10-16T04:02:00Z'
    }
  ];
  const state = buildLearnerState(interactions);
  assert.strictEqual(state.flags.isImpulsive, true);
  assert.strictEqual(state.cognitiveState, 'IMPULSIVE_GUESSING');
  assert.strictEqual(state.recommendedIntervention.action, 'ENCOURAGE_PAUSE');
  console.log('✅ Test 4 Passed: Impulsive guessing identified.');
}

// Test 5: Focused Flow (Accurate & Steady)
{
  const interactions = [
    {
      eventType: 'ANSWER_SUBMIT',
      isCorrect: true,
      attemptNumber: 1,
      responseTimeMs: 5000,
      idleTimeBeforeFirstActionMs: 1200,
      timestamp: '2026-10-16T04:03:00Z'
    },
    {
      eventType: 'ANSWER_SUBMIT',
      isCorrect: true,
      attemptNumber: 1,
      responseTimeMs: 5500,
      idleTimeBeforeFirstActionMs: 1000,
      timestamp: '2026-10-16T04:03:30Z'
    }
  ];
  const state = buildLearnerState(interactions);
  assert.strictEqual(state.cognitiveState, 'FOCUSED_FLOW');
  assert.strictEqual(state.recommendedIntervention.action, 'CELEBRATE');
  assert.strictEqual(state.recommendedIntervention.animation, 'celebrate');
  console.log('✅ Test 5 Passed: Focused flow state classified accurately.');
}

console.log('\nAll 5 Unit Tests Passed Successfully! 🎯');
