"""Read-only loading of the NSCH topical CSVs: hash verification, ages 6-10, valid K2Q31A labels."""

import hashlib
from pathlib import Path
from typing import Dict, Iterable, Tuple

import numpy as np
import pandas as pd

from . import config


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def raw_path(year: int) -> Path:
    return config.RAW_DIR / config.RAW_FILES[year][0]


def verify_raw(year: int) -> str:
    """Refuses to use a raw file that differs from the audited one."""
    path = raw_path(year)
    if not path.exists():
        raise FileNotFoundError(f"NSCH {year} file not found: {path}")
    digest = sha256(path)
    if digest != config.RAW_FILES[year][1]:
        raise ValueError(f"NSCH {year} file hash {digest} does not match the audited hash; stop and re-audit.")
    return digest


def load_year(year: int) -> pd.DataFrame:
    """All columns as strings, exactly as stored (blank = missing). The original file is never written."""
    verify_raw(year)
    return pd.read_csv(raw_path(year), dtype=str, keep_default_na=False)


def select_cohort(df: pd.DataFrame) -> pd.DataFrame:
    """Children aged 6-10 with a valid K2Q31A label (1 or 2). Blank/invalid labels are excluded, never inferred."""
    age = pd.to_numeric(df["SC_AGE_YEARS"], errors="coerce")
    keep = age.between(config.AGE_MIN, config.AGE_MAX) & df[config.TARGET].isin(
        [config.TARGET_POSITIVE, config.TARGET_NEGATIVE])
    return df.loc[keep].reset_index(drop=True)


def features_and_target(df: pd.DataFrame) -> Tuple[pd.DataFrame, np.ndarray]:
    missing = [c for c in config.FEATURES if c not in df.columns]
    if missing:
        raise KeyError(f"Allowlisted features missing from the data: {missing}")
    X = df[config.FEATURES].copy()
    y = (df[config.TARGET] == config.TARGET_POSITIVE).astype(int).to_numpy()
    return X, y


def load_development() -> Tuple[pd.DataFrame, np.ndarray, pd.Series, Dict[int, str]]:
    """2023 + 2024 only. The 2025 file is not opened here."""
    # Checked before any file is read, so a misconfiguration can never touch the test year.
    if config.TEST_YEAR in config.DEVELOPMENT_YEARS:
        raise RuntimeError("The held-out test year must never be used for development.")
    frames, hashes = [], {}
    for year in config.DEVELOPMENT_YEARS:
        df = select_cohort(load_year(year))
        frames.append(df)
        hashes[year] = config.RAW_FILES[year][1]
    dev = pd.concat(frames, ignore_index=True)
    if set(dev["YEAR"].unique()) - {str(y) for y in config.DEVELOPMENT_YEARS}:
        raise RuntimeError("Development data contains records outside the development years.")
    X, y = features_and_target(dev)
    return X, y, dev["YEAR"], hashes


def load_test() -> Tuple[pd.DataFrame, np.ndarray, pd.DataFrame]:
    """Held-out 2025 cohort. Returns features, labels and non-identifying subgroup columns."""
    df = select_cohort(load_year(config.TEST_YEAR))
    X, y = features_and_target(df)
    return X, y, df[["SC_SEX", "SC_AGE_YEARS"]].copy()


def header(year: int) -> Iterable[str]:
    with open(raw_path(year), encoding="utf-8") as f:
        return f.readline().strip().split(",")
