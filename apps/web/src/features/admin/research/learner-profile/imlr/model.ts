/**
 * Pure view-model for the IMLR prototype demonstration (unit-tested in tests/admin-research/imlrModel.test.ts).
 * It only maps exported prototype results to display categories and plain-language explanations;
 * classifications for transfer items are taken from the exported outcomes, never recomputed.
 */
import type { ImlrDemoSection, ImlrEvent, ImlrFormItem, ImlrItemEvidence, ImlrScenario } from './types';

export type DisplayResult = 'correct' | 'incorrect' | 'helped' | 'unknown' | 'unanswered' | 'guided';

export const POSITION_LABELS = ['Left', 'Middle', 'Right'] as const;

export const RESULT_LABELS: Record<DisplayResult, string> = {
  correct: 'Correct, no help',
  incorrect: 'Not correct, no help',
  helped: 'Helped',
  unknown: 'Help status unknown',
  unanswered: 'Not answered',
  guided: 'Guided teaching',
};

const OUTCOME_TO_RESULT: Record<string, DisplayResult> = {
  INDEPENDENT_CORRECT: 'correct',
  INDEPENDENT_INCORRECT: 'incorrect',
  HELPED: 'helped',
  ASSISTANCE_UNKNOWN: 'unknown',
  UNANSWERED: 'unanswered',
};

/** Pre-probe items use the same rules as transfer items (exported assistance status + answer-key correctness). */
export const preResult = (e: ImlrItemEvidence): DisplayResult => {
  if (!e.answered) return 'unanswered';
  if (e.assistanceStatus === 'ASSISTED') return 'helped';
  if (e.assistanceStatus === 'NONE_CONFIRMED') return e.correctFirstResponse ? 'correct' : 'incorrect';
  return 'unknown';
};

/** Plain-language reasons, specific to the item's exported status, flags and support events. */
export const explainItem = (e: ImlrItemEvidence, role: string): string[] => {
  const out: string[] = [];
  if (role === 'teaching') {
    out.push(
      `Teaching question: help is part of the activity (support levels used: ${e.supportLevels.join(', ') || 'none'}). ` +
        'Answers here are guided, so they never count as independent evidence.'
    );
    return out;
  }
  if (!e.presented) out.push('This question was not shown.');
  else if (e.skipped) out.push('The question was skipped, so there is no answer to classify.');
  else if (!e.answered) out.push('The question was shown but no answer was confirmed.');

  if (e.answered) {
    if (e.supportBeforeFirstResponse.length > 0) {
      const s = e.supportBeforeFirstResponse
        .map((x) => `level ${x.level} (${x.origin === 'child_request' ? 'child asked' : 'given by the activity'})`)
        .join(', ');
      out.push(`Help was given before the first answer — ${s}. A helped answer is not counted as independent.`);
    } else if (e.assistanceStatus === 'NONE_CONFIRMED') {
      out.push('The question recorder confirmed that no help was given before the first answer, so the answer counts as independent.');
    }
    if (e.correctFirstResponse !== null && e.assistanceStatus === 'NONE_CONFIRMED') {
      out.push(e.correctFirstResponse ? 'The first answer chose the group with the most objects.' : 'The first answer did not choose the group with the most objects.');
    }
  }
  if (e.flags.includes('ASSISTANCE_RECORDING_MISSING'))
    out.push('No end-of-question help record exists. A missing record is not proof that no help was given, so independence is UNKNOWN.');
  if (e.flags.includes('ASSISTANCE_RECORDING_INCOMPLETE'))
    out.push('The help record for this question is marked incomplete, so independence is UNKNOWN rather than assumed.');
  if (e.flags.includes('TEACHING_WINDOW_OPEN_AT_PRESENTATION'))
    out.push('The teaching stage had not been formally closed when this question appeared, so teaching support may still have been visible. Independence is UNKNOWN.');
  if (e.flags.includes('BREAK_DURING_ITEM'))
    out.push('The child took a break during this question. A break is rest, not teaching support, so it does not make the answer “helped”.');
  if (e.flags.includes('HELP_AFTER_FIRST_RESPONSE'))
    out.push('Help was asked for only after the first answer was confirmed, so the first answer still counts as independent.');
  if (e.flags.includes('SUPPORT_EVENT_MALFORMED'))
    out.push('A help record was malformed, so independence cannot be confirmed.');
  return out;
};

export interface OptionView {
  position: number;
  label: string;
  count: number;
  pattern: string;
  spacing: string;
  isCorrect: boolean;
  isFirstChoice: boolean;
}

export interface ItemView {
  itemId: string;
  role: 'pre' | 'teaching' | 'transfer';
  presentationIndex: number;
  objectType: string;
  extentMode: string;
  options: OptionView[];
  result: DisplayResult;
  evidence: ImlrItemEvidence;
  explanations: string[];
}

const itemView = (item: ImlrFormItem, evidence: ImlrItemEvidence, result: DisplayResult): ItemView => ({
  itemId: item.itemId,
  role: item.role,
  presentationIndex: item.presentationIndex,
  objectType: item.objectType,
  extentMode: item.extentMode,
  options: [...item.options]
    .sort((a, b) => a.position - b.position)
    .map((o) => ({
      position: o.position,
      label: POSITION_LABELS[o.position] ?? String(o.position),
      count: o.count,
      pattern: o.pattern,
      spacing: o.spacing,
      isCorrect: o.position === item.correctPosition,
      isFirstChoice: evidence.firstResponsePosition === o.position,
    })),
  result,
  evidence,
  explanations: explainItem(evidence, item.role),
});

