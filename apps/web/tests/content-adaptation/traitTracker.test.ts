/**
 * Bayesian ADHD trait tracker: archetype priors, in-game evidence, and the decision map.
 * Run: node --experimental-strip-types --test tests/content-adaptation/traitTracker.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  beliefs, observe, prefsFromProfile, priorFromProfile, scaffold, trimOptions,
} from '../../src/features/content-adaptation/adaptive/traitTracker.ts';
import type { StudentBehaviorProfile } from '../../src/features/content-adaptation/types.ts';

// The five studio archetypes (StudentBehaviorSelector.tsx ARCHETYPE_PRESETS).
const ARCHETYPES: Record<string, StudentBehaviorProfile> = {
  INATTENTIVE: { inattention_level: 'HIGH', impulsivity_level: 'LOW', working_memory_support: true, activity_pace: 'CALM_STEP_BY_STEP', visual_assistance: 'ALWAYS', audio_assistance: 'READ_ON_CLICK' },
  IMPULSIVE: { inattention_level: 'MODERATE', impulsivity_level: 'HIGH', working_memory_support: true, activity_pace: 'CALM_STEP_BY_STEP', visual_assistance: 'SOMETIMES', audio_assistance: 'READ_ON_CLICK' },
  WORKING_MEMORY: { inattention_level: 'MODERATE', impulsivity_level: 'MODERATE', working_memory_support: true, activity_pace: 'CALM_STEP_BY_STEP', visual_assistance: 'ALWAYS', audio_assistance: 'READ_EVERYTHING' },
  SENSORY_SENSITIVE: { inattention_level: 'HIGH', impulsivity_level: 'LOW', working_memory_support: false, activity_pace: 'CALM_STEP_BY_STEP', visual_assistance: 'ALWAYS', audio_assistance: 'READ_ON_CLICK' },
  BALANCED: { inattention_level: 'LOW', impulsivity_level: 'LOW', working_memory_support: false, activity_pace: 'REGULAR', visual_assistance: 'SOMETIMES', audio_assistance: 'READ_ON_CLICK' },
};

const forArchetype = (id: string) => {
  const p = ARCHETYPES[id];
  return scaffold(beliefs(priorFromProfile(p)), prefsFromProfile(p));
};

test('each archetype maps to its generator knobs', () => {
  const knobs = (id: string) => forArchetype(id).settings;
  assert.deepEqual(knobs('INATTENTIVE'), { step_granularity: 'MAXIMAL_THREE_TIER', distractor_count: 2, stimulus_density: 'LOW', visual_clutter_filter: true, timer_enabled: false });
  assert.deepEqual(knobs('IMPULSIVE'), { step_granularity: 'MAXIMAL_THREE_TIER', distractor_count: 3, stimulus_density: 'LOW', visual_clutter_filter: true, timer_enabled: false });
  assert.deepEqual(knobs('WORKING_MEMORY'), { step_granularity: 'MAXIMAL_THREE_TIER', distractor_count: 3, stimulus_density: 'LOW', visual_clutter_filter: true, timer_enabled: false });
  assert.deepEqual(knobs('SENSORY_SENSITIVE'), { step_granularity: 'TWO_TIER', distractor_count: 2, stimulus_density: 'LOW', visual_clutter_filter: true, timer_enabled: false });
  assert.deepEqual(knobs('BALANCED'), { step_granularity: 'TWO_TIER', distractor_count: 4, stimulus_density: 'MEDIUM', visual_clutter_filter: false, timer_enabled: true });
});

test('each archetype maps to its play settings', () => {
  const play = (id: string) => forArchetype(id).play;
  assert.deepEqual(play('INATTENTIVE'), { brakeMs: 0, hintAfter: 1, breakAfterWrong: 3, advanceMs: 1800, memoryRecap: true, voice: 'ON_TAP', maxWrongOptions: 2 });
  assert.deepEqual(play('IMPULSIVE'), { brakeMs: 1200, hintAfter: 1, breakAfterWrong: 2, advanceMs: 1800, memoryRecap: true, voice: 'ON_TAP', maxWrongOptions: null });
  assert.deepEqual(play('WORKING_MEMORY'), { brakeMs: 0, hintAfter: 1, breakAfterWrong: 3, advanceMs: 1800, memoryRecap: true, voice: 'AUTO', maxWrongOptions: null });
  assert.deepEqual(play('SENSORY_SENSITIVE'), { brakeMs: 0, hintAfter: 1, breakAfterWrong: 3, advanceMs: 1800, memoryRecap: false, voice: 'ON_TAP', maxWrongOptions: 2 });
  assert.deepEqual(play('BALANCED'), { brakeMs: 0, hintAfter: 3, breakAfterWrong: 3, advanceMs: 1400, memoryRecap: false, voice: 'ON_TAP', maxWrongOptions: null });
});

test('no profile keeps the original game behaviour', () => {
  const { play } = scaffold(beliefs(priorFromProfile(null)));
  assert.deepEqual(play, { brakeMs: 0, hintAfter: 2, breakAfterWrong: 3, advanceMs: 1400, memoryRecap: false, voice: 'AUTO', maxWrongOptions: null });
});

test('switching archetypes is stateless and deterministic', () => {
  const first = forArchetype('INATTENTIVE');
  forArchetype('BALANCED');
  assert.deepEqual(forArchetype('INATTENTIVE'), first);
});

test('fast impulsive mistakes raise impulsivity and the think-pause', () => {
  let s = priorFromProfile(ARCHETYPES.WORKING_MEMORY);
  const before = scaffold(beliefs(s));
  for (let i = 0; i < 3; i++) s = observe(s, { kind: 'wrong', distractor: 'IMPULSIVITY', latencyMs: 400 });
  const after = scaffold(beliefs(s));
  assert.ok(beliefs(s).impulsivity > 0.75);
  assert.equal(before.play.brakeMs, 0);
  assert.ok(after.play.brakeMs > 1000);
  assert.equal(after.play.breakAfterWrong, 2);
  assert.ok(after.reasons.some(r => r.trait === 'impulsivity'));
});

test('memory-overflow mistakes raise working-memory support; idles raise inattention', () => {
  let s = priorFromProfile(ARCHETYPES.BALANCED);
  for (let i = 0; i < 6; i++) s = observe(s, { kind: 'wrong', distractor: 'WORKING_MEMORY_OVERFLOW', latencyMs: 3000 });
  for (let i = 0; i < 4; i++) s = observe(s, { kind: 'idle' });
  const b = beliefs(s);
  assert.ok(b.workingMemory > 0.6 && b.inattention > 0.5);
  assert.equal(b.impulsivity, 0.2); // slow wrong answers are not impulsive
  assert.equal(scaffold(b).settings.step_granularity, 'MAXIMAL_THREE_TIER');
});

test('calm first-try answers lower the beliefs', () => {
  let s = priorFromProfile(ARCHETYPES.INATTENTIVE);
  const start = beliefs(s);
  for (let i = 0; i < 6; i++) s = observe(s, { kind: 'correct', firstTry: true, latencyMs: 2500, multiStep: true });
  const end = beliefs(s);
  assert.ok(end.inattention < start.inattention && end.workingMemory < start.workingMemory);
  // A fast first-try answer is not counted as evidence either way.
  assert.deepEqual(observe(s, { kind: 'correct', firstTry: true, latencyMs: 300, multiStep: true }), s);
});

test('old evidence fades so a belief can always move', () => {
  let s = priorFromProfile(null);
  for (let i = 0; i < 100; i++) s = observe(s, { kind: 'idle' });
  assert.ok(Math.abs(s.inattention.a + s.inattention.b - 30) < 1e-9);
  // Without the cap, 100 idles would take ~200 calm answers to undo; with it, ~42 do.
  for (let i = 0; i < 60; i++) s = observe(s, { kind: 'correct', firstTry: true, latencyMs: 2000, multiStep: false });
  assert.ok(beliefs(s).inattention < 0.5);
});

test('option trimming keeps the answer and the distractor for the dominant trait', () => {
  const opt = (text: string, is_correct: boolean, distractor_type: 'NONE' | 'IMPULSIVITY' | 'WORKING_MEMORY_OVERFLOW' | 'MAGNITUDE_SLIP') =>
    ({ text_si: text, text_en: text, is_correct, distractor_type });
  const options = [opt('8', false, 'MAGNITUDE_SLIP'), opt('12', true, 'NONE'), opt('5', false, 'IMPULSIVITY'), opt('22', false, 'WORKING_MEMORY_OVERFLOW')];
  const b = { inattention: 0.7, impulsivity: 0.8, workingMemory: 0.3 };
  assert.deepEqual(trimOptions(options, 2, b).map(o => o.text_en), ['8', '12', '5']);
  assert.equal(trimOptions(options, null, b), options);
  assert.equal(trimOptions(options, 3, b).length, 4);
});
