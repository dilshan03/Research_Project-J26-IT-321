import { useState, useCallback, useEffect } from 'react';
import type { InteractionEvent, LearnerState, BKTComparisonState, FSMDecision } from '../types/telemetry.types';
import type { AgentActionName } from '../types/agent.types';
import { useAgentStore } from '../store/useAgentStore';

export interface UseLearnerStateProps {
  studentId?: string;
  parentId?: string;
  sessionId?: string;
  autoIntervene?: boolean; // Automatically triggers 3D agent reaction & speech bubble
}

export function useLearnerState({
  studentId = 'student_trial_01',
  parentId = 'parent_demo',
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
    overestimationGap: 0.0,
    masteryProtected: false,
    falseDemotionPrevented: 0.0,
    retentionScore: 1.0,
    memoryStability: 3.0,
    decayedKnowledge: 0.20,
    elapsedDays: 0.0,
    revisionRecommended: false,
    optimalNextReviewDays: 1.1
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
   * Computes Standard BKT, AD-BKT (Step 3: Attention-Disentangled Slip Protection),
   * and Stability-Based Retention (Step 4: Ebbinghaus Forgetting Curve) side-by-side.
   */
  const computeBKTComparison = useCallback(
    (interactions: InteractionEvent[], elapsedDaysOverride: number = 0.0): BKTComparisonState => {
      let p_hintAware = 0.20;
      let p_std = 0.20;
      let effSlip = 0.18;
      let effGuess = 0.25;
      let stability = 3.0; // Initial memory stability S_0 = 3.0 days
      let lastMasteryProtected = false;
      let lastFalseDemotionPrevented = 0.0;
      const seenRts: number[] = [];

      const answers = interactions.filter(
        (e) => e.eventType === 'ANSWER_SUBMIT' && typeof e.isCorrect === 'boolean'
      );

      for (const item of answers) {
        const isCorrect = item.isCorrect === true;
        const hintLvl = item.hintLevelReached || 0;
        const rtMs =
          typeof item.responseTimeMs === 'number' && item.responseTimeMs > 0
            ? item.responseTimeMs
            : typeof item.timeLimitMs === 'number' && typeof item.remainingTimeMs === 'number'
              ? Math.max(100, item.timeLimitMs - item.remainingTimeMs)
              : 5000;

        // Compute personal log-RT Z-score up to current item
        let rtZScore = 0.0;
        if (seenRts.length >= 3) {
          const logRts = seenRts.map((r) => Math.log(Math.max(100, r)));
          const logMean = logRts.reduce((a, b) => a + b, 0) / logRts.length;
          const logStd = Math.max(
            0.25,
            Math.sqrt(logRts.reduce((acc, v) => acc + Math.pow(v - logMean, 2), 0) / logRts.length)
          );
          rtZScore = (Math.log(Math.max(100, rtMs)) - logMean) / logStd;
        }
        seenRts.push(rtMs);

        const inatt = item.idleTimeBeforeFirstActionMs
          ? Math.min(1, item.idleTimeBeforeFirstActionMs / 20000)
          : 0;
        const isImpulsiveError = !isCorrect && rtMs < 1500;
        const isRtAnomaly = Math.abs(rtZScore) >= 1.5;
        const isAttentionSlip = !isCorrect && (isImpulsiveError || isRtAnomaly || inatt >= 0.60);

        // 1. Step 3: AD-BKT Step with Attention-Disentangled Dynamic Slip
        effSlip = Math.max(0.18, Math.min(0.45, 0.18 + 0.22 * inatt));
        if (isAttentionSlip && (isImpulsiveError || isRtAnomaly)) {
          effSlip = Math.max(effSlip, 0.62);
        }
        const hintFraction = Math.max(0.0, Math.min(1.0, hintLvl / 4.0));

        // 2. Standard Baseline BKT Step (ignores hints, ignores attention slip)
        let nextStd = p_std;
        if (isCorrect) {
          const numStd = p_std * (1.0 - 0.18);
          const denStd = numStd + (1.0 - p_std) * 0.25;
          const postStd = denStd > 0 ? numStd / denStd : p_std;
          nextStd = Math.max(p_std, Math.min(1.0, postStd + (1.0 - postStd) * 0.15));
        } else {
          const numStd = p_std * 0.18;
          const denStd = numStd + (1.0 - p_std) * (1.0 - 0.25);
          const postStd = denStd > 0 ? numStd / denStd : p_std;
          nextStd = Math.min(p_std * 0.95, postStd);
        }

        if (isCorrect) {
          effGuess = 0.25 + 0.85 * hintFraction * (1.0 - 0.25);
          const numHA = p_hintAware * (1.0 - effSlip);
          const denHA = numHA + (1.0 - p_hintAware) * effGuess;
          const postHA = denHA > 0 ? numHA / denHA : p_hintAware;
          const effT = 0.15 * (1.0 - 0.30 * inatt);
          const updatedHA = postHA + (1.0 - postHA) * effT;
          p_hintAware = Math.max(p_hintAware, Math.min(1.0, updatedHA));
          lastMasteryProtected = false;
          lastFalseDemotionPrevented = 0.0;

          // Step 4: Stability growth S_t on correct recall
          if (hintLvl === 0 && inatt < 0.60) {
            stability = Math.min(30.0, stability * (1.0 + 0.35 * (1.0 - inatt)));
          } else {
            stability = Math.min(30.0, stability * (1.0 + 0.10 * (1.0 - hintFraction)));
          }
        } else {
          effGuess = 0.25;
          const numHA = p_hintAware * effSlip;
          const denHA = numHA + (1.0 - p_hintAware) * (1.0 - effGuess);
          const postHA = denHA > 0 ? numHA / denHA : p_hintAware;

          // What standard BKT would drop p_hintAware to if unprotected:
          const stdDropFromCurrent = (p_hintAware * 0.18) / (p_hintAware * 0.18 + (1.0 - p_hintAware) * 0.75);

          if (isAttentionSlip) {
            // Step 3 Novelty: Protect mastery against ADHD attention/impulsivity slip!
            p_hintAware = Math.max(p_hintAware * 0.96, Math.min(p_hintAware * 0.98, postHA));
            lastMasteryProtected = true;
            lastFalseDemotionPrevented = Math.max(0, p_hintAware - stdDropFromCurrent);
            // Memory stability S_t is preserved during an attention slip
          } else {
            p_hintAware = Math.min(p_hintAware * 0.95, postHA);
            lastMasteryProtected = false;
            lastFalseDemotionPrevented = 0.0;
            stability = Math.max(1.0, stability * 0.80);
          }
        }

        p_std = nextStd;
      }

      // Step 4: Apply Ebbinghaus Retention Decay R(t) = exp(-elapsedDays / S_t)
      const safeElapsedDays = Math.max(0.0, Number(elapsedDaysOverride) || 0.0);
      const retentionScore = safeElapsedDays > 0 ? Math.exp(-safeElapsedDays / stability) : 1.0;
      const decayedKnowledge =
        safeElapsedDays > 0
          ? 0.20 + (p_hintAware - 0.20) * retentionScore
          : p_hintAware;
      const optimalNextReviewDays = Math.max(0.5, -stability * Math.log(0.70));
      const revisionRecommended = retentionScore < 0.70;

      const activeMastery = decayedKnowledge;
      const predNext = activeMastery * (1.0 - 0.18) + (1.0 - activeMastery) * 0.25;

      return {
        hintAwareKnowledge: Number(p_hintAware.toFixed(4)),
        standardKnowledge: Number(p_std.toFixed(4)),
        predictedNextCorrect: Number(predNext.toFixed(4)),
        effectiveSlip: Number(effSlip.toFixed(4)),
        effectiveGuess: Number(effGuess.toFixed(4)),
        isMastered: activeMastery >= 0.85,
        overestimationGap: Number((p_std - p_hintAware).toFixed(4)),
        masteryProtected: lastMasteryProtected,
        falseDemotionPrevented: Number(lastFalseDemotionPrevented.toFixed(4)),
        retentionScore: Number(retentionScore.toFixed(4)),
        memoryStability: Number(stability.toFixed(2)),
        decayedKnowledge: Number(decayedKnowledge.toFixed(4)),
        elapsedDays: Number(safeElapsedDays.toFixed(1)),
        revisionRecommended,
        optimalNextReviewDays: Number(optimalNextReviewDays.toFixed(1))
      };
    },
    []
  );

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

            if (autoIntervene && data.decision?.action !== 'IDLE_OBSERVE' && data.decision?.shouldTriggerAnimation !== false) {
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
    async (
      interactions: InteractionEvent[],
      cameraTelemetry?: { cameraPermissionGranted: boolean; cameraAttentionScore?: number | null },
      elapsedDaysOverride: number = 0.0
    ) => {
      if (!interactions || interactions.length === 0) return null;

      const newestEvent = interactions[interactions.length - 1];
      const isPassiveQuestionLoad =
        newestEvent?.eventType === 'QUESTION_VIEW' &&
        !newestEvent.idleTimeBeforeFirstActionMs &&
        !newestEvent.responseTimeMs;

      // Do not overwrite active BKT/FSM state when auto-advancing to the next question
      if (isPassiveQuestionLoad && interactions.length > 1) {
        return null;
      }

      // 1. Update AD-BKT & Retention comparative model across all answered questions (Steps 3 & 4)
      const bktResult = computeBKTComparison(interactions, elapsedDaysOverride);
      setBktComparison(bktResult);

      try {
        setIsLoading(true);
        // 2. Fetch Learner State from backend (passing optional cameraTelemetry for Step 1 & Step 2 fusion)
        const res = await fetch('/api/telemetry/learner-state/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interactions, cameraTelemetry: cameraTelemetry || null })
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (data.success && data.learnerState) {
          const state: LearnerState = data.learnerState;
          setLearnerState(state);

          // 3. Evaluate FSM Decision Engine with full learner and BKT metrics
          const actionable = interactions.filter(
            (ev) =>
              ev.eventType !== 'QUESTION_VIEW' ||
              (ev.idleTimeBeforeFirstActionMs && ev.idleTimeBeforeFirstActionMs > 0) ||
              (ev.responseTimeMs && ev.responseTimeMs > 0)
          );
          const lastEvent =
            actionable.length > 0
              ? actionable[actionable.length - 1]
              : interactions[interactions.length - 1];
          const lastIsCorrect =
            lastEvent?.eventType === 'ANSWER_SUBMIT' ? lastEvent.isCorrect : null;

          const fsmContext = {
            consecutiveErrors: state.metrics.consecutiveErrors,
            consecutiveCorrect: state.metrics.consecutiveCorrect,
            highestHintLevel: state.metrics.highestHintLevel,
            currentIdleTimeMs: lastEvent?.idleTimeBeforeFirstActionMs || 0,
            inattentionIndex: state.metrics.inattentionIndex,
            frustrationIndex: state.metrics.frustrationIndex,
            isImpulsive: state.flags.isImpulsive,
            isFrustrated: state.flags.isFrustrated,
            isAttentionSlip: Boolean(state.flags.isAttentionSlip || state.attentionFusion?.isAttentionSlip || bktResult.masteryProtected),
            cameraPermissionGranted: Boolean(cameraTelemetry?.cameraPermissionGranted ?? state.attentionFusion?.cameraPermissionGranted),
            cameraAttentionScore: cameraTelemetry?.cameraAttentionScore ?? null,
            retentionScore: bktResult.retentionScore ?? 1.0,
            memoryStability: bktResult.memoryStability ?? 3.0,
            elapsedDays: bktResult.elapsedDays ?? elapsedDaysOverride,
            revisionRecommended: Boolean(bktResult.revisionRecommended),
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
      const params = new URLSearchParams({
        studentId,
        parentId,
        sessionId
      });
      const res = await fetch(`/api/telemetry/learner-state?${params.toString()}`);
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
  }, [studentId, parentId, sessionId]);

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
