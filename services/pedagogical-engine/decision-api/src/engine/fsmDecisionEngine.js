/**
 * State-Aware Constrained FSM Decision Engine for ADHD Pedagogical Agent (Steps 5 & 6)
 *
 * Research module implementing the Finite State Machine (FSM) rules
 * to adapt real-time pedagogical interventions based on:
 *  - Behavioral Telemetry (Idle time, response latency, clicking frequency)
 *  - Multimodal Attention Fusion (Optional Peer Camera + Gameplay Telemetry)
 *  - Cognitive & Affective States (Inattention index, Frustration flag, Persistence)
 *  - AD-BKT (Attention-Disentangled Mastery P(L), Mastery Protection, Slip Detection)
 *  - Stability-Based Forgetting & Spaced Revision (R(t) = exp(-Δt / S_t), REVISION_DUE)
 *  - Expected Mastery Gain (EMG) Optimal Challenge Difficulty Selector (Zone of Proximal Development)
 *  - Teacher (HITL) Explainable Decision Rationale Logs (Step 6)
 */

export const FSM_STATES = {
  OBSERVING: 'OBSERVING',
  ATTENTION_REDIRECT: 'ATTENTION_REDIRECT',
  DISTRACTED_RE_ENGAGE: 'DISTRACTED_RE_ENGAGE',
  REVISION_DUE: 'REVISION_DUE',
  HINT_SCAFFOLDING: 'HINT_SCAFFOLDING',
  FRUSTRATION_REGULATION: 'FRUSTRATION_REGULATION',
  IMPULSE_BRAKING: 'IMPULSE_BRAKING',
  MASTERY_REINFORCEMENT: 'MASTERY_REINFORCEMENT'
};

/**
 * Step 5 Novelty: Expected Mastery Gain (EMG) Optimal Challenge Difficulty Selector
 * Evaluates candidate difficulty tiers (EASY_WARMUP, OPTIMAL_FLOW, CHALLENGE_STRETCH)
 * to maximize Expected Mastery Gain while penalizing frustration and cognitive overload.
 */
