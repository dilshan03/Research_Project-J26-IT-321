/**
 * types.ts – Behaviour Monitoring Feature (Component 4, Function 1)
 *
 * Single source of truth for all tracking-related TypeScript types.
 * These mirror the Pydantic schemas in:
 *   services/behaviour-signal-service/app/schemas/events.py
 *
 * Naming convention: camelCase here  ↔  camelCase in Pydantic (model_config
 * uses camelCase alias generator on the Python side).
 */

// ── Event classification ─────────────────────────────────────────────────────

/**
 * Every discrete interaction the tracking engine can emit.
 * Must stay in sync with EventType enum in events.py.
 */
export type EventType =
  | 'click'            // generic mouse click
  | 'touch_start'      // mobile touch
  | 'question_start'   // a micro-step becomes active
  | 'answer_select'    // learner taps an option
  | 'answer_change'    // learner changes a previously tapped option
  | 'answer_submit'    // correct/wrong answer confirmed
  | 'pause_detected'   // idle gap > LONG_PAUSE_THRESHOLD_MS
  | 'inactivity_end'   // returned after inactivity
  | 'game_exit';       // learner left the game

export type ActionType =
  | 'IDENTIFY_ENTITY'
  | 'SELECT_OPERATOR'
  | 'CALCULATE_MICROSTEP';

export type GameTheme =
  | 'VILLAGE_MARKET'
  | 'JUNGLE_ADVENTURE'
  | 'SPACE_QUEST';


// ── Core event object (sent to the backend) ───────────────────────────────────

/**
 * One raw gameplay event — mirrors RawGameplayEvent in events.py.
 *
 * Fields that are not relevant for a given event type should be left
 * as undefined; the backend accepts sparse payloads.
 */
export interface RawGameplayEvent {
  /** Client-generated UUID – prevents duplicates on re-send */
  eventId: string;

  /** Game session UUID – created when the learner presses Play */
  sessionId: string;

  /** Learner profile ID from learner-profile-service */
  learnerId: string;

  /** Blueprint activity_id from content-adaptation-service */
  activityId: string;

  /** Type of interaction */
  eventType: EventType;

  /** UTC timestamp (ISO-8601 string) */
  timestamp: string;

  // ── Step / question context ────────────────────────────────────────
  stepOrder?:      number;       // 1 | 2 | 3
  actionType?:     ActionType;
  questionGrade?:  number;       // 1–5
  gameTheme?:      GameTheme;

  // ── Answer context ─────────────────────────────────────────────────
  selectedOption?: string;       // text_en of the chosen option
  isCorrect?:      boolean;      // true only for answer_submit

  // ── Pointer coordinates (0–1 normalised) ──────────────────────────
  pointerX?: number;
  pointerY?: number;

  // ── Pause / inactivity durations (ms) ─────────────────────────────
  pauseDurationMs?:       number;
  inactivityDurationMs?:  number;

  // ── Arbitrary extra metadata ───────────────────────────────────────
  meta?: Record<string, unknown>;
}


// ── Context threaded through the hook ────────────────────────────────────────

/** Immutable context shared across all tracking calls for one game play. */
export interface TrackingContext {
  sessionId:  string;
  learnerId:  string;
  activityId: string;
  gameTheme:  GameTheme;
  grade:      number;
}

/** Mutable per-step state managed by useGameplayTracker. */
export interface StepTrackingState {
  stepOrder:       number;
  actionType:      ActionType;
  questionStartAt: number;      // Date.now() when step became active
  clickCount:      number;
  lastSelectedOption: string | null;
  answerChanges:   number;
  submissionCount: number;
}


// ── Session open payload ──────────────────────────────────────────────────────

export interface GameSessionCreate {
  sessionId:  string;
  learnerId:  string;
  activityId: string;
  gameTheme?: GameTheme;
  grade?:     number;
}

export interface GameSessionResponse {
  sessionId:  string;
  learnerId:  string;
  activityId: string;
  startedAt:  string;
  status:     'active' | 'finished';
}


// ── Backend response envelope ─────────────────────────────────────────────────

export interface EventBatchResponse {
  success:    boolean;
  stored:     number;
  duplicates: number;
  snapshots:  number;
  message:    string;
}


// ── Tracker hook public API ───────────────────────────────────────────────────

export interface GameplayTrackerAPI {
  /** Call when the learner navigates to a new micro-step. */
  onStepStart: (stepOrder: number, actionType: ActionType) => void;

  /** Call when the learner taps an answer option. */
  onAnswerSelect: (optionText: string) => void;

  /** Call when a correct or incorrect answer is confirmed. */
  onAnswerSubmit: (optionText: string, isCorrect: boolean) => void;

  /** Call when the learner exits (Back / Finish button). */
  onGameExit: () => void;

  /** Whether the tracker is actively connected and buffering events. */
  isTracking: boolean;
}
