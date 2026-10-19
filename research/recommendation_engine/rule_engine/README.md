# Rule Engine Execution & Explainability (`rule_engine/`)

## Purpose
This directory holds the future evaluation engine that executes defined rules against learner profiles and generates transparent, human-readable explanations.

## Planned Scope
1. **Deterministic Rule Evaluator:**
   - Evaluates active rulesets against learner evidence structures without side effects.
   - Enforces execution safety, deterministic ordering, and deduplication of recommendations.
2. **Transparent Reason Codes:**
   - Generates machine-readable reason codes (e.g., `['CONCEPT_FOUNDATION_NEEDED', 'EVIDENCE_INSUFFICIENT']`) alongside localized bilingual descriptions (English / Sinhala).
3. **Auditability & Traceability:**
   - Every triggered recommendation attaches the exact input evidence parameters and the active ruleset version that justified its selection.
