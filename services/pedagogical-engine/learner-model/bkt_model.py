"""
Hint-Aware Bayesian Knowledge Tracing (BKT) with ADHD Inattention Adaptation

Mathematical Model:
Standard BKT assumes four parameters:
- P(L_0): Prior probability of knowing the skill initially
- P(T): Transition probability from unlearned to learned
- P(G): Guess probability (correct answer despite not knowing)
- P(S): Slip probability (incorrect answer despite knowing)

ADHD Extensions:
1. Dynamic Slip Penalty (Attention Drift):
   P(S_effective) = clip(P(S) + alpha_slip * inattention_index, P(S), 0.45)
   Elevated inattention causes careless errors even when the student possesses knowledge.

2. Scaffolding Guess Boost (Progressive Hints):
   P(G_effective) = P(G) + gamma * (hint_level / 4.0) * (1.0 - P(G))
   When hints are provided, answers are more likely to be correct through assistance.
   This prevents the model from mistakenly over-estimating student mastery when hints were used.

Bayesian Update Equations:
If is_correct == True:
   P(L_t | obs) = [ P(L_t-1) * (1 - P(S_eff)) ] / [ P(L_t-1)*(1 - P(S_eff)) + (1 - P(L_t-1))*P(G_eff) ]
If is_correct == False:
   P(L_t | obs) = [ P(L_t-1) * P(S_eff) ] / [ P(L_t-1)*P(S_eff) + (1 - P(L_t-1))*(1 - P(G_eff)) ]

Knowledge Transition Step:
   P(L_t) = P(L_t | obs) + (1 - P(L_t | obs)) * P(T)

Prediction for next step correctness:
   P(C_t+1) = P(L_t) * (1 - P(S)) + (1 - P(L_t)) * P(G)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from sklearn.metrics import roc_auc_score, mean_squared_error, log_loss


class HintAwareBKT:
    def __init__(
        self,
        p_l0: float = 0.20,
        p_t: float = 0.15,
        p_g: float = 0.25,
        p_s: float = 0.18,
        gamma: float = 0.85,
        alpha_slip: float = 0.22,
        mastery_threshold: float = 0.85
    ):
        """
        Initialize the Hint-Aware ADHD BKT model.
        """
        self.p_l0 = float(p_l0)
        self.p_t = float(p_t)
        self.p_g = float(p_g)
        self.p_s = float(p_s)
        self.gamma = float(gamma)
        self.alpha_slip = float(alpha_slip)
        self.mastery_threshold = float(mastery_threshold)

    @staticmethod
    def compute_personal_rt_zscore(
        response_times_ms: List[float],
        latest_rt_ms: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Computes learner-specific log-RT baseline and z-score to detect child-relative
        attention lapses (impulsive rush z <= -1.5 or attentional drift z >= +1.5).
        """
        valid = [float(rt) for rt in response_times_ms if rt is not None and float(rt) > 100.0]
        if not valid:
            return {
                "sample_count": 0,
                "mean_ms": 6000.0,
                "std_ms": 2000.0,
                "rt_zscore": 0.0,
                "is_rt_anomaly": False
            }

        mean_ms = float(np.mean(valid))
        std_ms = float(max(500.0, np.std(valid)))
        log_rts = np.log(np.maximum(100.0, valid))
        log_mean = float(np.mean(log_rts)) if len(valid) >= 3 else float(np.log(6000.0))
        log_std = float(max(0.25, np.std(log_rts))) if len(valid) >= 3 else 0.45

        rt_zscore = 0.0
        if latest_rt_ms is not None and float(latest_rt_ms) > 100.0:
            rt_zscore = float((np.log(float(latest_rt_ms)) - log_mean) / log_std)

        return {
            "sample_count": len(valid),
            "mean_ms": round(mean_ms, 1),
            "std_ms": round(std_ms, 1),
            "rt_zscore": round(rt_zscore, 2),
            "is_rt_anomaly": bool(abs(rt_zscore) >= 1.5)
        }

    @staticmethod
    def fuse_attention_signals(
        gameplay_inattention_index: float = 0.1,
        rt_zscore: float = 0.0,
        remaining_time_ms: Optional[float] = None,
        camera_permission_granted: bool = False,
        camera_attention_score: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Privacy-Aware Dual-Source Attention Fusion (Step 1 & Step 2):
        - Mode A (Multimodal): 0.60 * camera_inattention + 0.40 * gameplay_inattention
        - Mode B (Telemetry-Only Fallback): 1.00 * gameplay_inattention when camera permission is disabled.
        """
        gp_inatt = float(np.clip(gameplay_inattention_index, 0.0, 1.0))
        if rt_zscore >= 1.5:
            gp_inatt = float(min(1.0, gp_inatt + min(0.25, (rt_zscore - 1.5) * 0.12)))
        if remaining_time_ms is not None and float(remaining_time_ms) <= 0.0:
            gp_inatt = float(max(gp_inatt, 0.85))

        use_multimodal = bool(camera_permission_granted and camera_attention_score is not None)
        if use_multimodal:
            cam_inatt = float(np.clip(1.0 - float(camera_attention_score), 0.0, 1.0))
            fused = float(np.clip(0.60 * cam_inatt + 0.40 * gp_inatt, 0.0, 1.0))
            mode = "MULTIMODAL_CAMERA_AND_GAMEPLAY"
        else:
            cam_inatt = None
            fused = gp_inatt
            mode = "TELEMETRY_ONLY_FALLBACK"

        return {
            "fusion_mode": mode,
            "camera_permission_granted": bool(camera_permission_granted),
            "gameplay_inattention_index": round(gp_inatt, 4),
            "camera_inattention_index": round(cam_inatt, 4) if cam_inatt is not None else None,
            "fused_inattention_index": round(fused, 4),
            "attention_probability": round(1.0 - fused, 4)
        }

    def compute_retention_state(
        self,
        p_prior: float,
        memory_stability: float = 3.0,
        elapsed_days: float = 0.0
    ) -> Dict[str, Any]:
        """
        Computes Stability-Based Ebbinghaus Retention R(t) = exp(-delta_t / S_t)
        and returns decayed prior knowledge alongside revision scheduling metrics (Step 4).
        """
        safe_s = float(max(0.5, memory_stability))
        safe_dt = float(max(0.0, elapsed_days))
        retention_score = float(np.exp(-safe_dt / safe_s)) if safe_dt > 0.0 else 1.0
        decayed_prior = (
            float(self.p_l0 + (p_prior - self.p_l0) * retention_score)
            if safe_dt > 0.0
            else float(p_prior)
        )
        optimal_next_days = float(max(0.5, -safe_s * np.log(0.70)))
        return {
            "retention_score": round(retention_score, 4),
            "decayed_prior": round(float(np.clip(decayed_prior, 0.0, 1.0)), 4),
            "memory_stability": round(safe_s, 2),
            "elapsed_days": round(safe_dt, 2),
            "revision_recommended": bool(retention_score < 0.70),
            "optimal_next_review_days": round(optimal_next_days, 1)
        }

    def update_step(
        self,
        p_prior: float,
        is_correct: bool,
        hint_level: int = 0,
        inattention_index: float = 0.0,
        is_attention_slip: bool = False,
        rt_zscore: float = 0.0,
        memory_stability: float = 3.0,
        elapsed_days: float = 0.0
    ) -> Dict[str, Any]:
        """
        Executes a single AD-BKT (Attention-Disentangled & Forgetting-Aware BKT) update step (Steps 3 & 4).
        """
        # 0. Step 4: Stability-Based Forgetting Decay
        ret_state = self.compute_retention_state(p_prior, memory_stability, elapsed_days)
        active_prior = ret_state["decayed_prior"]

        # 1. Step 3: Adapt slip based on ADHD inattention & RT z-score
        clipped_inatt = float(np.clip(inattention_index, 0.0, 1.0))
        has_rt_anomaly = bool(abs(float(rt_zscore)) >= 1.5)
        effective_slip = float(np.clip(self.p_s + self.alpha_slip * clipped_inatt, self.p_s, 0.45))
        if not is_correct and (is_attention_slip or has_rt_anomaly):
            effective_slip = float(max(effective_slip, 0.62))

        # 2. Adapt guess based on progressive hint level assistance
        hint_fraction = float(np.clip(hint_level / 4.0, 0.0, 1.0))
        if is_correct:
            effective_guess = float(self.p_g + self.gamma * hint_fraction * (1.0 - self.p_g))
        else:
            effective_guess = float(self.p_g)

        # 3. Compute Posterior Knowledge via Bayes' Rule
        if is_correct:
            numerator = active_prior * (1.0 - effective_slip)
            denominator = numerator + (1.0 - active_prior) * effective_guess
        else:
            numerator = active_prior * effective_slip
            denominator = numerator + (1.0 - active_prior) * (1.0 - effective_guess)

        p_posterior = float(numerator / denominator) if denominator > 0 else float(active_prior)

        # Standard BKT comparison for False Demotion Rate
        std_num = active_prior * (1.0 - self.p_s) if is_correct else active_prior * self.p_s
        std_den = (
            std_num + (1.0 - active_prior) * self.p_g
            if is_correct
            else std_num + (1.0 - active_prior) * (1.0 - self.p_g)
        )
        std_post = float(std_num / std_den) if std_den > 0 else float(active_prior)
        std_updated = (
            float(np.clip(std_post + (1.0 - std_post) * self.p_t, active_prior, 1.0))
            if is_correct
            else float(min(active_prior * 0.95, std_post))
        )

        # 4. Learning Transition & AD-BKT False Mastery Demotion Protection
        mastery_protected = False
        if is_correct:
            eff_t = self.p_t * (1.0 - 0.30 * clipped_inatt)
            p_updated = float(p_posterior + (1.0 - p_posterior) * eff_t)
            p_updated = float(np.clip(p_updated, active_prior, 1.0))
        else:
            if is_attention_slip or has_rt_anomaly:
                p_updated = float(max(active_prior * 0.96, min(active_prior * 0.98, p_posterior)))
                mastery_protected = True
            else:
                p_updated = float(min(active_prior * 0.95, p_posterior))
                mastery_protected = bool(clipped_inatt >= 0.60)
            p_updated = float(np.clip(p_updated, 0.0, 1.0))

        # 5. Step 4: Update Memory Stability S_t (Spaced Retrieval Growth)
        updated_stability = float(ret_state["memory_stability"])
        if is_correct:
            if hint_level == 0 and clipped_inatt < 0.60:
                updated_stability = float(min(30.0, updated_stability * (1.0 + 0.35 * (1.0 - clipped_inatt))))
            else:
                updated_stability = float(min(30.0, updated_stability * (1.0 + 0.10 * (1.0 - hint_fraction))))
        elif not mastery_protected:
            updated_stability = float(max(1.0, updated_stability * 0.80))

        optimal_next_days = float(max(0.5, -updated_stability * np.log(0.70)))

        # 6. Predicted probability of answering the NEXT question correctly
        predicted_next_correct = float(p_updated * (1.0 - self.p_s) + (1.0 - p_updated) * self.p_g)
        false_demotion_prevented = float(max(0.0, p_updated - std_updated)) if not is_correct else 0.0

        return {
            'prior_knowledge': float(p_prior),
            'decayed_prior_knowledge': float(active_prior),
            'posterior_knowledge': float(p_posterior),
            'updated_knowledge': float(p_updated),
            'standard_updated_knowledge': float(round(std_updated, 4)),
            'predicted_next_correct': float(predicted_next_correct),
            'effective_slip': float(effective_slip),
            'effective_guess': float(effective_guess),
            'is_mastered': bool(p_updated >= self.mastery_threshold),
            'mastery_protected': bool(mastery_protected),
            'false_demotion_prevented': round(false_demotion_prevented, 4),
            'retention_score': ret_state["retention_score"],
            'memory_stability': round(updated_stability, 2),
            'revision_recommended': ret_state["revision_recommended"],
            'optimal_next_review_days': round(optimal_next_days, 1)
        }

    def predict_sequence(self, observations: List[Tuple[bool, int, float]]) -> List[Dict[str, Any]]:
        """
        Processes a sequence of student observations:
        observations: list of (is_correct, hint_level, inattention_index)
        """
        trajectory = []
        p_current = self.p_l0

        for is_correct, hint_level, inattention in observations:
            step_result = self.update_step(p_current, is_correct, hint_level, inattention)
            trajectory.append(step_result)
            p_current = step_result['updated_knowledge']

        return trajectory

    def evaluate_on_dataframe(
        self,
        df: pd.DataFrame,
        enable_ad_slip_protection: bool = False
    ) -> Dict[str, float]:
        """
        Evaluates BKT predictive performance and False Mastery Demotion Rate (FDR)
        on a tabular interaction dataset.
        Expected columns: student_id, is_correct, hint_level, inattention_index,
                          response_time_ms, true_mastery_latent (optional)
        """
        y_true = []
        y_pred = []
        mastered_slip_events = 0
        false_demotions = 0
        mastery_drop_sum = 0.0

        for student_id, group in df.groupby('student_id'):
            p_current = self.p_l0
            stability = 3.0
            seen_rts: List[float] = []

            for _, row in group.iterrows():
                is_corr = bool(row['is_correct'])
                hint_lvl = int(row.get('hint_level', 0))
                inatt = float(row.get('inattention_index', 0.0))
                rt_ms = float(row.get('response_time_ms', 5000.0))
                true_mastery = int(row.get('true_mastery_latent', 1 if p_current >= 0.70 else 0))

                # Personal log-RT Z-score computation
                rt_z = 0.0
                if len(seen_rts) >= 3:
                    log_rts = np.log(np.maximum(100.0, seen_rts))
                    mean_log = float(np.mean(log_rts))
                    std_log = float(max(0.25, np.std(log_rts)))
                    rt_z = float((np.log(max(100.0, rt_ms)) - mean_log) / std_log)
                seen_rts.append(rt_ms)

                is_impulsive_err = (not is_corr) and (rt_ms < 2200.0)
                is_attention_slip = bool(
                    enable_ad_slip_protection
                    and (not is_corr)
                    and (is_impulsive_err or abs(rt_z) >= 1.5 or inatt >= 0.55)
                )

                # Prediction before observing result
                eff_s_pred = float(np.clip(self.p_s + self.alpha_slip * inatt, self.p_s, 0.45))
                pred_correct = p_current * (1.0 - eff_s_pred) + (1.0 - p_current) * self.p_g
                y_true.append(1.0 if is_corr else 0.0)
                y_pred.append(float(pred_correct))

                p_before = p_current
                step_res = self.update_step(
                    p_current,
                    is_corr,
                    hint_lvl,
                    inatt,
                    is_attention_slip=is_attention_slip,
                    rt_zscore=rt_z if enable_ad_slip_protection else 0.0,
                    memory_stability=stability,
                    elapsed_days=0.0
                )
                p_current = step_res['updated_knowledge']
                stability = step_res['memory_stability']

                # Check False Mastery Demotion on true-mastered students who make an attentional slip
                if (not is_corr) and true_mastery == 1 and p_before >= 0.60 and (inatt >= 0.50 or rt_ms < 2500.0 or abs(rt_z) >= 1.3):
                    mastered_slip_events += 1
                    drop = max(0.0, p_before - p_current)
                    mastery_drop_sum += drop
                    if drop >= 0.12 or p_current < 0.55:
                        false_demotions += 1

        y_true_arr = np.array(y_true)
        y_pred_arr = np.array(y_pred)

        rmse = float(np.sqrt(mean_squared_error(y_true_arr, y_pred_arr)))
        try:
            auc = float(roc_auc_score(y_true_arr, y_pred_arr))
        except ValueError:
            auc = 0.5
        acc = float(np.mean((y_pred_arr >= 0.5) == (y_true_arr == 1.0)))
        loss = float(log_loss(y_true_arr, np.clip(y_pred_arr, 1e-6, 1.0 - 1e-6)))
        fdr = float(false_demotions / mastered_slip_events) if mastered_slip_events > 0 else 0.0
        avg_slip_drop = float(mastery_drop_sum / mastered_slip_events) if mastered_slip_events > 0 else 0.0

        return {
            'rmse': round(rmse, 4),
            'auc_roc': round(auc, 4),
            'accuracy': round(acc, 4),
            'log_loss': round(loss, 4),
            'false_demotion_rate': round(fdr, 4),
            'avg_slip_mastery_drop': round(avg_slip_drop, 4),
            'mastered_slip_events': mastered_slip_events,
            'sample_count': len(y_true)
        }
