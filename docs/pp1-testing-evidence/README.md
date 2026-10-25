# PP1 Testing Evidence: Learner Profile & Prediction Engine (Component 1)

| | |
|---|---|
| Run date | 2026-10-22 (local machine) |
| Code under test | branch `feature/learner-profile`, commit `d5c90e9`. The application code was not changed; only this folder was added. |
| Database | Local Docker MongoDB `mathquest-pp1-mongo` (127.0.0.1:27018) only. Tests use DB `mathquest_test`; the E2E run uses `mathquest_pp1_demo`. MongoDB Atlas was never contacted. |
| Data | Synthetic test fixtures, synthetic `@example.test` accounts, a hypothetical NSCH example, and the public NSCH survey files. **No real learner data. No real-learner validation has been done.** |

Every number below comes from an actual run whose raw output is in [`results/`](results/). Nothing here is estimated.

## 1. Results at a glance

| # | Suite | Test type | Passed | Failed | Skipped | Evidence |
|---|---|---|---|---|---|---|
| 1 | Backend (learner-profile-service), no DB | Unit, API (in-process ASGI + in-memory fake DB), regression | **424** | 0 | 19 | `results/backend-no-db.log`, `.junit.xml` |
| 2 | Backend, with the local test DB | The same suite plus real-MongoDB integration tests | **442** | 0 | 1 | `results/backend-with-local-db.log`, `.junit.xml` |
| 3 | Frontend (apps/web) Node tests | Unit (pure TypeScript functions) | **52** | 0 | 0 | `results/frontend-unit.log`, `.junit.xml`, `.lcov.info` |
| 4 | Frontend type check (`tsc -b`) | Static check | – | **15 errors** (all existing; see gaps) | – | `results/frontend-typecheck.log` |
| 5 | Frontend production build (`vite build`) | Build | OK | – | – | `results/frontend-build.log` |
| 6 | MQ-REC v0.1 rule prototype | Unit, synthetic scenarios | **44** | 0 | 0 | `results/research-mq-rec.log` |
| 7 | NSCH K2Q31A baseline | Model pipeline tests (leakage, reproducibility, artifacts) | **21** | 0 | 0 | `results/research-nsch-baseline.log` |
| 8 | IMLR probe | Unit, synthetic | **47** | 0 | 0 | `results/research-imlr-probe.log` |
| 9 | Offline ML metrics and SHAP re-verification | Model evaluation (read-only recomputation) | **20/20 checks** | 0 | – | `results/ml-verification.log`, `scripts/verify_ml_readonly.py` |
| 10 | PP1 end-to-end (Grade 2, real services and local DB, Playwright) | End-to-end system test | **36/36 checks** | 0 | – | `results/e2e-pp1-flow.log`, `screenshots/` |
| 11 | PP1 isolation check | End-to-end environment check | PASS | – | – | `results/e2e-pp1-isolation.log` |

Two caveats:
- **Row 2 vs row 1.** The 19 tests skipped in row 1 are the database-backed tests. Row 2 runs them against the local test DB. The 1 test still skipped in row 2 is skipped by design: it checks the "no DB configured" path.
- **Row 10.** The repository's `verify_pp1_flow.py` was written before the global Sinhala/English switch. Two of its button locators are now stale: "Sign In" is shown as "පිවිසෙන්න", and "නැවත" now matches two buttons. The unmodified script stops after check 3, at the browser sign-in step. The 36/36 result comes from a copy with only those two locators changed. The diff is in [`scripts/verify_pp1_flow_locator_changes.diff`](scripts/verify_pp1_flow_locator_changes.diff). No application code was changed.

## 2. Testing summary by functionality

Statuses:
- **Pass:** executed and passed.
- **Pass (synthetic):** passed on synthetic or hypothetical data only.
- **Pending:** not yet testable or not yet done.

