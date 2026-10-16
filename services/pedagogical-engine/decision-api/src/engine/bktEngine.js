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
    mastery_threshold = 0.85
  } = {}) {
    this.p_l0 = p_l0;
    this.p_t = p_t;
    this.p_g = p_g;
    this.p_s = p_s;
    this.gamma = gamma;
    this.alpha_slip = alpha_slip;
    this.mastery_threshold = mastery_threshold;
  }

  /**
   * Executes a single Bayesian update step incorporating hint scaffolding and inattention slip.
   */
  updateStep({
    p_prior = this.p_l0,
    isCorrect,
    hintLevel = 0,
    inattentionIndex = 0.0
  }) {
    // 1. Dynamic Slip Penalty (Attention Drift)
    const clippedInattention = Math.max(0.0, Math.min(1.0, inattentionIndex));
    const effectiveSlip = Math.max(this.p_s, Math.min(0.45, this.p_s + this.alpha_slip * clippedInattention));

    // 2. Scaffolding Guess Boost (Progressive Hints)
    const hintFraction = Math.max(0.0, Math.min(1.0, hintLevel / 4.0));
    const effectiveGuess = this.p_g + this.gamma * hintFraction * (1.0 - this.p_g);

    // 3. Compute Posterior Knowledge via Bayes' Rule
    let numerator, denominator;
    if (isCorrect) {
      numerator = p_prior * (1.0 - effectiveSlip);
      denominator = numerator + (1.0 - p_prior) * effectiveGuess;
    } else {
      numerator = p_prior * effectiveSlip;
      denominator = numerator + (1.0 - p_prior) * (1.0 - effectiveGuess);
    }

    const p_posterior = denominator > 0 ? numerator / denominator : p_prior;

    // 4. Learning Transition Step
    let p_updated = p_posterior + (1.0 - p_posterior) * this.p_t;
    p_updated = Math.max(0.0, Math.min(1.0, p_updated));

    // 5. Prediction for NEXT step correctness
    const predictedNextCorrect = p_updated * (1.0 - this.p_s) + (1.0 - p_updated) * this.p_g;

    return {
      priorKnowledge: Number(p_prior.toFixed(4)),
      posteriorKnowledge: Number(p_posterior.toFixed(4)),
      updatedKnowledge: Number(p_updated.toFixed(4)),
      predictedNextCorrect: Number(predictedNextCorrect.toFixed(4)),
      effectiveSlip: Number(effectiveSlip.toFixed(4)),
      effectiveGuess: Number(effectiveGuess.toFixed(4)),
      isMastered: p_updated >= this.mastery_threshold
    };
  }

  /**
   * Computes knowledge trajectory across a sequence of interactions
   */
  predictTrajectory(interactions = []) {
    const trajectory = [];
    let p_current = this.p_l0;

    for (const item of interactions) {
      if (item.eventType !== 'ANSWER_SUBMIT' && typeof item.isCorrect !== 'boolean') {
        continue;
      }

      const isCorrect = item.isCorrect === true;
      const hintLevel = item.hintLevelReached || item.hintLevel || 0;
      const inattention = item.inattentionIndex || (item.idleTimeBeforeFirstActionMs ? Math.min(1, item.idleTimeBeforeFirstActionMs / 20000) : 0);

      const stepResult = this.updateStep({
        p_prior: p_current,
        isCorrect,
        hintLevel,
        inattentionIndex: inattention
      });

      trajectory.push({
        questionId: item.questionId,
        attemptNumber: item.attemptNumber,
        isCorrect,
        hintLevel,
        ...stepResult
      });

      p_current = stepResult.updatedKnowledge;
    }

    return {
      initialKnowledge: this.p_l0,
      currentKnowledge: p_current,
      isMastered: p_current >= this.mastery_threshold,
      stepsCount: trajectory.length,
      trajectory
    };
  }
}

export const defaultBKT = new HintAwareBKT();