export function selectOptimalChallengeDifficulty(context = {}) {
  const pL = Math.max(0.05, Math.min(0.99, Number(context.bktKnowledge ?? 0.20)));
  const retention = Math.max(0.10, Math.min(1.0, Number(context.retentionScore ?? 1.0)));
  const inatt = Math.max(0.0, Math.min(1.0, Number(context.inattentionIndex ?? 0.1)));
  const frust = Math.max(0.0, Math.min(1.0, Number(context.frustrationIndex ?? 0.0)));
  const revisionRecommended = Boolean(context.revisionRecommended || retention < 0.70);

  const candidates = [
    {
      level: 'EASY_SCAFFOLD',
      labelSinhala: 'පහසු පුහුණු මට්ටම (Warm-up / Micro-Review)',
      difficultyFactor: 0.30,
      targetSuccessProb: Math.min(0.95, 0.55 + 0.40 * pL * retention)
    },
    {
      level: 'OPTIMAL_ZPD',
      labelSinhala: 'ප්‍රශස්ත අභියෝග මට්ටම (Optimal Flow ZPD)',
      difficultyFactor: 0.60,
      targetSuccessProb: Math.min(0.90, 0.35 + 0.52 * pL * retention)
    },
    {
      level: 'CHALLENGE_MASTERY',
      labelSinhala: 'ඉහළ ප්‍රගුණතා අභියෝගය (Mastery Stretch)',
      difficultyFactor: 0.85,
      targetSuccessProb: Math.min(0.85, 0.20 + 0.60 * pL * retention)
    }
  ];

  // Expected Mastery Gain (EMG) peaks when predicted success is near the ZPD sweet spot (~0.72)
  // and is penalized if frustration or inattention is high for harder items.
  let bestCandidate = candidates[0];
  let bestEmg = -Infinity;

  for (const cand of candidates) {
    const zpdProximity = 1.0 - Math.abs(cand.targetSuccessProb - 0.72);
    const infoGain = 4.0 * cand.targetSuccessProb * (1.0 - cand.targetSuccessProb); // Max 1.0 at p=0.5
    const overloadPenalty = cand.difficultyFactor * (0.55 * frust + 0.35 * inatt);
    const revisionBonus = revisionRecommended && cand.level === 'EASY_SCAFFOLD' ? 0.35 : 0.0;
    const masteryBonus = pL >= 0.80 && cand.level === 'CHALLENGE_MASTERY' && frust < 0.30 ? 0.25 : 0.0;

    const emgScore = Math.max(
      0.05,
      0.50 * zpdProximity + 0.35 * infoGain - overloadPenalty + revisionBonus + masteryBonus
    );
    cand.expectedMasteryGain = Number(emgScore.toFixed(3));

    if (emgScore > bestEmg) {
      bestEmg = emgScore;
      bestCandidate = cand;
    }
  }

  return {
    recommendedDifficulty: bestCandidate.level,
    labelSinhala: bestCandidate.labelSinhala,
    expectedMasteryGain: bestCandidate.expectedMasteryGain,
    predictedSuccessProb: Number(bestCandidate.targetSuccessProb.toFixed(2)),
    candidates: candidates.map((c) => ({
      level: c.level,
      expectedMasteryGain: c.expectedMasteryGain,
      predictedSuccessProb: Number(c.targetSuccessProb.toFixed(2))
    }))
  };
}

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

  // PRIORITY 3: Multimodal Distraction & Attention Slip Re-Engagement (Step 5 Novelty)
  // Triggers when peer camera attention drops (< 45%) or fused inattention is severe with an attention slip.
  {
    id: 'RULE_DISTRACTED_RE_ENGAGE',
    alias: 'RULE_MULTIMODAL_RE_ENGAGE',
    name: 'Multimodal Distraction Re-engagement',
    description: 'Triggers when optional peer camera detects gaze drift (cameraAttentionScore <= 0.45) or an AD-BKT attention slip is flagged. Re-engages focus while protecting mastery.',
    targetState: FSM_STATES.DISTRACTED_RE_ENGAGE,
    action: 'RE_ENGAGE_BRAIN_BREAK',
    animation: 'wave',
    targetHintLevel: 0,
    messageSinhala: 'පොඩ්ඩක් තිරය දෙස බලමුද? ඔයාගේ ලකුණු ආරක්ෂිතයි! අපි අවධානයෙන් මේ පියවර කරමු.',
    condition: (ctx) =>
      (ctx.cameraPermissionGranted === true && typeof ctx.cameraAttentionScore === 'number' && ctx.cameraAttentionScore <= 0.45) ||
      (ctx.isAttentionSlip === true && ctx.inattentionIndex >= 0.55)
  },

  // PRIORITY 4: Forgetting-Aware Spaced Revision Trigger (Step 4 & Step 5 Novelty)
  // Triggers when Ebbinghaus retention R(t) = exp(-Δt/S_t) falls below 0.70 after a time gap.
  {
    id: 'RULE_REVISION_DUE',
    alias: 'RULE_SPACED_REVISION',
    name: 'Spaced Memory Revision Trigger',
    description: 'Triggers when knowledge retention R(t) drops below 70% across elapsed days (revisionRecommended = true). Schedules a quick warm-up review before new difficulty.',
    targetState: FSM_STATES.REVISION_DUE,
    action: 'SCHEDULE_SPACED_REVIEW',
    animation: 'thinking',
    targetHintLevel: 1,
    messageSinhala: 'දවස් කිහිපයකට පසු අපි නැවත හමුවුණා! මුලින්ම පොඩි පුනරීක්ෂණ ප්‍රශ්නයකින් මතකය අලුත් කරගමු.',
    condition: (ctx) => ctx.revisionRecommended === true || (typeof ctx.retentionScore === 'number' && ctx.retentionScore < 0.70)
  },

  // PRIORITY 5: Mastery Attainment Celebration (High Knowledge Milestone)
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

  // PRIORITY 6: Independent Success Reinforcement (Autonomous Mastery Praise)
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

  // PRIORITY 7: Hint-Assisted Success Reinforcement (Effort Praise)
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

  // PRIORITY 8: Knowledge-Adaptive Slip Verification (High P(L) Careless Error)
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

  // PRIORITY 9: Attentional Lapse Re-engagement (Idle Latency / Drift Cue)
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

  // PRIORITY 10: Repeated Failure Initial Scaffolding
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

  // PRIORITY 11: Progressive Scaffolding Escalation
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

  // PRIORITY 12: Baseline Passive Observation (Default fallback)
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

/**
 * Step 6 Novelty: Builds human-readable, explainable clinical/pedagogical decision rationale
 * for Teachers & Parents (HITL Dashboard).
 */
