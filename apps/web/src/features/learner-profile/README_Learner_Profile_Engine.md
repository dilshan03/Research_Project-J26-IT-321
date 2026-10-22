# Learner Profile & Prediction Engine (ELP-X)

### MathQuest — Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support

**SLIIT Final-Year Research Project | Component Documentation**

The **Learner Profile & Prediction Engine** is a research component of **MathQuest**, a Sinhala-medium adaptive mathematics learning platform for children aged **6–10 (Grades 1–5)** with ADHD-related learning support needs. It builds an initial picture of each learner's mathematics knowledge, learning preferences, and support requirements, then uses evidence from learning activities to produce **uncertainty-aware skill estimates and explainable educational recommendations**.

> **Educational research, not clinical diagnosis:** Learner profiles, SNAP-IV questionnaire results, and predictions are intended to support learning decisions. They must not be used to diagnose ADHD or replace assessment by a qualified professional.

## 1. Research Problem

A single difficulty level or learning pathway does not suit every child. Initial mathematics ability, preferences, and learning-support needs can vary substantially; short baseline activities also provide limited evidence about a learner's actual proficiency. MathQuest explores how to combine structured onboarding information with mathematics performance and transparent modelling to create a profile that can be refined over time rather than making fixed judgments from a small number of answers.

## 2. Component Objectives

1. Collect relevant learner information through parent-guided onboarding, including learning preferences and optional behavioural questionnaire responses.
2. Establish an initial mathematics baseline through short, age-appropriate Sinhala learning activities.
3. Estimate skill-level proficiency **with uncertainty**, avoiding overconfident conclusions from insufficient observations.
4. Generate understandable, non-clinical learning recommendations for parents and other authorized stakeholders.
5. Maintain structured learner information that can inform the platform's content adaptation, behaviour analysis, and pedagogical decision components.
6. Support reproducible research experiments and explainable model analysis.

## 3. Main Features

### 3.1 Learner onboarding

The onboarding flow gathers parent-provided context, including available information about professional ADHD assessment, learner preferences such as sensory and audio settings, and learning-context details. The purpose is personalization, **not diagnosis**. Sensitive questions must be handled respectfully and with appropriate privacy protections.

### 3.2 Optional SNAP-IV questionnaire

- Provides an **18-item parent-completed SNAP-IV** questionnaire.
- Computes relevant inattention and hyperactivity/impulsivity subscale information.
- Allows the questionnaire to be skipped.
- Includes a non-diagnostic explanation of what responses do and do not mean.

A SNAP-IV score alone is not a medical diagnosis and should not be treated as a definitive learner label.

### 3.3 Interactive Sinhala mathematics baseline

Short activities gather evidence of the learner's initial mathematics understanding. The supplied repository reference describes **implemented Grade 1 and Grade 2 baseline activities**, including:

- Concrete representations such as base-ten blocks.
- Pictorial and symbolic representations.
- An activity sequence progressing from initial attempt to guided support and transfer.
- Server-side answer checking against the onboarding item bank (`onboarding_item_bank.py`).

**Scope note:** The overall MathQuest target is Grades 1–5, but the referenced baseline implementation specifically describes Grades 1–2. Do not describe Grades 3–5 baseline coverage as implemented until verified.

### 3.4 ELP-X Bayesian proficiency estimation

The profiling method described in the repository reference uses a **Beta–Binomial model** with an initial prior of `Beta(1, 1)` for each skill.

Given `c` correct answers from `n` evaluated questions:

```text
Posterior distribution:  Beta(1 + c, 1 + n - c)
Estimated proficiency: p = (1 + c) / (2 + n)
```

The engine also calculates **95% Bayesian credible intervals** to express uncertainty rather than showing a single score as a certain result.

A minimum evidence threshold of **three questions per skill (`n >= 3`)** is required before the skill can be treated as sufficiently observed for proficiency certification. Estimates with less evidence should be presented as provisional rather than definitive.

*Example (illustrative, not an actual learner result):* If a learner correctly answers 3 of 4 questions about a skill, the posterior mean is `(1 + 3) / (2 + 4) = 0.667`. This is an estimated probability under the model, not an exam grade or clinical measure.

### 3.5 Explainable recommendations

