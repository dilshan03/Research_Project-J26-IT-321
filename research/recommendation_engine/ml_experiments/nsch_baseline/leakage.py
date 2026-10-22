"""Leakage guards: static allowlist checks and the univariate screen used in the audit."""

from typing import Dict

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from . import config


def static_violations() -> Dict[str, list]:
    feats = set(config.FEATURES)
    return {
        "forbidden_in_allowlist": sorted(feats & config.FORBIDDEN_FEATURES),
        "adhd_named_features": sorted(f for f in feats if f.startswith("K2Q31") or "ADD" in f.upper()),
        "duplicates": sorted({f for f in config.FEATURES if config.FEATURES.count(f) > 1}),
        "imputation_flags": sorted(f for f in feats if f.endswith("_IF")),
    }


def univariate_auc(X: pd.DataFrame, y: np.ndarray) -> Dict[str, float]:
    """Per-feature in-sample AUC from per-category target rates (numeric features in deciles, blank as a category)."""
    out = {}
    y = np.asarray(y)
    for col in X.columns:
        x = X[col].astype(str)
        if col in config.NUMERIC_FEATURES:
            num = pd.to_numeric(x.replace("", np.nan), errors="coerce")
            cat = pd.qcut(num, 10, duplicates="drop").astype(str).where(num.notna(), "(blank)")
        else:
            cat = x.replace("", "(blank)")
        rate = pd.Series(y).groupby(cat.to_numpy()).mean()
        out[col] = float(roc_auc_score(y, cat.map(rate).to_numpy(dtype=float)))
    return out


def assert_no_leakage(X: pd.DataFrame, y: np.ndarray) -> Dict[str, float]:
    problems = {k: v for k, v in static_violations().items() if v}
    if problems:
        raise RuntimeError(f"Feature allowlist violates leakage rules: {problems}")
    aucs = univariate_auc(X, y)
    too_strong = {k: v for k, v in aucs.items() if v > config.MAX_UNIVARIATE_AUC}
    if too_strong:
        raise RuntimeError(f"Features exceed the univariate leakage threshold {config.MAX_UNIVARIATE_AUC}: {too_strong}")
    return aucs
