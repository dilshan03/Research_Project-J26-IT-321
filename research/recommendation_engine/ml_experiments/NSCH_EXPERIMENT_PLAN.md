# NSCH Supervised Baseline — Experiment Plan (`NSCH_EXPERIMENT_PLAN.md`)

**Status:** PROPOSED — for review. **Nothing in this plan has been implemented or trained.**
**Depends on:** `NSCH_DATA_AUDIT.md`, `NSCH_FEATURE_DICTIONARY.md`.

---

## 1. Research question and boundaries

**Question.** Using only the NSCH public-use topical files, how well can a reproducible supervised model discriminate
US children aged 6–10 whose parent reports that a doctor or other health care provider has **ever told** them the
child has ADD/ADHD, and how much of that performance survives once target-derived, treatment-related and
symptom-adjacent information is excluded — when evaluated on a later, unseen survey year?

**This experiment is methodological.** It must not be presented as:

- clinical ADHD diagnosis, screening or risk assessment for an individual child;
- classification of the three ADHD presentations (no presentation labels exist in the data);
- prediction of changes in ADHD presentation or individual symptom improvement (the data are independent
  cross-sections, not longitudinal);
- IMPSA or IMLR estimation, or any MathQuest learner metric;
- evidence about MathQuest's effectiveness.

No model from this experiment is to be deployed in, or queried by, the MathQuest application, and its outputs must
never be shown about a real child. Results describe a US survey population and do not transfer to Sri Lankan children.

## 2. Population and labels

| Item | Definition |
| :--- | :--- |
| Unit | One child per household (`HHID`). |
| Inclusion | `SC_AGE_YEARS` 6–10 (all form T2) and `K2Q31A` ∈ {1, 2}. |
| Exclusion | `K2Q31A` blank (87 / 96 / 83 records) — never imputed or inferred from follow-ups. |
| **Primary target Y1** | `K2Q31A = 1` ("ever told") vs `= 2`. |
| Secondary target Y2 (sensitivity) | Currently has the condition (`K2Q31A=1` and `K2Q31B=1`) vs `K2Q31A=2`; "no longer current" and incomplete follow-ups excluded. |
| Not targets | Severity, medication, behavioural treatment, medication shortage. |

## 3. Temporal evaluation design

| Split | Years | Labelled n | Positives (Y1) | Rate |
| :--- | :--- | ---: | ---: | ---: |
| Development | 2023 + 2024 | 25,131 | 3,570 | 14.2 % |
| **External-year test** | **2025** | 10,743 | 1,634 | 15.2 % |

- **Model selection only inside the development years**, using (a) 5-fold cross-validation stratified by
  year × target, and (b) a temporal check, train 2023 → validate 2024, to see whether choices hold forward in time.
- **2025 is used once**, after the feature set, preprocessing, model family, hyper-parameters and decision thresholds
  are frozen and recorded (a pre-registration file with a hash of the configuration).
- **Comparability checks before touching 2025 outcomes:**
  1. ADHD question wording and codes identical (verified in the audit).
  2. Only variables present in all three years with the same form coverage (list in the feature dictionary).
  3. Covariate shift: per-feature distribution comparison (population stability index) and an "adversarial"
     classifier distinguishing development from 2025 records **using predictors only**. A high adversarial AUC is
     reported as a limitation, not hidden.
  4. Label-prevalence shift (weighted 11.8 % → 12.7 % → 13.3 %): report calibration-in-the-large on 2025; optionally a
     prespecified intercept-only recalibration, reported separately from the frozen model.
- If a comparability check fails for a variable, it is dropped **before** final training and the change is logged.

## 4. Feature sets (models compared)

| Model | Features | Purpose |
| :--- | :--- | :--- |
| **M0** | Age + sex only | Reference; shows what trivial demographics achieve. |
| **M1 (primary)** | Tier A (stable / contextual) | The main baseline: the least leakage-prone information. |
| M2 (labelled "functional profile") | Tier A + Tier B | Shows how much contemporaneous behaviour/parent-stress items add. Must not be described as early prediction. |
| M3 (sensitivity, labelled "co-diagnosis informed") | M2 + L3 "ever told" co-occurring diagnoses | Quantifies dependence on co-diagnosis; illustrates proxy inflation. |
| — | L1, L2, outcome and design variables | **Never used.** Enforced by an allow-list, not a block-list. |

**Leakage guard-rails:** the feature list is an explicit allow-list file; an automated check fails the run if any
excluded variable (or any column derived from it) appears; the univariate screen is re-run on the final processed
matrix; any M1 result with ROC-AUC > 0.80 triggers a leakage investigation before it is reported.

