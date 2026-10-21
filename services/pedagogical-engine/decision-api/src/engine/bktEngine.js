/**
 * HintAwareBKT - Node.js Engine
 * 
 * Research implementation of Hint-Aware Bayesian Knowledge Tracing with ADHD Inattention adaptation.
 * Mirrors the Python model in services/pedagogical-engine/learner-model/bkt_model.py.
 */

export class HintAwareBKT {
  constructor({
    p_l0 = 0.20,
    p_t = 0.15,
    p_g = 0.25,
    p_s = 0.18,
    gamma = 0.85,
    alpha_slip = 0.22,
    mastery_threshold = 0.85,
    initial_stability_days = 3.0,
    retention_revision_threshold = 0.70
  } = {}) {
    this.p_l0 = p_l0;
    this.p_t = p_t;
    this.p_g = p_g;
    this.p_s = p_s;
    this.gamma = gamma;
    this.alpha_slip = alpha_slip;
    this.mastery_threshold = mastery_threshold;
    this.initial_stability_days = initial_stability_days;
    this.retention_revision_threshold = retention_revision_threshold;
  }

  /**
   * Computes Stability-Based Ebbinghaus Retention R(t) = exp(-delta_t / S_t)
   * and returns the decayed prior knowledge alongside revision scheduling metrics (Step 4).
   */
  computeRetentionState({
    p_prior = this.p_l0,
    memoryStability = this.initial_stability_days,
    elapsedDays = 0.0
  } = {}) {
    const safeStability = Math.max(0.5, Number(memoryStability) || this.initial_stability_days);
    const safeElapsedDays = Math.max(0.0, Number(elapsedDays) || 0.0);

    const retentionScore = safeElapsedDays > 0 ? Math.exp(-safeElapsedDays / safeStability) : 1.0;
    const decayedPrior =
      safeElapsedDays > 0
        ? this.p_l0 + (p_prior - this.p_l0) * retentionScore
        : p_prior;

    const optimalNextReviewDays = Math.max(
      0.5,
      -safeStability * Math.log(this.retention_revision_threshold)
    );

    return {
      retentionScore: Number(retentionScore.toFixed(4)),
      decayedPrior: Number(Math.max(0.0, Math.min(1.0, decayedPrior)).toFixed(4)),
      memoryStability: Number(safeStability.toFixed(2)),
      elapsedDays: Number(safeElapsedDays.toFixed(2)),
      revisionRecommended: retentionScore < this.retention_revision_threshold,
      optimalNextReviewDays: Number(optimalNextReviewDays.toFixed(1))
    };
  }

