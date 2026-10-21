# Onboarding-v2 Baseline: Grades 2–5 Activity Plan

**Component:** Learner Profile & Prediction Engine (Component 1)
**Status:**
- **Grade 2:** implemented and feature-flagged (`GRADE2_JOURNEY_ENABLED`).
- **Grade 3:** implemented and feature-flagged (`GRADE3_JOURNEY_ENABLED`).
- **Grades 4–5:** implemented and feature-flagged (`GRADE4_JOURNEY_ENABLED`, `GRADE5_JOURNEY_ENABLED`); one shared
  journey component (`UpperGradeJourney.tsx`) with per-grade content (`grade4.tsx`, `grade5.tsx`).

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
| **3 (built)** | Place value to 1000 (`place_value`) | Build 347 (hundreds, tens, ones; concrete); blocks → numeral 258 (pictorial); numeral 406 → blocks, zero tens (symbolic) | — | Build-base-ten with hundreds flats, Choice |
| | Multiplication as equal groups (`multiplication`) | 2 plates of 4 mangoes (pictorial) **+ pre + transfer** | 4 × 3 → *guided 3 × 5 (repeated addition, groups picture)* → 5 × 2 | Step-choice + equal-groups picture |
| **4 (built)** | Fractions & equivalent fractions (`fractions`) | Shade 3/4 of a strip (concrete); strip → fraction 2/3 (pictorial); strip equal to 1/2 (symbolic) | — | Shade-parts template (new), Choice |
| | Perimeter with unit lengths (`measurement_geometry`) | 2 × 2 square garden (pictorial) **+ pre + transfer** | 3 × 2 → *guided 4 × 2 (numbered edges)* → 5 × 2 | Step-choice + unit-grid picture |
| **5 (built)** | Decimals, tenths (`decimals`) | Shade 0.6 of a tenths strip (concrete); tiles → decimal 0.4 (pictorial); larger of 0.7 and 0.45 (symbolic) | — | Shade-parts template, Choice |
| | Number patterns (`number_patterns`) | Towers 1, 3, 5, ? (pictorial) **+ pre + transfer** | 5, 9, 13, 17, ? (+4) → *guided 2, 6, 10, ? (jumps shown)* → 4, 7, 10, 13, ? (+3) | Step-choice + sequence/tower pictures |

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
- **Grade 3:** the same 7 activities plus welcome and ending (8 with guided support); also not piloted.
- **Grade 3 content decisions for teacher review:**
  - Reading `a × b` as "a groups of b".
  - Distractors: digit reversal 852 for 258; place swap 285; piece count 15; the zero-tens confusions 460 and 604
    for 406; adding instead of multiplying (6, 7); concatenation (24, 43, 52); one group too many (12, 15).
- **Grades 4–5:** the same 7 activities plus welcome and ending (8 with guided support); not piloted.
- **Grade 4–5 content decisions for teacher review:** using a 3/4 shading task for fractions and a tenths strip
  (two rows of five on phones) for decimals; the Grade 5 transfer item changes the rule (+3 after +4), so it tests
  finding a rule, not reusing one; distractors include area instead of perimeter, half the perimeter, 0.04/4/40
  for 0.4, "longer is larger" (0.45 > 0.7) and +1 / adding the last jump twice for patterns.

## Known limitations
- The transfer item counts as independent ELP-X evidence, as in Grade 1. This is existing behaviour; see
  `IMLR_ML_FEASIBILITY.md` for the leakage note relevant to future machine learning.
- The support routing follows the live Grade 1 rule (support only when needed), not the universal teaching step of the
  IMLR research prototype.
- Item difficulty is not calibrated, and distractors are design choices (e.g. digit reversal 74/47) pending
  educator review.
