# 9. Implementation Prerequisites and Unresolved Research Limitations

> DRAFT. This summarises what must be true before the proposed assessment is used with any child, and what remains
> unknown even after expert review.

## 9.1 Prerequisites before any use with children

| # | Prerequisite | Decision log | Status |
|---|---|---|---|
| P1 | Mathematics educators approve (or revise) the concept, number range, items, response format, layout controls, teaching scripts and session length | D-E01–D-E13 | OPEN |
| P2 | Clinical supervisor approves (or revises) teaching for all children, attention demands, fatigue handling, breaks, neutral feedback, help, accessibility, data fields and reporting | D-C01–D-C12 | OPEN |
| P3 | Native Sinhala speaker and educator verify every child-facing instruction | D-E11, D-J04 | OPEN |
| P4 | Ethics approval and consent covering the recorded fields and research use | D-J01 | OPEN |
| P5 | A visual-cue layout chosen and, if needed, the item bank extended (e.g. congruent and incongruent trials) | D-E05 | OPEN |
| P6 | Locally appropriate illustrations replacing placeholder symbols; Sinhala audio availability confirmed or an alternative provided | D-E08, D-C09 | OPEN |
| P7 | Small pilot with consenting families to check timing, clarity, item difficulty, position effects and cue-following | D-J02 | OPEN |
| P8 | Integration as a **separate, feature-flagged protocol version**. The live onboarding, ELP-X calculations and current IMPSA/IMLR behaviour stay unchanged; the existing prediction-time evidence boundary and leakage tests are kept. | D-J03 | OPEN |
| P9 | Revised items, wording and protocol version recorded, so every future record states which version it came from | — | Planned after review |

## 9.2 Unresolved research limitations

These remain even if every prerequisite is met:

1. **Not validated.** No reliability or validity evidence exists for these questions with Sri Lankan Grade 1
   children. Expert review supports content suitability. It does not establish measurement validity.
2. **Few items.** Three new questions give a coarse, noisy description, even at a 1-in-3 chance level per question
   (about 4% chance of three correct by guessing).
3. **No causal claim.** Pre-teaching and new-question results cannot show that the teaching *caused* any change.
   Practice, familiarity with the format and attention over time all differ between the stages.
4. **Immediate transfer only.** The draft measures new questions straight after teaching. It says nothing about
   learning that lasts. The earlier recorded consultation (R4) asked for flexible reassessment timing.
5. **Perceptual shortcuts.** Density and area cues can point to the answer in the current layouts (document 7)
   until a control is chosen and checked.
6. **One concept.** All evidence comes from a single Grade 1 concept. Grades 2–5 are not designed.
7. **Synthetic only so far.** The prototype's tests and demonstration use scripted synthetic events. They show the
   evidence rules work as programmed; they say nothing about real children's behaviour or item difficulty.
8. **Context factors.** Language familiarity, device experience, reading level, audio availability, tiredness and
   setting can all affect answers. These are recorded as context where possible, never as indicators of ability or
   attention.
9. **No prediction model.** No learning-readiness prediction model exists or is proposed until real, consented,
   reviewed data of adequate size is available (see `ml_experiments/IMLR_ML_FEASIBILITY.md`, still classified
   BLOCKED_INSUFFICIENT_REAL_DATA).
10. **Limited external evidence.** The only external source cross-referenced so far, the Boston Children's
    Hospital guide (document 10), is home and homework guidance for children with ADHD. It gives supporting background
    for breaks, small ordered steps and attention demands. It provides no evidence about mathematics assessment,
    teaching or learning-transfer measurement, and states that its planning skill (Skill 6) is "most useful for older
    children".
11. **No clinical meaning.** Results must never be interpreted as evidence about ADHD, attention or any other
    condition. ADHD information and SNAP-IV answers are not used.

## 9.3 After the review

1. Copy each reviewer's responses into [08_decision_log.md](08_decision_log.md) with attribution as the reviewer
   chose.
2. Update the protocol draft (`IMLR_PROBE_REDESIGN.md`) and the synthetic item bank in a **new version**. Do not
   overwrite `0.1.0-prototype`.
3. Regenerate the figures (`tools/generate_figures.py`) and re-run the prototype tests.
4. Prepare the pilot and ethics documentation (P4, P7).
