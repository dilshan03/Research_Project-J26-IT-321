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

    def update_step(
        self,
        p_prior: float,
        is_correct: bool,
        hint_level: int = 0,
        inattention_index: float = 0.0
    ) -> Dict[str, Any]:
        """
        Executes a single Bayesian update step incorporating hint scaffolding and inattention slip.

        :param p_prior: P(L_t-1), previous knowledge probability
        :param is_correct: Whether the student answered correctly (True/False)
        :param hint_level: Progressive hint level reached (0 to 4)
        :param inattention_index: Real-time attentional drift score [0.0, 1.0]
        :return: Dict containing posterior, updated knowledge, and effective parameters
        """
        # 1. Adapt slip based on ADHD inattention
        clipped_inatt = float(np.clip(inattention_index, 0.0, 1.0))
        effective_slip = float(np.clip(self.p_s + self.alpha_slip * clipped_inatt, self.p_s, 0.45))

        # 2. Adapt guess based on progressive hint level assistance
        hint_fraction = float(np.clip(hint_level / 4.0, 0.0, 1.0))
        if is_correct:
            effective_guess = float(self.p_g + self.gamma * hint_fraction * (1.0 - self.p_g))
        else:
            effective_guess = float(self.p_g)

        # 3. Compute Posterior Knowledge via Bayes' Rule
        if is_correct:
            numerator = p_prior * (1.0 - effective_slip)
            denominator = numerator + (1.0 - p_prior) * effective_guess
        else:
            numerator = p_prior * effective_slip
            denominator = numerator + (1.0 - p_prior) * (1.0 - effective_guess)

        p_posterior = float(numerator / denominator) if denominator > 0 else float(p_prior)

        # 4. Learning Transition
        if is_correct:
            p_updated = float(p_posterior + (1.0 - p_posterior) * self.p_t)
            p_updated = float(np.clip(p_updated, p_prior, 1.0))
        else:
            p_updated = float(min(p_prior * 0.95, p_posterior))
            p_updated = float(np.clip(p_updated, 0.0, 1.0))

        # 5. Predicted probability of answering the NEXT question correctly
        predicted_next_correct = float(p_updated * (1.0 - self.p_s) + (1.0 - p_updated) * self.p_g)

        return {
            'prior_knowledge': float(p_prior),
            'posterior_knowledge': float(p_posterior),
            'updated_knowledge': float(p_updated),
            'predicted_next_correct': float(predicted_next_correct),
            'effective_slip': float(effective_slip),
            'effective_guess': float(effective_guess),
            'is_mastered': bool(p_updated >= self.mastery_threshold)
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

    def evaluate_on_dataframe(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Evaluates BKT predictive performance on a tabular interaction dataset.
        Expected columns: student_id, is_correct, hint_level, inattention_index
        """
        y_true = []
        y_pred = []

        for student_id, group in df.groupby('student_id'):
            p_current = self.p_l0
            for _, row in group.iterrows():
                is_corr = bool(row['is_correct'])
                hint_lvl = int(row.get('hint_level', 0))
                inatt = float(row.get('inattention_index', 0.0))

                # Prediction before observing result
                pred_correct = p_current * (1.0 - self.p_s) + (1.0 - p_current) * self.p_g
                y_true.append(1.0 if is_corr else 0.0)
                y_pred.append(float(pred_correct))

                # Update state
                step_res = self.update_step(p_current, is_corr, hint_lvl, inatt)
                p_current = step_res['updated_knowledge']

        y_true_arr = np.array(y_true)
        y_pred_arr = np.array(y_pred)

        rmse = float(np.sqrt(mean_squared_error(y_true_arr, y_pred_arr)))
        try:
            auc = float(roc_auc_score(y_true_arr, y_pred_arr))
        except ValueError:
            auc = 0.5
        acc = float(np.mean((y_pred_arr >= 0.5) == (y_true_arr == 1.0)))
        loss = float(log_loss(y_true_arr, np.clip(y_pred_arr, 1e-6, 1.0 - 1e-6)))

        return {
            'rmse': round(rmse, 4),
            'auc_roc': round(auc, 4),
            'accuracy': round(acc, 4),
            'log_loss': round(loss, 4),
            'sample_count': len(y_true)
        }
