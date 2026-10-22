/**
 * Bayesian ADHD trait tracker.
 *
 * Each trait (inattention, impulsivity, working-memory load) is a Beta(a, b) belief whose
 * mean p = a / (a + b) is "how strongly this learner shows the trait right now".
 *  - Prior: the teacher's behaviour archetype (LOW / MODERATE / HIGH).
 *  - Evidence: what happens in play. Wrong options are already tagged with the ADHD error
 *    they model (IMPULSIVITY, WORKING_MEMORY_OVERFLOW, MAGNITUDE_SLIP), plus answer speed
 *    and idle pauses.
 *  - Decision: a small rule map turns the beliefs into generator knobs (for the teacher
 *    studio) and play settings (for the live game), each with a stated reason.
 *
 * Pure and deterministic: the same profile and events always give the same scaffold.
 */
import type { CustomADHDGameSettings, DistractorType, GameChoiceOption, StudentBehaviorProfile } from '../types';

export type Trait = 'inattention' | 'impulsivity' | 'workingMemory';
export interface Beta { a: number; b: number }
export type TraitState = Record<Trait, Beta>;
export type TraitBeliefs = Record<Trait, number>;

export type TraitEvent =
  | { kind: 'wrong'; distractor?: DistractorType | null; latencyMs: number }
  | { kind: 'correct'; firstTry: boolean; latencyMs: number; multiStep: boolean }
  | { kind: 'idle' };

export type VoiceMode = 'AUTO' | 'ON_TAP' | 'OFF';

export interface PlaySettings {
  /** Taps are ignored this long at step start and after a wrong answer ("think first"). */
  brakeMs: number;
  /** Misses on a step before Gaja switches from "try again" to a strategy hint. */
  hintAfter: number;
  /** Wrong answers in a row before the breathing break. */
  breakAfterWrong: number;
  /** Celebration pause before the next step. */
  advanceMs: number;
  /** Keep the answers of solved steps on screen. */
  memoryRecap: boolean;
  voice: VoiceMode;
  /** Wrong options shown per step at most (null = as generated). */
  maxWrongOptions: number | null;
}

export type GeneratorSettings = Required<Pick<CustomADHDGameSettings,
  'step_granularity' | 'distractor_count' | 'stimulus_density' | 'visual_clutter_filter' | 'timer_enabled'>>;

export interface ScaffoldReason { trait?: Trait; si: string; en: string }

export interface Scaffold {
  beliefs: TraitBeliefs;
  settings: GeneratorSettings;
  play: PlaySettings;
  reasons: ScaffoldReason[];
}

/** Teacher preferences that are choices, not traits to infer. */
export type ScaffoldPrefs = Partial<Pick<StudentBehaviorProfile, 'activity_pace' | 'visual_assistance' | 'audio_assistance'>>;

/** Answers faster than this are "impulsive" when wrong (same as the behaviour service's VERY_FAST_RESPONSE_MS). */
export const FAST_MS = 800;
const PRIOR: Record<'LOW' | 'MODERATE' | 'HIGH', Beta> = {
  LOW: { a: 1, b: 4 },
  MODERATE: { a: 2.5, b: 2.5 },
  HIGH: { a: 4, b: 1 },
};
/** Older evidence fades once a belief holds this much, so recent play still matters. */
const MAX_STRENGTH = 30;

export function priorFromProfile(profile?: Partial<StudentBehaviorProfile> | null): TraitState {
  return {
    inattention: { ...PRIOR[profile?.inattention_level ?? 'MODERATE'] },
    impulsivity: { ...PRIOR[profile?.impulsivity_level ?? 'MODERATE'] },
    workingMemory: { ...PRIOR[profile?.working_memory_support == null ? 'MODERATE' : profile.working_memory_support ? 'HIGH' : 'LOW'] },
  };
}

export function prefsFromProfile(profile?: Partial<StudentBehaviorProfile> | null): ScaffoldPrefs {
  return {
    activity_pace: profile?.activity_pace,
    visual_assistance: profile?.visual_assistance,
    audio_assistance: profile?.audio_assistance,
  };
}

