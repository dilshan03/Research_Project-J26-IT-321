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

---

## Prototype: `mq_rec` (MQ-REC v0.1) — isolated, deterministic, non-diagnostic

Research prototype only. It is not connected to any service, database or UI, uses only the Python
standard library, and makes no ML predictions.

### Run (from `research/recommendation_engine/`)

```bash
python -m rule_engine.mq_rec.demo              # default scenario (S2), readable report
python -m rule_engine.mq_rec.demo --all        # all synthetic scenarios
python -m rule_engine.mq_rec.demo S7 --json    # one scenario as JSON
python -m unittest discover -s test_scenarios -t . -v   # unit tests (also: python -m pytest test_scenarios)
```

Each report shows the anonymised hypothetical input, the recommendations (action, why, rule, reason
codes, input evidence, EN/SI parent text, interaction with ELP-X, conflicts), the supporting
literature/expert evidence, missing-evidence and uncertainty notices, and a trace for all 18 rules.

### Files

| File | Purpose |
| :--- | :--- |
| `mq_rec/context.py` | Typed, versioned learner context `MQ-LEARNER-CONTEXT-v0.1` with per-group provenance; invalid input is rejected, missing values stay `None`. Parent-reported ADHD context and clinician reference labels are separate types. |
| `mq_rec/rules.py` | Deterministic rule functions and the registry of all 18 specified rules (enabled or disabled with reason). |
| `mq_rec/evaluator.py` | Runs rules, attaches provenance/evidence (MQ-RS6-03), orders by priority, adds notices, applies guardrails. |
| `mq_rec/guardrails.py` | MQ-RS6-01 non-diagnostic language check and the optional-support check (raise on violation). |
| `mq_rec/evidence.py` | Rule → evidence references (`references.json` IDs + expert log). |
| `mq_rec/report.py`, `mq_rec/demo.py` | Text/JSON output and the CLI. |
| `../test_scenarios/scenarios/*.json` | 8 synthetic, anonymised learners (`SYN-L00x`); S8 shows explicit concept introduction. |
| `../test_scenarios/test_mq_rec.py` | 44 unit tests. |

### Rule status in v0.1

| Rule | Status | Reason |
| :--- | :--- | :--- |
| MQ-RS1-01 child sensory comfort | **Enabled** | Available child/parent inputs; resolves child quiet choice vs parent automatic audio (catalogue Conflict Rule 2). |
| MQ-RS2-01 CRA scaffolding | **Enabled** | Consumes ELP-X `EMERGING` level as given (no recalculation); IES Rec 3. |
| MQ-RS2-02 task chunking | **Enabled — pace-preference branch only** | Hint-count branch (>= 2) is an unvalidated threshold and overlaps ELP-X `ADAPTIVE_HINT_PACING`. |
| MQ-RS2-04 accessible numbers | **Enabled, input-gated** | Needs an explicit, provenance-backed `conceptIntroduction` record (stage `introduction`, with basis). A missing ELP-X estimate means "unknown", never "new concept". No producer exists yet, so the rule reports `CONCEPT_INTRODUCTION_EVIDENCE_MISSING` in practice. No grade-specific number limits. |
| MQ-RS3-02 latency safeguard | **Safeguard** | Response time is never a rule input; the 45 s threshold is not used. |
| MQ-RS3-03 sparse evidence | **Consumes ELP-X** | Notices only; ELP-X already emits `ASSESSMENT_EXPANSION`. |
| MQ-RS6-01 / MQ-RS6-03 | **Always applied** | Guardrail and provenance. |
| MQ-RS1-02 (SNAP-IV 1.78), MQ-RS2-03 (15-min break), MQ-RS4-02 (transfer window), MQ-RS5-02 (4-month interval), MQ-RS6-02 (>= 3 missed drops) | **Disabled** | Unvalidated numeric thresholds or pending expert decisions; unavailable telemetry. |
| MQ-RS1-03, MQ-RS3-01, MQ-RS4-01, MQ-RS4-03, MQ-RS5-01 | **Disabled** | Already implemented in ELP-X / learner-profile-service; not duplicated. |

### Boundaries

- No ADHD inference or clinical label; parent-reported presentation, SNAP-IV and clinician labels never
  select support (tests prove outputs are identical with or without them).
- No SNAP-IV cutoffs, no response-time penalties, no mandatory breaks or time limits; every
  recommendation is `optional: true`.
- No ELP-X Bayesian calculations and no ELP-X-REC baseline codes are re-emitted.
- `CHILD_SENSORY_PREFERENCE` (from MQ-RS1-01) is listed in `recommendation_catalogue.md` as a proposed
  educational preference strategy, pending expert review.
- The output `summary.blockedByMissingInput` lists enabled rules that could not run for lack of input.
- Rule traces list conditions and contributing features per rule, so they can later be shown next to
  SHAP attributions from offline ML experiments.
