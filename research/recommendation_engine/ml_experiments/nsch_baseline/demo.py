"""
Live prediction demo for the frozen NSCH K2Q31A baseline.

    .venv\\Scripts\\python.exe -m nsch_baseline.demo                       # held-out 2025 example no. 0
    .venv\\Scripts\\python.exe -m nsch_baseline.demo --example 25          # another held-out example
    .venv\\Scripts\\python.exe -m nsch_baseline.demo --hypothetical examples\\hypothetical_child.json
    add --no-shap to skip the explanation

Only the 74 allowlisted model features are displayed — never household IDs, state, weights or other identifiers.
"""

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from . import config, data
from .preprocessing import source_feature

LABELS = json.loads((Path(__file__).with_name("feature_labels.json")).read_text(encoding="utf-8"))["features"]


def load_frozen():
    meta = json.loads((config.ARTIFACT_DIR / "metadata.json").read_text(encoding="utf-8"))
    if data.sha256(config.ARTIFACT_DIR / "model.joblib") != meta["model_sha256"]:
        raise RuntimeError("Model file differs from the frozen artifact.")
    return joblib.load(config.ARTIFACT_DIR / "model.joblib"), meta


def held_out_example(index: int):
    df = data.select_cohort(data.load_year(config.TEST_YEAR))
    if not 0 <= index < len(df):
        raise IndexError(f"--example must be between 0 and {len(df) - 1}")
    row = df.iloc[[index]]
    return row[config.FEATURES].reset_index(drop=True), row[config.TARGET].iloc[0]


def hypothetical(path: Path):
    raw = json.loads(path.read_text(encoding="utf-8"))
    values = raw.get("features", {})
    unknown = sorted(set(values) - set(config.FEATURES))
    if unknown:
        raise KeyError(f"Not model features (ignored by design, refusing to guess): {unknown}")
    row = {f: str(values.get(f, "")) for f in config.FEATURES}  # missing -> blank, handled like survey non-response
    return pd.DataFrame([row]), None


def describe(feature: str, value: str) -> str:
    if value in ("", "nan", "None"):
        return "(missing)"
    meaning = LABELS[feature]["codes"].get(value)
    return f"{value} = {meaning}" if meaning else value


def explain(pipe, X):
    """SHAP explanation verified against the model's own output; returns per-source-feature contributions."""
    try:
        import shap
    except ImportError:
        return None, "SHAP is not installed in this environment; prediction shown without explanation."
    prep, model = pipe.named_steps["prep"], pipe.named_steps["model"]
    x = prep.transform(X)
    names = prep.named_steps["columns"].get_feature_names_out()
    background = np.load(config.ARTIFACT_DIR / "shap_background.npz")["background"]
    if hasattr(model, "coef_"):
        explainer = shap.LinearExplainer(model, shap.maskers.Independent(background, max_samples=len(background)))
        values = np.asarray(explainer.shap_values(x))[0]
        base = float(np.ravel(explainer.expected_value)[0])
        target_output = float(model.decision_function(x)[0])          # log-odds
        scale = "log-odds"
    else:
        explainer = shap.TreeExplainer(model)
        sv = explainer.shap_values(x)
        values = (sv[1] if isinstance(sv, list) else np.asarray(sv)[..., 1])[0]
        base = float(np.ravel(explainer.expected_value)[1])
        target_output = float(model.predict_proba(x)[0, 1])           # probability
        scale = "probability"
    reconstructed = base + float(np.sum(values))
    if abs(reconstructed - target_output) > 1e-6:
        return None, (f"SHAP additivity check FAILED ({reconstructed:.6f} vs model {target_output:.6f}); "
                      "explanation withheld rather than shown incorrectly.")
    per_feature = {}
    for name, v in zip(names, values):
        src = source_feature(name)
        per_feature[src] = per_feature.get(src, 0.0) + float(v)
    return {"scale": scale, "base_value": base, "model_output": target_output,
            "reconstructed": reconstructed, "contributions": per_feature}, None


def main(argv=None):
    parser = argparse.ArgumentParser(description="NSCH K2Q31A baseline - prediction demo (research only)")
    parser.add_argument("--example", type=int, default=0, help="index of a held-out 2025 survey record")
    parser.add_argument("--hypothetical", type=Path, help="JSON file with a clearly hypothetical input")
    parser.add_argument("--no-shap", action="store_true")
    args = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    pipe, meta = load_frozen()
    if args.hypothetical:
        X, survey_answer = hypothetical(args.hypothetical)
        source = f"HYPOTHETICAL input from {args.hypothetical.name} (not a real child)"
    else:
        X, survey_answer = held_out_example(args.example)
        source = f"Held-out 2025 NSCH survey record #{args.example} (anonymised: identifiers not shown)"

    p = float(pipe.predict_proba(X)[0, 1])
    threshold = meta["decision_threshold"]["value"]
    bar = "=" * 86
    print(bar)
    print(f"{meta['experiment_id']} | {meta['selected_model']['family']} {meta['selected_model']['params']}")
    print(bar)
    print("NOTE:", config.DISCLAIMER)
    print(f"\nInput: {source}")
    print(f"\nModel probability of a parent-reported 'ever told ADD/ADHD' answer: {p:.3f}")
    print(f"  training-data prevalence: {meta['train_prevalence']:.3f} | development threshold: {threshold:.3f} -> "
          f"score is {'ABOVE' if p >= threshold else 'BELOW'} the threshold (a statistical flag, not a diagnosis)")
    if survey_answer is not None:
        print(f"  survey answer recorded for this held-out record (K2Q31A): "
              f"{'1 = Yes' if survey_answer == '1' else '2 = No'}")

    row = X.iloc[0]
    n_missing = sum(str(row[f]) in ("", "nan", "None") for f in config.FEATURES)
    if n_missing > 0.1 * len(config.FEATURES):
        print(f"  WARNING: {n_missing} of {len(config.FEATURES)} inputs are missing. In the survey, item non-response "
              "is itself associated with the outcome, so this score is dominated by missing-value categories and is "
              "not representative.")
    print(f"\nFeatures used by the model ({len(config.FEATURES)} allowlisted, Tier A):")
    for f in config.FEATURES:
        print(f"  {f:<14} {LABELS[f]['label'][:52]:<52} {describe(f, str(row[f]))}")

    if not args.no_shap:
        result, message = explain(pipe, X)
        print("\nSHAP explanation (statistical contributions to THIS model's output, not causes):")
        if result is None:
            print("  " + message)
        else:
            print(f"  scale: {result['scale']} | base value {result['base_value']:.4f} + sum of contributions = "
                  f"{result['reconstructed']:.4f} (model output {result['model_output']:.4f}; additivity verified)")
            top = sorted(result["contributions"].items(), key=lambda kv: -abs(kv[1]))[:10]
            for f, v in top:
                print(f"  {'+' if v >= 0 else '-'}{abs(v):.4f}  {f:<14} {LABELS[f]['label'][:48]:<48} "
                      f"[{describe(f, str(row[f]))[:30]}]")
            print("  Positive values push the score up, negative values push it down, relative to an average "
                  "training child. They describe the model's arithmetic, not why a child has or lacks a diagnosis.")
    print(bar)


if __name__ == "__main__":
    main()
