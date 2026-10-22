import type { Tone } from '../components/ui';

/* Plain-language wording for the codes stored by the learner-profile service. */

export interface Label {
  text: string;
  tone: Tone;
  help?: string;
}

const lookup = (map: Record<string, Label>, key: unknown, fallback: Tone = 'slate'): Label =>
  map[String(key ?? '')] ?? { text: key == null || key === '' ? '—' : humanize(String(key)), tone: fallback };

/** "IN_PROGRESS" / "inputMethod" / "g2v2_add_pre_32_15" → readable words. */
export const humanize = (code: string): string =>
  code
    .replace(/^g\dv2_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

export const ONBOARDING_STATUS: Record<string, Label> = {
  NOT_STARTED: { text: 'Not started', tone: 'slate' },
  IN_PROGRESS: { text: 'In progress', tone: 'amber' },
  COMPLETED: { text: 'Completed', tone: 'emerald' },
};
export const onboardingStatus = (s: unknown) => lookup(ONBOARDING_STATUS, s);

export const SKILL_LEVEL: Record<string, Label> = {
  PROFICIENT: { text: 'Proficient', tone: 'emerald', help: 'Estimate is 80% or higher.' },
  DEVELOPING: { text: 'Developing', tone: 'sky', help: 'Estimate is between 50% and 80%.' },
  EMERGING: { text: 'Emerging', tone: 'amber', help: 'Estimate is below 50%.' },
  INSUFFICIENT_EVIDENCE: { text: 'Not enough evidence yet', tone: 'slate', help: 'Fewer than 3 questions answered without help.' },
};
export const skillLevel = (s: unknown) => lookup(SKILL_LEVEL, s);

/** What part an onboarding item plays in the evidence. */
export const ITEM_ROLE: Record<string, Label> = {
  '': { text: 'Answered alone', tone: 'indigo', help: 'Independent question; counts towards the skill estimate.' },
  representation: { text: 'Same idea, new form', tone: 'violet', help: 'Objects, picture or symbols; counts when answered alone.' },
  pre: { text: 'First try', tone: 'sky', help: 'Start of the learn-and-try-again sequence; counts when answered alone.' },
  support: { text: 'Guided (not counted)', tone: 'amber', help: 'Help was part of this activity, so it never counts as independent.' },
  transfer: { text: 'New question after support', tone: 'teal', help: 'A different question of the same kind; counts when answered alone.' },
  calibration: { text: 'Instruction check', tone: 'slate', help: 'Not maths; checks the child can follow a simple instruction.' },
};
export const itemRole = (r: unknown) => ITEM_ROLE[String(r ?? '')] ?? { text: humanize(String(r)), tone: 'slate' as Tone };

export const REPRESENTATION: Record<string, Label> = {
  concrete: { text: 'Hands-on', tone: 'orange' },
  pictorial: { text: 'Picture', tone: 'sky' },
  symbolic: { text: 'Symbols', tone: 'violet' },
};
export const representation = (r: unknown) => lookup(REPRESENTATION, r);

export const EXCLUSION_REASON: Record<string, string> = {
  NON_MATHEMATICAL_ITEM: 'Not a maths question (instruction check)',
  DUPLICATE_SUBMISSION: 'Sent twice; the first copy was used',
  UNKNOWN_QUESTION_ID: 'Unknown question',
  QUESTION_NOT_APPROVED_FOR_GRADE: 'Not a question for this grade',
};

export const RESPONSE_STATUS: Record<string, string> = {
  ANSWERED: 'Answered',
  SKIPPED: 'Skipped',
  NOT_PRESENTED: 'Not shown',
  INVALID: 'Invalid answer',
};

export const IMLR_STATUS: Record<string, Label> = {
  ALREADY_DEMONSTRATED: { text: 'Solved the first try without help', tone: 'emerald' },
  TRANSFER_OBSERVED: { text: 'Solved a new question after support', tone: 'teal' },
  TRANSFER_NOT_YET_OBSERVED: { text: 'Not yet solved the new question', tone: 'amber' },
  INSUFFICIENT_EVIDENCE: { text: 'Not enough evidence', tone: 'slate' },
};
export const imlrStatus = (s: unknown) => lookup(IMLR_STATUS, s);

export const SUPPORT_LEVEL: Record<number, string> = { 1: 'Hint', 2: 'Picture clue', 3: 'Worked example' };

export const AUDIT_ACTION: Record<string, Label> = {
  VIEW_OVERVIEW: { text: 'Opened the overview', tone: 'indigo' },
  LIST_USERS: { text: 'Viewed accounts', tone: 'sky' },
  LIST_LEARNERS: { text: 'Viewed the children list', tone: 'teal' },
  VIEW_LEARNER: { text: 'Opened a child profile', tone: 'violet' },
  VIEW_LEARNER_SENSITIVE: { text: 'Opened sensitive parent reports', tone: 'rose' },
  VIEW_AUDIT_LOG: { text: 'Viewed the audit log', tone: 'slate' },
  RESEARCH_LIST_COMPONENTS: { text: 'Opened research analytics', tone: 'amber' },
  RESEARCH_VIEW_COMPONENT: { text: 'Viewed a research component', tone: 'amber' },
  RESEARCH_VIEW_LIVE_SUMMARY: { text: 'Viewed live research counts', tone: 'orange' },
};
export const auditAction = (a: unknown) => lookup(AUDIT_ACTION, a);

export const ROLE: Record<string, Label> = {
  parent: { text: 'Parents', tone: 'sky' },
  teacher: { text: 'Teachers', tone: 'teal' },
  admin: { text: 'Admins', tone: 'violet' },
};
