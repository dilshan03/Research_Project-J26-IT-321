/**
 * useGameplayTracker.ts – Component 4, Function 1
 * React hook that wires the tracking engine + event buffer into the game.
 *
 * Usage (inside GamePlayer)
 * ─────────────────────────
 *   const tracker = useGameplayTracker({ learnerId, activityId, gameTheme, grade });
 *   // Call tracker.onStepStart()  when a micro-step becomes active
 *   // Call tracker.onAnswerSelect() when learner taps an option
 *   // Call tracker.onAnswerSubmit() when the answer is confirmed
 *   // Call tracker.onGameExit()   when learner presses Back / Finish
 *
 * Tracking is completely automatic after mount:
 *   • All mouse clicks / touches are captured by the engine.
 *   • Long pauses are detected via the inactivity poller.
 *   • Correct/incorrect answers, response times, answer changes are derived
 *     from the semantic events the hook receives.
 *
 * The hook resets per-step counters (clickCount, answerChanges, lastSelected)
 * every time onStepStart is called, so each step is measured independently.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createTrackingEngine } from './trackingEngine';
import { createEventBuffer, generateEventId, nowISO } from './eventBuffer';
import type {
  ActionType,
  EventBufferHandle,
  GameplayTrackerAPI,
  GameTheme,
  RawGameplayEvent,
  StepTrackingState,
  TrackingContext,
  TrackingEngineHandle,
} from './types';

// ── Hook input ────────────────────────────────────────────────────────────────

export interface UseGameplayTrackerOptions {
  /** Learner profile ID (from learner-profile-service). Empty string to disable. */
  learnerId:  string;
  /** Blueprint activity ID (from content-adaptation-service). */
  activityId: string;
  /** Visual theme of the current game. */
  gameTheme:  GameTheme;
  /** Grade level (1-5). */
  grade:      number;
  /**
   * Optional ref to the game container element.
   * When provided, click listeners are scoped to that element;
   * otherwise document-level listeners are used.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGameplayTracker(
  options: UseGameplayTrackerOptions,
): GameplayTrackerAPI {
  const { learnerId, activityId, gameTheme, grade, containerRef } = options;

  // Tracking active only when a real learnerId is provided
  const isTracking = Boolean(learnerId && activityId);

  // Stable refs so the engine / buffer closures don't become stale
  const sessionIdRef  = useRef<string>(generateEventId());   // session UUID
  const stepStateRef  = useRef<StepTrackingState | null>(null);
  const engineRef     = useRef<TrackingEngineHandle | null>(null);
  const bufferRef     = useRef<EventBufferHandle | null>(null);

  const [trackerReady, setTrackerReady] = useState(false);

  // ── Context object (stable reference) ────────────────────────────────────
  const contextRef = useRef<TrackingContext>({
    sessionId:  sessionIdRef.current,
    learnerId,
    activityId,
    gameTheme,
    grade,
  });
  // Keep context current if props change (should not happen in practice)
  contextRef.current = { sessionId: sessionIdRef.current, learnerId, activityId, gameTheme, grade };

  // ── Step order getter for the engine (always reads current step) ──────────
  const stepOrderGetter = useCallback((): number => {
    return stepStateRef.current?.stepOrder ?? 0;
  }, []);

  // ── Emit helper ───────────────────────────────────────────────────────────
  const emit = useCallback((
    eventType: RawGameplayEvent['eventType'],
    extra: Partial<RawGameplayEvent> = {},
  ): void => {
    if (!bufferRef.current) return;
    const step = stepStateRef.current;
    const event: RawGameplayEvent = {
      eventId:       generateEventId(),
      sessionId:     contextRef.current.sessionId,
      learnerId:     contextRef.current.learnerId,
      activityId:    contextRef.current.activityId,
      eventType,
      timestamp:     nowISO(),
      stepOrder:     step?.stepOrder,
      actionType:    step?.actionType,
      questionGrade: contextRef.current.grade,
      gameTheme:     contextRef.current.gameTheme,
      ...extra,
    };
    bufferRef.current.push(event);
  }, []);

  // ── Initialise engine + buffer once on mount ──────────────────────────────
  useEffect(() => {
    if (!isTracking) return;

    const buffer = createEventBuffer();
    bufferRef.current = buffer;

    // Open backend session (best-effort; game continues regardless)
    void buffer.openSession({
      sessionId:  sessionIdRef.current,
      learnerId,
      activityId,
      gameTheme,
      grade,
    });

    // Create tracking engine
    const engine = createTrackingEngine({
      context:    contextRef.current,
      stepOrder:  stepOrderGetter,
      onEvent:    (ev) => buffer.push(ev),
    });
    engineRef.current = engine;

    // Attach to container or document
    engine.attach(containerRef?.current ?? null);

    setTrackerReady(true);

    return () => {
      engine.detach();
      void buffer.destroy();
      void buffer.closeSession(sessionIdRef.current);
      setTrackerReady(false);
    };
  }, [isTracking, learnerId, activityId, gameTheme, grade]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reattach to container if ref changes ─────────────────────────────────
  useEffect(() => {
    if (!engineRef.current || !trackerReady) return;
    engineRef.current.attach(containerRef?.current ?? null);
  }, [containerRef?.current, trackerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Call when a micro-step becomes active.
   * Resets all per-step counters and emits question_start.
   */
  const onStepStart = useCallback((stepOrder: number, actionType: ActionType): void => {
    if (!isTracking) return;

    // Reset per-step state
    stepStateRef.current = {
      stepOrder,
      actionType,
      questionStartAt:    Date.now(),
      clickCount:         0,
      lastSelectedOption: null,
      answerChanges:      0,
      submissionCount:    0,
    };

    emit('question_start', { stepOrder, actionType });

    // Immediately flush so the backend knows the step has started
    void bufferRef.current?.flush();
  }, [isTracking, emit]);

  /**
   * Call when the learner taps an answer option.
   * Detects answer changes and increments click count.
   */
  const onAnswerSelect = useCallback((optionText: string): void => {
    if (!isTracking || !stepStateRef.current) return;

    const step = stepStateRef.current;
    step.clickCount += 1;

    const isChange = step.lastSelectedOption !== null && step.lastSelectedOption !== optionText;

    if (isChange) {
      step.answerChanges += 1;
      emit('answer_change', {
        selectedOption: optionText,
        meta:           { previousOption: step.lastSelectedOption },
      });
    } else {
      emit('answer_select', { selectedOption: optionText });
    }

    step.lastSelectedOption = optionText;
  }, [isTracking, emit]);

  /**
   * Call when the answer is confirmed (correct or not).
   * Emits answer_submit with correctness flag and flushes immediately
   * so the backend can update the BehaviourSnapshot in near-real-time.
   */
  const onAnswerSubmit = useCallback((optionText: string, isCorrect: boolean): void => {
    if (!isTracking || !stepStateRef.current) return;

    const step = stepStateRef.current;
    step.submissionCount += 1;
    step.clickCount += 1;

    emit('answer_submit', { selectedOption: optionText, isCorrect });

    // Flush immediately — submit is latency-sensitive for the backend processor
    void bufferRef.current?.flush();
  }, [isTracking, emit]);

  /**
   * Call when the learner exits the game (Back / Finish).
   * Emits game_exit, flushes all remaining events, closes the session.
   */
  const onGameExit = useCallback((): void => {
    if (!isTracking) return;
    emit('game_exit');
    void bufferRef.current?.flush();
    void bufferRef.current?.closeSession(sessionIdRef.current);
  }, [isTracking, emit]);

  return {
    onStepStart,
    onAnswerSelect,
    onAnswerSubmit,
    onGameExit,
    isTracking: trackerReady,
  };
}
