/**
 * LearnerStateBuilder
 * 
 * Research Module for ADHD Pedagogical Engine.
 * Constructs real-time cognitive and behavioural metrics from student telemetry streams:
 *  - Inattention Index (I_att in [0, 1])
 *  - Frustration Index (F_rust in [0, 1]) & Frustration Flag
 *  - Persistence Score (P_persist in [0, 1])
 *  - Cognitive State Classification (FOCUSED_FLOW, INATTENTIVE_DRIFT, FRUSTRATED_STRUGGLE, IMPULSIVE_GUESSING, NORMAL)
 *  - Pedagogical Intervention Recommendations for 3D Companion Agent
 */

export const THRESHOLDS = {
  MIN_IMPULSIVE_RESPONSE_TIME_MS: 1500,   // Submissions under 1.5s indicate impulsive guessing
  OPTIMAL_RESPONSE_TIME_MS: 6000,         // Normal thoughtful response latency (~6s)
  MODERATE_IDLE_TIME_MS: 10000,           // > 10s idle indicates mild distraction
  SEVERE_IDLE_TIME_MS: 20000,             // > 20s idle indicates significant inattention/freeze
  RAGE_CLICK_INTERVAL_MS: 2500,           // Rapid repeated wrong clicks indicate agitation
  CONSECUTIVE_ERRORS_FOR_FRUSTRATION: 2,  // 2+ consecutive errors trigger frustration flag
  FRUSTRATION_CUTOFF: 0.65,               // Threshold for isFrustrated
  INATTENTION_CUTOFF: 0.60,               // Threshold for isInattentive
};

/**
 * Builds the comprehensive learner state from an array of interaction events
 * @param {Array} interactions - Telemetry events sorted chronologically (or reverse)
 * @param {Object} options - Configuration overrides
 * @returns {Object} Real-time learner state
 */
