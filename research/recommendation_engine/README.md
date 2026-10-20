# MathQuest — Learner Profile & Prediction Engine
## Research-Development Workspace (`research/recommendation_engine`)

**Project Code:** J26-IT-321  
**Component:** Learner Profile & Prediction Engine (SLIIT Final-Year Research)  
**Status:** Isolated Research & Development Environment  

---

### 1. Purpose and Scope

This directory serves as the dedicated, isolated research workspace for developing, evaluating, and documenting the **Learner Profile & Prediction Engine** for MathQuest. 

This workspace is strictly decoupled from the live runtime services (`services/learner-profile-service`, `apps/web`) to ensure that experimental research, literature benchmarking, synthetic test scenarios, and machine learning explorations do not destabilize the active application.

### 2. Research Boundaries and Ethical Guardrails

1. **Non-Diagnostic Educational Scope:**
   - MathQuest is an educational game designed to support primary school children with ADHD-related learning challenges through personalized mathematics scaffolding.
   - Neither rule-based recommendations nor machine learning predictions constitute a medical diagnosis, clinical evaluation, or symptom severity assessment.
   - All outputs are framed strictly as **formative pedagogical learning supports** (e.g., visual scaffolding, task chunking, gentle feedback pacing).

2. **ADHD Presentation Classification Boundary:**
   - Any future research into supervised ADHD presentation classification (Inattentive, Hyperactive-Impulsive, Combined) will be conducted strictly offline and **only when clinically established reference labels with appropriate ethical approvals** are available.
   - Clinical labels will never be derived or inferred from gameplay clicks, tap speed, or raw screening questionnaires.

3. **Separation from Team Member Components:**
   - **Gameplay Behaviour Signals:** In-game telemetry and sensor-level behavioural classifications are owned by the `services/behaviour-signal-service` component. This engine consumes structured educational outcomes; it does not duplicate raw behaviour models.
   - **Content Adaptation:** Generation of curriculum quests and LLM blueprints is owned by `services/content-adaptation-service`.

---

### 3. Workspace Directory Structure

| Directory | Purpose & Planned Scope |
| :--- | :--- |
| [`evidence_base/`](./evidence_base/README.md) | Clinical guidelines (NICE NG87, AAP 2019), educational literature (IES Math Guide, Boston Children's guidance), source traceability, and external supervisor/psychologist feedback logs. |
| [`rule_definitions/`](./rule_definitions/README.md) | Modular, transparent specifications of personalized learning-support rules, input criteria, and output adaptation actions. |
| [`rule_engine/`](./rule_engine/README.md) | Deterministic rule execution logic, conflict resolution, and explainable reason-code generators. |
| [`test_scenarios/`](./test_scenarios/README.md) | Synthetic learner profiles, diverse developmental edge cases, and unit tests verifying rule execution predictability and safety. |
| [`ml_experiments/`](./ml_experiments/README.md) | Offline experimental pipelines for supervised ML, IMPSA/IMLR estimation experiments, clinically referenced presentation research, and SHAP explainability. |
| [`longitudinal/`](./longitudinal/README.md) | Methodologies and validation for tracking questionnaire indicator trajectories and mathematics learning progress over multiple sessions. |
| [`model_artifacts/`](./model_artifacts/README.md) | Versioned, exportable rule definitions, parameter snapshots, and serialized model files ready for staging. |

---

### 4. Integration Path to Production

All algorithms, rule catalogs, and prediction models developed in this workspace follow a rigorous progression:
1. **Literature & Expert Grounding:** Grounded in validated guidelines (`evidence_base/`).
2. **Offline Simulation & Verification:** Tested against synthetic scenarios and unit tests (`test_scenarios/`).
3. **Auditability & Explainability:** Evaluated with transparent reason codes and SHAP analysis (`ml_experiments/`).
4. **Controlled Promotion:** Promoted as clean, dependency-minimized modules into `services/learner-profile-service`.
