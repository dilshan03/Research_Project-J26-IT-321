# Learner Profile & Prediction Engine (ELP-X)

**MathQuest: Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support**
SLIIT final-year research project (J26-IT-321), Component 1

This component builds a profile for each child (Grades 1–5, ages 6–10) from parent onboarding and short Sinhala maths activities. It then gives **uncertainty-aware skill estimates** and **simple learning tips** in Sinhala and English.

> **Not a diagnosis.** Profiles, SNAP-IV results and tips support learning only. SNAP-IV is never used to score maths or to choose tips.

## What it does

| Part | What happens |
|---|---|
| **Parent onboarding** | 1. ADHD information<br>2. Optional SNAP-IV (18 items, can be skipped)<br>3. Learning preferences<br>4. Learning environment<br>5. Handover to the child |
| **SNAP-IV history** | Parents can repeat SNAP-IV. Every submission is kept and shown as a simple "reported more / less / similar" chart. It is descriptive only. |
| **Child activities** | A themed activity journey for each grade (Grades 1–5). Each journey includes an independent item, items in different representations (concrete, pictorial, symbolic), and a pre-probe → guided support → new transfer item sequence. The server checks the answers. |
| **Evidence rules** | Only the **first answer the child gives alone** counts. Practice items, guided-support items and unapproved items are excluded. Hints, answer changes, instruction replays and response times are recorded. |
| **ELP-X skill estimate** | Explained in the next section. |
| **Dimension summaries** | Descriptive counts for representation use, self-correction, instruction following and interaction (DIM-DESCRIPTIVE-v0.1). These are not scores. |
| **Learning tips (ELP-X-REC)** | Rule-based tips chosen from the skill level, the amount of evidence, the parent's preferences and environment answers, and hint use. |
| **Gameplay evidence** | `POST /learners/{id}/evidence` adds new answers and updates the profile. No game in the app sends evidence to it yet. |
| **Research (admin only)** | An offline NSCH survey baseline with SHAP explanations, the MQ-REC rule prototype and an IMLR probe. None of these is connected to the parent-facing results. |

## ELP-X in one paragraph
Each skill starts with a `Beta(1, 1)` prior. After `c` correct first answers out of `n` questions, the estimate is **p = (1 + c) / (2 + n)**, shown with a 95% credible interval.
- If **n < 3**, the skill is marked `INSUFFICIENT_EVIDENCE`.
- Otherwise the level is **Emerging** (p < 0.50), **Developing** (0.50–0.80) or **Proficient** (p ≥ 0.80). These levels are always provisional.

Example: 3 of 4 correct gives p = 4/6 = 0.67, which is Developing.

## Where the results are shown
- **Onboarding summary:** skill cards and tips, shown right after the child finishes.
- **Parent → Learner profiles:** skill cards, plus the preferences and environment answers the parent gave.
- **Parent → Learning tips:** the tip cards (`RecommendationList.tsx`).
- **Admin → Child detail and Research:** technical values (rule codes, ELP-X numbers, NSCH and SHAP results).

## Key files
| Area | Files |
|---|---|
| Onboarding UI | `pages/OnboardingPlaceholderPage.tsx`, `components/onboarding/*Step.tsx` |
| Child activities | `components/onboarding/journey/` (`grade1–5`, `*Journey.tsx`, `evidence.ts`, `interactionObservations.ts`) |
| Parent pages | `pages/ParentLearnerProfilesPage.tsx`, `pages/ParentRecommendationsPage.tsx`, `pages/ParentSnapIvPage.tsx` |
| Text (Sinhala / English) | `apps/web/src/shared/i18n/parentText.ts`, `parentText.en.ts` |
| API and logic | `services/learner-profile-service/app/` |
| ELP-X and tips | `core/elpx_engine.py`, `core/thresholds.py` |
| Scoring and evidence | `services/onboarding_service.py`, `services/assessment_evidence.py`, `db/onboarding_item_bank.py` |
| SNAP-IV and dimension summaries | `services/snap_iv_progress.py`, `services/dimension_summaries.py` |
| Research | `research/recommendation_engine/` (MQ-REC, `ml_experiments/`, `expert_review/`) |

**Stack:** FastAPI, Pydantic, PyMongo (Python 3.12+); React 19, TypeScript, Vite, Tailwind; scikit-learn and SHAP for the offline research.

## Run it
**Backend** (port 5001; API docs at `/docs`):
```powershell
cd services/learner-profile-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 5001 --reload
```

**Frontend** (http://localhost:5173; also needs the auth service on port 5000):
```powershell
cd apps/web
npm install
npm run dev
```

**Isolated PP1 demo:** local Docker MongoDB, synthetic data only, served at http://localhost:5174:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\start-pp1-local.ps1
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\stop-pp1-local.ps1
```

Configuration comes from `.env` (`MONGODB_URI`, `MONGODB_DB_NAME`, …). Never commit secrets or real child data.

## Tests
| Suite | Command |
|---|---|
| Backend | `cd services/learner-profile-service; python -m pytest -q`. Database tests run only when `MATHQUEST_TEST_MONGODB_URI` points to a **local** MongoDB. |
| Frontend unit | `cd apps/web; node --experimental-strip-types --import ./tests/ts-resolve.mjs --test tests/**/*.test.ts` |
| Browser E2E (Playwright) | Start the PP1 stack, then `cd tests/playwright; npx playwright test` |
| Research | `cd research/recommendation_engine; python -m unittest discover -s test_scenarios -t .`, and in `ml_experiments`: `.\.venv\Scripts\python.exe -m unittest discover -s tests` |

Latest recorded results, commands and known gaps: `docs/pp1-testing-evidence/`.

## Limitations
- All validation so far uses **synthetic data**. ELP-X has not yet been checked against real learners or teacher judgement, and there has been no pilot.
- Activity items, distractors and Sinhala wording are waiting for teacher review (`expertReview: PENDING`).
- ELP-X-REC tips are transparent rules, not taken from a published guide. MQ-REC, which is evidence-referenced (NICE NG87, IES, Boston Children's Hospital), is still a research prototype waiting for expert review.
- The NSCH baseline (ROC-AUC 0.736 on the 2025 survey test set) predicts a **parent-reported US survey outcome**. It is research-only and not evidence about MathQuest children.
- The IMLR model is blocked until real data is available.

## Connections to other components
| Component | Uses from this profile |
|---|---|
| Content Adaptation | Preferences and skill needs |
| Behaviour Signal Engine | Gameplay context (it can send evidence through `/evidence`) |
| Pedagogical Agent | Skill levels and support needs |

These are the intended data flows; end-to-end integration with the other components is not complete yet.