export function buildLearnerState(interactions = [], options = {}) {
  if (!Array.isArray(interactions) || interactions.length === 0) {
    return createDefaultLearnerState();
  }

  // Ensure chronological order (oldest to newest)
  const sorted = [...interactions].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.receivedAt || 0).getTime();
    const timeB = new Date(b.timestamp || b.receivedAt || 0).getTime();
    return timeA - timeB;
  });

  const recentWindow = sorted.slice(-10); // Evaluate last 10 interactions for real-time reactivity
  const latest = recentWindow[recentWindow.length - 1];

  // 1. Compute Base Counts & Streaks
  let totalAttempts = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let consecutiveErrors = 0;
  let consecutiveCorrect = 0;
  let totalHintsUsed = 0;
  let highestHintLevel = 0;
  let recentResponseTimes = [];
  let recentIdleTimes = [];

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];

    if (ev.eventType === 'ANSWER_SUBMIT') {
      totalAttempts++;
      if (ev.isCorrect === true) {
        correctCount++;
        consecutiveCorrect++;
        consecutiveErrors = 0;
      } else if (ev.isCorrect === false) {
        wrongCount++;
        consecutiveErrors++;
        consecutiveCorrect = 0;
      }

      if (typeof ev.responseTimeMs === 'number' && ev.responseTimeMs > 0) {
        recentResponseTimes.push(ev.responseTimeMs);
      }
      if (typeof ev.idleTimeBeforeFirstActionMs === 'number' && ev.idleTimeBeforeFirstActionMs > 0) {
        recentIdleTimes.push(ev.idleTimeBeforeFirstActionMs);
      }
    } else if (ev.eventType === 'HINT_REQUEST') {
      totalHintsUsed++;
      const lvl = ev.hintLevelReached || ev.hintLevel || 0;
      if (lvl > highestHintLevel) highestHintLevel = lvl;
    }
  }

  // 2. Inattention Index Calculation (0.0 to 1.0)
  const inattentionIndex = calculateInattentionIndex(recentWindow, latest);

  // 3. Frustration Index Calculation (0.0 to 1.0)
  const frustrationIndex = calculateFrustrationIndex(recentWindow, consecutiveErrors);

  // 4. Persistence Score Calculation (0.0 to 1.0)
  const persistenceScore = calculatePersistenceScore(recentWindow, totalAttempts, totalHintsUsed);

  // 5. Accuracy Rate
  const accuracyRate = totalAttempts > 0 ? Number((correctCount / totalAttempts).toFixed(2)) : 0;

  // 6. Flags
  const isInattentive = inattentionIndex >= THRESHOLDS.INATTENTION_CUTOFF;
  const isFrustrated = frustrationIndex >= THRESHOLDS.FRUSTRATION_CUTOFF || consecutiveErrors >= THRESHOLDS.CONSECUTIVE_ERRORS_FOR_FRUSTRATION;
  const isImpulsive = checkImpulsivity(latest);

  // 7. Cognitive State Classification
  const cognitiveState = classifyCognitiveState({
    inattentionIndex,
    frustrationIndex,
    persistenceScore,
    isImpulsive,
    consecutiveErrors,
    accuracyRate,
    totalAttempts
  });

  // 8. Pedagogical Intervention Recommendation
  const recommendation = generatePedagogicalRecommendation(cognitiveState, {
    consecutiveErrors,
    highestHintLevel,
    isFrustrated,
    isInattentive
  });

  return {
    studentId: latest?.studentId || 'unknown',
    sessionId: latest?.sessionId || 'unknown',
    evaluatedAt: new Date().toISOString(),
    metrics: {
      inattentionIndex: Number(inattentionIndex.toFixed(2)),
      frustrationIndex: Number(frustrationIndex.toFixed(2)),
      persistenceScore: Number(persistenceScore.toFixed(2)),
      accuracyRate,
      consecutiveErrors,
      consecutiveCorrect,
      totalAttempts,
      correctCount,
      wrongCount,
      totalHintsUsed,
      highestHintLevel
    },
    flags: {
      isInattentive,
      isFrustrated,
      isImpulsive,
      needsHintPrompt: consecutiveErrors >= 2 && highestHintLevel === 0
    },
    cognitiveState,
    recommendedIntervention: recommendation
  };
}

/**
 * Calculates inattention index using idle latency and response time variance
 */
function calculateInattentionIndex(window, latest) {
  if (!window || window.length === 0) return 0.1;

  let idleScores = [];
  let longPauseCount = 0;

  for (const ev of window) {
    const idle = ev.idleTimeBeforeFirstActionMs || 0;
    const responseTime = ev.responseTimeMs || 0;

    // Idle before first click
    if (idle >= THRESHOLDS.SEVERE_IDLE_TIME_MS) {
      idleScores.push(1.0);
      longPauseCount++;
    } else if (idle >= THRESHOLDS.MODERATE_IDLE_TIME_MS) {
      idleScores.push(idle / THRESHOLDS.SEVERE_IDLE_TIME_MS);
      longPauseCount++;
    } else {
      idleScores.push(Math.max(0.05, idle / THRESHOLDS.SEVERE_IDLE_TIME_MS));
    }

    // Abnormally long overall response time (> 25s)
    if (responseTime > 25000) {
      idleScores.push(Math.min(1.0, (responseTime - 20000) / 20000));
    }

    // Timeout events
    if (ev.eventType === 'IDLE_TIMEOUT') {
      idleScores.push(1.0);
      longPauseCount += 2;
    }
  }

  // Exponential moving average over window
  const avgIdleScore = idleScores.reduce((acc, v) => acc + v, 0) / (idleScores.length || 1);

  // Boost if current latest action itself was delayed
  let currentBoost = 0;
  if (latest?.idleTimeBeforeFirstActionMs >= THRESHOLDS.SEVERE_IDLE_TIME_MS) {
    currentBoost = 0.25;
  }

  const result = Math.min(1.0, avgIdleScore * 0.75 + (longPauseCount > 1 ? 0.2 : 0) + currentBoost);
  return Math.max(0.0, result);
}

