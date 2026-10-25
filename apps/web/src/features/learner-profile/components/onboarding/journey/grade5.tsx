import type { ItemMeta } from './evidence';
import type { ChoiceOption } from './activities';
import { NumberSequence, PartsStrip, TowerPattern } from './partActivities';
import type { UpperGradeJourneyConfig } from './UpperGradeJourney';
import { childText } from '../../../../../shared/i18n/childText';

/**
 * Grade 5 onboarding-v2 journey content. Question IDs, probe roles and families mirror
 * services/learner-profile-service/app/db/onboarding_item_bank.py, where answers are scored.
 * Proposed content, pending Sri Lankan Grade 5 teacher review (expertReview: PENDING).
 *
 * Independent evidence per skill (ELP-X needs >= 3 distinct items):
 *   decimals:        shade 0.6, tiles -> decimal (0.4), compare 0.7 and 0.45
 *   number_patterns: towers 1, 3, 5, ?; pre 5, 9, 13, 17, ? (+4); transfer 4, 7, 10, 13, ? (+3)
 *                    (guided 2, 6, 10, ? never counts)
 */

const bigNumber = (text: string) => <span className="text-4xl font-extrabold text-mq-text-strong">{text}</span>;

const patternMeta = (questionId: string, probeRole: 'pre' | 'support' | 'transfer', dimensionTags: string[]): ItemMeta => ({
  questionId,
  activityId: 'g5_pattern_sequence',
  conceptId: 'pattern_find_rule',
  itemFamilyId: 'g5_pattern_add_rule',
  probeRole,
  representation: 'symbolic',
  dimensionTags,
});

export const GRADE5_JOURNEY: UpperGradeJourneyConfig = {
  calibration: {
    questionId: 'g5v2_calibration_move',
    activityId: 'g5_follow_instruction',
    conceptId: 'instruction_following',
    probeRole: 'calibration',
    dimensionTags: ['IC', 'IA'],
  },
  shade: {
    meta: {
      questionId: 'g5v2_shade_tenths_0_6',
      activityId: 'g5_shade_tenths',
      conceptId: 'decimal_tenths',
      itemFamilyId: 'g5_decimals',
      representation: 'concrete',
      dimensionTags: ['MP', 'RU', 'SC', 'IA'],
    },
    parts: 10,
    instruction: childText.decimal.shade,
    helpClarify: childText.decimal.shadeHelp,
    helpCue: childText.decimal.shadeCue,
  },
  read: {
    meta: {
      questionId: 'g5v2_match_tiles_to_decimal_0_4',
      activityId: 'g5_read_tiles',
      conceptId: 'decimal_tenths',
      itemFamilyId: 'g5_decimals',
      probeRole: 'representation',
      representation: 'pictorial',
      dimensionTags: ['RU', 'MP', 'SC'],
    },
    instruction: childText.decimal.readTiles,
    helpText: childText.decimal.readHelp,
    stimulus: <PartsStrip parts={10} shaded={4} label="සමාන කොටස් 10න් 4ක් පාට කළ තීරුව" />,
    options: ['4', '0.04', '0.4', '40'].map((d): ChoiceOption => ({ value: d, ariaLabel: d, content: bigNumber(d) })),
    layout: 'wrap',
  },
  match: {
    meta: {
      questionId: 'g5v2_compare_decimals_0_7_0_45',
      activityId: 'g5_compare_decimals',
      conceptId: 'decimal_comparison',
      itemFamilyId: 'g5_decimals',
      probeRole: 'representation',
      representation: 'symbolic',
      dimensionTags: ['RU', 'MP', 'SC'],
    },
    instruction: childText.decimal.compare,
    helpText: childText.decimal.compareHelp,
    stimulus: <span className="text-3xl font-extrabold text-mq-text-strong">0.45 ? 0.7</span>,
    options: ['0.45', '0.7'].map((d): ChoiceOption => ({ value: d, ariaLabel: d, content: bigNumber(d) })),
    layout: 'wrap',
  },
  independent: {
    item: {
      meta: {
        questionId: 'g5v2_pattern_towers_1_3_5',
        activityId: 'g5_pattern_towers',
        conceptId: 'pattern_next_term',
        itemFamilyId: 'g5_pattern_picture',
        representation: 'pictorial',
        dimensionTags: ['MP', 'RU'],
      },
      stimulus: <TowerPattern heights={[1, 3, 5]} label="කැට 1, 3, 5 තියෙන කුළුණු, ඊළඟ කුළුණ ?" />,
      options: [6, 7, 9, 8],
      correct: 7,
    },
    instruction: childText.pattern.towers,
    helpText: childText.pattern.towersHelp,
  },
  sequence: {
    pre: {
      meta: patternMeta('g5v2_pattern_pre_plus4', 'pre', ['MP', 'SR']),
      stimulus: <NumberSequence terms={[5, 9, 13, 17]} />,
      options: [22, 18, 21, 25],
      correct: 21,
    },
    support: {
      meta: patternMeta('g5v2_pattern_support_plus4', 'support', ['SR']),
      stimulus: <NumberSequence terms={[2, 6, 10]} />,
      options: [14, 13, 18, 12],
      correct: 14,
      visualCue: <NumberSequence terms={[2, 6, 10]} step={4} />,
      worked: childText.pattern.supportL3(10, 4),
      guidance: { l1: childText.pattern.supportL1, l2: childText.pattern.supportL2 },
    },
    transfer: {
      meta: patternMeta('g5v2_pattern_transfer_plus3', 'transfer', ['SR', 'MP']),
      stimulus: <NumberSequence terms={[4, 7, 10, 13]} />,
      options: [15, 17, 14, 16],
      correct: 16,
    },
    instruction: childText.pattern.next,
    helpText: childText.pattern.helpClarify,
    supportIntro: childText.pattern.supportIntro,
    transferIntro: childText.pattern.transferIntro,
  },
};
