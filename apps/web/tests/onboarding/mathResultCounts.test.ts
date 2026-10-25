/**
 * Parent summary counts: independent performance separated from guided/helped activities.
 * Run: node --experimental-strip-types --test tests/onboarding/mathResultCounts.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mathResultCounts } from '../../src/features/learner-profile/utils/mathResultCounts.ts';

// Shape of the stored Grade 2 PP1 run: 6 independent items (5 correct first time) + 1 guided support item
const grade2 = [
  { questionId: 'build', includedInProficiencyEstimate: true, correctFirstResponse: true },
  { questionId: 'read', includedInProficiencyEstimate: true, correctFirstResponse: true },
  { questionId: 'show', includedInProficiencyEstimate: true, correctFirstResponse: true },
  { questionId: 'blocks', includedInProficiencyEstimate: true, correctFirstResponse: true },
  { questionId: 'pre', probeRole: 'pre', includedInProficiencyEstimate: true, correctFirstResponse: false },
  { questionId: 'support', probeRole: 'support', includedInProficiencyEstimate: false, correctFirstResponse: false, isCorrect: true },
  { questionId: 'transfer', probeRole: 'transfer', includedInProficiencyEstimate: true, correctFirstResponse: true },
];

test('guided support is not counted as independent performance', () => {
  assert.deepEqual(mathResultCounts(grade2), { independentTotal: 6, independentCorrect: 5, notIndependent: 1 });
});

test('helped or unconfirmed items are listed separately, never as independent', () => {
  const items = [
    { includedInProficiencyEstimate: true, correctFirstResponse: true },
    { includedInProficiencyEstimate: false, correctFirstResponse: true },   // help before first answer
    { includedInProficiencyEstimate: false, correctFirstResponse: null },   // first response unknown
  ];
  assert.deepEqual(mathResultCounts(items), { independentTotal: 1, independentCorrect: 1, notIndependent: 2 });
});

test('older records without evidence flags fall back to the original wording', () => {
  assert.equal(mathResultCounts([{ questionId: 'g2_add_2digit_01', isCorrect: true }]), null);
  assert.equal(mathResultCounts(undefined), null);
  assert.equal(mathResultCounts([]), null);
});
