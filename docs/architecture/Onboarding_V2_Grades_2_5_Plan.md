# Onboarding-v2 Baseline: Grades 2–5 Activity Plan

**Component:** Learner Profile & Prediction Engine (Component 1)
**Status:**
- **Grade 2:** implemented and feature-flagged (`GRADE2_JOURNEY_ENABLED`).
- **Grades 3–5:** planned only; they stay on the existing v1 flow.

**Content status:** every concept, item, number and Sinhala sentence is a proposal pending Sri Lankan Grades 2–5
teacher review (`expertReview: PENDING`). Alignment with the national primary mathematics syllabus must be confirmed
by Sinhala-medium educators; it is not assumed here.

## Rules every grade follows
- **Two skills per grade**, each with **≥ 3 independent, server-scored items** (the ELP-X minimum per skill;
  `MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL = 3`, unchanged).
- **Independent** means no probe role, `representation`, `pre` or `transfer`, answered with no help before the first
  response. Guided `support` items and the non-mathematical `calibration` item **never** count.
- **One learn-and-transfer sequence per grade:** pre → guided support (only if the pre-probe was not answered
  correctly without help, as in Grade 1) → a new transfer item. The three items have different numbers, and the
  correct answer is in a different position in each.
- **Answer keys live only on the server** (`app/db/onboarding_item_bank.py`). The client keeps a copy only to route
  support and escalate guidance.
- **Dimensions:**
  - **CP:** child choices on the welcome screen.
  - **IC / IA:** the instruction-check (calibration) item, plus input mode and missed drops on every item.
  - **MP:** independent items.
  - **RU:** paired representation items.
  - **SC:** revisions before confirming.
  - **SR:** the learn-and-transfer sequence.

## Grade plans

| Grade | Skill (skillId) | Independent items (≥ 3) | Sequence (pre → support → transfer) | Templates |
|---|---|---|---|---|
| **2 (built)** | Place value, tens & ones (`place_value`) | Build 34 with tens sticks and ones cubes (concrete); blocks → numeral 47 (pictorial); numeral 52 → blocks (symbolic) | — | Build-base-ten (new), Choice |
| | 2-digit addition, no regrouping (`addition`) | Blocks 21 + 14 (pictorial) **+ pre + transfer** | 32 + 15 → *guided 24 + 33* → 41 + 26 | Step-choice (new) |
| 3 | Place value to 1000 (`place_value`) | Build 347 (hundreds, tens, ones); blocks → numeral; numeral → blocks | — | Build-base-ten extended with hundreds |
| | Multiplication as equal groups (`multiplication`) | Groups picture → product **+ pre + transfer** | 4 groups of 3 → *guided repeated addition* → 5 groups of 2 | Step-choice + equal-groups picture |
| 4 | Equivalent fractions (`fractions`) | Strip → fraction; fraction → strip; choose the equivalent strip | — | Fraction-strip template (new) |
| | Perimeter with unit tiles (`measurement_geometry`) | Count edges of a shape **+ pre + transfer** | 3 × 2 rectangle → *guided edge counting* → new shape | Unit-tile template (new) |
| 5 | Decimal place value, tenths (`decimals`) | Tiles → decimal; decimal → tiles; compare two decimals | — | Tenths-tiles template (new) |
| | Number patterns (`number_patterns`) | Next term **+ pre + transfer** | +4 rule → *guided rule finding* → +3 rule with different numbers | Step-choice |

Every grade also uses the shared welcome (CP), calibration (IC/IA) and ending steps (`JourneyShell.tsx`).

## Duration and the five-minute goal
- **Grade 2:** 7 child-facing activities plus welcome and ending (8 if guided support is needed). This is a team
  estimate, **not piloted:** about 6–9 minutes for a 7-year-old. That is longer than the ~5-minute child-portion
  target in `MathQuest_Onboarding_Activity_Design.md`.
- **The trade-off:** the ≥ 3-items-per-skill rule is what makes the ELP-X output meaningful. Options to discuss with
  educators:
  1. keep two skills and accept a longer session, with breaks allowed;
  2. assess one skill at onboarding and collect the second through early gameplay (once the gameplay-evidence
     link exists);
  3. split onboarding across two sessions.
- **Grades 3–5:** similar length expected. The new templates (fraction strips, unit tiles, tenths tiles) are the main
  build cost.

## Known limitations
- The transfer item counts as independent ELP-X evidence, as in Grade 1. This is existing behaviour; see
  `IMLR_ML_FEASIBILITY.md` for the leakage note relevant to future machine learning.
- The support routing follows the live Grade 1 rule (support only when needed), not the universal teaching step of the
  IMLR research prototype.
- Item difficulty is not calibrated, and distractors are design choices (e.g. digit reversal 74/47) pending
  educator review.
