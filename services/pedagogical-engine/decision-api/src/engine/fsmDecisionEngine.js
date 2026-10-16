/**
 * FSM Decision Engine for ADHD Pedagogical Agent
 * 
 * Research module implementing the Finite State Machine (FSM) rules
 * to adapt real-time pedagogical interventions based on:
 *  - Behavioral Telemetry (Idle time, response latency, clicking frequency)
 *  - Cognitive & Affective States (Inattention index, Frustration flag, Persistence)
 *  - Hint-Aware Bayesian Knowledge Tracing (P(L), Mastery Threshold, Slip Detection)
 *  - Hierarchical Priority & Cooldown Guard (Impulse braking -> Affective regulation -> Success -> Cognitive Scaffolding)
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
  // PRIORITY 1: Impulsive Guessing Inhibition (Immediate behavioral brake)
  // Higher priority than cognitive scaffolding: halt rapid clicking before offering hints.
  {
    id: 'RULE_5',
    alias: 'RULE_IMPULSE_BRAKING',
    name: 'Impulsive Guessing Inhibition',
    description: 'Triggers when an incorrect answer is submitted in under 1.5s without reflection. Halts fast-fire clicking.',
    targetState: FSM_STATES.IMPULSE_BRAKING,
    action: 'ENCOURAGE_PAUSE',
    animation: 'encourage',
    targetHintLevel: 1,
    messageSinhala: 'හොඳට ප්‍රශ්නය කියවලා, පොඩ්ඩක් හිතලා උත්තරය තෝරමු.',
    condition: (ctx) => ctx.isImpulsive === true
  },

  // PRIORITY 2: Affective Co-Regulation (Frustration relief & emotional de-escalation)
  // Resolves student struggle/frustration before pushing academic hints to avoid task abandonment.
  {
    id: 'RULE_FRUSTRATION',
    alias: 'RULE_FRUSTRATION_REGULATION',
    name: 'Affective Frustration Co-Regulation',
    description: 'Triggers when student shows acute frustration (isFrustrated = true or repeated errors with frustration index >= 0.60). Promotes calm breathing & encouragement.',
    targetState: FSM_STATES.FRUSTRATION_REGULATION,
    action: 'CALM_AND_REGULATE',
    animation: 'encourage',
    targetHintLevel: (ctx) => Math.min(4, Math.max(1, ctx.highestHintLevel || 1)),
    messageSinhala: 'කලබල වෙන්න එපා! අපි ගැඹුරු හුස්මක් අරන් පොඩ්ඩක් විවේකීව බලමු. ඔයාට මේක කරන්න පුළුවන්.',
    condition: (ctx) => ctx.isFrustrated === true || (ctx.consecutiveErrors >= 3 && ctx.frustrationIndex >= 0.60)
  },

  // PRIORITY 3: Mastery Attainment Celebration (High Knowledge Milestone)
  {
    id: 'RULE_4',
    alias: 'RULE_MASTERY_CELEBRATION',
    name: 'Mastery Attainment Celebration',
    description: 'Triggers when BKT knowledge crosses mastery threshold (P(L) >= 0.85) with repeated success.',
    targetState: FSM_STATES.MASTERY_REINFORCEMENT,
    action: 'CELEBRATE',
    animation: 'correctCelebrate',
    targetHintLevel: null,
    messageSinhala: 'විශිෂ්ටයි! ඔයා මේ ගණිත සංකල්පය සම්පූර්ණයෙන්ම ප්‍රගුණ කර අවසන්!',
    condition: (ctx) => ctx.bktKnowledge >= 0.85 && ctx.consecutiveCorrect >= 2
  },

  // PRIORITY 4: Independent Success Reinforcement (Autonomous Mastery Praise)
  // Positive reinforcement when student answers correctly without relying on heavy scaffolding.
  {
    id: 'RULE_AUTONOMY_PRAISE',
    alias: 'RULE_INDEPENDENT_SUCCESS',
    name: 'Autonomous Success Praise',
    description: 'Triggers when student answers correctly without heavy hint scaffolding (Hint Level <= 1). Delivers immediate positive reinforcement.',
    targetState: FSM_STATES.OBSERVING,
    action: 'PRAISE_AUTONOMY',
    animation: 'correctCelebrate',
    targetHintLevel: null,
    messageSinhala: 'විශිෂ්ටයි! කිසිම උදව්වක් නැතුව ඔයා තනියම නිවැරදි උත්තරය සොයාගත්තා!',
    condition: (ctx) => ctx.lastAnswerIsCorrect === true && (ctx.highestHintLevel == null || ctx.highestHintLevel <= 1)
  },

  // PRIORITY 5: Hint-Assisted Success Reinforcement (Effort Praise)
  {
    id: 'RULE_3',
    alias: 'RULE_HINT_ASSISTED_SUCCESS',
    name: 'Hint-Assisted Success Reinforcement',
    description: 'Triggers when student solves problem correctly using higher hint scaffolding (L2-L4). Praises persistence without over-attributing unassisted competence.',
    targetState: FSM_STATES.OBSERVING,
    action: 'PRAISE_EFFORT',
    animation: 'clap',
    targetHintLevel: null,
    messageSinhala: 'නියමයි! හෝඩුවාවේ ආධාරයෙන් ඔයා නිවැරදි උත්තරය සොයාගත්තා. දිගටම කරමු!',
    condition: (ctx) => ctx.lastAnswerIsCorrect === true && ctx.highestHintLevel >= 2
  },

  // PRIORITY 6: Knowledge-Adaptive Slip Verification (High P(L) Careless Error)
  // Avoids giving hints to high-knowledge students who merely made an attentional slip.
  {
    id: 'RULE_KNOWLEDGE_SLIP',
    alias: 'RULE_HIGH_KNOWLEDGE_SLIP',
    name: 'Knowledge-Adaptive Slip Verification',
    description: 'Triggers when a high-knowledge student (P(L) >= 0.65) makes an unassisted error. Prompts verification rather than unnecessary scaffolding.',
    targetState: FSM_STATES.OBSERVING,
    action: 'VERIFY_ATTENTION',
    animation: 'thinking',
    targetHintLevel: 0,
    messageSinhala: 'ඔයා මේ ගණිත ක්‍රමය හොඳට දන්නවා! පොඩි අතපසුවීමක් උනේ, ආයෙත් ගණනය කර බලන්න.',
    condition: (ctx) => ctx.consecutiveErrors >= 1 && ctx.bktKnowledge >= 0.65 && (ctx.highestHintLevel === 0 || ctx.highestHintLevel == null) && ctx.lastAnswerIsCorrect === false
  },

  // PRIORITY 7: Attentional Lapse Re-engagement (Idle Latency / Drift Cue)
  {
    id: 'RULE_2',
    alias: 'RULE_ATTENTION_REDIRECT',
    name: 'Attentional Lapse Re-engagement',
    description: 'Triggers when idle time exceeds 15s or inattention index >= 0.65. Gentle re-orientation cue.',
    targetState: FSM_STATES.ATTENTION_REDIRECT,
    action: 'GENTLE_PROMPT',
    animation: 'wave',
    targetHintLevel: 1,
    messageSinhala: 'අපි ඊළඟ පියවර කරමුද? මම ඔයාට උදව් කරන්න ලෑස්තියි!',
    condition: (ctx) => ctx.currentIdleTimeMs >= 15000 || ctx.inattentionIndex >= 0.65
  },

  // PRIORITY 8: Repeated Failure Initial Scaffolding
  {
    id: 'RULE_1',
    alias: 'RULE_REPEATED_FAILURE_SCAFFOLDING',
    name: 'Repeated Failure Scaffolding',
    description: 'Triggers when student has 2 consecutive errors without having used hints.',
    targetState: FSM_STATES.HINT_SCAFFOLDING,
    action: 'OFFER_ASSISTANCE',
    animation: 'thinking',
    targetHintLevel: 1,
    messageSinhala: 'කලබල වෙන්න එපා! අපි පළවෙනි හෝඩුවාවෙන් පටන් ගමු.',
    condition: (ctx) => ctx.consecutiveErrors >= 2 && ctx.highestHintLevel === 0
  },

  // PRIORITY 9: Progressive Scaffolding Escalation
  {
    id: 'RULE_6',
    alias: 'RULE_PROGRESSIVE_SCAFFOLDING',
    name: 'Progressive Scaffolding Escalation',
    description: 'Triggers when student continues failing despite having viewed a lower hint level.',
    targetState: FSM_STATES.HINT_SCAFFOLDING,
    action: 'OFFER_ASSISTANCE',
    animation: 'thinking',
    targetHintLevel: (ctx) => Math.min(4, (ctx.highestHintLevel || 0) + 1),
    messageSinhala: 'තව හෝඩුවාවක් බලමුද? මම ඊළඟ පියවර පැහැදිලි කරන්නම්.',
    condition: (ctx) => ctx.consecutiveErrors >= 2 && ctx.highestHintLevel > 0 && ctx.highestHintLevel < 4
  },

  // PRIORITY 10: Baseline Passive Observation (Default fallback)
  {
    id: 'RULE_DEFAULT',
    alias: 'RULE_DEFAULT',
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
  constructor(rules = FSM_RULES, { cooldownMs = 12000 } = {}) {
    this.rules = rules;
    this.currentState = FSM_STATES.OBSERVING;
    this.lastInterventionTime = 0;
    this.lastInterventionAction = null;
    this.interventionCount = 0;
    this.cooldownMs = cooldownMs;
    this.stateHistory = [];
  }

  /**
   * Evaluates the active context and executes the highest-priority matching FSM transition rule.
   * Includes cooldown enforcement to prevent "nagging agent" intervention spamming.
   */
  evaluate(context = {}, options = {}) {
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

    // Cooldown & Throttling evaluation
    const now = Date.now();
    const timeSinceLastIntervention = now - this.lastInterventionTime;
    const isCooldownActive = timeSinceLastIntervention < this.cooldownMs;

    // Direct event feedbacks (praise, braking, celebration, frustration soothing) bypass passive cooldown
    const isDirectEventFeedback = [
      'ENCOURAGE_PAUSE',
      'CALM_AND_REGULATE',
      'CELEBRATE',
      'PRAISE_AUTONOMY',
      'PRAISE_EFFORT',
      'VERIFY_ATTENTION'
    ].includes(matchedRule.action);

    let shouldTriggerAnimation = true;
    if (!isDirectEventFeedback && isCooldownActive && this.lastInterventionAction === matchedRule.action) {
      shouldTriggerAnimation = false;
    }

    if (matchedRule.action !== 'IDLE_OBSERVE' && shouldTriggerAnimation) {
      this.lastInterventionTime = now;
      this.lastInterventionAction = matchedRule.action;
      this.interventionCount++;
    }

    // Keep recent history (last 10 transitions)
    this.stateHistory.push({
      timestamp: new Date().toISOString(),
      ruleId: matchedRule.id,
      state: this.currentState,
      action: matchedRule.action
    });
    if (this.stateHistory.length > 10) {
      this.stateHistory.shift();
    }

    return {
      fsmState: this.currentState,
      previousState,
      stateTransitionOccurred: previousState !== this.currentState,
      rule: {
        id: matchedRule.id,
        alias: matchedRule.alias,
        name: matchedRule.name,
        description: matchedRule.description
      },
      decision: {
        action: matchedRule.action,
        animation: matchedRule.animation,
        targetHintLevel: hintLevel,
        messageSinhala: matchedRule.messageSinhala,
        autoOpenHint: matchedRule.targetState === FSM_STATES.HINT_SCAFFOLDING,
        shouldTriggerAnimation
      },
      meta: {
        isCooldownActive,
        timeSinceLastInterventionMs: timeSinceLastIntervention,
        interventionCount: this.interventionCount
      },
      evaluatedContext: safeContext,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset FSM back to OBSERVING state and clear intervention cooldowns
   */
  reset() {
    this.currentState = FSM_STATES.OBSERVING;
    this.lastInterventionTime = 0;
    this.lastInterventionAction = null;
    this.interventionCount = 0;
    this.stateHistory = [];
  }
}

export const defaultFSM = new FSMDecisionEngine();