The component provides interpretable, non-clinical educational guidance, including parent-facing advice in **Sinhala and English**. Recommendations should communicate the observed skill evidence and its uncertainty and suggest suitable next learning support without treating attention-related answers as diagnostic conclusions.

### 3.6 Research analytics and model explainability

The repository reference describes offline **NSCH survey logistic-regression baseline** experiments, with a reported ROC-AUC of **0.7356**, and **SHAP** explanations exported to an admin research-analytics dashboard. This result belongs to the referenced offline experimental model; it is **not** evidence that the complete MathQuest learner profiling system achieves that accuracy on local children or in classroom use.

## 4. High-Level Component Workflow

```text
Parent / Guardian
       |
       v
Learner Onboarding
  |-- Learning context and preferences
  |-- Optional SNAP-IV questionnaire
  |-- Sinhala mathematics baseline
       |
       v
Validated Onboarding & Activity Records
       |
       v
ELP-X Learner Profiling
  |-- Per-skill evidence aggregation
  |-- Bayesian proficiency estimates
  |-- Uncertainty / evidence checks
       |
       v
Learner Profile + Explainable Recommendations
       |
       +--> Parent-facing learning summary
       +--> Authorized teacher / research views (where enabled)
       +--> Inputs for other MathQuest components
       |
       v
Future Learning Observations -> Profile Refinement
```

The final step reflects the project's intended longitudinal direction; validate the currently integrated event-update paths before claiming that every learning event updates the profile in real time.

## 5. Technology Stack

| Area | Technologies identified in the repository reference |
| --- | --- |
| Learner profile API | Python 3.12+, FastAPI, Uvicorn |
| Validation and schemas | Pydantic |
| Database connectivity | PyMongo / MongoDB |
| Bayesian learner modelling | Beta–Binomial inference |
| Offline research models | scikit-learn |
| Model explanations | SHAP |
| Web interface | React 19, TypeScript, Vite, Tailwind CSS |

## 6. Relevant Repository Directories

This component spans several locations in the **`Research_Project-J26-IT-321`** monorepo:

```text
Research_Project-J26-IT-321/
├── apps/
│   └── web/
│       └── src/
│           └── features/
│               └── learner-profile/       # Learner profile / onboarding UI
├── services/
│   └── learner-profile-service/           # FastAPI service
├── research/
│   └── recommendation_engine/            # Recommendation logic and experiments
│       └── ml_experiments/                # Offline ML experiments
├── database/                              # Database resources
├── packages/                              # Shared contracts and types
└── scripts/
    └── pp1-local/                         # Isolated demo scripts (if present)
```

Paths show the locations documented in the supplied repository reference. For detailed module and endpoint names, consult the actual source tree and autogenerated API documentation.

## 7. Getting Started

### Prerequisites

- Python **3.12 or later**.
- Node.js and npm (for the web application).
- MongoDB Atlas or local MongoDB, configured for the selected environment.
- Docker / Docker Compose, if using the containerized stack.

### Configure the environment

At the repository root, configure the environment expected by your application. Example variable names from the supplied reference:

```dotenv
MONGODB_URI=<your-mongodb-connection-string>
MONGODB_DB_NAME=mathquest_db
AUTH_SERVICE_PORT=5000
LEARNER_PROFILE_PORT=5001
```

Additional values or per-service `.env` files may be required by the current source code. **Never commit secrets or real child-participant information.**

### Run only the learner profile backend

From the repository root:

```powershell
cd services/learner-profile-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 5001 --reload
```

Install the service's dependencies using its checked-in requirements/packaging file before launching. The exact installation command depends on the dependency manifest in that directory.

- API documentation (when the service starts successfully): **http://localhost:5001/docs**
- Default learner profile service port: **5001**

### Run the frontend

In another terminal, from the repository root:

```powershell
cd apps/web
npm install
npm run dev
```

- Typical web development URL: **http://localhost:5173**
- Some onboarding functionality may also require the authentication service (default port **5000**).

### Run the complete application using Docker

From the repository root, if the repository's Docker Compose configuration is available:

```powershell
docker compose up --build -d
docker compose logs -f learner-profile-service
docker compose down
```

