import type { HintLevel } from './agent.types';

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
