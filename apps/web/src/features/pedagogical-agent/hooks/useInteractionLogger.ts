import { useState, useRef, useEffect, useCallback } from 'react';
import type { InteractionEvent, SessionMetrics } from '../types/telemetry.types';
import type { HintLevel } from '../types/agent.types';

export interface UseInteractionLoggerProps {
  sessionId?: string;
  studentId?: string;
  questionId: string;
  concept?: string;
  onLogEvent?: (event: InteractionEvent) => void;
}

export function useInteractionLogger({
  sessionId = 'sess_' + Math.random().toString(36).substring(2, 9),
  studentId = 'student_demo',
  questionId,
  concept = 'addition_basic',
  onLogEvent
}: UseInteractionLoggerProps) {
  // Logs history for research review & telemetry sync
  const [logs, setLogs] = useState<InteractionEvent[]>([]);
  
  // Real-time calculated session metrics
  const [metrics, setMetrics] = useState<SessionMetrics>({
    totalAttempts: 0,
    correctCount: 0,
    wrongCount: 0,
    totalHintsCount: 0,
    avgResponseTimeMs: 0,
    streak: 0
  });

  // Internal timestamps for latency calculations
  const questionStartTime = useRef<number>(Date.now());
  const firstActionRecorded = useRef<boolean>(false);
  const idleTimeBeforeFirstAction = useRef<number>(0);
  const attemptCount = useRef<number>(0);
  const hintCount = useRef<number>(0);

  // Helper to persist event to backend API asynchronously
  const sendToBackend = async (event: InteractionEvent) => {
    try {
      await fetch('/api/telemetry/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (err) {
      // Non-blocking fallback
      console.warn('Backend telemetry sync offline:', (err as Error).message);
    }
  };

  // Reset timestamps when questionId changes
  useEffect(() => {
    questionStartTime.current = Date.now();
    firstActionRecorded.current = false;
    idleTimeBeforeFirstAction.current = 0;
    attemptCount.current = 0;
    hintCount.current = 0;

    // Log initial view
    const viewEvent: InteractionEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      sessionId,
      studentId,
      questionId,
      concept,
      eventType: 'QUESTION_VIEW',
      attemptNumber: 0,
      hintLevelReached: 0,
      totalHintsRequested: 0,
      responseTimeMs: 0,
      idleTimeBeforeFirstActionMs: 0,
      timestamp: new Date().toISOString()
    };

    setLogs((prev) => [...prev, viewEvent]);
    sendToBackend(viewEvent);
    if (onLogEvent) onLogEvent(viewEvent);
  }, [questionId, sessionId, studentId, concept, onLogEvent]);

  // Record first action time for inattention tracking
  const markFirstAction = () => {
    if (!firstActionRecorded.current) {
      idleTimeBeforeFirstAction.current = Date.now() - questionStartTime.current;
      firstActionRecorded.current = true;
    }
  };

  /**
   * Log an answer submission
   */
  const logAnswer = useCallback(
    (selectedAnswer: string | number, isCorrect: boolean, currentHintLevel: HintLevel) => {
      markFirstAction();
      attemptCount.current += 1;
      const now = Date.now();
      const responseTimeMs = now - questionStartTime.current;

      const answerEvent: InteractionEvent = {
        id: 'evt_' + Math.random().toString(36).substring(2, 9),
        sessionId,
        studentId,
        questionId,
        concept,
        eventType: 'ANSWER_SUBMIT',
        attemptNumber: attemptCount.current,
        selectedAnswer,
        isCorrect,
        hintLevelReached: currentHintLevel,
        totalHintsRequested: hintCount.current,
        responseTimeMs,
        idleTimeBeforeFirstActionMs: idleTimeBeforeFirstAction.current,
        timestamp: new Date().toISOString()
      };

      setLogs((prev) => {
        const next = [...prev, answerEvent];
        return next;
      });

      // Update metrics
      setMetrics((prev) => {
        const total = prev.totalAttempts + 1;
        const newCorrect = isCorrect ? prev.correctCount + 1 : prev.correctCount;
        const newWrong = !isCorrect ? prev.wrongCount + 1 : prev.wrongCount;
        const newStreak = isCorrect ? prev.streak + 1 : 0;
        const newAvg = Math.round((prev.avgResponseTimeMs * prev.totalAttempts + responseTimeMs) / total);

        return {
          totalAttempts: total,
          correctCount: newCorrect,
          wrongCount: newWrong,
          totalHintsCount: prev.totalHintsCount,
          avgResponseTimeMs: newAvg,
          streak: newStreak
        };
      });

      console.log('📊 [InteractionLogger] Answer logged:', answerEvent);
      sendToBackend(answerEvent);
      if (onLogEvent) onLogEvent(answerEvent);

      return answerEvent;
    },
    [sessionId, studentId, questionId, concept, onLogEvent]
  );

  /**
   * Log a progressive hint request
   */
  const logHint = useCallback(
    (requestedLevel: HintLevel) => {
      markFirstAction();
      hintCount.current += 1;
      const now = Date.now();
      const responseTimeMs = now - questionStartTime.current;

      const hintEvent: InteractionEvent = {
        id: 'evt_' + Math.random().toString(36).substring(2, 9),
        sessionId,
        studentId,
        questionId,
        concept,
        eventType: 'HINT_REQUEST',
        attemptNumber: attemptCount.current,
        hintLevelReached: requestedLevel,
        totalHintsRequested: hintCount.current,
        responseTimeMs,
        idleTimeBeforeFirstActionMs: idleTimeBeforeFirstAction.current,
        timestamp: new Date().toISOString()
      };

      setLogs((prev) => [...prev, hintEvent]);

      setMetrics((prev) => ({
        ...prev,
        totalHintsCount: prev.totalHintsCount + 1
      }));

      console.log('💡 [InteractionLogger] Hint logged:', hintEvent);
      sendToBackend(hintEvent);
      if (onLogEvent) onLogEvent(hintEvent);

      return hintEvent;
    },
    [sessionId, studentId, questionId, concept, onLogEvent]
  );

  /**
   * Clear or export logs
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    metrics,
    logAnswer,
    logHint,
    clearLogs
  };
}
