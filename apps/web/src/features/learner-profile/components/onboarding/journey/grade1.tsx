import React from 'react';
import type { ItemMeta } from './evidence';
import type { CompareGroupsItem, ChoiceOption } from './activities';
import { childText } from '../../../../../shared/i18n/childText';

/**
 * Grade 1 onboarding-v2 journey content. Question IDs, probe roles and families mirror
 * services/learner-profile-service/app/db/onboarding_item_bank.py, where answers are scored.
 * Proposed content, pending Sri Lankan Grade 1 teacher review.
 */

export const G1_CALIBRATION: ItemMeta = {
  questionId: 'g1v2_calibration_move',
  activityId: 'g1_follow_instruction',
  conceptId: 'instruction_following',
  probeRole: 'calibration',
  dimensionTags: ['IC', 'IA'],
};

export const G1_COUNT = {
  meta: {
    questionId: 'g1v2_count_fruit_4',
    activityId: 'g1_count_basket',
    conceptId: 'counting_to_10',
    itemFamilyId: 'g1_count_set',
    representation: 'concrete',
    dimensionTags: ['MP', 'IA', 'SC'],
  } satisfies ItemMeta,
  target: 4,
  poolSize: 8,
  objectIcon: '🍎',
  objectLabel: 'ඇපල් ගෙඩිය',
  containerIcon: '🧺',
  containerLabel: 'කූඩය',
  helperIcon: '🐿️',
};

const Blocks: React.FC<{ count: number }> = ({ count }) => (
  <span className="grid grid-cols-3 gap-1" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} className="w-5 h-5 rounded-md bg-sky-400 border border-sky-600" />
    ))}
  </span>
);

export const G1_MATCH_NUMERAL = {
  meta: {
    questionId: 'g1v2_match_objects_to_numeral_3',
    activityId: 'g1_match_numeral',
    conceptId: 'quantity_numeral_link',
    itemFamilyId: 'g1_quantity_numeral',
    probeRole: 'representation',
    representation: 'concrete',
    dimensionTags: ['RU', 'SC', 'IC'],
  } satisfies ItemMeta,
  instruction: childText.matchNumeral.instruction,
  helpText: childText.matchNumeral.help,
  stimulus: (
    <span className="flex gap-4 text-6xl" aria-label="කාර් 3">
      <span aria-hidden="true">🚗</span>
      <span aria-hidden="true">🚗</span>
      <span aria-hidden="true">🚗</span>
    </span>
  ),
  options: [1, 2, 3, 4, 5].map(
    (n): ChoiceOption => ({ value: n, ariaLabel: String(n), content: <span className="text-4xl font-bold text-mq-text-strong">{n}</span> })
  ),
};

export const G1_MATCH_GROUP = {
  meta: {
    questionId: 'g1v2_match_numeral_to_group_5',
    activityId: 'g1_match_group',
    conceptId: 'quantity_numeral_link',
    itemFamilyId: 'g1_quantity_numeral',
    probeRole: 'representation',
    representation: 'symbolic',
    dimensionTags: ['RU', 'SC'],
  } satisfies ItemMeta,
  instruction: childText.matchGroup.instruction(5),
  helpText: childText.matchGroup.help,
  stimulus: <span className="text-7xl font-extrabold text-mq-primary">5</span>,
  options: [4, 6, 5].map(
    (n): ChoiceOption => ({ value: `group_${n}`, ariaLabel: `බ්ලොක් පෙට්ටියක්`, content: <Blocks count={n} /> })
  ),
};

const compareMeta = (questionId: string, probeRole: 'pre' | 'support' | 'transfer', dimensionTags: string[]): ItemMeta => ({
  questionId,
  activityId: 'g1_compare_groups',
  conceptId: 'compare_more',
  itemFamilyId: 'g1_compare_more',
  probeRole,
  representation: 'pictorial',
  dimensionTags,
});

/** Pre-probe: more animals sit close together, fewer are spread out (length does not give the answer). */
export const G1_COMPARE_PRE: CompareGroupsItem = {
  meta: compareMeta('g1v2_compare_pre', 'pre', ['MP', 'SR']),
  left: { icon: '🐦', count: 5, label: 'කුරුල්ලෝ' },
  right: { icon: '🐿️', count: 3, label: 'ලේනුන්' },
  leftLayout: 'cluster',
  rightLayout: 'spread',
  more: 'left',
};

/** Guided example: different animals and numbers, shown with one-to-one pairing support. */
export const G1_COMPARE_SUPPORT: CompareGroupsItem = {
  meta: compareMeta('g1v2_compare_support', 'support', ['SR']),
  left: { icon: '🐇', count: 3, label: 'හාවෝ' },
  right: { icon: '🦆', count: 5, label: 'තාරාවෝ' },
  leftLayout: 'spread',
  rightLayout: 'cluster',
  more: 'right',
};

/** Transfer: new animals, numbers and side; no hints shown unless the child asks. */
export const G1_COMPARE_TRANSFER: CompareGroupsItem = {
  meta: compareMeta('g1v2_compare_transfer', 'transfer', ['SR', 'MP']),
  left: { icon: '🐘', count: 4, label: 'අලි' },
  right: { icon: '🦋', count: 6, label: 'සමනලයෝ' },
  leftLayout: 'spread',
  rightLayout: 'cluster',
  more: 'right',
};
