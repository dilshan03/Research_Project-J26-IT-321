"""
Train and freeze the NSCH K2Q31A baseline.

    .venv\\Scripts\\python.exe -m nsch_baseline.train        (run from ml_experiments/)

Uses 2023 + 2024 only (the 2025 file is never opened here). Splits the development data into training and
validation partitions (stratified by year x target, fixed seed), fits logistic regression and random forest
candidates on the training partition, selects the preferred model on the validation partition, fixes the decision
threshold on the validation partition, and saves the frozen pipeline, allowlist and metadata.
"""

import json
import platform
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from . import config, data, leakage, metrics
from .preprocessing import make_preprocessor


def candidates():
    for c in (0.01, 0.1, 1.0):
        yield "logistic_regression", {"C": c}, LogisticRegression(C=c, max_iter=5000, random_state=config.SEED)
    for leaf in (10, 30, 60):
        yield "random_forest", {"n_estimators": 300, "min_samples_leaf": leaf, "max_features": "sqrt"}, \
            RandomForestClassifier(n_estimators=300, min_samples_leaf=leaf, max_features="sqrt",
                                   n_jobs=-1, random_state=config.SEED)


def versions():
    out = {"python": platform.python_version(), "scikit-learn": sklearn.__version__, "pandas": pd.__version__,
           "numpy": np.__version__, "joblib": joblib.__version__}
    try:
        import shap
        out["shap"] = shap.__version__
    except ImportError:
        out["shap"] = None
    return out


