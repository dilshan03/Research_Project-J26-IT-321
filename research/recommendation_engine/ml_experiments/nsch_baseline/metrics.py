"""Classification, calibration and baseline metrics (unweighted; survey-design adjustment not applied)."""

from typing import Dict, Optional

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, confusion_matrix, roc_auc_score, roc_curve

EPS = 1e-6


def discrimination(y, p) -> Dict[str, float]:
    prevalence = float(np.mean(y))
    brier = float(brier_score_loss(y, p))
    brier_ref = prevalence * (1 - prevalence)  # Brier of predicting the observed prevalence for everyone
    return {
        "n": int(len(y)),
        "positives": int(np.sum(y)),
        "prevalence": prevalence,
        "roc_auc": float(roc_auc_score(y, p)),
        "pr_auc": float(average_precision_score(y, p)),
        "pr_auc_no_skill_baseline": prevalence,
        "brier": brier,
        "brier_skill_vs_observed_prevalence": float(1 - brier / brier_ref),
    }


def calibration(y, p, bins: int = 10) -> Dict[str, object]:
    """Calibration-in-the-large, logistic calibration slope/intercept and a decile reliability table."""
    p = np.clip(np.asarray(p, dtype=float), EPS, 1 - EPS)
    logit = np.log(p / (1 - p)).reshape(-1, 1)
    lr = LogisticRegression(C=1e6, max_iter=1000).fit(logit, y)
    order = np.argsort(p, kind="mergesort")
    table = []
    for chunk in np.array_split(order, bins):
        table.append({"n": int(len(chunk)), "mean_predicted": float(p[chunk].mean()),
                      "observed_rate": float(np.mean(np.asarray(y)[chunk]))})
    return {
        "mean_predicted": float(p.mean()),
        "observed_rate": float(np.mean(y)),
        "calibration_in_the_large": float(np.mean(y) - p.mean()),
        "calibration_slope": float(lr.coef_[0][0]),
        "calibration_intercept": float(lr.intercept_[0]),
        "reliability_deciles": table,
    }


def youden_threshold(y, p) -> float:
    fpr, tpr, thr = roc_curve(y, p)
    j = tpr - fpr
    return float(thr[int(np.argmax(j))])


def at_threshold(y, p, threshold: float) -> Dict[str, object]:
    pred = (np.asarray(p) >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    sens = tp / (tp + fn) if tp + fn else float("nan")
    spec = tn / (tn + fp) if tn + fp else float("nan")
    prec = tp / (tp + fp) if tp + fp else float("nan")
    return {
        "threshold": float(threshold),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "sensitivity": float(sens), "specificity": float(spec),
        "precision": float(prec), "recall": float(sens),
        "npv": float(tn / (tn + fn)) if tn + fn else float("nan"),
        "f1": float(2 * prec * sens / (prec + sens)) if prec + sens else float("nan"),
        "predicted_positive_rate": float(pred.mean()),
    }


def prevalence_baseline(y, train_prevalence: float) -> Dict[str, float]:
    """Predicts the training prevalence for every child (no information about the child)."""
    p = np.full(len(y), train_prevalence)
    prevalence = float(np.mean(y))
    return {
        "predicted_probability": float(train_prevalence),
        "roc_auc": 0.5,
        "pr_auc": prevalence,
        "brier": float(brier_score_loss(y, p)),
        "sensitivity_specificity_at_any_threshold": "all-positive or all-negative only",
    }


def bootstrap_ci(y, p, n_boot: int = 1000, seed: int = 0, threshold: Optional[float] = None) -> Dict[str, list]:
    """PROVISIONAL simple-random-sample percentile bootstrap (NOT survey-design adjusted)."""
    rng = np.random.default_rng(seed)
    y, p = np.asarray(y), np.asarray(p)
    stats = {"roc_auc": [], "pr_auc": [], "brier": []}
    for _ in range(n_boot):
        idx = rng.integers(0, len(y), len(y))
        if y[idx].min() == y[idx].max():
            continue
        stats["roc_auc"].append(roc_auc_score(y[idx], p[idx]))
        stats["pr_auc"].append(average_precision_score(y[idx], p[idx]))
        stats["brier"].append(brier_score_loss(y[idx], p[idx]))
    return {k: [float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))] for k, v in stats.items()}
