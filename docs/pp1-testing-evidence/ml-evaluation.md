# Offline ML evaluation and SHAP verification

**Scope.** The NSCH K2Q31A logistic-regression baseline is an **offline research experiment on a public US survey**. The outcome is *parent-reported "ever told the child has ADD/ADHD"*.
- It is not trained on MathQuest learners.
- It is not used to score or label any MathQuest child.
- It is not a diagnostic tool.
- SNAP-IV is not one of its inputs.

## What was done (2026-10-22)
`scripts/verify_ml_readonly.py` was run with the ML venv (shap 0.54.1, scikit-learn 1.9.1). It is read-only: nothing is refitted and nothing in the repo is written. It performs four checks:
1. Load the frozen `artifacts/nsch_k2q31a_v1/model.joblib` and check its sha256 against `metadata.json`. The value is `73DEE96F…D1B3`, and the same hash appears in `test_metrics_2025.json` and in the research snapshot.
2. Load the 2025 held-out data and recompute the metrics with scikit-learn. Compare them with `test_metrics_2025.json`.
3. Recompute the SHAP explanation for the **hypothetical** example (`examples/hypothetical_child.json`, not a real child). Compare it with `app/research_snapshots/learner-profile.json`.
4. Re-create the 2023–24 validation partition and recompute aggregate mean |SHAP|. Compare it with the snapshot.

Full output: [`results/ml-verification.log`](results/ml-verification.log).

## Results: 20 of 20 checks passed

| Check | Stored | Recomputed | Match |
|---|---|---|---|
| Model sha256 | 73DEE96F…D1B3 | same | ✔ |
| Model | LogisticRegression, C=0.1 | – | – |
| Test n / positives (2025) | 10 743 / 1 634 | 10 743 / 1 634 | ✔ |
| ROC-AUC | 0.73555 | 0.73555 | ✔ (diff 0) |
| PR-AUC (average precision) | 0.34292 (no-skill baseline 0.152) | 0.34292 | ✔ |
| Brier score | 0.11608 | 0.11608 | ✔ |
| Confusion matrix @ frozen threshold 0.12586 | TN 5740, FP 3369, FN 468, TP 1166 | identical | ✔ |
| SHAP, hypothetical example: base value / model output (log-odds) | −2.11086 / −0.79100 | identical | ✔ |
| SHAP additivity (base + ΣSHAP = output) | – | error 3.3e-16 | ✔ |
| SHAP contributions (74 source features) | snapshot values | max diff 0.0 | ✔ |
| Aggregate SHAP, validation n | 5 027 | 5 027 | ✔ |
| Aggregate SHAP, additivity | – | max error 1.8e-15 | ✔ |
| Aggregate mean \|SHAP\| (74 features) | snapshot values | max diff 1.2e-14 | ✔ |

Other details of the explainer and model:
- **Explainer:** `shap.LinearExplainer` with `maskers.Independent`, 200 background rows taken from the training partition (`shap_background.npz`).
- **Top aggregate features:** SC_SEX, SC_AGE_YEARS, INSTYPE, FAMILY_R, SC_RACE_R.
- **Other stored values, not recomputed here:**
  - validation ROC-AUC 0.7086;
  - test sensitivity 0.714 and specificity 0.630 at the threshold;
  - calibration slope 0.978;
  - provisional bootstrap 95% CI for ROC-AUC [0.723, 0.749];
  - per-subgroup metrics.

  These come from the same frozen run and are in `test_metrics_2025.json`.

## How to read these results
- They show the stored evaluation and explanations are **reproducible and internally consistent**. They do not show that the model works for Sri Lankan children or for MathQuest gameplay.
- Metrics are unweighted. The confidence intervals are not adjusted for the survey design.
- The top SHAP features are demographic or household variables. This is a known limitation, documented as a reason the model is research-only.
- **IMLR model:** only synthetic probe tests exist (47 passed). Its status is `BLOCKED_INSUFFICIENT_REAL_DATA`, and no performance metrics are claimed.
- **ELP-X:** a transparent Bayesian rule-based estimator, not a trained ML model. It is verified by unit, boundary and integration tests, not by accuracy metrics. No validation against teacher judgement or real learners has been done yet.
