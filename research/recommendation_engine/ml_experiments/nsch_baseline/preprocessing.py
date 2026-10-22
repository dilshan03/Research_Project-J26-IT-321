"""
Preprocessing pipeline (fitted on training data only, saved with the model):
- blank cells -> NaN; numeric features parsed as numbers;
- categorical: blank -> explicit 'MISSING' level, one-hot encoding, levels below 1 % grouped as infrequent,
  unseen levels ignored;
- numeric: median imputation plus missing-value indicators, standardisation.
No Tier A feature has a skip rule at ages 6-10, so every blank is item non-response (type unknown in the CSV).
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from . import config


class NSCHCleaner(BaseEstimator, TransformerMixin):
    """Turns the as-stored string columns into model-ready dtypes without inventing values."""

    def __init__(self, numeric=None, categorical=None):
        self.numeric = numeric
        self.categorical = categorical

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = pd.DataFrame(X).copy()
        for c in self.numeric:
            X[c] = pd.to_numeric(X[c].replace("", np.nan), errors="coerce").astype(float)
        for c in self.categorical:
            X[c] = X[c].astype(object).where(X[c].notna() & (X[c] != ""), np.nan)
        return X[list(self.numeric) + list(self.categorical)]


def make_preprocessor() -> Pipeline:
    numeric = Pipeline([
        ("impute", SimpleImputer(strategy="median", add_indicator=True)),
        ("scale", StandardScaler()),
    ])
    categorical = Pipeline([
        ("impute", SimpleImputer(strategy="constant", fill_value="MISSING")),
        ("onehot", OneHotEncoder(handle_unknown="infrequent_if_exist", min_frequency=0.01, sparse_output=False)),
    ])
    columns = ColumnTransformer([
        ("num", numeric, config.NUMERIC_FEATURES),
        ("cat", categorical, config.CATEGORICAL_FEATURES),
    ], verbose_feature_names_out=True)
    return Pipeline([
        ("clean", NSCHCleaner(numeric=config.NUMERIC_FEATURES, categorical=config.CATEGORICAL_FEATURES)),
        ("columns", columns),
    ])


def source_feature(encoded_name: str) -> str:
    """Maps an encoded column name (e.g. 'cat__SC_SEX_2', 'num__missingindicator_A1_AGE') to its source feature."""
    name = encoded_name.split("__", 1)[1]
    name = name.removeprefix("missingindicator_")
    matches = [f for f in config.FEATURES if name == f or name.startswith(f + "_")]
    return max(matches, key=len)