export interface ScenarioView {
  scenario: ImlrScenario;
  pre: ItemView[];
  teaching: ItemView[];
  transfer: ItemView[];
  summary: {
    preIndependentCorrect: number;
    preIndependentClassified: number;
    teachingItems: number;
    teachingMaxSupportLevel: number;
    transferIndependentCorrect: number;
    transferIndependentClassified: number;
    transferCounts: Record<DisplayResult, number>;
    chanceLevel: number;
  };
  eventsUsed: ImlrEvent[];
  eventsExcluded: ImlrEvent[];
  boundaryEvent: ImlrEvent | undefined;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

export const buildScenarioView = (demo: ImlrDemoSection, scenarioId: string): ScenarioView | null => {
  const scenario = demo.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return null;
  const formItems = new Map(demo.form.items.map((i) => [i.itemId, i]));
  const byRole = (role: ImlrFormItem['role']) => demo.form.items.filter((i) => i.role === role);

  const evidenceFor = (list: ImlrItemEvidence[], id: string) => list.find((e) => e.itemId === id);
  const pre = byRole('pre').map((it) => {
    const e = evidenceFor(scenario.inputs.preProbe, it.itemId)!;
    return itemView(it, e, preResult(e));
  });
  const teaching = byRole('teaching').map((it) => itemView(it, evidenceFor(scenario.inputs.teaching, it.itemId)!, 'guided'));
  const transfer = scenario.outcomes.items.map((o) => {
    const it = formItems.get(o.itemId)!;
    const e = evidenceFor(scenario.outcomes.itemDetails, o.itemId)!;
    return itemView(it, e, OUTCOME_TO_RESULT[o.outcome] ?? 'unknown');
  });

  const f = scenario.inputs.snapshot.features;
  const transferCounts = { correct: 0, incorrect: 0, helped: 0, unknown: 0, unanswered: 0, guided: 0 } as Record<DisplayResult, number>;
  transfer.forEach((t) => (transferCounts[t.result] += 1));

  return {
    scenario,
    pre,
    teaching,
    transfer,
    summary: {
      preIndependentCorrect: num(f.pre_independent_correct),
      preIndependentClassified: num(f.pre_independent_correct) + num(f.pre_independent_incorrect),
      teachingItems: num(f.teaching_items_presented),
      teachingMaxSupportLevel: num(f.teaching_max_support_level),
      transferIndependentCorrect: scenario.outcomes.independentCorrect,
      transferIndependentClassified: scenario.outcomes.independentClassified,
      transferCounts,
      chanceLevel: scenario.outcomes.chanceLevelPerItem,
    },
    eventsUsed: scenario.events.filter((e) => e.window === 'before_prediction_time'),
    eventsExcluded: scenario.events.filter((e) => e.window === 'after_prediction_time'),
    boundaryEvent: scenario.events.find((e) => e.window === 'prediction_time'),
  };
};

/** Readable labels for the allowlisted snapshot features shown in the main table. */
export const FEATURE_LABELS: Record<string, string> = {
  pre_items_presented: 'Questions shown before teaching',
  pre_items_answered: 'Questions answered before teaching',
  pre_independent_correct: 'Correct without help (before teaching)',
  pre_independent_incorrect: 'Not correct without help (before teaching)',
  pre_assisted: 'Helped answers (before teaching)',
  pre_assistance_unknown: 'Help status unknown (before teaching)',
  pre_child_help_requests: 'Times the child asked for help',
  pre_revisions: 'Answer changes before confirming',
  pre_instruction_replays: 'Instruction replays',
  pre_first_response_seconds: 'Time to first answer (seconds)',
  teaching_items_presented: 'Teaching questions shown',
  teaching_items_answered: 'Teaching questions completed',
  teaching_max_support_level: 'Highest teaching support level (1–3)',
  teaching_support_events: 'Teaching support steps given',
  teaching_assisted_first_try_correct: 'Teaching questions right on first guided try',
  breaks_before_prediction_time: 'Breaks taken before the boundary',
  elpx_pre_transfer: 'ELP-X estimate from independent pre-teaching answers',
};

export const EVENT_LABELS: Record<string, string> = {
  SESSION_STARTED: 'Session started',
  ITEM_PRESENTED: 'Question shown',
  INSTRUCTION: 'Instruction',
  SUPPORT_STARTED: 'Help started',
  SUPPORT_ENDED: 'Help ended',
  RESPONSE_REVISED: 'Answer changed',
  RESPONSE_CONFIRMED: 'Answer confirmed',
  ITEM_SKIPPED: 'Question skipped',
  ITEM_ENDED: 'Question closed',
  BREAK_STARTED: 'Break started',
  BREAK_ENDED: 'Break ended',
  TEACHING_WINDOW_STARTED: 'Teaching stage started',
  TEACHING_WINDOW_ENDED: 'Teaching stage ended',
  BOUNDARY_SHOWN: 'Evidence boundary (snapshot frozen)',
  SESSION_ENDED: 'Session ended',
};

export const formatFeature = (key: string, value: unknown): string => {
  if (Array.isArray(value)) return value.map((v) => (v === null ? '—' : String(v))).join(', ') || '—';
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (key === 'elpx_pre_transfer') {
      return v.available
        ? `${v.correctFirstResponses} of ${v.distinctQuestionsAssessed} correct → estimate ${v.estimatedProficiency} (${v.provisionalSkillLevel})`
        : 'not available';
    }
    return JSON.stringify(value);
  }
  return value === null || value === undefined ? '—' : String(value);
};