export function buildTeacherExplainableRationale(matchedRule, safeContext, challengeRecommendation) {
  const fusionMode = safeContext.cameraPermissionGranted
    ? `Multimodal (Cam ${Math.round((safeContext.cameraAttentionScore ?? 0.85) * 100)}% + Gameplay)`
    : 'Privacy-Safe Telemetry Fallback (Camera OFF)';
  const pLPct = Math.round((safeContext.bktKnowledge ?? 0.20) * 100);
  const retPct = Math.round((safeContext.retentionScore ?? 1.0) * 100);

  let whyTriggered = matchedRule.description;
  if (matchedRule.id === 'RULE_DISTRACTED_RE_ENGAGE') {
    whyTriggered = safeContext.cameraPermissionGranted
      ? `Peer camera attention dropped to ${Math.round((safeContext.cameraAttentionScore ?? 0.4) * 100)}% with fused I_att=${Math.round(safeContext.inattentionIndex * 100)}%. AD-BKT protected mastery (${pLPct}%) from false demotion.`
      : `Attention slip detected via RT Z-score / idle drift (I_att=${Math.round(safeContext.inattentionIndex * 100)}%). AD-BKT shielded mastery (${pLPct}%).`;
  } else if (matchedRule.id === 'RULE_REVISION_DUE') {
    whyTriggered = `Memory retention R(t)=${retPct}% fell below the 70% spaced-retrieval threshold across Δt=${safeContext.elapsedDays ?? 0}d (Stability S_t=${safeContext.memoryStability ?? 3.0}d).`;
  } else if (matchedRule.id === 'RULE_5') {
    whyTriggered = `Impulsive error (<1.5s latency) detected. Applied cognitive braking before hint scaffolding to curb fast-fire guessing.`;
  } else if (matchedRule.id === 'RULE_FRUSTRATION') {
    whyTriggered = `Affective frustration index reached ${Math.round(safeContext.frustrationIndex * 100)}% (${safeContext.consecutiveErrors} consecutive errors). Prioritized emotional co-regulation.`;
  }

  return {
    summary: `[${matchedRule.id}] ${matchedRule.name} → ${matchedRule.action}`,
    whyTriggered,
    fusionSource: fusionMode,
    masteryAndRetention: `AD-BKT P(L): ${pLPct}% | Retention R(t): ${retPct}%`,
    difficultyRationale: `Selected ${challengeRecommendation.recommendedDifficulty} (Expected Mastery Gain: +${Math.round(
      challengeRecommendation.expectedMasteryGain * 100
    )}%, P(Success): ${Math.round(challengeRecommendation.predictedSuccessProb * 100)}%)`
  };
}

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
   * Includes cooldown enforcement to prevent "nagging agent" intervention spamming,
   * Expected Mastery Gain difficulty selection (Step 5), and Teacher Explainable Logs (Step 6).
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
      isAttentionSlip: context.isAttentionSlip ?? false,
      cameraPermissionGranted: context.cameraPermissionGranted ?? false,
      cameraAttentionScore: context.cameraAttentionScore ?? null,
      retentionScore: context.retentionScore ?? 1.0,
      memoryStability: context.memoryStability ?? 3.0,
      elapsedDays: context.elapsedDays ?? 0,
      revisionRecommended: context.revisionRecommended ?? false,
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

    // Direct event feedbacks bypass passive cooldown
    const isDirectEventFeedback = [
      'ENCOURAGE_PAUSE',
      'CALM_AND_REGULATE',
      'RE_ENGAGE_BRAIN_BREAK',
      'SCHEDULE_SPACED_REVIEW',
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

    // Step 5: Compute Expected Mastery Gain (EMG) Optimal Challenge Difficulty
    const challengeRecommendation = selectOptimalChallengeDifficulty(safeContext);

    // Step 6: Build Explainable Teacher (HITL) Decision Rationale
    const explainableRationale = buildTeacherExplainableRationale(
      matchedRule,
      safeContext,
      challengeRecommendation
    );

    const timestamp = new Date().toISOString();

    // Keep recent history (last 10 transitions) with explainable rationales
    this.stateHistory.push({
      timestamp,
      ruleId: matchedRule.id,
      ruleName: matchedRule.name,
      state: this.currentState,
      previousState,
      action: matchedRule.action,
      recommendedDifficulty: challengeRecommendation.recommendedDifficulty,
      expectedMasteryGain: challengeRecommendation.expectedMasteryGain,
      rationale: explainableRationale.whyTriggered,
      fusionSource: explainableRationale.fusionSource
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
        shouldTriggerAnimation,
        recommendedDifficulty: challengeRecommendation.recommendedDifficulty,
        expectedMasteryGain: challengeRecommendation.expectedMasteryGain
      },
      challengeRecommendation,
      explainableRationale,
      recentDecisionLogs: [...this.stateHistory].reverse(),
      meta: {
        isCooldownActive,
        timeSinceLastInterventionMs: timeSinceLastIntervention,
        interventionCount: this.interventionCount
      },
      evaluatedContext: safeContext,
      timestamp
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
