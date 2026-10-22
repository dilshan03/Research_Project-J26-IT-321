# MathQuest – Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support

**SLIIT Research Project J26-IT-321**

MathQuest is a research web application that gives adaptive, attention-friendly mathematics practice to **Sri Lankan Sinhala-medium children in Grades 1–5 (ages 6–10) with ADHD-related learning support needs**. It follows the NIE primary mathematics syllabus.

> MathQuest is an educational support system. It is **not** designed to diagnose ADHD.

## The Problem

Children with ADHD-related learning needs differ a lot in maths level, attention and how they like to learn. A single difficulty level or learning path does not suit them. Most existing tools offer only one piece of the solution, and few support Sinhala-medium learners.

MathQuest brings four pieces together:
- getting to know each learner;
- turning the syllabus into attention-friendly games;
- watching how the child plays;
- deciding how to support them in real time.

## Research Components

| # | Component | What it does | Core model / algorithm | Student |
|---|---|---|---|---|
| 1 | **Learner Profile & Prediction Engine** | Parent onboarding, optional SNAP-IV, and Sinhala maths activities for Grades 1–5. Builds an initial learner profile across 7 dimensions and gives parents learning tips and tracks the ADHD traits progress | **ELP-X**, a Bayesian Beta-Binomial skill estimate with a credible interval and a minimum-evidence rule, plus **ELP-X-REC** rule-based recommendations | IT23168954 |
| 2 | **Attention-Friendly Content Adaptation Engine** | Turns NIE teacher's-guide PDFs into a validated Sinhala problem bank, scores the cognitive load of each problem, and generates step-by-step game blueprints that teachers review | **Bayesian trait tracker** (inattention, impulsivity, working memory) plus the **Cognitive Load Index** | IT23182332 |
| 3 | **Gameplay Interaction & Behaviour Signal Engine** | Monitors gameplay interactions and optional webcam signals to detect seven behavioural states through multimodal behaviour analysis and provide personalised re-engagement support. | Core Model and Algorithm	- Random Forest (Gameplay-only Baseline), Confidence-aware Multimodal Signal Fusion (MediaPipe, WebGazer.js & DeepFace), and Proposed Adaptive Confidence-based Behaviour and Re-engagement (ACBR) Algorithm. | IT23176324 |
| 4 | **Intelligent Pedagogical Agent & Adaptive Student Progress Engine** | Tracks knowledge during play and gives scaffolding through the 3D companion MathBot and 4-tier visual hints | **AD-BKT**, Attention-Disentangled Bayesian Knowledge Tracing, plus an FSM decision engine | IT23185470 |

## How the Components Work Together

```
Parent onboarding + child activities
        │
        ▼
[1] Learner Profile ──── skill levels, preferences, support needs ────┐
        │                                                            │
        ▼                                                            ▼
[2] Content Adaptation ── teacher-approved, attention-friendly games ──► Child plays
                                                                     │
                     gameplay events, optional webcam signals         │
        ┌────────────────────────────────────────────────────────────┘
        ▼
[3] Behaviour Signals ── behavioural states (e.g. impulsive, distracted) ──┐
                                                                          ▼
[4] Pedagogical Agent ── knowledge state + hints, encouragement, breaks ──► Child
        │
        └── progress evidence ──► back to [1] to refine the profile
```

These are the intended data flows. Each component works on its own today. **End-to-end integration between the components is still in progress.**

## Users

- **Children:** play the activities and games (no login of their own).
- **Parents / guardians:** onboarding, the child's profile, learning tips and progress.
- **Teachers:** upload syllabus guides, review and approve game blueprints, see learner insights.
- **Admins / researchers:** research analytics and model evaluation.

## Technology

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Three.js |
| Backend services | Python + FastAPI (components 1, 2, 3,4), Node.js + Express (auth service) |
| Database | MongoDB, plus GridFS for syllabus PDFs |
| AI / ML | scikit-learn, SHAP, Bayesian models, Google Gemini, SinLLaMA, MediaPipe, WebGazer.js, DeepFace |
| Testing | pytest, Node test runner, Playwright |

## Repository Structure

```text
apps/web/                         React web app (one feature folder per component)
  src/features/learner-profile/      Component 1
  src/features/content-adaptation/   Component 2
  src/features/behaviour-monitoring/ Component 3
  src/features/pedagogical-agent/    Component 4
services/
  auth-service/                   Sign-up / sign-in             :5000
  learner-profile-service/        Component 1 API               :5001
  pedagogical-engine/             Component 4 decision API      :5002
  content-adaptation-service/     Component 2 API               :8003
  behaviour-signal-service/       Component 3 API               :8004
research/recommendation_engine/   Component 1 research (ML experiments, MQ-REC, expert review)
packages/                         Shared contracts, types and DB helpers
database/                         Collection definitions and seed data
docs/                             Design documents and testing evidence
scripts/pp1-local/                Isolated local demo (synthetic data)
tests/playwright/                 Browser end-to-end tests
```

## Getting Started

1. Create a `.env` file in the repository root with the database connection and service ports. **Never commit it.**
2. Start everything, using either option:
   ```bash
   npm run dev          # starts all services and the web app in one terminal (start-all.js)
   npm run docker:up    # or run everything with Docker Compose
   ```
3. Open **http://localhost:5173**.

Each service also has its own README with commands to run and test it separately.

## Current Status

**Implemented (initial versions):**
- Learner onboarding and profiling.
- The validated Grades 1–5 problem bank and the game player.
- Gameplay and behaviour tracking.
- Knowledge tracing with the 3D companion.
- Parent, teacher and admin views.

**In progress:**
- Integration between the components.
- Teacher and expert review of content and Sinhala wording.
- Pilot studies with real learners to validate the models.

All models are verified with automated tests on **synthetic data**. They have **not yet been validated with real children**.

## Privacy and Ethics

- Webcam monitoring is optional and consent-based. Raw video is not stored by default.
- Parents see only their own children's data. Only teacher-approved games are shown to children.
- Questionnaire and behaviour information is never used as a diagnosis or a medical label.
- Demonstrations and tests use synthetic data only.
- Real participant research requires ethics approval, parent consent and child assent.

---

**Project ID:** J26-IT-321 | **Institution:** Sri Lanka Institute of Information Technology (SLIIT) | **Status:** Under development