def main():
    X, y, years, hashes = data.load_development()
    strata = years.to_numpy() + "_" + y.astype(str)
    X_tr, X_va, y_tr, y_va, yr_tr, yr_va = train_test_split(
        X, y, years, test_size=config.VALIDATION_FRACTION, stratify=strata, random_state=config.SEED)
    print(f"Development 2023+2024: n={len(y)} (train {len(y_tr)}, validation {len(y_va)})")

    univariate = leakage.assert_no_leakage(X_tr.reset_index(drop=True), y_tr)
    print(f"Leakage guard passed: {len(config.FEATURES)} allowlisted features, max univariate AUC "
          f"{max(univariate.values()):.3f} (limit {config.MAX_UNIVARIATE_AUC})")

    results, fitted = [], []
    for family, params, estimator in candidates():
        pipe = Pipeline([("prep", make_preprocessor()), ("model", estimator)])
        pipe.fit(X_tr, y_tr)
        p_va = pipe.predict_proba(X_va)[:, 1]
        m = metrics.discrimination(y_va, p_va)
        results.append({"family": family, "params": params, **{k: m[k] for k in ("roc_auc", "pr_auc", "brier")}})
        fitted.append((pipe, p_va))
        print(f"  {family:<20} {json.dumps(params):<62} val ROC-AUC {m['roc_auc']:.4f}  "
              f"PR-AUC {m['pr_auc']:.4f}  Brier {m['brier']:.4f}")

    # Selection on validation only: highest ROC-AUC, then lowest Brier (candidates listed simplest first)
    best = max(range(len(results)), key=lambda i: (round(results[i]["roc_auc"], 4), -results[i]["brier"]))
    pipe, p_va = fitted[best]
    threshold = metrics.youden_threshold(y_va, p_va)
    train_prevalence = float(np.mean(y_tr))

    lr_best = max((i for i, r in enumerate(results) if r["family"] == "logistic_regression"),
                  key=lambda i: results[i]["roc_auc"])
    rf_best = max((i for i, r in enumerate(results) if r["family"] == "random_forest"),
                  key=lambda i: results[i]["roc_auc"])
    validation = {
        "selected": {**results[best], **metrics.discrimination(y_va, p_va),
                     "calibration": metrics.calibration(y_va, p_va),
                     "at_threshold": metrics.at_threshold(y_va, p_va, threshold)},
        "best_logistic_regression": results[lr_best],
        "best_random_forest": results[rf_best],
        "prevalence_baseline": metrics.prevalence_baseline(y_va, train_prevalence),
        "all_candidates": results,
    }

    config.ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model_path = config.ARTIFACT_DIR / "model.joblib"
    joblib.dump(pipe, model_path)

    # Small background sample (training partition only) for SHAP; ignored by Git
    background = pipe.named_steps["prep"].transform(X_tr.sample(200, random_state=config.SEED))
    np.savez_compressed(config.ARTIFACT_DIR / "shap_background.npz", background=background)

    encoded = list(pipe.named_steps["prep"].named_steps["columns"].get_feature_names_out())
    metadata = {
        "experiment_id": config.EXPERIMENT_ID,
        "frozen_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "outcome": "K2Q31A (parent-reported: ever told by a doctor/health care provider the child has ADD/ADHD)",
        "disclaimer": config.DISCLAIMER,
        "population": f"NSCH topical public-use files, ages {config.AGE_MIN}-{config.AGE_MAX}, valid K2Q31A (1/2)",
        "development_years": list(config.DEVELOPMENT_YEARS),
        "test_year": config.TEST_YEAR,
        "test_year_used_for_training_or_selection": False,
        "raw_file_sha256": {str(k): v for k, v in hashes.items()},
        "seed": config.SEED,
        "validation_fraction": config.VALIDATION_FRACTION,
        "split_stratification": "survey year x target",
        "n": {"development": int(len(y)), "train": int(len(y_tr)), "validation": int(len(y_va)),
              "train_by_year": {str(k): int(v) for k, v in pd.Series(yr_tr).value_counts().sort_index().items()},
              "validation_by_year": {str(k): int(v) for k, v in pd.Series(yr_va).value_counts().sort_index().items()}},
        "train_prevalence": train_prevalence,
        "selected_model": {"family": results[best]["family"], "params": results[best]["params"],
                           "selection_rule": "highest validation ROC-AUC (4 d.p.), then lowest validation Brier"},
        "decision_threshold": {"value": threshold,
                               "rule": "maximises Youden's J (sensitivity + specificity - 1) on the validation partition"},
        "features": {"numeric": config.NUMERIC_FEATURES, "categorical": config.CATEGORICAL_FEATURES,
                     "n_source_features": len(config.FEATURES), "n_encoded_columns": len(encoded)},
        "univariate_leakage_screen_train": univariate,
        "preprocessing": [
            "Read CSV as strings (blank = missing); originals never modified",
            "Numeric: parsed as numbers, median imputation (training partition) + missing indicators, standardised",
            "Categorical: blank -> 'MISSING' level, one-hot, levels < 1% grouped as infrequent, unseen levels ignored",
            "No survey weights and no survey year used as predictors",
            "CSV blanks cannot distinguish skip / refused / don't know (official codebook not available)",
        ],
        "model_sha256": data.sha256(model_path),
        "library_versions": versions(),
    }
    (config.ARTIFACT_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (config.ARTIFACT_DIR / "feature_allowlist.json").write_text(json.dumps(
        {"numeric": config.NUMERIC_FEATURES, "categorical": config.CATEGORICAL_FEATURES,
         "forbidden": sorted(config.FORBIDDEN_FEATURES)}, indent=2), encoding="utf-8")
    (config.ARTIFACT_DIR / "validation_metrics.json").write_text(json.dumps(validation, indent=2), encoding="utf-8")

    sel = validation["selected"]
    print(f"\nSelected: {results[best]['family']} {results[best]['params']}")
    print(f"Validation ROC-AUC {sel['roc_auc']:.4f} | PR-AUC {sel['pr_auc']:.4f} (no-skill {sel['prevalence']:.4f}) | "
          f"Brier {sel['brier']:.4f} | threshold {threshold:.4f}")
    print(f"Frozen artifacts in {config.ARTIFACT_DIR}  (model sha256 {metadata['model_sha256'][:16]}...)")
    print("2025 has NOT been opened. Evaluate once with: .venv\\Scripts\\python.exe -m nsch_baseline.evaluate")


if __name__ == "__main__":
    main()