| Functionality | Test type | Expected outcome | Actual outcome | Status | Evidence |
|---|---|---|---|---|---|
| Parent onboarding: ADHD information step | API (fake DB) + unit | Valid answers accepted. Diagnosis details are rejected unless the answer is "yes". | Passed | Pass | `test_adhd_onboarding_flow.py` (32), `test_onboarding_schemas.py` (11) |
| Onboarding persistence and status in MongoDB | Integration (local DB) | Steps are stored and `onboardingStatus` moves to COMPLETED | Passed (with-DB run) | Pass | `test_onboarding_api.py` (6), E2E checks 7–10 and 34 |
| SNAP-IV: submit, skip and repeat history | Unit + API + regression | Every submission is kept. Comparison needs ≥2 entries and the overall trend needs ≥3. Incomplete forms are rejected. No clinical wording. **SNAP-IV never changes the maths profile.** Other parents cannot read it. | Passed | Pass | `test_snap_iv_progress.py` (15), `test_support_information.py` (9), `tests/onboarding/snapIvProgress.test.ts` (4) |
| Baseline maths assessment (v1 and onboarding-v2, Grades 1–5) | API (fake DB) | The server scores the first response. Support, calibration and unapproved items are excluded. Payloads with no approved items return 422. | Passed | Pass | `test_math_assessment_submission.py` (10), `test_onboarding_v2_grade1/2/3/4_5.py` (12/8/9/7), `test_assessment_evidence.py` (31) |
| Grade 2 PP1 flow, DB-free | API end-to-end (in-memory) | Child creation → onboarding → profile; the transfer role is kept; assisted evidence is insufficient; 7 dimensions have evidence and no invented scores | Passed | Pass | `test_grade2_pp1_flow.py` (4) |
| Grade 2 PP1 flow, real stack | End-to-end (browser + services + local DB) | 36 checks: sign-in, child journey, server-side scoring, ELP-X levels, ELP-X-REC present, ownership denials, stored evidence for CP/IC/IA/MP/RU/SC/SR, no scores stored for those dimensions, local-only traffic | 36/36 | Pass (synthetic accounts) | `results/e2e-pp1-flow.log`, `screenshots/` |
| ELP-X v1.0 Bayesian proficiency estimation | Unit / boundary | p=(1+c)/(2+n). n<3 gives INSUFFICIENT_EVIDENCE. Levels change at 0.5 and 0.8. The credible interval narrows as n grows. Repeats are de-duplicated. Missing evidence is not treated as zero. | Passed | Pass | `test_elpx_core.py` (14), `test_thresholds_and_evidence.py` (10) |
| ELP-X-REC recommendation rules | Unit | Valid strategy codes and reason codes; no ADHD or clinical wording | Passed | Pass | `test_elpx_core.py::test_recommendation_strategy_codes`, `::test_ethical_boundary_no_adhd_or_clinical_diagnosis`; E2E check 14 |
| Gameplay evidence ingestion (`POST /learners/{id}/evidence`) | Integration (local DB) | 200 on ingest. A duplicate event gives `duplicateCount` 1. A repeat attempt updates the profile. The sanitised view works. Non-owners get 403. | Passed (with-DB run only) | Pass | `test_elpx_api.py` (1 lifecycle test) |
| Gameplay evidence access control | API (fake DB) | Owner accepted; other parents, teachers and unauthenticated users denied | Passed | Pass | `test_learner_authorization.py` (13) |
| Interaction observations (response time, rapid clicks, revisions) | Unit (backend + frontend) | Only measured values are recorded; unmeasured values stay null | Passed | Pass | `test_interaction_observations.py` (15), `tests/onboarding/interactionObservations.test.ts` (11) |
| Descriptive dimension summaries (RU, SC, IC, IA) | Unit + API | Counts only, descriptive, no scores; onboarding-v2 only | Passed | Pass | `test_dimension_summaries.py` (11) |
| Learner CRUD, archive and deletion | Integration (local DB) | Owner-scoped CRUD; archive and delete remove the data | Passed (with-DB run) | Pass | `test_learners_api.py` (8), `test_learner_archive_and_deletion.py` (4) |
| Admin and research analytics APIs | API (fake DB) | Admin-only access; aggregated, sanitised output | Passed | Pass | `test_admin_api.py` (12), `test_research_analytics.py` (22), `tests/admin-research/access.test.ts` (6) |
| DB safety guard (never reach Atlas from tests) | Regression | Remote or Atlas URIs rejected; only the local `mathquest_test` DB is used | Passed | Pass | `test_db_safety_guard.py` (9), `test_config_security.py` (3) |
| Navigation and Sinhala/English switch | Unit | Role-based links; both languages have the same keys | Passed | Pass | `tests/navigation/*.test.ts` (11 tests from 2 files) |
| MQ-REC v0.1 rule prototype | Unit, synthetic scenarios | Schema, missing data, conflicts, non-diagnostic safeguards, explanations | 44 passed | Pass (synthetic) | `results/research-mq-rec.log` |
| NSCH K2Q31A baseline pipeline | Model pipeline tests | No target leakage; deterministic; frozen-model hash; 2025 data never used in development | 21 passed | Pass (public survey data) | `results/research-nsch-baseline.log` |
| NSCH offline metrics (2025 held-out test) | Model evaluation | Recomputed metrics equal the stored metrics | ROC-AUC 0.7356, PR-AUC 0.3429, Brier 0.1161, confusion matrix all identical | Pass (public survey data, not MathQuest learners) | `results/ml-verification.log`, [`ml-evaluation.md`](ml-evaluation.md) |
| NSCH SHAP explanations | Model evaluation | Recomputed SHAP equals the stored snapshot; additivity holds | 74/74 contributions identical; additivity error ≤1.8e-15 | Pass (hypothetical example + survey data) | `results/ml-verification.log` |
| IMLR probe | Unit, synthetic | Form balancing, unseen items, assistance status, no clinical claims | 47 passed | Pass (synthetic). The model is BLOCKED_INSUFFICIENT_REAL_DATA. | `results/research-imlr-probe.log` |
| Real-learner validation, expert review, teacher review, pilot | – | – | Not done | **Pending** | [`coverage-and-gaps.md`](coverage-and-gaps.md) |

## 3. Files in this folder
- [`test-inventory.md`](test-inventory.md): every test file, classified by what it actually verifies.
- [`commands.md`](commands.md): the exact commands to reproduce each run.
- [`ml-evaluation.md`](ml-evaluation.md): offline ML metrics and SHAP verification.
- [`coverage-and-gaps.md`](coverage-and-gaps.md): coverage, skipped tests, known failures and pending validations.
- `results/`: raw logs, JUnit XML and LCOV output.
- `screenshots/`: E2E screenshots (synthetic accounts and child).
- `scripts/`: the read-only ML verification script and the E2E locator diff.

**Privacy:** absolute paths, the username and the hostname were replaced with `<repo>`, `<user-home>` and `<host>`. The only e-mail addresses are synthetic `@example.test` accounts. The `mongodb+srv://placeholder-…` and `example-secret` strings in the JUnit files are fake test parameters from `test_db_safety_guard.py`, not credentials. No `.env` content is included.
