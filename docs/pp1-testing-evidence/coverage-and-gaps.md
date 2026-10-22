# Coverage, skipped tests, known failures and pending validation

## Code coverage
| Area | Tool | Result | Notes |
|---|---|---|---|
| Frontend (files loaded by the 8 test files) | Node `--experimental-test-coverage` (LCOV in `results/frontend-unit.lcov.info`) | **Source files only (13 files): 99.08% lines, 91.13% branches, 41.15% functions.** The runner's "all files" row, which also counts the test files, is 99.24 / 93.63 / 59.39. | Covers only the 13 `src` files the tests import, out of 214 `.ts/.tsx` files in `apps/web/src`. **This is not whole-frontend coverage.** The low function percentage mostly comes from text-formatter functions in the i18n dictionaries. |
| Backend | – | **Not measured** | `pytest-cov` / `coverage` are not installed, and nothing was installed for this report. To measure it: `pip install pytest-cov` (needs approval), then add `--cov=app --cov-report=html` to command 1 or 2. |
| Research | – | Not measured | Same reason as the backend. |

## Skipped tests
| Run | Skipped | Reason |
|---|---|---|
| Backend, no DB | 19 | Database-backed tests (`test_elpx_api` 1, `test_learners_api` 8, `test_learner_archive_and_deletion` 4, `test_onboarding_api` 6). By design they skip without `MATHQUEST_TEST_MONGODB_URI`. **All 19 pass in the with-DB run.** |
| Backend, with local DB | 1 | `test_db_safety_guard.py:97`, "only meaningful when no local test database is configured". It is covered by the no-DB run. |
| Frontend, research | 0 | – |

## Known failures and issues found while collecting evidence
1. **TypeScript `tsc -b`: 15 errors.** These were already present at commit `d5c90e9`; this task changed no code.

   | File | Errors | Owner |
   |---|---|---|
   | `features/learner-profile/components/parent/Grade1V2EvidenceView.tsx` | 7 | Component 1 |
   | `features/learner-profile/pages/OnboardingPlaceholderPage.tsx` | 1 | Component 1 |
   | `features/auth/pages/SignInPage.tsx` | 1 | auth |
   | `features/behaviour-monitoring/*` | 2 | Component 2, teammate |
   | `pages/student/StudentDashboardPage.tsx` | 3 | teammate |
   | `pages/test/AgentTestPage.tsx` | 1 | teammate |

   The Vite production build still succeeds, because Vite does not type-check. The 8 Component 1 errors are worth fixing before the final evaluation.
2. **E2E script locators are stale.** The repository's `verify_pp1_flow.py` stops at the UI sign-in step because the UI now defaults to Sinhala. With two locator updates (`scripts/verify_pp1_flow_locator_changes.diff`) it passes 36/36. The application behaviour was not the cause.

## Coverage gaps
- **No React component tests.** The repo has no test renderer (such as Testing Library or jsdom). UI behaviour is checked only through the Playwright E2E flow (Grade 2) and manual review.
- **E2E covers Grade 2 only.** Grades 1, 3, 4 and 5 are covered at API level (`test_onboarding_v2_*`) but not in a real browser.
- **Gameplay → evidence has no in-app producer.** `POST /evidence` is tested as an API: ingestion, duplicates, profile update and access control. No game in the app sends evidence to it yet.
- **ELP-X-REC** is tested for codes, structure and ethical wording, not for whether recommendations are pedagogically appropriate.
- **The NSCH pipeline tests don't check metric values.** The separate read-only script now does (20/20, see `ml-evaluation.md`).
- **SNAP-IV** is tested for storage, history, comparison, wording and its separation from the maths profile. No psychometric validation was done (out of scope; it is descriptive only).
- **No performance, load, accessibility or cross-browser tests.**
- **No backend coverage measurement** (see above).

## Validations still pending (not testing gaps, but not done)
| Validation | Status |
|---|---|
| Real-learner validation of ELP-X levels (e.g. against teacher judgement) | Not started. All evidence is synthetic. |
| Pilot with children and parents | Not started |
| Teacher review of onboarding items, distractors and Sinhala wording (`expertReview: PENDING`) | Pending |
| Expert validation of MQ-REC v0.1 (29 open decisions) | Pending |
| Educator review of the RU/SC/IC/IA descriptive summaries | Pending |
| IMLR model with real data | Blocked: `BLOCKED_INSUFFICIENT_REAL_DATA` |
| NSCH baseline relevance to the Sri Lankan / MathQuest population | Not established. It stays a research-only experiment. |

**Do not present any of the results in this folder as real-learner, clinical or diagnostic validation.**