  /**
   * Executes a single AD-BKT (Attention-Disentangled & Forgetting-Aware BKT) update step (Steps 3 & 4).
   */
  updateStep({
    p_prior = this.p_l0,
    isCorrect,
    hintLevel = 0,
    inattentionIndex = 0.0,
    isAttentionSlip = false,
    rtZScore = 0.0,
    memoryStability = this.initial_stability_days,
    elapsedDays = 0.0
  }) {
    // 0. Step 4: Stability-Based Forgetting Decay prior to current interaction
    const retentionState = this.computeRetentionState({
      p_prior,
      memoryStability,
      elapsedDays
    });
    const activePrior = retentionState.decayedPrior;

    // 1. Step 3: AD-BKT Attention-Disentangled Dynamic Slip
    const clippedInattention = Math.max(0.0, Math.min(1.0, inattentionIndex));
    const hasRtAnomaly = Math.abs(Number(rtZScore) || 0) >= 1.5;
    const isDetectedSlip =
      !isCorrect && (Boolean(isAttentionSlip) || hasRtAnomaly || clippedInattention >= 0.60);

    let effectiveSlip = Math.max(
      this.p_s,
      Math.min(0.45, this.p_s + this.alpha_slip * clippedInattention)
    );
    if (isDetectedSlip && (Boolean(isAttentionSlip) || hasRtAnomaly)) {
      // Elevate slip when personal RT Z-score or multimodal fusion flags an ADHD attention lapse
      effectiveSlip = Math.max(effectiveSlip, 0.62);
    }

    // 2. Scaffolding Guess Boost (Progressive Hints)
    const hintFraction = Math.max(0.0, Math.min(1.0, hintLevel / 4.0));
    const effectiveGuess = isCorrect
      ? this.p_g + this.gamma * hintFraction * (1.0 - this.p_g)
      : this.p_g;

    // 3. Compute Posterior Knowledge via Bayes' Rule
    let numerator, denominator;
    if (isCorrect) {
      numerator = activePrior * (1.0 - effectiveSlip);
      denominator = numerator + (1.0 - activePrior) * effectiveGuess;
    } else {
      numerator = activePrior * effectiveSlip;
      denominator = numerator + (1.0 - activePrior) * (1.0 - effectiveGuess);
    }

    const p_posterior = denominator > 0 ? numerator / denominator : activePrior;

    // Also compute what Standard BKT would have done on this step (for False Demotion Rate comparison)
    const stdNum = isCorrect
      ? activePrior * (1.0 - this.p_s)
      : activePrior * this.p_s;
    const stdDen = isCorrect
      ? stdNum + (1.0 - activePrior) * this.p_g
      : stdNum + (1.0 - activePrior) * (1.0 - this.p_g);
    const stdPosterior = stdDen > 0 ? stdNum / stdDen : activePrior;
    const stdUpdated = isCorrect
      ? Math.max(activePrior, Math.min(1.0, stdPosterior + (1.0 - stdPosterior) * this.p_t))
      : Math.min(activePrior * 0.95, stdPosterior);

    // 4. Learning Transition Step & AD-BKT False Mastery Demotion Protection
    let p_updated;
    let masteryProtected = false;
    if (isCorrect) {
      // Attentive learners acquire slightly more transition gain than distracted learners
      const effectiveTransition = this.p_t * (1.0 - 0.30 * clippedInattention);
      p_updated = p_posterior + (1.0 - p_posterior) * effectiveTransition;
      p_updated = Math.max(activePrior, Math.min(1.0, p_updated));
    } else {
      if (Boolean(isAttentionSlip) || hasRtAnomaly) {
        // Explicit ADHD Attention/Impulsivity Slip: protect mastery from severe false demotion
        p_updated = Math.max(activePrior * 0.96, Math.min(activePrior * 0.98, p_posterior));
        masteryProtected = true;
      } else {
        // Standard monotonic decrease on genuine error
        p_updated = Math.min(activePrior * 0.95, p_posterior);
        masteryProtected = clippedInattention >= 0.60;
      }
      p_updated = Math.max(0.0, Math.min(1.0, p_updated));
    }

    // 5. Step 4: Update Memory Stability S_t (Spaced Retrieval Growth)
    let updatedStability = retentionState.memoryStability;
    if (isCorrect) {
      if (hintLevel === 0 && clippedInattention < 0.60) {
        // Strong stability growth on unassisted, focused recall
        updatedStability = Math.min(30.0, updatedStability * (1.0 + 0.35 * (1.0 - clippedInattention)));
      } else {
        // Modest stability growth when hints were required
        updatedStability = Math.min(30.0, updatedStability * (1.0 + 0.10 * (1.0 - hintFraction)));
      }
    } else if (!masteryProtected) {
      // Genuine knowledge gap reduces stability; attention slips preserve stability
      updatedStability = Math.max(1.0, updatedStability * 0.80);
    }

    const optimalNextReviewDays = Math.max(
      0.5,
      -updatedStability * Math.log(this.retention_revision_threshold)
    );

    // 6. Prediction for NEXT step correctness
    const predictedNextCorrect = p_updated * (1.0 - this.p_s) + (1.0 - p_updated) * this.p_g;
    const falseDemotionPrevented = !isCorrect
      ? Math.max(0.0, p_updated - stdUpdated)
      : 0.0;

    return {
      priorKnowledge: Number(p_prior.toFixed(4)),
      decayedPriorKnowledge: retentionState.decayedPrior,
      posteriorKnowledge: Number(p_posterior.toFixed(4)),
      updatedKnowledge: Number(p_updated.toFixed(4)),
      standardUpdatedKnowledge: Number(stdUpdated.toFixed(4)),
      predictedNextCorrect: Number(predictedNextCorrect.toFixed(4)),
      effectiveSlip: Number(effectiveSlip.toFixed(4)),
      effectiveGuess: Number(effectiveGuess.toFixed(4)),
      isMastered: p_updated >= this.mastery_threshold,
      masteryProtected,
      falseDemotionPrevented: Number(falseDemotionPrevented.toFixed(4)),
      retentionScore: retentionState.retentionScore,
      memoryStability: Number(updatedStability.toFixed(2)),
      revisionRecommended: retentionState.revisionRecommended,
      optimalNextReviewDays: Number(optimalNextReviewDays.toFixed(1))
    };
  }