### Isolated PP1 demonstration (synthetic data)

The supplied project reference includes a separate PP1 demonstration flow:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\start-pp1-local.ps1
python scripts\pp1-local\verify_pp1_flow.py
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\stop-pp1-local.ps1
```

This setup is documented to use a local MongoDB container and a separate learner profile API port (**5101**) with a web interface at **http://localhost:5174**. Confirm script availability and prerequisites in the checked-out branch before using it.

## 8. Running Tests

The supplied repository guide identifies these test commands. Test counts are intentionally not fixed in this README because they can change between commits.

**Learner profile backend tests (Docker):**

```powershell
docker exec mathquest-learner-profile pytest -v
```

**Recommendation engine tests (repository root, PowerShell):**

```powershell
$env:PYTHONPATH="research/recommendation_engine"
python -m unittest discover -s research/recommendation_engine/test_scenarios -v
```

**Offline ML experiments tests (repository root, PowerShell):**

```powershell
$env:PYTHONPATH="research/recommendation_engine/ml_experiments"
python -m unittest discover -s research/recommendation_engine/ml_experiments/tests -v
```

**Isolated onboarding end-to-end verification:**

```powershell
python scripts/pp1-local/verify_pp1_flow.py
```

Test commands assume their dependencies, environment configuration, and referenced directories are present. Review the actual output for pass/fail/skip status.

## 9. Research Evaluation Considerations

The component's evaluation should distinguish between **technical verification** and **research effectiveness**:

- **Functional correctness:** onboarding flow, optional questions, answer validation, profile creation, and authorization.
- **Estimation behaviour:** uncertainty intervals, minimum evidence handling, stability, and sensitivity to small samples.
- **Recommendation quality:** relevance, clarity, consistency, and expert review.
- **Usability:** age-appropriate child interactions and understandable parent-facing summaries.
- **Reproducibility:** dataset documentation, fixed experiment settings, recorded model versions, and clearly reported metrics.
- **Privacy and ethics:** parent/guardian consent, child assent where applicable, access restrictions, data minimization, and approved research procedures.

Any reported external-data model performance must be identified separately from evaluation of Sinhala primary-school learners.

## 10. Current Scope and Limitations

- **Target audience:** Sinhala-medium children aged 6–10, Grades 1–5.
- **Baseline activities documented in the supplied implementation reference:** Grades 1 and 2.
- **SNAP-IV:** optional, parent-completed, non-diagnostic.
- **Proficiency prediction:** probabilistic and uncertain, especially with few responses.
- **Offline ML evaluation:** cannot independently establish effectiveness in the target population.
- **Cross-service integrations and expanded grade coverage:** should be described as complete only when verified on the current branch.

## 11. Responsible Use and Data Privacy

MathQuest processes information relating to children, including learning observations and potentially sensitive contextual information. Development and research should therefore:

- Use synthetic/anonymized examples in screenshots, demos, documentation, and test fixtures.
- Apply authorization checks so that a parent or teacher only accesses permitted learner data.
- Obtain required ethics approvals, parent/guardian informed consent, and child assent before conducting participant research.
- Avoid clinical labels inferred from questionnaire scores or gameplay interaction patterns.
- Keep credentials, database connection strings, and participant identifiers out of source control.

## 12. Relationship to MathQuest

The Learner Profile & Prediction Engine contributes initial and updated learner evidence that can inform three other MathQuest research areas:

| Connected component | Intended relationship |
| --- | --- |
| Intelligent Content Adaptation | Uses learner preferences and skill needs to guide accessible activity presentation. |
| Gameplay Interaction & Behaviour Signal Engine | Contributes gameplay observations that may provide additional learning context. |
| Intelligent Pedagogical Agent & Decision Engine | Uses relevant learner evidence to support scaffolding, difficulty, and revision decisions. |

These describe component responsibilities and intended data flow, not a guarantee of complete end-to-end integration.

---

**Project:** MathQuest — Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support  
**Institution:** Sri Lanka Institute of Information Technology (SLIIT)  
**Component:** Learner Profile & Prediction Engine (ELP-X)  
**Status:** Research and development

*Documentation based on the supplied MathQuest repository overview and component guide; refer to the checked-out branch for the latest implementation details.*
