import type { ItemMeta } from './evidence';
import type { ChoiceOption } from './activities';
import { EqualGroupsPicture, HundredsTensOnesPicture, type StepChoiceItem } from './numberActivities';
import { childText } from '../../../../../shared/i18n/childText';

/**
 * Grade 3 onboarding-v2 journey content. Question IDs, probe roles and families mirror
 * services/learner-profile-service/app/db/onboarding_item_bank.py, where answers are scored.
 * Proposed content, pending Sri Lankan Grade 3 teacher review (expertReview: PENDING), including the
 * "a × b = a groups of b" reading of the multiplication sign.
 *
 * Independent evidence per skill (ELP-X needs >= 3 distinct items):
 *   place_value:    build 347, blocks -> numeral (258), numeral -> blocks (406, zero tens)
 *   multiplication: 2 plates of 4, pre 4 × 3, transfer 5 × 2   (guided 3 × 5 never counts)
 */

export const G3_CALIBRATION: ItemMeta = {
  questionId: 'g3v2_calibration_move',
  activityId: 'g3_follow_instruction',
  conceptId: 'instruction_following',
  probeRole: 'calibration',
  dimensionTags: ['IC', 'IA'],
};

export const G3_BUILD = {
  meta: {
    questionId: 'g3v2_build_hto_347',
    activityId: 'g3_build_number',
    conceptId: 'hundreds_tens_ones',
    itemFamilyId: 'g3_place_value',
    representation: 'concrete',
    dimensionTags: ['MP', 'RU', 'SC', 'IA'],
  } satisfies ItemMeta,
  target: 347,
};

export const G3_READ_BLOCKS = {
  meta: {
    questionId: 'g3v2_match_blocks_to_numeral_258',
    activityId: 'g3_read_blocks',
    conceptId: 'hundreds_tens_ones',
    itemFamilyId: 'g3_place_value',
    probeRole: 'representation',
    representation: 'pictorial',
    dimensionTags: ['RU', 'MP', 'SC'],
  } satisfies ItemMeta,
  instruction: childText.placeValue3.readBlocks,
  helpText: childText.placeValue3.readHelp,
  stimulus: <HundredsTensOnesPicture hundreds={2} tens={5} ones={8} label="සියයේ පුවරු 2, දහයේ කූරු 5, එකේ කැට 8" />,
  options: [852, 258, 285, 15].map(
    (n): ChoiceOption => ({ value: n, ariaLabel: String(n), content: <span className="text-3xl font-bold text-mq-text-strong">{n}</span> })
  ),
};

export const G3_SHOW_NUMBER = {
  meta: {
    questionId: 'g3v2_match_numeral_to_blocks_406',
    activityId: 'g3_show_number',
    conceptId: 'hundreds_tens_ones',
    itemFamilyId: 'g3_place_value',
    probeRole: 'representation',
    representation: 'symbolic',
    dimensionTags: ['RU', 'MP', 'SC'],
  } satisfies ItemMeta,
  instruction: childText.placeValue3.showNumber(406),
  helpText: childText.placeValue3.showHelp,
  stimulus: <span className="text-7xl font-extrabold text-mq-primary">406</span>,
  options: ([
    ['blocks_4_6_0', 4, 6, 0],
    ['blocks_4_0_6', 4, 0, 6],
    ['blocks_6_0_4', 6, 0, 4],
  ] as const).map(
    ([value, hundreds, tens, ones]): ChoiceOption => ({
      value,
      ariaLabel: `පුවරු ${hundreds}, කූරු ${tens}, කැට ${ones}`,
      content: <HundredsTensOnesPicture hundreds={hundreds} tens={tens} ones={ones} label={`පුවරු ${hundreds}, කූරු ${tens}, කැට ${ones}`} />,
    })
  ),
};

const productStimulus = (groups: number, each: number) => (
  <span className="text-5xl sm:text-6xl font-extrabold text-mq-text-strong tracking-wide">
    {groups} × {each} = ?
  </span>
);

const groupsCue = (groups: number, each: number) => (
  <EqualGroupsPicture groups={groups} each={each} icon="🔵" label={`${each} බැගින් කාණ්ඩ ${groups}ක්`} />
);

const seqMeta = (questionId: string, probeRole: 'pre' | 'support' | 'transfer', dimensionTags: string[]): ItemMeta => ({
  questionId,
  activityId: 'g3_mult_sequence',
  conceptId: 'mult_equal_groups',
  itemFamilyId: 'g3_mult_equal_groups',
  probeRole,
  representation: 'symbolic',
  dimensionTags,
});

/** Independent equal-groups picture (separate family; not part of the learn-and-transfer sequence). */
export const G3_MULT_GROUPS: StepChoiceItem = {
  meta: {
    questionId: 'g3v2_mult_groups_2x4',
    activityId: 'g3_mult_groups',
    conceptId: 'mult_equal_groups',
    itemFamilyId: 'g3_mult_groups_picture',
    representation: 'pictorial',
    dimensionTags: ['MP', 'RU'],
  },
  stimulus: <EqualGroupsPicture groups={2} each={4} icon="🥭" label="පිඟන් 2ක අඹ 4 බැගින්" />,
  options: [6, 8, 24, 12],
  correct: 8,
};

export const G3_MULT_PRE: StepChoiceItem = {
  meta: seqMeta('g3v2_mult_pre_4x3', 'pre', ['MP', 'SR']),
  stimulus: productStimulus(4, 3),
  options: [7, 43, 12, 15],
  correct: 12,
};

/** Guided example: different numbers, answer in a different position from the pre-probe and transfer. */
export const G3_MULT_SUPPORT: StepChoiceItem = {
  meta: seqMeta('g3v2_mult_support_3x5', 'support', ['SR']),
  stimulus: productStimulus(3, 5),
  options: [15, 8, 35, 18],
  correct: 15,
  visualCue: groupsCue(3, 5),
  worked: childText.mult.supportL3(3, 5),
  guidance: { l1: childText.mult.supportL1(3, 5), l2: childText.mult.supportL2 },
};

export const G3_MULT_TRANSFER: StepChoiceItem = {
  meta: seqMeta('g3v2_mult_transfer_5x2', 'transfer', ['SR', 'MP']),
  stimulus: productStimulus(5, 2),
  options: [7, 52, 12, 10],
  correct: 10,
};
