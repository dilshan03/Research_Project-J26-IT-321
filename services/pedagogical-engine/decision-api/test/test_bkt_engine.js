import assert from 'assert';
import { HintAwareBKT } from '../src/engine/bktEngine.js';

console.log('Running HintAwareBKT Unit Tests (Node.js Engine)...\n');

const bkt = new HintAwareBKT({
  p_l0: 0.20,
  p_t: 0.15,
  p_g: 0.25,
  p_s: 0.18,
  gamma: 0.85,
  alpha_slip: 0.22,
  mastery_threshold: 0.85
});

// Test 1: Unassisted correct answer produces solid knowledge gain
{
  const res = bkt.updateStep({
    p_prior: 0.20,
    isCorrect: true,
    hintLevel: 0,
    inattentionIndex: 0.0
  });

  assert.strictEqual(res.effectiveSlip, 0.18);
  assert.strictEqual(res.effectiveGuess, 0.25);
  assert(res.updatedKnowledge > 0.40, `Expected updatedKnowledge > 0.40, got ${res.updatedKnowledge}`);
  console.log(`✅ Test 1 Passed: Unassisted correct answer updated P(L) from 0.20 to ${res.updatedKnowledge}`);
}

// Test 2: Hint Scaffolding Discounting (Level 4 Hint)
// If answer was correct only because of a Level 4 hint, effective guess is boosted,
// so the posterior knowledge attribution is discounted (lower than unassisted).
{
  const unassisted = bkt.updateStep({
    p_prior: 0.20,
    isCorrect: true,
    hintLevel: 0,
    inattentionIndex: 0.0
  });

  const assisted = bkt.updateStep({
    p_prior: 0.20,
    isCorrect: true,
    hintLevel: 4,
    inattentionIndex: 0.0
  });

  assert(assisted.effectiveGuess > unassisted.effectiveGuess, 'Level 4 hint must raise effective guess');
  assert(assisted.updatedKnowledge < unassisted.updatedKnowledge,
    `Hint-assisted knowledge (${assisted.updatedKnowledge}) must be discounted relative to unassisted (${unassisted.updatedKnowledge})`
  );
  console.log(`✅ Test 2 Passed: Level 4 hint correctly discounted P(L) (${assisted.updatedKnowledge} < ${unassisted.updatedKnowledge})`);
}

// Test 3: ADHD Inattention Slip Penalty
// High inattention increases effective slip, forgiving mistakes as attention lapses.
{
  const focusedError = bkt.updateStep({
    p_prior: 0.60,
    isCorrect: false,
    hintLevel: 0,
    inattentionIndex: 0.0
  });

  const inattentiveError = bkt.updateStep({
    p_prior: 0.60,
    isCorrect: false,
    hintLevel: 0,
    inattentionIndex: 0.90
  });

  assert(inattentiveError.effectiveSlip > focusedError.effectiveSlip, 'Inattention must increase effective slip');
  // Because the slip is high, the model treats the mistake partly as a slip rather than absence of knowledge:
  assert(inattentiveError.updatedKnowledge > focusedError.updatedKnowledge,
    `Inattentive error preserves more knowledge (${inattentiveError.updatedKnowledge}) than focused blunder (${focusedError.updatedKnowledge})`
  );
  console.log(`✅ Test 3 Passed: Inattention slip compensation verified (${inattentiveError.effectiveSlip} > ${focusedError.effectiveSlip})`);
}

// Test 4: Trajectory & Mastery Convergence
{
  const interactions = [
    { eventType: 'ANSWER_SUBMIT', isCorrect: true, hintLevel: 0, inattentionIndex: 0.1 },
    { eventType: 'ANSWER_SUBMIT', isCorrect: true, hintLevel: 0, inattentionIndex: 0.0 },
    { eventType: 'ANSWER_SUBMIT', isCorrect: true, hintLevel: 0, inattentionIndex: 0.0 },
    { eventType: 'ANSWER_SUBMIT', isCorrect: true, hintLevel: 0, inattentionIndex: 0.0 },
  ];

  const traj = bkt.predictTrajectory(interactions);
  assert.strictEqual(traj.stepsCount, 4);
  assert(traj.currentKnowledge >= 0.85, `Mastery threshold expected, got ${traj.currentKnowledge}`);
  assert.strictEqual(traj.isMastered, true);
  console.log(`✅ Test 4 Passed: Repeated success achieved mastery P(L)=${traj.currentKnowledge} (isMastered: ${traj.isMastered})`);
}

// Test 5: Consecutive wrong answers monotonically decrease knowledge
{
  const wrongInteractions = [
    { eventType: 'ANSWER_SUBMIT', isCorrect: false, hintLevel: 0, inattentionIndex: 0.0 },
    { eventType: 'ANSWER_SUBMIT', isCorrect: false, hintLevel: 2, inattentionIndex: 0.1 },
    { eventType: 'ANSWER_SUBMIT', isCorrect: false, hintLevel: 4, inattentionIndex: 0.0 },
  ];

  const traj = bkt.predictTrajectory(wrongInteractions);
  assert(traj.trajectory[0].updatedKnowledge < 0.20, `Step 0 must decrease from 0.20, got ${traj.trajectory[0].updatedKnowledge}`);
  assert(traj.trajectory[1].updatedKnowledge < traj.trajectory[0].updatedKnowledge, `Step 1 must decrease further`);
  assert(traj.trajectory[2].updatedKnowledge < traj.trajectory[1].updatedKnowledge, `Step 2 must decrease further`);
  assert(traj.currentKnowledge < 0.05, `Knowledge should drop to near zero on consecutive errors, got ${traj.currentKnowledge}`);
  console.log(`✅ Test 5 Passed: Consecutive wrong answers monotonically decreased P(L): 0.20 -> ${traj.trajectory[0].updatedKnowledge} -> ${traj.trajectory[1].updatedKnowledge} -> ${traj.currentKnowledge}`);
}

// Test 6: High hint level + wrong answer should strictly decrease knowledge (no Bayes denominator inversion)
{
  const prior = 0.50;
  const errorWithMaxHint = bkt.updateStep({
    p_prior: prior,
    isCorrect: false,
    hintLevel: 4,
    inattentionIndex: 0.0
  });

  assert(errorWithMaxHint.updatedKnowledge < prior,
    `Error with hint level 4 must decrease P(L) below prior ${prior}, got ${errorWithMaxHint.updatedKnowledge}`
  );
  assert.strictEqual(errorWithMaxHint.effectiveGuess, 0.25, 'Effective guess on error must remain base guess (0.25)');
  console.log(`✅ Test 6 Passed: Error at Level 4 hint safely decreased P(L) from ${prior} to ${errorWithMaxHint.updatedKnowledge}`);
}

console.log('\nAll 6 HintAwareBKT Tests Passed! 🎯');
