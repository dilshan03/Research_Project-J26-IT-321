# MathQuest – Attention-Friendly Content Adaptation Engine

**Curriculum-Grounded, ADHD-Friendly Game Generation**

## Overview

This component of MathQuest turns the Sri Lankan NIE Grade 1–5 Sinhala-medium mathematics syllabus into short, attention-friendly games for children with ADHD-related learning support needs.

It reads the official NIE teacher's-guide PDFs, extracts problems that can be checked against the source page, measures how much cognitive load each problem puts on the child, and generates a game "blueprint" that breaks the problem into small steps. A teacher reviews and tunes each blueprint before a child can play it. During play, the proposed **Bayesian trait tracker** adjusts the game to how the child is actually responding.

## Main Functionalities

1. **Syllabus Ingestion:** Teachers upload NIE teacher's-guide PDFs (up to 300 MB).
   - Every page is rendered to an image and transcribed to Unicode Sinhala. The PDF text layer is not used, because the guides use legacy (non-Unicode) Sinhala fonts and the Grade 4 guide has no text layer at all.
   - Transcripts are cached per file, so each guide is sent to the model only once.
2. **Grounded Problem Bank:** A problem is accepted only if:
   - the quoted source text appears on the cited page;
   - every number is printed on that page (or stays within the competency limit quoted from it);
   - the arithmetic is correct, as checked by deterministic code (calculations are never left to the LLM);
   - the operation fits the grade's limits;
   - a game mechanic exists for it.
   Each rejected problem is counted under its reason, so gaps in coverage stay visible.
3. **Cognitive Load Index (CLI):** Scores each problem on intrinsic complexity, wording load and the number of steps it takes to solve.
4. **Game Blueprint Generation:** Breaks each problem into 2 or 3 micro-steps (e.g. identify the numbers → choose the operation → calculate). Each step offers answer choices, and every wrong choice is tagged with the ADHD-related error it represents.
5. **Adaptation Studio (Teacher View):** Teachers can:
   - browse the problem bank;
   - pick a behaviour archetype for the learner;
   - adjust cognitive-load settings and see a live effective-CLI preview;
   - approve or reject each blueprint.
6. **Interactive Game Player (Child View):** Plays approved blueprints only. It includes:
   - 8 game mechanics;
   - 3 themes (village market, jungle adventure, space quest);
   - the Gaja elephant companion, with Sinhala/English voice and a customisable outfit;
   - breathing breaks and calm celebrations.
7. **Live Adaptation:** The Bayesian trait tracker updates its beliefs from in-game evidence and changes the play settings during the session. Each change comes with a reason in Sinhala and English.

## Adaptation Settings

**Generator settings** (set when the blueprint is created):
- Step granularity: 2-tier or 3-tier;
- Number of wrong choices: 2, 3 or 4;
- Stimulus density: low or medium;
- Visual clutter filter: on or off;
- Timer: on or off.

**Play settings** (changed live during the game):
- "Think-first" pause before answers are accepted (up to 1.5 s);
- Number of misses before a strategy hint;
- Number of misses in a row before a breathing break;
- Pause before moving to the next step;
- Showing earlier answers on screen (memory recap);
- Voice mode: automatic, on tap, or off;
- Maximum number of wrong choices shown.

## Cognitive Load Index (CLI)

**CLI = 0.4 × Intrinsic + 0.3 × Linguistic + 0.3 × Executive**

| Term | Measure |
|---|---|
| Intrinsic complexity | Number of operations |
| Linguistic load | Words per number in the question |
| Executive interactivity | Extra operations beyond the first |

Baseline settings follow from the CLI and the learner's risk level. For example, a CLI of 3.0 or more, or a HIGH risk level, gives 3-tier steps, 2 wrong choices and low stimulus.

After the teacher customises the settings, an **effective CLI** (clamped to 1.0–5.0) shows how much each choice raises or lowers the load. For example:
- a 3-tier breakdown lowers it by 0.40;
- turning the timer on raises it by 0.45.

## Proposed Bayesian Trait Tracker

The **Bayesian trait tracker** is the core adaptation algorithm of Component 2 (`adaptive/traitTracker.ts`). It is designed to:
- Track three traits (**inattention**, **impulsivity** and **working-memory load**), each as a Beta(a, b) belief with mean **p = a / (a + b)**.
- Start from a prior set by the teacher's behaviour archetype:

  | Archetype | Prior |
  |---|---|
  | LOW | Beta(1, 4) |
  | MODERATE | Beta(2.5, 2.5) |
  | HIGH | Beta(4, 1) |

- Update from gameplay evidence:

  | Evidence | Updates |
  |---|---|
  | Wrong choice tagged `IMPULSIVITY`, or any wrong answer under 800 ms | Impulsivity ↑ |
  | Wrong choice tagged `WORKING_MEMORY_OVERFLOW` | Working memory ↑ |
  | Wrong choice tagged `MAGNITUDE_SLIP` | Inattention ↑ (half weight) |
  | Idle pause | Inattention ↑ |
  | Calm, first-try correct answer | All three traits ↓ |

- Cap each belief at a total strength of 30, so older evidence fades and recent play still counts.
- Turn beliefs into settings through a small, readable rule map. For example:
  - inattention above 0.65 → only 2 wrong choices;
  - impulsivity above 0.6 → 3-tier steps and a breathing break after 2 misses.
  Each rule produces a bilingual reason that is shown to the teacher.
