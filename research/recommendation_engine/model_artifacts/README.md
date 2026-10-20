# Model Artifacts & Ruleset Versions (`model_artifacts/`)

## Purpose
This directory stores versioned rule snapshots, parameter configurations, and serialized machine learning model artifacts generated from validated research experiments.

## Planned Scope
1. **Versioned Ruleset Snapshots:**
   - Frozen JSON specifications of verified recommendation rulesets (e.g., `ruleset_v1.0.json`) with cryptographic hashes for auditability.
2. **Trained Model Binaries (Future Phase):**
   - Serialized scikit-learn / XGBoost model files (`.joblib`, `.json`, or `.onnx`) accompanied by metadata files detailing training dates, hyperparameters, evaluation metrics, and feature schemas.
3. **Immutability & Release Staging:**
   - Artifacts stored here serve as the release candidates for staging and eventual promotion into the production `services/learner-profile-service/ml/models/` directory.

*Note: Currently empty. No trained models or validated prediction weights have been exported yet.*
