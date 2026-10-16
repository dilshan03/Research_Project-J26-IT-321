import { useState, useCallback, useEffect } from 'react';
import type { InteractionEvent, LearnerState } from '../types/telemetry.types';
import type { AgentActionName } from '../types/agent.types';
import { useAgentStore } from '../store/useAgentStore';

export interface UseLearnerStateProps {
  studentId?: string;
  sessionId?: string;
  autoIntervene?: boolean; // Automatically triggers 3D agent reaction & speech bubble
}

export function useLearnerState({
  studentId = 'student_trial_01',
  sessionId = 'sess_adhd_study_01',
  autoIntervene = true
}: UseLearnerStateProps = {}) {
  const [learnerState, setLearnerState] = useState<LearnerState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const playAction = useAgentStore((state) => state.playAction);

  /**
   * Evaluate state using backend Decision API
   */
  const evaluateInteractions = useCallback(
    async (interactions: InteractionEvent[]) => {
      if (!interactions || interactions.length === 0) return null;

      try {
        setIsLoading(true);
        const res = await fetch('/api/telemetry/learner-state/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interactions })
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (data.success && data.learnerState) {
          const state: LearnerState = data.learnerState;
          setLearnerState(state);

          // Automated Agent Pedagogical Reaction
          if (autoIntervene && state.recommendedIntervention) {
            const { action, animation, messageSinhala } = state.recommendedIntervention;

            if (action !== 'IDLE_OBSERVE') {
              // Map recommended animation to AgentActionName
              let targetAction: AgentActionName = 'thinking';
              if (animation === 'wave') targetAction = 'wave';
              else if (animation === 'thinking') targetAction = 'thinking';
              else if (animation === 'clap') targetAction = 'clap';
              else if (animation === 'celebrate') targetAction = 'correctCelebrate';
              else if (animation === 'idle') targetAction = 'encourage';

              playAction(targetAction, {
                message: messageSinhala,
                duration: 3.5
              });
            }
          }

          return state;
        }
      } catch (err) {
        console.warn('[useLearnerState] Backend evaluation fallback:', (err as Error).message);
      } finally {
        setIsLoading(false);
      }

      return null;
    },
    [autoIntervene, playAction]
  );

  /**
   * Fetch current state from backend MongoDB persistent records
   */
  const fetchLearnerState = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/telemetry/learner-state?studentId=${studentId}&sessionId=${sessionId}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.success && data.learnerState) {
        setLearnerState(data.learnerState);
        return data.learnerState;
      }
    } catch (err) {
      console.warn('[useLearnerState] Fetch state failed:', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [studentId, sessionId]);

  // Initial fetch on mount
  useEffect(() => {
    fetchLearnerState();
  }, [fetchLearnerState]);

  return {
    learnerState,
    isLoading,
    evaluateInteractions,
    fetchLearnerState,
    setLearnerState
  };
}
