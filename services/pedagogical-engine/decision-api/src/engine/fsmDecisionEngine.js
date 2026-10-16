/**
 * FSM Decision Engine for ADHD Pedagogical Agent
 * 
 * Research module implementing the Finite State Machine (FSM) rules
 * to adapt real-time pedagogical interventions based on:
 *  - Behavioral Telemetry (Idle time, response latency)
 *  - Cognitive & Affective States (Inattention index, Frustration flag, Persistence)
 *  - Hint-Aware Bayesian Knowledge Tracing (P(L), Mastery Threshold)
 */

export const FSM_STATES = {
  OBSERVING: 'OBSERVING',
  ATTENTION_REDIRECT: 'ATTENTION_REDIRECT',
  HINT_SCAFFOLDING: 'HINT_SCAFFOLDING',
  FRUSTRATION_REGULATION: 'FRUSTRATION_REGULATION',
  IMPULSE_BRAKING: 'IMPULSE_BRAKING',
  MASTERY_REINFORCEMENT: 'MASTERY_REINFORCEMENT'
};

export const FSM_RULES = [
  {
    id: 'RULE_1',
    name: 'Repeated Failure Scaffolding',
    description: 'Triggers when student has 2 consecutive errors without having used hints.',
    targetState: FSM_STATES.HINT_SCAFFOLDING,
    action: 'OFFER_ASSISTANCE',
    animation: 'thinking',
    targetHintLevel: 1,
    messageSinhala: 'කලබල වෙන්න එපා! අපි පළවෙනි හෝඩුවාවෙන් පටන් ගමු.',
    condition: (ctx) => ctx.consecutiveErrors >= 2 && ctx.highestHintLevel === 0
  },
  {
    id: 'RULE_2',
    name: 'Attentional Lapse Re-engagement',
    description: 'Triggers when idle time exceeds 15s or inattention index >= 0.65.',
    targetState: FSM_STATES.ATTENTION_REDIRECT,
    action: 'GENTLE_PROMPT',
    animation: 'wave',
    targetHintLevel: 1,
    messageSinhala: 'අපි ඊළඟ පියවර කරමුද? මම ඔයාට උදව් කරන්න ලෑස්තියි!',
    condition: (ctx) => ctx.currentIdleTimeMs >= 15000 || ctx.inattentionIndex >= 0.65
  },
  {
    id: 'RULE_3',
    name: 'Hint-Assisted Success Reinforcement',
    description: 'Triggers when student solves problem correctly using higher hint scaffolding (L3/L4).',
    targetState: FSM_STATES.OBSERVING,
    action: 'PRAISE_EFFORT',
    animation: 'clap',
    targetHintLevel: null,
    messageSinhala: 'නියමයි! හෝඩුවාවේ ආධාරයෙන් ඔයා නිවැරදි උත්තරය සොයාගත්තා. දිගටම කරමු!',
    condition: (ctx) => ctx.lastAnswerIsCorrect === true && ctx.highestHintLevel >= 3
  },
  {
    id: 'RULE_4',
    name: 'Mastery Attainment Celebration',
    description: 'Triggers when BKT knowledge crosses mastery threshold (P(L) >= 0.85) with repeated success.',
    targetState: FSM_STATES.MASTERY_REINFORCEMENT,
    action: 'CELEBRATE',
    animation: 'correctCelebrate',
    targetHintLevel: null,
    messageSinhala: 'විශිෂ්ටයි! ඔයා මේ ගණිත සංකල්පය සම්පූර්ණයෙන්ම ප්‍රගුණ කර අවසන්!',
    condition: (ctx) => ctx.bktKnowledge >= 0.85 && ctx.consecutiveCorrect >= 2
  },
  {
    id: 'RULE_5',
    name: 'Impulsive Guessing Inhibition',
    description: 'Triggers when an incorrect answer is submitted in under 1.5s without reflection.',
    targetState: FSM_STATES.IMPULSE_BRAKING,
    action: 'ENCOURAGE_PAUSE',
    animation: 'encourage',
    targetHintLevel: 1,
    messageSinhala: 'හොඳට ප්‍රශ්නය කියවලා, පොඩ්ඩක් හිතලා උත්තරය තෝරමු.',
    condition: (ctx) => ctx.isImpulsive === true
  },
  {
    id: 'RULE_6',
    name: 'Progressive Scaffolding Escalation',
    description: 'Triggers when student continues failing despite having viewed a lower hint level.',
    targetState: FSM_STATES.HINT_SCAFFOLDING,
    action: 'OFFER_ASSISTANCE',
    animation: 'thinking',
    targetHintLevel: (ctx) => Math.min(4, (ctx.highestHintLevel || 0) + 1),
    messageSinhala: 'තව හෝඩුවාවක් බලමුද? මම ඊළඟ පියවර පැහැදිලි කරන්නම්.',
    condition: (ctx) => ctx.consecutiveErrors >= 2 && ctx.highestHintLevel > 0 && ctx.highestHintLevel < 4
  },
  {
    id: 'RULE_DEFAULT',
    name: 'Baseline Passive Observation',
    description: 'Default state when student is engaged normally within healthy parameters.',
    targetState: FSM_STATES.OBSERVING,
    action: 'IDLE_OBSERVE',
    animation: 'idle',
    targetHintLevel: null,
    messageSinhala: 'ඔයාට පුළුවන්! හොඳට හිතලා බලන්න.',
    condition: () => true
  }
];

