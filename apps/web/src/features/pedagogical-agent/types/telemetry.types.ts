import type { HintLevel, AgentAnimation } from './agent.types';

/**
 * Standard Telemetry Schema for Pedagogical Engine & Hint-Aware BKT
 */
export interface InteractionEvent {
  id: string;
  sessionId: string;
  studentId: string;
  learnerId?: string;
  parentId?: string;
  studentName?: string;
  grade?: number;
  questionId: string;
  concept: string; // e.g. 'single_digit_addition'
  
  eventType: 'QUESTION_VIEW' | 'ANSWER_SUBMIT' | 'HINT_REQUEST' | 'QUESTION_RESET' | 'IDLE_TIMEOUT';
  
  attemptNumber: number;
  selectedAnswer?: string | number;
  isCorrect?: boolean;
  
  hintLevelReached: HintLevel;
  totalHintsRequested: number;
  
  responseTimeMs: number;
  idleTimeBeforeFirstActionMs: number;
  remainingTimeMs?: number;
  timeLimitMs?: number;
  cameraPermissionGranted?: boolean;
  cameraAttentionScore?: number | null;
  
  timestamp: string; // ISO 8601 string
}

export interface SessionMetrics {
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  totalHintsCount: number;
  avgResponseTimeMs: number;
  streak: number;
}

/**
 * Real-time Cognitive State classifications for ADHD learners
 */
export type CognitiveState =
  | 'NORMAL'
  | 'FOCUSED_FLOW'
  | 'INATTENTIVE_DRIFT'
  | 'FRUSTRATED_STRUGGLE'
  | 'IMPULSIVE_GUESSING'
  | 'PRODUCTIVE_STRUGGLE';

export interface PersonalRtBaseline {
  sampleCount: number;
  meanMs: number;
  stdMs: number;
  logMean?: number;
  logStd?: number;
  latestRtZScore: number;
  isRtAnomaly: boolean;
}

export interface AttentionFusionState {
  fusionMode: 'MULTIMODAL_CAMERA_AND_GAMEPLAY' | 'TELEMETRY_ONLY_FALLBACK';
  cameraPermissionGranted: boolean;
  gameplayInattentionIndex: number;
  cameraInattentionIndex: number | null;
  fusedInattentionIndex: number;
  attentionProbability: number;
  isAttentionSlip: boolean;
  personalRtBaseline?: PersonalRtBaseline | null;
}

export interface LearnerMetrics {
  inattentionIndex: number; // 0.0 to 1.0 (Fused)
  gameplayInattentionIndex?: number;
  cameraInattentionIndex?: number | null;
  attentionProbability?: number;
  rtZScore?: number;
  frustrationIndex: number; // 0.0 to 1.0
  persistenceScore: number; // 0.0 to 1.0
  accuracyRate: number;     // 0.0 to 1.0
  consecutiveErrors: number;
  consecutiveCorrect: number;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  totalHintsUsed: number;
  highestHintLevel: number;
}

export interface LearnerFlags {
  isInattentive: boolean;
  isFrustrated: boolean;
  isImpulsive: boolean;
  isAttentionSlip?: boolean;
  needsHintPrompt: boolean;
}

export interface PedagogicalIntervention {
  action: 'GENTLE_PROMPT' | 'OFFER_ASSISTANCE' | 'ENCOURAGE_PAUSE' | 'PRAISE_EFFORT' | 'CELEBRATE' | 'IDLE_OBSERVE';
  animation: AgentAnimation;
  targetHintLevel: HintLevel | null;
  messageSinhala: string;
  reason: string;
}

export interface LearnerState {
  studentId: string;
  sessionId: string;
  evaluatedAt: string;
  metrics: LearnerMetrics;
  flags: LearnerFlags;
  attentionFusion?: AttentionFusionState;
  cognitiveState: CognitiveState;
  recommendedIntervention: PedagogicalIntervention;
}

/**
 * Real-time comparison between Standard BKT and Hint-Aware ADHD BKT
 */
export interface BKTComparisonState {
  hintAwareKnowledge: number;         // P(L) in [0, 1] (AD-BKT)
  standardKnowledge: number;          // P(L_std) in [0, 1]
  predictedNextCorrect: number;       // P(C_{t+1}) in [0, 1]
  effectiveSlip: number;              // P(S_eff)
  effectiveGuess: number;             // P(G_eff)
  isMastered: boolean;                // P(L) >= 0.85
  overestimationGap: number;          // standardKnowledge - hintAwareKnowledge
  // Step 3: AD-BKT False Mastery Demotion Protection
  masteryProtected?: boolean;
  falseDemotionPrevented?: number;
  // Step 4: Stability-Based Forgetting & Knowledge Retention
  retentionScore?: number;            // R(t) = exp(-elapsedDays / memoryStability)
  memoryStability?: number;           // S_t in days
  decayedKnowledge?: number;          // P(L) after time decay
  elapsedDays?: number;               // Simulated or actual elapsed days since practice
  revisionRecommended?: boolean;      // True when R(t) < 0.70
  optimalNextReviewDays?: number;     // -S_t * ln(0.70)
}

/**
 * Finite State Machine (FSM) Decision Engine Types (Task #21 + Steps 5 & 6)
 */
export type FSMState =
  | 'OBSERVING'
  | 'ATTENTION_REDIRECT'
  | 'DISTRACTED_RE_ENGAGE'
  | 'REVISION_DUE'
  | 'HINT_SCAFFOLDING'
  | 'FRUSTRATION_REGULATION'
  | 'IMPULSE_BRAKING'
  | 'MASTERY_REINFORCEMENT';

export type ChallengeDifficultyLevel =
  | 'EASY_SCAFFOLD'
  | 'OPTIMAL_ZPD'
  | 'CHALLENGE_MASTERY';

export interface ChallengeRecommendation {
  recommendedDifficulty: ChallengeDifficultyLevel;
  labelSinhala: string;
  expectedMasteryGain: number;
  predictedSuccessProb: number;
  candidates?: Array<{
    level: ChallengeDifficultyLevel;
    expectedMasteryGain: number;
    predictedSuccessProb: number;
  }>;
}

export interface ExplainableDecisionRationale {
  summary: string;
  whyTriggered: string;
  fusionSource: string;
  masteryAndRetention: string;
  difficultyRationale: string;
}

export interface FSMDecisionLogEntry {
  timestamp: string;
  ruleId: string;
  ruleName: string;
  state: FSMState;
  previousState: FSMState;
  action: string;
  recommendedDifficulty: ChallengeDifficultyLevel;
  expectedMasteryGain: number;
  rationale: string;
  fusionSource: string;
}

export interface FSMDecision {
  fsmState: FSMState;
  previousState: FSMState;
  stateTransitionOccurred: boolean;
  rule: {
    id: string;
    name: string;
    description: string;
  };
  decision: {
    action: string;
    animation: AgentAnimation;
    targetHintLevel: HintLevel | null;
    messageSinhala: string;
    autoOpenHint: boolean;
    recommendedDifficulty?: ChallengeDifficultyLevel;
    expectedMasteryGain?: number;
  };
  challengeRecommendation?: ChallengeRecommendation;
  explainableRationale?: ExplainableDecisionRationale;
  recentDecisionLogs?: FSMDecisionLogEntry[];
  timestamp: string;
}