/**
 * Calculates frustration index from consecutive failures, rapid rage clicks, and hint stalls
 */
function calculateFrustrationIndex(window, consecutiveErrors) {
  let score = 0.0;

  // Contribution from consecutive errors
  if (consecutiveErrors === 1) score += 0.25;
  else if (consecutiveErrors === 2) score += 0.65;
  else if (consecutiveErrors >= 3) score += 0.90;

  // Check for rapid successive wrong answers (rage / impulsive clicks < 2.5s)
  const answers = window.filter((e) => e.eventType === 'ANSWER_SUBMIT');
  for (let i = 1; i < answers.length; i++) {
    const prev = answers[i - 1];
    const curr = answers[i];
    if (prev.isCorrect === false && curr.isCorrect === false) {
      const delta = (curr.responseTimeMs || 0);
      if (delta > 0 && delta < THRESHOLDS.RAGE_CLICK_INTERVAL_MS) {
        score += 0.25; // Repeated fast failure indicates emotional agitation
      }
    }
  }

  // Struggled despite higher hints (reached Level 3 or 4 hint but failed)
  const failedAfterHighHint = window.some(
    (e) => e.eventType === 'ANSWER_SUBMIT' && e.isCorrect === false && (e.hintLevelReached >= 3 || e.hintLevel >= 3)
  );
  if (failedAfterHighHint) {
    score += 0.20;
  }

  // If latest answer was correct, relieve frustration significantly
  const latestAnswer = answers[answers.length - 1];
  if (latestAnswer && latestAnswer.isCorrect === true) {
    score = score * 0.35;
  }

  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Measures student persistence and constructive learning effort
 */
function calculatePersistenceScore(window, totalAttempts, totalHintsUsed) {
  if (totalAttempts === 0 && totalHintsUsed === 0) return 0.5;

  let persistence = 0.5;

  // Rewarded for continuing after a mistake
  const answers = window.filter((e) => e.eventType === 'ANSWER_SUBMIT');
  let retriedAfterError = 0;
  for (let i = 1; i < answers.length; i++) {
    if (answers[i - 1].isCorrect === false) {
      retriedAfterError++;
    }
  }
  persistence += retriedAfterError * 0.15;

  // Rewarded for utilizing hints constructively instead of giving up
  if (totalHintsUsed > 0) {
    persistence += Math.min(0.25, totalHintsUsed * 0.08);
  }

  // Rewarded if an error was eventually overcome with a correct answer
  const hasRecovered = answers.some((e, idx) => idx > 0 && e.isCorrect === true && answers[idx - 1].isCorrect === false);
  if (hasRecovered) {
    persistence += 0.20;
  }

  return Math.min(1.0, Math.max(0.1, persistence));
}

/**
 * Detect impulsive guessing behavior
 */
function checkImpulsivity(latest) {
  if (!latest || latest.eventType !== 'ANSWER_SUBMIT') return false;
  return (
    latest.isCorrect === false &&
    typeof latest.responseTimeMs === 'number' &&
    latest.responseTimeMs > 0 &&
    latest.responseTimeMs < THRESHOLDS.MIN_IMPULSIVE_RESPONSE_TIME_MS
  );
}

/**
 * Classify overall cognitive state
 */
function classifyCognitiveState({
  inattentionIndex,
  frustrationIndex,
  persistenceScore,
  isImpulsive,
  consecutiveErrors,
  accuracyRate,
  totalAttempts
}) {
  if (isImpulsive) {
    return 'IMPULSIVE_GUESSING';
  }
  if (frustrationIndex >= THRESHOLDS.FRUSTRATION_CUTOFF || consecutiveErrors >= 2) {
    return 'FRUSTRATED_STRUGGLE';
  }
  if (inattentionIndex >= THRESHOLDS.INATTENTION_CUTOFF) {
    return 'INATTENTIVE_DRIFT';
  }
  if (consecutiveErrors > 0 && persistenceScore >= 0.70) {
    return 'PRODUCTIVE_STRUGGLE';
  }
  if (totalAttempts >= 2 && inattentionIndex < 0.35 && frustrationIndex < 0.35 && accuracyRate >= 0.70) {
    return 'FOCUSED_FLOW';
  }
  return 'NORMAL';
}

/**
 * Recommends companion agent reaction based on cognitive state
 */
function generatePedagogicalRecommendation(cognitiveState, context) {
  switch (cognitiveState) {
    case 'INATTENTIVE_DRIFT':
      return {
        action: 'GENTLE_PROMPT',
        animation: 'wave',
        targetHintLevel: 1,
        messageSinhala: 'අපි ඊළඟ පියවර කරමුද? මම ඔයාට උදව් කරන්න ලෑස්තියි!',
        reason: 'Student idle time exceeded threshold; refocus attention gently.'
      };

    case 'FRUSTRATED_STRUGGLE':
      return {
        action: 'OFFER_ASSISTANCE',
        animation: 'thinking',
        targetHintLevel: Math.min(4, (context.highestHintLevel || 0) + 1),
        messageSinhala: 'කලබල වෙන්න එපා! අපි එකට එකතු වෙලා මේක විසඳමු.',
        reason: 'Repeated errors detected; mitigate frustration with proactive scaffolding.'
      };

    case 'IMPULSIVE_GUESSING':
      return {
        action: 'ENCOURAGE_PAUSE',
        animation: 'idle',
        targetHintLevel: 1,
        messageSinhala: 'හොඳට ප්‍රශ්නය කියවලා, පොඩ්ඩක් හිතලා උත්තරය තෝරමු.',
        reason: 'Rapid incorrect responses detected; encourage deliberate reflection.'
      };

    case 'PRODUCTIVE_STRUGGLE':
      return {
        action: 'PRAISE_EFFORT',
        animation: 'clap',
        targetHintLevel: null,
        messageSinhala: 'නියමයි! ඔයාගේ උත්සාහය ඉතාම අගෙයි, දිගටම කරගෙන යන්න!',
        reason: 'Student shows high persistence despite mistakes; reinforce self-efficacy.'
      };

    case 'FOCUSED_FLOW':
      return {
        action: 'CELEBRATE',
        animation: 'celebrate',
        targetHintLevel: null,
        messageSinhala: 'විශිෂ්ටයි! ඔයා ගණන් හරිම ඉක්මනට සහ නිවැරදිව හදනවා!',
        reason: 'High accuracy and steady attention; reinforce mastery.'
      };

    default:
      return {
        action: 'IDLE_OBSERVE',
        animation: 'idle',
        targetHintLevel: null,
        messageSinhala: 'ඔයාට පුළුවන්! හොඳට හිතලා බලන්න.',
        reason: 'Baseline balanced state; passive encouragement.'
      };
  }
}

/**
 * Default fallback state when no logs exist yet
 */
function createDefaultLearnerState() {
  return {
    studentId: 'unknown',
    sessionId: 'unknown',
    evaluatedAt: new Date().toISOString(),
    metrics: {
      inattentionIndex: 0.1,
      frustrationIndex: 0.0,
      persistenceScore: 0.5,
      accuracyRate: 0,
      consecutiveErrors: 0,
      consecutiveCorrect: 0,
      totalAttempts: 0,
      correctCount: 0,
      wrongCount: 0,
      totalHintsUsed: 0,
      highestHintLevel: 0
    },
    flags: {
      isInattentive: false,
      isFrustrated: false,
      isImpulsive: false,
      needsHintPrompt: false
    },
    cognitiveState: 'NORMAL',
    recommendedIntervention: {
      action: 'IDLE_OBSERVE',
      animation: 'idle',
      targetHintLevel: null,
      messageSinhala: 'අපි ගණන් හදමු! මම ඔයාට උදව් කරන්නම්.',
      reason: 'Initial session baseline.'
    }
  };
}