function bump(state: TraitState, trait: Trait, side: 'a' | 'b', by: number): TraitState {
  const next = { ...state[trait], [side]: state[trait][side] + by };
  const total = next.a + next.b;
  if (total > MAX_STRENGTH) {
    next.a *= MAX_STRENGTH / total;
    next.b *= MAX_STRENGTH / total;
  }
  return { ...state, [trait]: next };
}

/** Bayesian update for one observed event. Returns a new state. */
export function observe(state: TraitState, ev: TraitEvent): TraitState {
  let s = state;
  if (ev.kind === 'idle') return bump(s, 'inattention', 'a', 1);
  if (ev.kind === 'wrong') {
    if (ev.distractor === 'IMPULSIVITY') s = bump(s, 'impulsivity', 'a', 1);
    if (ev.latencyMs < FAST_MS) s = bump(s, 'impulsivity', 'a', 1);
    if (ev.distractor === 'WORKING_MEMORY_OVERFLOW') s = bump(s, 'workingMemory', 'a', 1);
    if (ev.distractor === 'MAGNITUDE_SLIP') s = bump(s, 'inattention', 'a', 0.5);
    return s;
  }
  // A calm, first-try correct answer is evidence against all three traits.
  if (ev.firstTry && ev.latencyMs >= FAST_MS) {
    s = bump(s, 'inattention', 'b', 0.5);
    s = bump(s, 'impulsivity', 'b', 0.5);
    if (ev.multiStep) s = bump(s, 'workingMemory', 'b', 0.5);
  }
  return s;
}

export function beliefs(state: TraitState): TraitBeliefs {
  const p = (t: Trait) => state[t].a / (state[t].a + state[t].b);
  return { inattention: p('inattention'), impulsivity: p('impulsivity'), workingMemory: p('workingMemory') };
}

const pct = (p: number) => p.toFixed(2);
const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v));

