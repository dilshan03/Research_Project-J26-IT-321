import assert from 'assert';
import { FSMDecisionEngine, FSM_STATES, FSM_RULES } from '../src/engine/fsmDecisionEngine.js';

console.log('Running FSMDecisionEngine Unit Tests...\n');

const fsm = new FSMDecisionEngine();

// Test 1: Rule 1 - Two consecutive wrong answers without hint triggers Hint 1 Scaffold
{
  const res = fsm.evaluate({
    consecutiveErrors: 2,
    highestHintLevel: 0
  });

  assert.strictEqual(res.fsmState, FSM_STATES.HINT_SCAFFOLDING);
  assert.strictEqual(res.rule.id, 'RULE_1');
  assert.strictEqual(res.decision.action, 'OFFER_ASSISTANCE');
  assert.strictEqual(res.decision.animation, 'thinking');
  assert.strictEqual(res.decision.targetHintLevel, 1);
  console.log('✅ Test 1 Passed: Rule 1 triggered HINT_SCAFFOLDING (Level 1 Hint + thinking animation).');
}

// Test 2: Rule 2 - High idle time (>15s) triggers Attention Redirect
{
  const res = fsm.evaluate({
    currentIdleTimeMs: 16500,
    consecutiveErrors: 0
  });

  assert.strictEqual(res.fsmState, FSM_STATES.ATTENTION_REDIRECT);
  assert.strictEqual(res.rule.id, 'RULE_2');
  assert.strictEqual(res.decision.action, 'GENTLE_PROMPT');
  assert.strictEqual(res.decision.animation, 'wave');
  console.log('✅ Test 2 Passed: Rule 2 triggered ATTENTION_REDIRECT on prolonged idle latency.');
}

// Test 3: Rule 3 - Correct after high hint (L4) praises effort without overcrediting
{
  const res = fsm.evaluate({
    lastAnswerIsCorrect: true,
    highestHintLevel: 4,
    consecutiveErrors: 0
  });

  assert.strictEqual(res.rule.id, 'RULE_3');
  assert.strictEqual(res.decision.action, 'PRAISE_EFFORT');
  assert.strictEqual(res.decision.animation, 'clap');
  console.log('✅ Test 3 Passed: Rule 3 recognized hint-assisted victory and triggered praise.');
}

// Test 4: Rule 4 - Mastery attainment P(L) >= 0.85 with streaks triggers Celebration
{
  const res = fsm.evaluate({
    bktKnowledge: 0.90,
    consecutiveCorrect: 3,
    consecutiveErrors: 0
  });

  assert.strictEqual(res.fsmState, FSM_STATES.MASTERY_REINFORCEMENT);
  assert.strictEqual(res.rule.id, 'RULE_4');
  assert.strictEqual(res.decision.action, 'CELEBRATE');
  assert.strictEqual(res.decision.animation, 'correctCelebrate');
  console.log('✅ Test 4 Passed: Rule 4 celebrated concept mastery attainment.');
}

// Test 5: Rule 5 - Impulsive guess (<1.5s error) triggers Impulse Braking
{
  const res = fsm.evaluate({
    isImpulsive: true,
    consecutiveErrors: 1
  });

  assert.strictEqual(res.fsmState, FSM_STATES.IMPULSE_BRAKING);
  assert.strictEqual(res.rule.id, 'RULE_5');
  assert.strictEqual(res.decision.action, 'ENCOURAGE_PAUSE');
  console.log('✅ Test 5 Passed: Rule 5 halted impulsive guessing with deliberate reflection prompt.');
}

// Test 6: Rule 6 - Progressive hint escalation
{
  const res = fsm.evaluate({
    consecutiveErrors: 2,
    highestHintLevel: 1
  });

  assert.strictEqual(res.fsmState, FSM_STATES.HINT_SCAFFOLDING);
  assert.strictEqual(res.rule.id, 'RULE_6');
  assert.strictEqual(res.decision.targetHintLevel, 2);
  console.log('✅ Test 6 Passed: Rule 6 escalated hint level from 1 to 2.');
}

console.log('\nAll 6 FSM Decision Engine Tests Passed! 🎯');