## 5. Preprocessing

- **Missing values:** structural skips → `NOT_APPLICABLE` level from documented skip rules; remaining blanks →
  `MISSING` level (categorical) or missing indicator plus median imputation (numeric). All fitted on training folds
  only. No complete-case analysis (≈ 35 % of records would be lost).
- **Categorical variables:** one-hot for nominal; ordered integers for Likert-type items; "Don't know" / "not enrolled"
  / "does not give grades" codes as separate levels; levels < 1 % merged within training folds.
- **Family poverty ratio:** develop with `FPL_I1`; for final estimates, repeat fitting/evaluation over `FPL_I1`–`FPL_I6`
  and combine (average predictions; report between-implicate spread).
- **Top-coded values** (FPL 400 = ≥ 400 %, age 70 = 70+) treated as censored categories where relevant.

## 6. Class imbalance

Positive rate ≈ 14–15 % (moderate). Default: **no resampling** (it distorts calibration). Use class-weighted loss only
if it improves PR-AUC in cross-validation, and always report calibrated probabilities. Decision thresholds (if any)
are chosen on development folds and frozen; ROC-AUC/PR-AUC are threshold-free and primary.

## 7. Survey design

- **Development fitting:** unweighted (prediction is the goal) with a sensitivity run using normalised `FWC` as sample
  weights. When pooling 2023+2024 for population estimates, divide weights by the number of years (to be confirmed
  against the NSCH methodology report).
- **Evaluation:** report both unweighted and `FWC`-weighted metrics on 2025. Confidence intervals from a
  stratified bootstrap that resamples records within `FIPSST × STRATUM` strata (design to be confirmed with the
  missing methodology documents); 1,000 replicates.
- **Interpretation:** weighted metrics describe the US population of children aged 6–10 in 2025; unweighted
  metrics describe the sample.

## 8. Models (after approval)

1. Penalised logistic regression (L2; also L1 for sparsity) — transparent primary model.
2. Gradient-boosted trees (histogram-based) — non-linear comparison.

Seeds fixed; hyper-parameter grids small and declared in advance. **scikit-learn is not currently installed**; adding
it (with pinned versions) needs approval before any training. Post-hoc explanations (coefficients; SHAP values for the
tree model) are reported at the population level only, consistent with the MQ-REC rule-trace design.

## 9. Evaluation metrics

| Category | Metrics |
| :--- | :--- |
| Discrimination | ROC-AUC (primary); PR-AUC with the 2025 prevalence as the no-skill reference |
| Calibration | Brier score; calibration intercept and slope; reliability curve (deciles) |
| Threshold-based (secondary, frozen threshold) | Sensitivity, specificity, PPV, NPV, F1 |
| Temporal robustness | Development-CV vs 2025 difference for each metric; adversarial-validation AUC |
| Subgroup performance | Sex, single year of age, race, Hispanic origin, household language, insurance type, poverty band |
| Uncertainty | 95 % bootstrap CIs (unweighted and weighted) |

All results are reported for M0–M3 side by side, so the effect of excluding leakage-prone information is explicit.

## 10. Reproducibility

- Raw files are verified by SHA-256 (values in the audit) before each run; raw data stay under the git-ignored
  `ml_experiments/data/raw/`. Derived child-level files must go to a git-ignored `data/processed/` (rule to be added
  first). Only aggregate results are committed.
- One configuration file (target, allow-list, preprocessing, model grids, seeds, thresholds) plus its hash; pinned
  environment (Python, pandas, numpy, scikit-learn versions); scripted pipeline with no manual steps.
- A results log records every evaluation of 2025 (expected: exactly one per frozen model).

## 11. Ethics and reporting

- The label reflects access to care and parental reporting as much as the child's behaviour; disparities in
  subgroup metrics must be reported and interpreted as such.
- Report the cross-sectional design, parent-report labels, missing methodology documents and US-only population as
  limitations in every write-up.
- No clinical, diagnostic or individual-level claims; no use in the MathQuest product; no linkage with MathQuest
  learner data.

## 12. Prerequisites before training (decision points for review)

1. Obtain the official NSCH codebook (special missing codes) and methodology/weighting guidance for 2023–2025, ideally
   with SAS/Stata files.
2. Approve Y1 as the primary target and Y2 as a sensitivity target.
3. Approve the Tier A / Tier B / L1–L3 classification in `NSCH_FEATURE_DICTIONARY.md`.
4. Approve installing scikit-learn (pinned) and adding a git-ignore rule for `ml_experiments/data/processed/`.
5. Confirm with the supervisor/ethics contact that this population-level, non-diagnostic use of public data is within
   the project's approved scope.
