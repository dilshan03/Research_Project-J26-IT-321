"""
Sinhala word-problem operation classifier (ADD / SUB / MUL / DIV).

Model: TF-IDF over character n-grams (2-5, word-boundary aware, robust to Sinhala
inflection) + multinomial Logistic Regression. Trained on the verified curriculum
problem bank. Baseline: the rule-based keyword parser (app/services/problem_parser.py).

Run: python -m app.ml.train_operation_classifier
Outputs app/ml/operation_classifier.joblib and app/ml/operation_classifier_metrics.json
"""
import json
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import make_pipeline

from app.services.problem_parser import parse_problem

HERE = Path(__file__).resolve().parent
BANK = HERE.parent / "data" / "db_store" / "curriculum_problems.json"
LABELS = ["ADD", "SUB", "MUL", "DIV"]
SEED = 42


def load():
    items = json.loads(BANK.read_text(encoding="utf-8"))
    seen, X, y = set(), [], []
    for p in items:
        text = (p.get("raw_problem_text") or "").strip()
        if p.get("operation") in LABELS and text and text not in seen:
            seen.add(text)
            X.append(text)
            y.append(p["operation"])
    return X, y


def build():
    return make_pipeline(
        TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=1),
        LogisticRegression(max_iter=2000, C=10, class_weight="balanced", random_state=SEED),
    )


def baseline(texts):
    return [(parse_problem(t).operations or ["NONE"])[0] for t in texts]


def main():
    X, y = load()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)

    model = build().fit(Xtr, ytr)
    pred = model.predict(Xte)
    base = baseline(Xte)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    cv_pred = cross_val_predict(build(), X, y, cv=cv)
    fold_acc = [accuracy_score(np.array(y)[te], cv_pred[te]) for _, te in cv.split(X, y)]

    metrics = {
        "model": "TF-IDF char n-grams (2-5) + Logistic Regression",
        "dataset": {"total": len(X), "train": len(Xtr), "test": len(Xte), "class_counts": dict(Counter(y))},
        "holdout_test": {
            "accuracy": round(accuracy_score(yte, pred), 3),
            "macro_f1": round(f1_score(yte, pred, average="macro"), 3),
            "per_class": classification_report(yte, pred, labels=LABELS, output_dict=True, zero_division=0),
            "confusion_matrix": {"labels": LABELS, "matrix": confusion_matrix(yte, pred, labels=LABELS).tolist()},
        },
        "cross_validation_5fold": {
            "accuracy_mean": round(float(np.mean(fold_acc)), 3),
            "accuracy_std": round(float(np.std(fold_acc)), 3),
            "macro_f1": round(f1_score(y, cv_pred, average="macro"), 3),
        },
        "baseline_rule_parser": {
            "holdout_accuracy": round(accuracy_score(yte, base), 3),
            "full_dataset_accuracy": round(accuracy_score(y, baseline(X)), 3),
        },
    }

    final = build().fit(X, y)  # deployable model uses all data
    joblib.dump(final, HERE / "operation_classifier.joblib")
    (HERE / "operation_classifier_metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    h, c, b = metrics["holdout_test"], metrics["cross_validation_5fold"], metrics["baseline_rule_parser"]
    print(f"Dataset: {len(X)} problems {dict(Counter(y))}")
    print(f"Hold-out accuracy {h['accuracy']}  macro-F1 {h['macro_f1']}")
    print(f"5-fold CV accuracy {c['accuracy_mean']} ± {c['accuracy_std']}  macro-F1 {c['macro_f1']}")
    print(f"Baseline rule parser: hold-out {b['holdout_accuracy']}, full {b['full_dataset_accuracy']}")
    print("Confusion (rows=true ADD,SUB,MUL,DIV):", h["confusion_matrix"]["matrix"])


if __name__ == "__main__":
    main()
