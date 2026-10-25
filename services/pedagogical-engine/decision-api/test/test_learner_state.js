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

// Test 6: Remaining Time Normalization & Personal RT Z-Score Attention Slip Detection
{
  const interactions = [
    { eventType: 'ANSWER_SUBMIT', isCorrect: true, timeLimitMs: 30000, remainingTimeMs: 25000, timestamp: '2026-10-16T04:04:00Z' },
    { eventType: 'ANSWER_SUBMIT', isCorrect: true, timeLimitMs: 30000, remainingTimeMs: 24500, timestamp: '2026-10-16T04:04:10Z' },
    { eventType: 'ANSWER_SUBMIT', isCorrect: true, timeLimitMs: 30000, remainingTimeMs: 24800, timestamp: '2026-10-16T04:04:20Z' },
    // Sudden impulsive click: 29.2s remaining out of 30s (responseTimeMs = 800ms) -> wrong
    { eventType: 'ANSWER_SUBMIT', isCorrect: false, timeLimitMs: 30000, remainingTimeMs: 29200, timestamp: '2026-10-16T04:04:30Z' }
  ];
  const state = buildLearnerState(interactions);
  assert.strictEqual(state.flags.isAttentionSlip, true);
  assert.strictEqual(state.attentionFusion.fusionMode, 'TELEMETRY_ONLY_FALLBACK');
  assert.ok(state.metrics.rtZScore < -1.5, 'Expected negative RT Z-score for sudden rapid click');
  console.log('✅ Test 6 Passed: Remaining time normalized & personal RT Z-score attention slip detected.');
}

// Test 7: Privacy-Aware Dual-Source Attention Fusion (Multimodal Camera ON vs Fallback Camera OFF)
{
  const baseInteractions = [
    {
      eventType: 'ANSWER_SUBMIT',
      isCorrect: false,
      responseTimeMs: 6000,
      idleTimeBeforeFirstActionMs: 2000,
      timestamp: '2026-10-16T04:05:00Z'
    }
  ];

  // Mode A: Camera Permission Granted with low visual attention (0.15 -> 0.85 camera inattention)
  const multimodalState = buildLearnerState(baseInteractions, {
    cameraTelemetry: { cameraPermissionGranted: true, cameraAttentionScore: 0.15 }
  });
  assert.strictEqual(multimodalState.attentionFusion.fusionMode, 'MULTIMODAL_CAMERA_AND_GAMEPLAY');
  assert.strictEqual(multimodalState.attentionFusion.cameraInattentionIndex, 0.85);
  assert.ok(multimodalState.metrics.inattentionIndex > 0.50);

  // Mode B: Camera Permission Denied -> falls back purely to gameplay telemetry
  const fallbackState = buildLearnerState(baseInteractions, {
    cameraTelemetry: { cameraPermissionGranted: false, cameraAttentionScore: 0.15 }
  });
  assert.strictEqual(fallbackState.attentionFusion.fusionMode, 'TELEMETRY_ONLY_FALLBACK');
  assert.strictEqual(fallbackState.attentionFusion.cameraInattentionIndex, null);
  assert.ok(fallbackState.metrics.inattentionIndex < 0.25);
  console.log('✅ Test 7 Passed: Privacy-aware dual-source fusion switches cleanly between Multimodal and Telemetry-Only modes.');
}

console.log('\nAll 7 Unit Tests Passed Successfully! 🎯');
