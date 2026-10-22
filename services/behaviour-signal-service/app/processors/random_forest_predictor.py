from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd

MODEL_PATH = (
    Path(__file__).resolve().parents[2]
    / "model_training"
    / "models"
    / "random_forest_offtask.joblib"
)


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Random Forest model not found: {MODEL_PATH}"
        )

    return joblib.load(MODEL_PATH)


def predict_offtask(features: dict):
    saved = load_model()

    model = saved["model"]
    feature_names = saved["features"]

    # Ensure all required features are provided
    missing = [
        name for name in feature_names
        if name not in features
    ]

    if missing:
        raise ValueError(
            f"Missing gameplay features: {missing}"
        )

    # Arrange features in the same order used during training
    input_data = pd.DataFrame(
        [[features[name] for name in feature_names]],
        columns=feature_names
    )

    prediction = model.predict(input_data)[0]

    return {
        "offtask_score": float(prediction),
        "model": "random_forest_offtask",
        "status": "experimental"
    }