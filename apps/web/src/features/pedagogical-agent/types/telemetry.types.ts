import type { HintLevel, AgentAnimation } from './agent.types';

/**
 * Standard Telemetry Schema for Pedagogical Engine & Hint-Aware BKT
 */
export interface InteractionEvent {
  id: string;
  sessionId: string;
  studentId: string;
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

export interface LearnerMetrics {
  inattentionIndex: number; // 0.0 to 1.0
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
  cognitiveState: CognitiveState;
  recommendedIntervention: PedagogicalIntervention;
}

/**
 * Real-time comparison between Standard BKT and Hint-Aware ADHD BKT
 */
export interface BKTComparisonState {
  hintAwareKnowledge: number;         // P(L) in [0, 1]
  standardKnowledge: number;          // P(L_std) in [0, 1]
  predictedNextCorrect: number;       // P(C_{t+1}) in [0, 1]
  effectiveSlip: number;              // P(S_eff)
  effectiveGuess: number;             // P(G_eff)
  isMastered: boolean;                // P(L) >= 0.85
  overestimationGap: number;          // standardKnowledge - hintAwareKnowledge
}

/**
 * Finite State Machine (FSM) Decision Engine Types (Task #21)
 */
export type FSMState =
  | 'OBSERVING'
  | 'ATTENTION_REDIRECT'
  | 'HINT_SCAFFOLDING'
  | 'FRUSTRATION_REGULATION'
  | 'IMPULSE_BRAKING'
  | 'MASTERY_REINFORCEMENT';

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
  };
  timestamp: string;
}
