/**
 * NumberHunt only offers steps the learner can actually finish.
 * Run: node --experimental-strip-types --test tests/content-adaptation/huntNumbers.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canHunt, tokenNumber } from '../../src/features/content-adaptation/game/mechanics/huntNumbers.ts';

test('a word tile reads as the number a child sees', () => {
  assert.equal(tokenNumber('5ක්'), '5');
  assert.equal(tokenNumber('රු.50'), '50');
  assert.equal(tokenNumber('1,000ක්'), '1000');
  assert.equal(tokenNumber('8.00ට'), '8');
  assert.equal(tokenNumber('ඇපල්'), '');
});

test('steps whose numbers are in the question can be hunted', () => {
  assert.ok(canHunt({ operands: [5, 3] }, 'මාලාට ඇපල් 5 ක් ඇත. නිමල් ඇයට ඇපල් 3 ක් දුන්නේය.'));
  assert.ok(canHunt({ operands: [10, 8] }, 'පාසල උදේ 8.00ට පටන් ගෙන 10.00ට විවේකය ලැබුණා.'));
});

test('a generic prompt without the numbers cannot be hunted', () => {
  assert.equal(canHunt({ operands: [24, 15] }, 'ඔක්කොම එකතු කළ විට මුළු ගණන කීයද කියා ගජාට පෙන්වමු! 🌟'), false);
  assert.equal(canHunt({ operands: [] }, '5 සහ 3'), false);
});

test('a repeated number must appear as often as the step needs it', () => {
  assert.equal(canHunt({ operands: [5, 5] }, 'අඹ 5 ක් තිබුණා. තව ටිකක් ගත්තා.'), false);
  assert.ok(canHunt({ operands: [5, 5] }, 'අඹ 5 ක් සහ දොඩම් 5 ක්.'));
});