- Stay pure and deterministic: the same profile and events always give the same result. It needs no training data.

The tracker is implemented and verified with automated tests. It has not yet been validated with real learners or against teacher judgement.

## Machine Learning and AI Approach

- **Bayesian trait tracker:** Live, explainable adaptation that works from the first answer.
- **Rule-based Cognitive Load Index:** Transparent load scoring and setting derivation.
- **Gemini (vision + text):** Transcribes the PDFs to Sinhala and mines candidate problems. Every candidate passes the deterministic validation above before it enters the bank.
- **Operation Classifier (TF-IDF char n-grams + Logistic Regression):** Classifies Sinhala word problems as ADD / SUB / MUL / DIV.
  - Trained on 217 verified problems from the bank.
  - Hold-out accuracy 0.818 (macro-F1 0.855).
  - 5-fold cross-validation accuracy 0.875 ± 0.038.
  - Baseline keyword parser for comparison: 0.545.
  - Offline experiment only; not yet used by the live parser.
- **SinLLaMA / Gemini dialogue:** Child-friendly Sinhala lines for Gaja, with warm template fallbacks when no model is available.

## Supported Game Mechanics

| Mechanic | Used for |
|---|---|
| Count Objects / Basket Count | Counting and quantities |
| Number Hunt | Identifying the numbers in a problem |
| Operator Drop | Choosing the operation (drag or tap) |
| Balance Scale | Calculation steps |
| Comparison Scale | More / less / equal |
| Pattern Train | Number and colour patterns |
| Shape Matcher | Shape identification |

## Current Problem Bank

- 311 validated problems across Grades 1–5:

  | Grade | Problems |
  |---|---|
  | 1 | 40 |
  | 2 | 52 |
  | 3 | 65 |
  | 4 | 93 |
  | 5 | 61 |

- Operations: addition, subtraction, multiplication, division, comparison, counting, patterns, shapes and identification.

## Technologies

| Technology | Purpose |
|---|---|
| React + TypeScript | Adaptation Studio, Game Player and mechanics |
| Framer Motion | Child-friendly animations and drag interactions |
| Python + FastAPI | Content Adaptation Service (port 8003) |
| MongoDB + GridFS (Motor) | Syllabus PDFs, problem bank and blueprints, with a local JSON fallback |
| PyMuPDF | Rendering PDF pages to images |
| Google Gemini | Sinhala transcription and problem mining |
| SinLLaMA (Ollama / Hugging Face) | Optional Sinhala companion dialogue |
| Pydantic | Request and response validation |
| scikit-learn | Operation classifier experiment |
| pytest + Node test runner | Backend and frontend testing |

## Main API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/syllabus/upload` | Upload an NIE teacher's-guide PDF |
| `POST /api/v1/syllabus/documents/{id}/extract` | Run transcription and validated extraction |
| `GET /api/v1/syllabus/problems` | List the validated problem bank |
| `POST /api/v1/syllabus/problems/{id}/adapt` | Generate a blueprint for a learner profile |
| `PUT /api/v1/syllabus/blueprints/{id}/tune` | Apply teacher customisation |
| `POST /api/v1/syllabus/cognitive-load/preview` | Preview the effective CLI |
| `POST /api/v1/adaptations/analyze` | Parse a question and compute its CLI |
| `GET /api/v1/adaptations/blueprints?status=` | List draft, approved or rejected blueprints |
| `PATCH /api/v1/adaptations/blueprints/{id}/status` | Approve or reject a blueprint |

## System Workflow

NIE Teacher's-Guide PDF Upload
→ Page Rendering & Sinhala Transcription
→ Candidate Mining & Deterministic Validation
→ Grounded Problem Bank
→ Cognitive Load Index
→ Blueprint Generation (Micro-steps + Tagged Distractors)
→ Teacher Review & Tuning (Adaptation Studio)
→ Approved Game for the Child
→ Live Adaptation by the Bayesian Trait Tracker

## Current Development Status

**Implemented**
- PDF ingestion with cached Sinhala transcription and per-reason rejection counts
- Validated problem bank for Grades 1–5
- Cognitive Load Index and effective-CLI preview
- Blueprint generation with micro-steps and ADHD-tagged distractors
- Adaptation Studio with behaviour archetypes, cognitive-load customiser and approval workflow
- Game Player with 8 mechanics, 3 themes, the Gaja companion, voice, and breathing breaks
- Bayesian trait tracker for live in-game adaptation
- Offline operation classifier experiment with evaluation metrics
- Automated tests: backend (pytest) and trait tracker and mechanics (Node test runner)

**Ongoing / Planned**
- Saving trait-tracker beliefs per learner across sessions
- Using the learner profile from Component 1 as the tracker's prior
- Sending gameplay events to Component 3 (Behaviour Signal Engine)
- Using the tracker in Component 4's student dashboard
- Teacher review of generated Sinhala wording and game steps
- Pilot study to validate the adaptations against teacher judgement
- Deciding whether to use the operation classifier in the live parser

## Privacy and Ethics

- Only teacher-approved blueprints can be played by children.
- Trait beliefs describe in-game behaviour only. They are not a diagnosis and are not stored as medical information.
- All arithmetic in games is checked by deterministic code, never by an LLM.
- All demonstrations and tests use synthetic data only.

MathQuest is an educational support system and is not intended to diagnose ADHD.

---

**Research Project:** MathQuest – Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support

**Component:** Attention-Friendly Content Adaptation Engine
