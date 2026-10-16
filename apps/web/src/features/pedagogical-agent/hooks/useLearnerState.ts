import { useState, useCallback, useEffect } from 'react';
import type { InteractionEvent, LearnerState, BKTComparisonState, FSMDecision } from '../types/telemetry.types';
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
  const [bktComparison, setBktComparison] = useState<BKTComparisonState>({
    hintAwareKnowledge: 0.20,
    standardKnowledge: 0.20,
    predictedNextCorrect: 0.364,
    effectiveSlip: 0.18,
    effectiveGuess: 0.25,
    isMastered: false,
    overestimationGap: 0.0
  });

  const [fsmDecision, setFsmDecision] = useState<FSMDecision>({
    fsmState: 'OBSERVING',
    previousState: 'OBSERVING',
    stateTransitionOccurred: false,
    rule: {
      id: 'RULE_DEFAULT',
      name: 'Baseline Passive Observation',
      description: 'Default state when student is engaged normally within healthy parameters.'
    },
    decision: {
      action: 'IDLE_OBSERVE',
      animation: 'idle',
      targetHintLevel: null,
      messageSinhala: 'ඔයාට පුළුවන්! හොඳට හිතලා බලන්න.',
      autoOpenHint: false
    },
    timestamp: new Date().toISOString()
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const playAction = useAgentStore((state) => state.playAction);

  /**
   * Computes both Standard BKT and Hint-Aware ADHD BKT side-by-side
   */
  const computeBKTComparison = useCallback((interactions: InteractionEvent[]): BKTComparisonState => {
    let p_hintAware = 0.20;
    let p_std = 0.20;
    let effSlip = 0.18;
    let effGuess = 0.25;

    const answers = interactions.filter(
      (e) => e.eventType === 'ANSWER_SUBMIT' && typeof e.isCorrect === 'boolean'
    );

    for (const item of answers) {
      const isCorrect = item.isCorrect === true;
      const hintLvl = item.hintLevelReached || 0;
      const inatt = item.idleTimeBeforeFirstActionMs ? Math.min(1, item.idleTimeBeforeFirstActionMs / 20000) : 0;

      // 1. Hint-Aware BKT Step
      effSlip = Math.max(0.18, Math.min(0.45, 0.18 + 0.22 * inatt));
      const hintFraction = Math.max(0.0, Math.min(1.0, hintLvl / 4.0));
      effGuess = 0.25 + 0.85 * hintFraction * (1.0 - 0.25);

      let numHA, denHA;
      if (isCorrect) {
        numHA = p_hintAware * (1.0 - effSlip);
        denHA = numHA + (1.0 - p_hintAware) * effGuess;
      } else {
        numHA = p_hintAware * effSlip;
        denHA = numHA + (1.0 - p_hintAware) * (1.0 - effGuess);
      }
      const postHA = denHA > 0 ? numHA / denHA : p_hintAware;
      p_hintAware = Math.max(0.0, Math.min(1.0, postHA + (1.0 - postHA) * 0.15));

      // 2. Standard Baseline BKT Step (ignores hints, ignores inattention slip)
      let numStd, denStd;
      if (isCorrect) {
        numStd = p_std * (1.0 - 0.18);
        denStd = numStd + (1.0 - p_std) * 0.25;
      } else {
        numStd = p_std * 0.18;
        denStd = numStd + (1.0 - p_std) * (1.0 - 0.25);
      }
      const postStd = denStd > 0 ? numStd / denStd : p_std;
      p_std = Math.max(0.0, Math.min(1.0, postStd + (1.0 - postStd) * 0.15));
    }

    const predNext = p_hintAware * (1.0 - 0.18) + (1.0 - p_hintAware) * 0.25;

    return {
      hintAwareKnowledge: Number(p_hintAware.toFixed(4)),
      standardKnowledge: Number(p_std.toFixed(4)),
      predictedNextCorrect: Number(predNext.toFixed(4)),
      effectiveSlip: Number(effSlip.toFixed(4)),
      effectiveGuess: Number(effGuess.toFixed(4)),
      isMastered: p_hintAware >= 0.85,
      overestimationGap: Number((p_std - p_hintAware).toFixed(4))
    };
  }, []);

  /**
   * Directly triggers and evaluates an arbitrary context on the FSM Decision Engine
   */
  const triggerFSMContext = useCallback(
    async (context: Record<string, any>) => {
      try {
        const res = await fetch('/api/telemetry/fsm/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(context)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setFsmDecision(data);

            if (autoIntervene && data.decision?.action !== 'IDLE_OBSERVE') {
              let targetAction: AgentActionName = 'thinking';
              const anim = data.decision.animation;
              if (anim === 'wave') targetAction = 'wave';
              else if (anim === 'thinking') targetAction = 'thinking';
              else if (anim === 'clap') targetAction = 'clap';
              else if (anim === 'correctCelebrate') targetAction = 'correctCelebrate';
              else if (anim === 'encourage') targetAction = 'encourage';

              playAction(targetAction, {
                message: data.decision.messageSinhala,
                duration: 3.5
              });
            }

            return data;
          }
        }
      } catch (err) {
        console.warn('[useLearnerState] FSM evaluation error:', (err as Error).message);
      }
      return null;
    },
    [autoIntervene, playAction]
  );

  /**
   * Evaluate state using backend Decision API, BKT comparison, and FSM Engine
   */
  const evaluateInteractions = useCallback(
    async (interactions: InteractionEvent[]) => {
      if (!interactions || interactions.length === 0) return null;

      // 1. Update BKT comparative model
      const bktResult = computeBKTComparison(interactions);
      setBktComparison(bktResult);

      try {
        setIsLoading(true);
        // 2. Fetch Learner State from backend
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

          // 3. Evaluate FSM Decision Engine with full learner and BKT metrics
          const lastEvent = interactions[interactions.length - 1];
          const lastIsCorrect = lastEvent?.eventType === 'ANSWER_SUBMIT' ? lastEvent.isCorrect : null;

          const fsmContext = {
            consecutiveErrors: state.metrics.consecutiveErrors,
            consecutiveCorrect: state.metrics.consecutiveCorrect,
            highestHintLevel: state.metrics.highestHintLevel,
            currentIdleTimeMs: lastEvent?.idleTimeBeforeFirstActionMs || 0,
            inattentionIndex: state.metrics.inattentionIndex,
            frustrationIndex: state.metrics.frustrationIndex,
            isImpulsive: state.flags.isImpulsive,
            isFrustrated: state.flags.isFrustrated,
            lastAnswerIsCorrect: lastIsCorrect,
            bktKnowledge: bktResult.hintAwareKnowledge
          };

          await triggerFSMContext(fsmContext);
          return state;
        }
      } catch (err) {
        console.warn('[useLearnerState] Backend evaluation fallback:', (err as Error).message);
      } finally {
        setIsLoading(false);
      }

      return null;
    },
    [computeBKTComparison, triggerFSMContext]
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

  useEffect(() => {
    fetchLearnerState();
  }, [fetchLearnerState]);

  return {
    learnerState,
    bktComparison,
    fsmDecision,
    isLoading,
    evaluateInteractions,
    triggerFSMContext,
    fetchLearnerState,
    setLearnerState
  };
}
