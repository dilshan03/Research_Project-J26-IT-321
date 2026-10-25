# MathQuest – Learner Profile & Prediction Engine

**Component 1 | Learner Profiling & Personalized Recommendations**

## Overview

This component of MathQuest builds an initial learner profile for Sri Lankan Sinhala-medium Grade 1–5 students with ADHD-related learning support needs.

It combines parent-guided onboarding, an optional SNAP-IV questionnaire and grade-specific Sinhala mathematics activities. From this evidence, the proposed **ELP-X** learner profiling model produces uncertainty-aware skill estimates and explainable learning recommendations for parents.

## Main Functionalities

1. **Parent-Guided Onboarding:**
   - ADHD information (parent-reported context only);
   - learning preferences;
   - learning environment;
   - handover to the child.
2. **Optional SNAP-IV Questionnaire:** An 18-item parent questionnaire that can be skipped. Repeated submissions are kept and shown as a simple history chart. It is non-diagnostic.
3. **Interactive Mathematics Baseline:**
   - Themed Sinhala activity journeys for Grades 1–5, using concrete, pictorial and symbolic representations.
   - Each journey includes a pre-probe → guided support → transfer sequence.
4. **Evidence Collection:** Records:
   - first answers;
   - answer changes;
   - hints and support levels;
   - instruction replays;
   - response times;
   - rapid clicks;
   - interaction mode (tap or drag).
5. **ELP-X Proficiency Estimation:** A Bayesian estimate of each mathematics skill, with a credible interval and a minimum evidence rule.
6. **Explainable Recommendations (ELP-X-REC):** Rule-based learning tips in Sinhala and English, each with strategy and reason codes.
7. **Profile Views and Research Analytics:** Parent summary, learner profile and tips pages, plus an admin research dashboard with ML metrics and SHAP explanations.

## Seven Learner Profile Dimensions

1. Initial Mathematical Proficiency (MP)
2. Instruction Comprehension (IC)
3. Support Responsiveness (SR)
4. Representation Understanding (RU)
5. Self-Correction and Strategy (SC)
6. Interaction Accessibility and Engagement (IA)
7. Child-Expressed Preferences (CP)

How each dimension is currently handled:
- **MP:** estimated by ELP-X.
- **SR:** summarized provisionally from the pre-probe → support → transfer sequence.
- **RU, SC, IC and IA:** shown as descriptive counts only, until educators review how to interpret them.
- **CP:** recorded from the child's own choices.

## Proposed ELP-X Model

**ELP-X** is the core learner profiling model of Component 1. It is designed to:
- Estimate each skill using a **Bayesian Beta-Binomial model**. The prior is Beta(1, 1). After c correct out of n questions, the estimate is **p = (1 + c) / (2 + n)**, with a 95% credible interval.
- Count only the **first answer the child gives alone**. Practice, guided-support and unapproved items are excluded. All answers are checked on the server.
- Report **insufficient evidence** when a skill has fewer than 3 questions, instead of guessing.
- Assign provisional levels:

  | Estimate p | Level |
  |---|---|
  | below 0.50 | Emerging |
  | 0.50 to 0.80 | Developing |
  | 0.80 and above | Proficient |

- Update the profile when new gameplay evidence arrives (`POST /learners/{id}/evidence`).
- Generate recommendations from the skill level, the amount of evidence, the parent's preferences and hint use. ADHD and SNAP-IV information are never used.

ELP-X is implemented and verified with automated tests. It has not yet been validated against real learners or teacher judgement.

## Machine Learning Approach

- **ELP-X (Bayesian Beta-Binomial):** Live skill estimation, explainable and suited to small samples.
- **ELP-X-REC:** Live rule-based recommendations.
- **Logistic Regression (NSCH baseline):** An offline experiment on the public US National Survey of Children's Health (ages 6–10).
  - Trained on 2023–24 and tested on 2025: ROC-AUC 0.736.
  - Research only; not applied to MathQuest learners.
- **SHAP (LinearExplainer):** Explanations for the NSCH model, shown in the admin research dashboard.
- **MQ-REC v0.1:** Evidence-referenced recommendation rules (NICE NG87, IES, Boston Children's Hospital guidance), awaiting expert review.
- **IMLR:** A planned learning-responsiveness model, waiting for real pilot data.

## Technologies

| Technology | Purpose |
|---|---|
| React + TypeScript | Onboarding UI, child activities, parent and admin views |
| Python + FastAPI | Learner profile service and ELP-X engine |
| MongoDB | Learners, onboarding records, assessments and profiles |
| Pydantic | Request and response validation |
| scikit-learn | Logistic regression baseline |
| SHAP | Model explainability |
| Playwright + pytest | End-to-end and backend testing |

## System Workflow

Parent Onboarding
→ Optional SNAP-IV Questionnaire
→ Child Mathematics Activities
→ Server-side Answer Checking & Evidence Rules
→ ELP-X Proficiency Estimation
→ ELP-X-REC Recommendations
→ Learner Profile (Parent & Admin Views)
→ Inputs for Other MathQuest Components

## Current Development Status

**Implemented**
- Parent onboarding, including the optional SNAP-IV with repeat history
- Interactive mathematics activities for Grades 1–5
- Evidence collection and server-side answer checking
- ELP-X proficiency estimation and ELP-X-REC recommendations
- Descriptive dimension summaries
- Parent profile and tips pages, plus the admin research dashboard
- Gameplay evidence API
- NSCH logistic regression baseline with SHAP explanations (offline)
- Automated tests: backend, frontend, end-to-end and ML verification

**Ongoing / Planned**
- Teacher review of activity items and Sinhala wording
- Expert review and integration of MQ-REC
- Pilot study to validate ELP-X against teacher judgement
- IMLR model training once real data is available
- Connecting gameplay to the evidence API, and integration with the other components
- Longitudinal progress tracking

## Privacy and Ethics

- Parents can access only their own children's data. Teachers and unauthenticated users are blocked.
- Parents can archive or delete a child's data.
- SNAP-IV is optional, and it and the ADHD information never affect skill estimates or recommendations.
- All demonstrations and tests use synthetic data only.

MathQuest is an educational support system and is not intended to diagnose ADHD.

---

**Research Project:** MathQuest – Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support

**Component:** Learner Profile & Prediction Engine
