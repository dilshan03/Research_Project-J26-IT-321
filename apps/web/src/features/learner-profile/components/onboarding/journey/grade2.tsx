import type { ItemMeta } from './evidence';
import type { ChoiceOption } from './activities';
import { BaseTenPicture, type StepChoiceItem } from './numberActivities';
import { childText } from '../../../../../shared/i18n/childText';

/**
 * Grade 2 onboarding-v2 journey content. Question IDs, probe roles and families mirror
 * services/learner-profile-service/app/db/onboarding_item_bank.py, where answers are scored.
 * Proposed content, pending Sri Lankan Grade 2 teacher review (expertReview: PENDING).
 *
 * Independent evidence per skill (ELP-X needs >= 3 distinct items):
 *   place_value: build 34, blocks -> numeral (47), numeral -> blocks (52)
 *   addition:    blocks 21 + 14, pre 32 + 15, transfer 41 + 26   (guided 24 + 33 never counts)
 */

export const G2_CALIBRATION: ItemMeta = {
  questionId: 'g2v2_calibration_move',
  activityId: 'g2_follow_instruction',
  conceptId: 'instruction_following',
  probeRole: 'calibration',
  dimensionTags: ['IC', 'IA'],
};

export const G2_BUILD = {
  meta: {
    questionId: 'g2v2_build_tens_ones_34',
    activityId: 'g2_build_number',
    conceptId: 'tens_and_ones',
    itemFamilyId: 'g2_place_value',
    representation: 'concrete',
    dimensionTags: ['MP', 'RU', 'SC', 'IA'],
  } satisfies ItemMeta,
  target: 34,
};

export const G2_READ_BLOCKS = {
  meta: {
    questionId: 'g2v2_match_blocks_to_numeral_47',
    activityId: 'g2_read_blocks',
    conceptId: 'tens_and_ones',
    itemFamilyId: 'g2_place_value',
    probeRole: 'representation',
    representation: 'pictorial',
    dimensionTags: ['RU', 'MP', 'SC'],
  } satisfies ItemMeta,
  instruction: childText.placeValue.readBlocks,
  helpText: childText.placeValue.readHelp,
  stimulus: <BaseTenPicture tens={4} ones={7} label="දහයේ කූරු 4, එකේ කැට 7" />,
  options: [74, 47, 11, 407].map(
    (n): ChoiceOption => ({ value: n, ariaLabel: String(n), content: <span className="text-3xl font-bold text-mq-text-strong">{n}</span> })
  ),
};

export const G2_SHOW_NUMBER = {
  meta: {
    questionId: 'g2v2_match_numeral_to_blocks_52',
    activityId: 'g2_show_number',
    conceptId: 'tens_and_ones',
    itemFamilyId: 'g2_place_value',
    probeRole: 'representation',
    representation: 'symbolic',
    dimensionTags: ['RU', 'MP', 'SC'],
  } satisfies ItemMeta,
  instruction: childText.placeValue.showNumber(52),
  helpText: childText.placeValue.showHelp,
  stimulus: <span className="text-7xl font-extrabold text-mq-primary">52</span>,
  options: ([
    ['blocks_2_5', 2, 5],
    ['blocks_0_7', 0, 7],
    ['blocks_5_2', 5, 2],
  ] as const).map(
    ([value, tens, ones]): ChoiceOption => ({
      value,
      ariaLabel: `කූරු ${tens}, කැට ${ones}`,
      content: <BaseTenPicture tens={tens} ones={ones} label={`කූරු ${tens}, කැට ${ones}`} />,
    })
  ),
};

const sumStimulus = (a: number, b: number) => (
  <span className="text-5xl sm:text-6xl font-extrabold text-mq-text-strong tracking-wide">
    {a} + {b} = ?
  </span>
);

const splitCue = (a: number, b: number) => (
  <span className="flex flex-wrap items-end justify-center gap-4">
    <BaseTenPicture tens={Math.floor(a / 10)} ones={a % 10} label={String(a)} />
    <span className="text-3xl font-bold">+</span>
    <BaseTenPicture tens={Math.floor(b / 10)} ones={b % 10} label={String(b)} />
  </span>
);

const seqMeta = (questionId: string, probeRole: 'pre' | 'support' | 'transfer', dimensionTags: string[]): ItemMeta => ({
  questionId,
  activityId: 'g2_add_sequence',
  conceptId: 'add_2digit_no_regroup',
  itemFamilyId: 'g2_add_no_regroup',
  probeRole,
  representation: 'symbolic',
  dimensionTags,
});

/** Independent addition with a base-ten picture (separate family; not part of the learn-and-transfer sequence). */
export const G2_ADD_BLOCKS: StepChoiceItem = {
  meta: {
    questionId: 'g2v2_add_blocks_21_14',
    activityId: 'g2_add_blocks',
    conceptId: 'add_2digit_no_regroup',
    itemFamilyId: 'g2_add_no_regroup_blocks',
    representation: 'pictorial',
    dimensionTags: ['MP', 'RU'],
  },
  stimulus: splitCue(21, 14),
  options: [53, 35, 25, 45],
  correct: 35,
};

export const G2_ADD_PRE: StepChoiceItem = {
  meta: seqMeta('g2v2_add_pre_32_15', 'pre', ['MP', 'SR']),
  stimulus: sumStimulus(32, 15),
  options: [74, 46, 47, 57],
  correct: 47,
};

/** Guided example: different numbers, answer in a different position from the pre-probe and transfer. */
export const G2_ADD_SUPPORT: StepChoiceItem = {
  meta: seqMeta('g2v2_add_support_24_33', 'support', ['SR']),
  stimulus: sumStimulus(24, 33),
  options: [56, 57, 66, 75],
  correct: 57,
  visualCue: splitCue(24, 33),
  worked: childText.add2.supportL3(24, 33),
};

export const G2_ADD_TRANSFER: StepChoiceItem = {
  meta: seqMeta('g2v2_add_transfer_41_26', 'transfer', ['SR', 'MP']),
  stimulus: sumStimulus(41, 26),
  options: [67, 76, 65, 57],
  correct: 67,
};
