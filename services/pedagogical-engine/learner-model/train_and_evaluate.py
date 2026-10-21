"""
Research Evaluation & Ablation Benchmark Script (Step 7):
Compares 3 Knowledge Tracing Variants on ADHD Student Interaction Telemetry:
  1. Standard BKT Baseline (No Hint Discounting, Static Slip)
  2. Hint-Aware BKT (Scaffolding Discounting, Basic Slip)
  3. Proposed AD-BKT (Attention-Disentangled, Personal RT Z-Score & Mastery Protection + Stability Retention)

Outputs:
  - Console Comparative Table (AUC-ROC, RMSE, Accuracy, Log-Loss, False Demotion Rate [FDR], Avg Slip Mastery Drop)
  - JSON Research Summary saved to `data/ad_bkt_benchmark_results.json`
"""

import json
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import pandas as pd
from bkt_model import HintAwareBKT
from simulate_adhd_learners import generate_synthetic_dataset


def run_evaluation():
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'synthetic_adhd_interactions.csv')
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}, generating synthetic ADHD dataset...")
        generate_synthetic_dataset(output_path=data_path)

    df = pd.read_csv(data_path)
    print("==========================================================================================")
    print(f" Loaded Research Telemetry Dataset: {len(df)} interactions across {df['student_id'].nunique()} students")
    print(" Archetypes included:", df['archetype'].unique().tolist())
    print("==========================================================================================\n")

    # 1. Baseline Standard BKT (no hint discounting, fixed slip rate, no slip protection)
    baseline_bkt = HintAwareBKT(
        p_l0=0.20,
        p_t=0.15,
        p_g=0.25,
        p_s=0.18,
        gamma=0.0,       # No hint awareness
        alpha_slip=0.0   # No inattention slip adjustment
    )
    baseline_metrics = baseline_bkt.evaluate_on_dataframe(df, enable_ad_slip_protection=False)

    # 2. Hint-Aware BKT (with hint discounting + basic linear inattention slip, without AD-BKT Z-score shield)
    hint_aware_bkt = HintAwareBKT(
        p_l0=0.20,
        p_t=0.15,
        p_g=0.25,
        p_s=0.18,
        gamma=0.85,      # Hint awareness discounting
        alpha_slip=0.22  # Basic attention drift slip compensation
    )
    hint_aware_metrics = hint_aware_bkt.evaluate_on_dataframe(df, enable_ad_slip_protection=False)

    # 3. Proposed AD-BKT (Full Attention-Disentangled Slip Protection + Personal RT Z-Score Shield)
    ad_bkt = HintAwareBKT(
        p_l0=0.20,
        p_t=0.15,
        p_g=0.25,
        p_s=0.18,
        gamma=0.85,      # Hint awareness discounting
        alpha_slip=0.28  # Multimodal/Telemetry fused slip sensitivity
    )
    ad_bkt_metrics = ad_bkt.evaluate_on_dataframe(df, enable_ad_slip_protection=True)

    print("[RESULTS] 3-MODEL ABLATION BENCHMARK (Standard BKT vs. Hint-Aware BKT vs. Proposed AD-BKT):")
    print("+------------------------------+----------------+------------------+------------------+---------------+")
    print("| Metric                       | Standard BKT   | Hint-Aware BKT   | Proposed AD-BKT  | AD vs Std Δ   |")
    print("+------------------------------+----------------+------------------+------------------+---------------+")

    rows = [
        ('auc_roc', 'AUC-ROC (Discrimination)    '),
        ('rmse', 'RMSE (Calibration Error)    '),
        ('accuracy', 'Predictive Accuracy         '),
        ('log_loss', 'Cross-Entropy Log-Loss      '),
        ('false_demotion_rate', 'False Demotion Rate (FDR) ↓ '),
        ('avg_slip_mastery_drop', 'Avg Mastery Drop on Slip ↓  ')
    ]

    for key, label in rows:
        b_val = baseline_metrics[key]
        h_val = hint_aware_metrics[key]
        a_val = ad_bkt_metrics[key]
        delta = a_val - b_val
        delta_str = f"{delta:+.4f}"
        print(f"| {label} | {b_val:14.4f} | {h_val:16.4f} | {a_val:16.4f} | {delta_str:13} |")

    print("+------------------------------+----------------+------------------+------------------+---------------+")
    print(
        f"\n[KEY NOVELTY FINDING] Across {ad_bkt_metrics['mastered_slip_events']} ADHD attention-slip events among mastered learners:"
    )
    print(
        f"  • Standard BKT False Demotion Rate (FDR): {baseline_metrics['false_demotion_rate'] * 100:.1f}% "
        f"(Avg mastery drop: -{baseline_metrics['avg_slip_mastery_drop'] * 100:.1f}%)"
    )
    print(
        f"  • Proposed AD-BKT False Demotion Rate:    {ad_bkt_metrics['false_demotion_rate'] * 100:.1f}% "
        f"(Avg mastery drop: -{ad_bkt_metrics['avg_slip_mastery_drop'] * 100:.1f}%)"
    )

    output_json_path = os.path.join(os.path.dirname(__file__), 'data', 'ad_bkt_benchmark_results.json')
    summary_payload = {
        "dataset": {
            "total_interactions": int(len(df)),
            "unique_students": int(df['student_id'].nunique()),
            "archetypes": df['archetype'].unique().tolist()
        },
        "models": {
            "standard_bkt": baseline_metrics,
            "hint_aware_bkt": hint_aware_metrics,
            "proposed_ad_bkt": ad_bkt_metrics
        }
    }
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(summary_payload, f, indent=2)
    print(f"\n[SAVED] Benchmark JSON exported to: {output_json_path}")


if __name__ == '__main__':
    run_evaluation()