/** Decision map: beliefs (+ teacher preferences) → generator knobs, play settings and reasons. */
export function scaffold(b: TraitBeliefs, prefs: ScaffoldPrefs = {}): Scaffold {
  const { inattention: pI, impulsivity: pP, workingMemory: pW } = b;
  const pace = prefs.activity_pace ?? 'REGULAR';
  const reasons: ScaffoldReason[] = [];

  // Generator knobs
  const distractor_count = pI > 0.65 ? 2 : pI < 0.35 ? 4 : 3;
  if (distractor_count === 2) reasons.push({ trait: 'inattention', en: `Inattention ${pct(pI)} → only 2 wrong choices`, si: `අවධානය ${pct(pI)} → වැරදි පිළිතුරු 2ක් පමණයි` });
  if (distractor_count === 4) reasons.push({ trait: 'inattention', en: `Inattention ${pct(pI)} → 4 wrong choices (stretch)`, si: `අවධානය ${pct(pI)} → වැරදි පිළිතුරු 4ක්` });

  const threeTier = pP > 0.6 || pW > 0.6;
  if (threeTier) {
    const t: Trait = pW >= pP ? 'workingMemory' : 'impulsivity';
    reasons.push({ trait: t, en: `${t === 'workingMemory' ? 'Working memory' : 'Impulsivity'} ${pct(Math.max(pP, pW))} → 3 small steps`, si: `${t === 'workingMemory' ? 'මතක ධාරිතාව' : 'ආවේගශීලීත්වය'} ${pct(Math.max(pP, pW))} → කුඩා පියවර 3ක්` });
  }

  const lowStimulus = pI > 0.5 || pace === 'CALM_STEP_BY_STEP';
  if (pI > 0.5) reasons.push({ trait: 'inattention', en: `Inattention ${pct(pI)} → calm visuals, clutter filter on`, si: `අවධානය ${pct(pI)} → සන්සුන් දර්ශන` });
  const clutterFilter = pI >= 0.35;
  const timer = pP < 0.35 && pI < 0.35 && pace !== 'CALM_STEP_BY_STEP';
  if (timer) reasons.push({ en: 'Low inattention and impulsivity → soft timer allowed', si: 'අඩු අවධාන/ආවේග අවශ්‍යතා → මෘදු කාල තීරුව' });

  // Play settings
  const brakeMs = Math.round(clamp(0, 1500, 4000 * (pP - 0.5)));
  if (brakeMs > 0) reasons.push({ trait: 'impulsivity', en: `Impulsivity ${pct(pP)} → ${(brakeMs / 1000).toFixed(1)} s think-pause before answering`, si: `ආවේගශීලීත්වය ${pct(pP)} → පිළිතුරු දීමට පෙර තත්පර ${(brakeMs / 1000).toFixed(1)} විරාමයක්` });

  let hintAfter = pI > 0.6 || pW > 0.6 ? 1 : pI > 0.4 || pW > 0.4 ? 2 : 3;
  hintAfter = clamp(1, 3, hintAfter + (prefs.visual_assistance === 'ALWAYS' ? -1 : prefs.visual_assistance === 'MINIMAL' ? 1 : 0));
  if (hintAfter === 1) reasons.push({ en: 'Strategy hint after the first miss', si: 'පළමු වැරැද්දෙන් පසු ඉඟියක්' });

  const breakAfterWrong = pP > 0.6 ? 2 : 3;
  if (breakAfterWrong === 2) reasons.push({ trait: 'impulsivity', en: `Impulsivity ${pct(pP)} → breathing break after 2 misses`, si: `ආවේගශීලීත්වය ${pct(pP)} → වැරදි 2කට පසු හුස්ම විවේකය` });

  const advanceMs = pace === 'CALM_STEP_BY_STEP' ? 1800 : pace === 'FLEXIBLE' ? 1000 : 1400;
  const memoryRecap = pW > 0.5;
  if (memoryRecap) reasons.push({ trait: 'workingMemory', en: `Working memory ${pct(pW)} → earlier answers stay on screen`, si: `මතක ධාරිතාව ${pct(pW)} → පෙර පිළිතුරු තිරයේ රැඳේ` });

  const voice: VoiceMode = prefs.audio_assistance === 'OFF' ? 'OFF' : prefs.audio_assistance === 'READ_ON_CLICK' ? 'ON_TAP' : 'AUTO';
  const maxWrongOptions = pI > 0.65 ? 2 : null;

  return {
    beliefs: b,
    settings: {
      step_granularity: threeTier ? 'MAXIMAL_THREE_TIER' : 'TWO_TIER',
      distractor_count,
      stimulus_density: lowStimulus ? 'LOW' : 'MEDIUM',
      visual_clutter_filter: clutterFilter,
      timer_enabled: timer,
    },
    play: { brakeMs, hintAfter, breakAfterWrong, advanceMs, memoryRecap, voice, maxWrongOptions },
    reasons,
  };
}

const TRAIT_DISTRACTOR: Record<Trait, DistractorType> = {
  impulsivity: 'IMPULSIVITY',
  workingMemory: 'WORKING_MEMORY_OVERFLOW',
  inattention: 'MAGNITUDE_SLIP',
};

/**
 * Shows at most `maxWrong` wrong options, keeping the correct one and preferring the
 * distractors that probe the learner's strongest trait. Never adds options; keeps order.
 */
export function trimOptions(options: GameChoiceOption[], maxWrong: number | null, b: TraitBeliefs): GameChoiceOption[] {
  const wrong = options.filter(o => !o.is_correct);
  if (maxWrong == null || wrong.length <= maxWrong) return options;
  const dominant = (Object.keys(b) as Trait[]).reduce((x, y) => (b[y] > b[x] ? y : x));
  const preferred = TRAIT_DISTRACTOR[dominant];
  const keep = new Set([
    ...wrong.filter(o => o.distractor_type === preferred),
    ...wrong.filter(o => o.distractor_type !== preferred),
  ].slice(0, maxWrong));
  return options.filter(o => o.is_correct || keep.has(o));
}