  /**
   * Generates a multi-day Ebbinghaus retention forecast curve for visualization
   */
  simulateRetentionCurve({
    currentKnowledge = 0.75,
    memoryStability = this.initial_stability_days,
    daysHorizon = 14
  } = {}) {
    const curve = [];
    for (let day = 0; day <= daysHorizon; day++) {
      const state = this.computeRetentionState({
        p_prior: currentKnowledge,
        memoryStability,
        elapsedDays: day
      });
      curve.push({
        day,
        retentionScore: state.retentionScore,
        retainedKnowledge: state.decayedPrior,
        revisionRecommended: state.revisionRecommended
      });
    }
    return curve;
  }

  /**
   * Computes knowledge trajectory across a sequence of interactions
   */
  predictTrajectory(interactions = []) {
    const trajectory = [];
    let p_current = this.p_l0;
    let s_current = this.initial_stability_days;
    let prevTimestampMs = null;

    for (const item of interactions) {
      if (item.eventType !== 'ANSWER_SUBMIT' && typeof item.isCorrect !== 'boolean') {
        continue;
      }

      const isCorrect = item.isCorrect === true;
      const hintLevel = item.hintLevelReached || item.hintLevel || 0;
      const inattention =
        item.inattentionIndex ??
        (item.idleTimeBeforeFirstActionMs ? Math.min(1, item.idleTimeBeforeFirstActionMs / 20000) : 0);

      let elapsedDays = item.elapsedDays || 0.0;
      if (!elapsedDays && item.timestamp) {
        const tsMs = new Date(item.timestamp).getTime();
        if (prevTimestampMs && tsMs > prevTimestampMs) {
          elapsedDays = (tsMs - prevTimestampMs) / (1000 * 60 * 60 * 24);
        }
        prevTimestampMs = tsMs;
      }

      const stepResult = this.updateStep({
        p_prior: p_current,
        isCorrect,
        hintLevel,
        inattentionIndex: inattention,
        isAttentionSlip: Boolean(item.isAttentionSlip),
        rtZScore: item.rtZScore || 0.0,
        memoryStability: s_current,
        elapsedDays
      });

      trajectory.push({
        questionId: item.questionId,
        attemptNumber: item.attemptNumber,
        isCorrect,
        hintLevel,
        ...stepResult
      });

      p_current = stepResult.updatedKnowledge;
      s_current = stepResult.memoryStability;
    }

    return {
      initialKnowledge: this.p_l0,
      currentKnowledge: p_current,
      currentStability: s_current,
      isMastered: p_current >= this.mastery_threshold,
      stepsCount: trajectory.length,
      trajectory
    };
  }
}

export const defaultBKT = new HintAwareBKT();
