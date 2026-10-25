# Test inventory (classified by what each test actually verifies)

These are the categories used below:

| Category | Meaning in this repo |
|---|---|
| **Unit** | Calls pure functions or classes directly. No HTTP, no database. |
| **API** | Calls FastAPI endpoints in-process (httpx `ASGITransport`) with an in-memory `FakeCollection` instead of MongoDB. It checks routing, validation, authorization and response shape. It is **not** an integration test with a real database. |
| **Integration** | Endpoints plus a **real local MongoDB** (`mathquest_test`). These skip unless `MATHQUEST_TEST_MONGODB_URI` is set to a local URI. |
| **Regression** | Guards a previously fixed bug or a safety rule. |
| **End-to-end** | Real browser, real services and the local DB (`scripts/pp1-local`). |
| **Model evaluation** | Checks an offline ML model's pipeline, artifacts or metrics. |
| **Component (React)** | Renders React components. **There are none in this repo.** |

## Backend: `services/learner-profile-service/tests` (443 collected)

| File | Tests | Category | What it verifies |
|---|---|---|---|
| `test_elpx_core.py` | 14 | Unit | ELP-X v1.0 Beta-Binomial estimate, evidence minimum, levels, credible interval, de-duplication, ELP-X-REC strategy codes, no clinical wording |
| `test_thresholds_and_evidence.py` | 10 | Unit (boundary) | Level thresholds and minimum evidence at 0, 1, 2, 3 and more than 3 questions |
| `test_assessment_evidence.py` | 31 | Unit | ASSESS-EVIDENCE-v1.0 rules: first-response scoring, support and calibration exclusion, transfer integrity |
| `test_interaction_observations.py` | 15 | Unit | Response time, rapid clicks and revisions; unmeasured values stay null |
| `test_onboarding_schemas.py` | 11 | Unit | Pydantic onboarding request schemas |
| `test_config_security.py` | 3 | Unit / regression | Configuration safety |
| `test_db_safety_guard.py` | 9 | Regression | Tests refuse Atlas or remote URIs and only use local `mathquest_test` (1 test skips when a DB is configured, by design) |
| `test_dimension_summaries.py` | 11 | Unit + API | DIM-DESCRIPTIVE-v0.1 counts for RU, SC, IC and IA; descriptive only |
| `test_snap_iv_progress.py` | 15 | Unit + API + regression | SNAPIV-PROGRESS-v1.0 history and comparison; never affects the maths profile; owner-only |
| `test_adhd_onboarding_flow.py` | 32 | API + unit | ADHD information and SNAP-IV onboarding validation and flow |
| `test_support_information.py` | 9 | API | Parent support-information endpoints |
| `test_math_assessment_submission.py` | 10 | API | Baseline maths submission and server-side scoring |
| `test_onboarding_v2_grade1.py` | 12 | API | Grade 1 onboarding-v2 journey evidence and ELP-X inputs |
| `test_onboarding_v2_grade2.py` | 8 | API | Grade 2 onboarding-v2 |
| `test_onboarding_v2_grade3.py` | 9 | API | Grade 3 onboarding-v2 |
| `test_onboarding_v2_grades4_5.py` | 7 | API | Grades 4–5 onboarding-v2 |
| `test_grade2_pp1_flow.py` | 4 | API (end-to-end flow, in-memory) | Child creation → onboarding → profile; transfer role; seven-dimension evidence without invented scores |
| `test_child_avatar_choice.py` | 6 | API | The child's avatar choice overrides the parent's choice |
| `test_learner_authorization.py` | 13 | API | Ownership and role checks, including `POST /evidence` |
| `test_admin_api.py` | 12 | API | Admin endpoints and admin-only access |
| `test_research_analytics.py` | 22 | API | Research analytics and snapshot endpoints |
| `test_elpx_api.py` | 1 | **Integration (local DB)** | Gameplay evidence ingestion lifecycle: ingest, duplicate, repeat attempt, profile update, sanitised view, 403 |
| `test_learners_api.py` | 8 | **Integration (local DB)** | Learner CRUD |
| `test_learner_archive_and_deletion.py` | 4 | **Integration (local DB)** | Archive and deletion |
| `test_onboarding_api.py` | 6 | **Integration (local DB)** | Onboarding persistence and status |

Some counts are test functions; parametrised cases expand to the 443 collected tests.

## Frontend: `apps/web/tests` (52 executed)

| File | Tests | Category | What it verifies |
|---|---|---|---|
| `onboarding/interactionObservations.test.ts` | 11 | Unit | Client-side interaction observation recorder |
| `onboarding/legacyAnswers.test.ts` | 7 | Unit | v1 answer compatibility |
| `onboarding/mathResultCounts.test.ts` | 3 | Unit | Parent summary counts |
| `onboarding/snapIvProgress.test.ts` | 4 | Unit | SNAP-IV progress chart data |
| `admin-research/access.test.ts` | 6 | Unit | Admin research access rules |
| `admin-research/imlrModel.test.ts` | 8 | Unit | IMLR admin view model |
| `navigation/navConfig.test.ts` | 5 | Unit | Role-based navigation |
| `navigation/i18n.test.ts` | 8 (6 + a loop over 3 dictionaries) | Unit | Sinhala/English switch and dictionary parity |

All of these are pure-function tests. **No React component is rendered.**

## Research: `research/recommendation_engine`

| File | Tests | Category | What it verifies |
|---|---|---|---|
| `test_scenarios/test_mq_rec.py` | 44 | Unit (synthetic scenarios) | MQ-REC v0.1: context schema, missing data, rules, conflicting preferences, non-diagnostic safeguards, explainability |
| `ml_experiments/tests/test_nsch_baseline.py` | 21 | Model evaluation (pipeline) | No target leakage, required features, preprocessing reproducibility, frozen artifacts, valid predictions, 2025 data never used in development. It does **not** recompute metric values; `scripts/verify_ml_readonly.py` does that. |
| `ml_experiments/tests/test_imlr_probe.py` | 47 | Unit (synthetic) | IMLR item bank, form assignment, balance, unseen items, assistance status, prediction snapshot, no clinical claims |

## End-to-end: `scripts/pp1-local`

| Script | Checks | Category |
|---|---|---|
| `verify_pp1_flow.py` | 36 | End-to-end: Playwright browser, auth service, learner-profile service and local MongoDB |
| `check_pp1_isolation.py` | 1 | Environment isolation (browser only reaches 5174/5101) |

## Coverage of the requested functionality

| Area | Tests |
|---|---|
| Onboarding | `test_adhd_onboarding_flow`, `test_onboarding_schemas`, `test_onboarding_api` (DB), `test_onboarding_v2_*`, `test_grade2_pp1_flow`, `test_child_avatar_choice`, E2E |
| SNAP-IV | `test_snap_iv_progress`, `test_adhd_onboarding_flow`, `test_support_information`, `snapIvProgress.test.ts` |
| Baseline assessment | `test_math_assessment_submission`, `test_assessment_evidence`, `test_interaction_observations`, `test_onboarding_v2_*`, E2E |
| ELP-X | `test_elpx_core`, `test_thresholds_and_evidence`, `test_elpx_api` (DB), ELP-X assertions in `test_onboarding_v2_*`, E2E checks 12–13 |
| ELP-X-REC | `test_elpx_core` (strategy codes, ethical boundary), E2E check 14 |
| Gameplay evidence ingestion | `test_elpx_api` (DB, success path), `test_learner_authorization` (access control) |