export class FSMDecisionEngine {
  constructor(rules = FSM_RULES) {
    this.rules = rules;
    this.currentState = FSM_STATES.OBSERVING;
  }

  /**
   * Evaluates the active context and executes the first matching FSM transition rule.
   * Priority order is defined by the rule order in FSM_RULES.
   */
  evaluate(context = {}) {
    const safeContext = {
      consecutiveErrors: context.consecutiveErrors ?? 0,
      consecutiveCorrect: context.consecutiveCorrect ?? 0,
      highestHintLevel: context.highestHintLevel ?? 0,
      currentIdleTimeMs: context.currentIdleTimeMs ?? 0,
      inattentionIndex: context.inattentionIndex ?? 0.0,
      frustrationIndex: context.frustrationIndex ?? 0.0,
      isImpulsive: context.isImpulsive ?? false,
      isFrustrated: context.isFrustrated ?? false,
      lastAnswerIsCorrect: context.lastAnswerIsCorrect ?? null,
      bktKnowledge: context.bktKnowledge ?? 0.20,
      ...context
    };

    // Find the highest-priority rule whose conditions are satisfied
    let matchedRule = this.rules[this.rules.length - 1]; // fallback default

    for (const rule of this.rules) {
      try {
        if (rule.condition(safeContext)) {
          matchedRule = rule;
          break;
        }
      } catch (err) {
        console.warn(`[FSM] Rule evaluation error on ${rule.id}:`, err.message);
      }
    }

    // Determine target hint level if dynamic
    let hintLevel = matchedRule.targetHintLevel;
    if (typeof hintLevel === 'function') {
      hintLevel = hintLevel(safeContext);
    }

    const previousState = this.currentState;
    this.currentState = matchedRule.targetState;

    return {
      fsmState: this.currentState,
      previousState,
      stateTransitionOccurred: previousState !== this.currentState,
      rule: {
        id: matchedRule.id,
        name: matchedRule.name,
        description: matchedRule.description
      },
      decision: {
        action: matchedRule.action,
        animation: matchedRule.animation,
        targetHintLevel: hintLevel,
        messageSinhala: matchedRule.messageSinhala,
        autoOpenHint: matchedRule.targetState === FSM_STATES.HINT_SCAFFOLDING
      },
      evaluatedContext: safeContext,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset FSM back to OBSERVING state
   */
  reset() {
    this.currentState = FSM_STATES.OBSERVING;
  }
}

export const defaultFSM = new FSMDecisionEngine();
