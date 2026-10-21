# Expert-Review Package: Proposed Grade 1 IMLR Assessment Protocol

**Project:** MathQuest (SLIIT J26-IT-321), Learner Profile & Prediction Engine (Component 1)
**Protocol under review:** `IMLR-PROBE-G1` version `0.1.0-prototype`; item bank `IMLR-G1-ITEMS-0.1.0-synthetic`
**Package date:** 2026-10-21
**Status:** DRAFT FOR EXPERT REVIEW. Nothing in this package has been reviewed, approved or validated.

> **Please read first**
> - Every question, number, picture layout, teaching script and Sinhala instruction here is an **unvalidated
>   draft** written by the research team.
> - The protocol has **not** been used with any child, and no child data exists for it.
> - It is **not** a clinical instrument, and it makes **no** ADHD-related or diagnostic claim.
> - No expert response, approval or finding has been recorded yet. All decisions in the log are **OPEN**.

---

## Who reviews what

The two review roles are kept separate. Please answer only the questions in your own form. If you have a view
outside your role, use the "other comments" box at the end of your form.

| Reviewer | Responsible for | Form |
|---|---|---|
| **Primary mathematics educator(s)** (Sinhala-medium Grade 1) | Curriculum fit, mathematical difficulty, number range, response options, visual cues as *mathematics*, teaching method and scripts, Sinhala wording as classroom language, session length for learning purposes | [05_educator_feedback_form.md](05_educator_feedback_form.md) |
| **Clinical supervisor** | Attention and working-memory demands, accessibility, fatigue and breaks, neutral feedback, child wellbeing, data minimisation, wording that avoids diagnostic interpretation | [06_clinical_supervisor_feedback_form.md](06_clinical_supervisor_feedback_form.md) |
| **Native Sinhala speaker** (may be one of the above) | Naturalness and grammar of child-facing Sinhala | Columns in [04_sinhala_instructions.md](04_sinhala_instructions.md) |

## Contents

| # | Document | What it contains |
|---|---|---|
| 1 | [01_assessment_overview.md](01_assessment_overview.md) | IMPSA and IMLR in plain language; what this assessment can and cannot show |
| 2 | [02_grade1_assessment_flow.md](02_grade1_assessment_flow.md) | Step-by-step flow: 2 pre-teaching questions → 2 guided teaching questions → evidence boundary → 3 new questions |
| 3 | [03_question_examples.md](03_question_examples.md) | Illustrated questions drawn from the actual synthetic item definitions (with and without the answer key) |
| 4 | [04_sinhala_instructions.md](04_sinhala_instructions.md) | Proposed Sinhala instructions with English translations, for native-speaker and educator checking |
| 5 | [05_educator_feedback_form.md](05_educator_feedback_form.md) | Mathematics educator feedback form |
| 6 | [06_clinical_supervisor_feedback_form.md](06_clinical_supervisor_feedback_form.md) | Clinical supervisor feedback form |
| 7 | [07_visual_density_review.md](07_visual_density_review.md) | The visual-density confound and alternative layouts (illustrated) |
| 8 | [08_decision_log.md](08_decision_log.md) | Every decision that needs expert approval (all OPEN) |
| 9 | [09_prerequisites_and_limitations.md](09_prerequisites_and_limitations.md) | Implementation prerequisites and unresolved research limitations |
| 10 | [10_evidence_traceability.md](10_evidence_traceability.md) | Evidence-to-design traceability for the Boston Children's Hospital guide (Skills 2, 6, 8): verified passages and PDF pages, what each supports, and evidence gaps. Supporting background only. |
| — | [figures/](figures/) | SVG illustrations generated from the prototype, plus `figures_manifest.json` |
| — | [tools/generate_figures.py](tools/generate_figures.py) | Script that regenerates the figures from the prototype definitions |

## How to review (about 45–60 minutes, a team estimate)

1. Read documents 1–3 for the purpose and the actual questions.
2. Educators: check document 4 (Sinhala) and complete form 5.
3. Clinical supervisor: complete form 6.
4. Both roles: read document 7 and answer its questions in your own form.
5. Return the forms. The research team will copy the decisions into document 8, attributed to the reviewer, with
   no paraphrasing beyond what the reviewer wrote or agreed.

## Source materials used to build this package

- `research/recommendation_engine/ml_experiments/IMLR_ML_FEASIBILITY.md`: why the earlier single-item probe was
  not usable.
- `research/recommendation_engine/ml_experiments/IMLR_PROBE_REDESIGN.md`: the design proposal and its approved
  prototype decisions.
- `research/recommendation_engine/ml_experiments/imlr_probe/`: the prototype package and synthetic item bank
  (figures generated from it).
- The admin "IMLR Prototype Demo" data, exported from the same package (synthetic scenarios only).
- `docs/architecture/MathQuest_Onboarding_Activity_Design.md`: the onboarding design (a five-minute child-portion
  pilot target, educator validation of Sinhala).
- `research/recommendation_engine/evidence_base/expert_feedback_log.md`: the earlier, *user-reported verbal*
  consultation on draft rules R1–R8. Relevant points are cross-referenced in the decision log; they are not
  approvals of this protocol.

- `research/recommendation_engine/evidence_base/sources/Guided Self-Management Tools for ADHD - Children 6-12.pdf`:
  Lee & Sinclair-McBride, Boston Children's Hospital, v1.1. Skills 2, 6 and 8 are cited only as supporting
  background for decisions D-C05, D-E09 and D-C02 (see document 10). They are never used for mathematics content,
  question formats, item counts, visual layouts or scoring.

No formal research-proposal document was found in the repository, so curriculum references are left for educators
to supply.

## Regenerating the figures
```
cd research/recommendation_engine/ml_experiments
.venv\Scripts\python.exe ..\expert_review\imlr\tools\generate_figures.py
```
