import type { ItemMeta } from './evidence';
import type { ChoiceOption } from './activities';
import { PartsStrip, PerimeterPicture } from './partActivities';
import type { StepChoiceItem } from './numberActivities';
import type { UpperGradeJourneyConfig } from './UpperGradeJourney';
import { childText } from '../../../../../shared/i18n/childText';

/**
 * Grade 4 onboarding-v2 journey content. Question IDs, probe roles and families mirror
 * services/learner-profile-service/app/db/onboarding_item_bank.py, where answers are scored.
 * Proposed content, pending Sri Lankan Grade 4 teacher review (expertReview: PENDING).
 *
 * Independent evidence per skill (ELP-X needs >= 3 distinct items):
 *   fractions:            shade 3/4, strip -> fraction (2/3), equivalent strip for 1/2
 *   measurement_geometry: 2 × 2 square, pre 3 × 2, transfer 5 × 2   (guided 4 × 2 never counts)
 */

const fractionLabel = (text: string) => <span className="text-4xl font-extrabold text-mq-text-strong">{text}</span>;

const perimeterMeta = (questionId: string, probeRole: 'pre' | 'support' | 'transfer', dimensionTags: string[]): ItemMeta => ({
  questionId,
  activityId: 'g4_perimeter_sequence',
  conceptId: 'perimeter_unit_edges',
  itemFamilyId: 'g4_perimeter_rectangle',
  probeRole,
  representation: 'pictorial',
  dimensionTags,
});

const garden = (w: number, h: number, numbered = false) => (
  <PerimeterPicture w={w} h={h} numbered={numbered} label={`ඒකක ${w}ක් දිග, ඒකක ${h}ක් පළල වත්ත`} />
);

const G4_PERIMETER_SUPPORT: StepChoiceItem = {
  meta: perimeterMeta('g4v2_perimeter_support_4x2', 'support', ['SR']),
  stimulus: garden(4, 2),
  options: [12, 8, 6, 16],
  correct: 12,
  visualCue: garden(4, 2, true),
  worked: childText.perimeter.supportL3(4, 2),
  guidance: { l1: childText.perimeter.supportL1, l2: childText.perimeter.supportL2 },
};

export const GRADE4_JOURNEY: UpperGradeJourneyConfig = {
  calibration: {
    questionId: 'g4v2_calibration_move',
    activityId: 'g4_follow_instruction',
    conceptId: 'instruction_following',
    probeRole: 'calibration',
    dimensionTags: ['IC', 'IA'],
  },
  shade: {
    meta: {
      questionId: 'g4v2_shade_fraction_3_4',
      activityId: 'g4_shade_fraction',
      conceptId: 'fraction_part_whole',
      itemFamilyId: 'g4_fractions',
      representation: 'concrete',
      dimensionTags: ['MP', 'RU', 'SC', 'IA'],
    },
    parts: 4,
    instruction: childText.fraction.shade,
    helpClarify: childText.fraction.shadeHelp,
    helpCue: childText.fraction.shadeCue,
  },
  read: {
    meta: {
      questionId: 'g4v2_match_strip_to_fraction_2_3',
      activityId: 'g4_read_strip',
      conceptId: 'fraction_part_whole',
      itemFamilyId: 'g4_fractions',
      probeRole: 'representation',
      representation: 'pictorial',
      dimensionTags: ['RU', 'MP', 'SC'],
    },
    instruction: childText.fraction.readStrip,
    helpText: childText.fraction.readHelp,
    stimulus: <PartsStrip parts={3} shaded={2} label="සමාන කොටස් 3න් 2ක් පාට කළ තීරුව" />,
    options: ['3/2', '1/3', '2/3', '2/5'].map((f): ChoiceOption => ({ value: f, ariaLabel: f, content: fractionLabel(f) })),
    layout: 'wrap',
  },
  match: {
    meta: {
      questionId: 'g4v2_equivalent_strip_1_2',
      activityId: 'g4_equivalent_strip',
      conceptId: 'equivalent_fractions',
      itemFamilyId: 'g4_fractions',
      probeRole: 'representation',
      representation: 'symbolic',
      dimensionTags: ['RU', 'MP', 'SC'],
    },
    instruction: childText.fraction.equivalent,
    helpText: childText.fraction.equivalentHelp,
    stimulus: (
      // Same width as the option strips, so the shaded amounts can be compared directly.
      <span className="flex flex-col items-center gap-2 w-[260px] sm:w-[300px]">
        {fractionLabel('1/2')}
        <PartsStrip parts={2} shaded={1} label="සමාන කොටස් 2න් 1ක් පාට කළ තීරුව" />
      </span>
    ),
    options: ([
      ['strip_2_4', 4, 2],
      ['strip_1_4', 4, 1],
      ['strip_2_3', 3, 2],
    ] as const).map(
      ([value, parts, shaded]): ChoiceOption => ({
        value,
        ariaLabel: `සමාන කොටස් ${parts}න් ${shaded}ක් පාට කළ තීරුව`,
        content: <PartsStrip parts={parts} shaded={shaded} label={`සමාන කොටස් ${parts}න් ${shaded}ක් පාට කළ තීරුව`} />,
      })
    ),
    layout: 'equal',
  },
  independent: {
    item: {
      meta: {
        questionId: 'g4v2_perimeter_square_2x2',
        activityId: 'g4_perimeter_square',
        conceptId: 'perimeter_unit_edges',
        itemFamilyId: 'g4_perimeter_square',
        representation: 'pictorial',
        dimensionTags: ['MP', 'RU'],
      },
      stimulus: garden(2, 2),
      options: [4, 8, 6, 16],
      correct: 8,
    },
    instruction: childText.perimeter.square,
    helpText: childText.perimeter.helpClarify,
  },
  sequence: {
    pre: {
      meta: perimeterMeta('g4v2_perimeter_pre_3x2', 'pre', ['MP', 'SR']),
      stimulus: garden(3, 2),
      options: [6, 5, 10, 12],
      correct: 10,
    },
    support: G4_PERIMETER_SUPPORT,
    transfer: {
      meta: perimeterMeta('g4v2_perimeter_transfer_5x2', 'transfer', ['SR', 'MP']),
      stimulus: garden(5, 2),
      options: [10, 7, 28, 14],
      correct: 14,
    },
    instruction: childText.perimeter.rectangle,
    helpText: childText.perimeter.helpClarify,
    supportIntro: childText.perimeter.supportIntro,
    transferIntro: childText.perimeter.transferIntro,
  },
};
