# MathQuest — Child Onboarding Activity Design Matrix (Grades 1–5)

**Project:** J26-IT-321 — Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support  
**Component owner:** Learner Profile & Prediction Engine  
**Document status:** Proposed implementation and expert-review specification, **not** a validated assessment instrument  
**Basis:** October 18, 2026 read-only repository and onboarding audits, plus agreed research requirements.  

## 1. Design goals and boundaries

The child-facing onboarding should be short, calm, clearly distinct from ordinary mathematics gameplay, and usable in Sinhala with appropriate audio/pictorial assistance. The target is **approximately five minutes for the child portion**, excluding parent registration, optional questionnaire and social context. This is a pilot target, not a deadline; children can pause, take longer or stop without penalty.

It serves two separate initial predictions:

- **IMPSA — Independent Mathematical Problem-Solving Ability:** performance on appropriately targeted problems **before hints, demonstrations, or answer feedback**.
- **IMLR — Independent Mathematical Learning Readiness:** provisional ability to benefit from a brief supported learning opportunity and **apply the learned idea to a different, unassisted transfer item**. Existing competence and learning-from-support must be distinguished.

Six *supporting observable dimensions* and one preference dimension must be addressed:
1. Initial Mathematical Proficiency (MP)
2. Instruction Comprehension (IC)
3. Support Responsiveness (SR)
4. Representation Understanding (RU)
5. Self-Correction and Strategy (SC)
6. Interaction Accessibility and Engagement (IA)
7. Child-Expressed Preferences (CP)

**Scope boundary:** Neither the onboarding nor gameplay signals establish an ADHD diagnosis or clinical presentation shift. Parent/teacher symptom ratings, if collected with appropriate permission, are separate from game-observed learning behaviour. Social context, language, accessibility and temporary session factors primarily contextualize evidence and personalize support; they must not automatically lower mathematical ability estimates.

## 2. Adult preparation — separate from the five-minute child portion

| Area | Suggested collection | Design decision |
|---|---|---|
| Learner identity | Parent-child relationship, nickname, age 6–10, grade 1–5, preferred language | Reuse learner CRUD. No public child account required. |
| ADHD information | Unknown / clinician-reported inattentive / hyperactive-impulsive / combined, **with source and date** | Optional. Do not derive or overwrite a clinical label from SNAP-IV or gameplay. |
| SNAP-IV | Optional caregiver screening or follow-up; scored by subscale, with approved language/version | Distinguish screening from diagnosis. Validate local wording/cutoffs and repeat interval with domain expert and ethics approval. |
| Social/learning context | Cooperation, team/individual comfort, decision-making, confidence, frustration response, persistence, help-seeking; source/date | Parent and optional teacher observations, not fixed personality scores. Editable and versioned. |
| Persistent accessibility context | Preferred instruction language, language familiarity, audio/text needs, visual/hearing/motor interface accommodations, device familiarity | Ask about **needed accommodations**, not infer disabilities from clicks. |
| Session-only context | Optional tiredness, hunger, unusual environment/distraction and any general factor affecting today's participation | Separate, minimally intrusive pre-session check-in; skip allowed. Medication details only after necessity, expert and ethics review. |
| Consents and controls | Guardian consent, child assent, data minimization, roles, retention and withdrawal process | Never expose raw symptom responses through cross-service learner-profile contracts. |

**Existing baseline:** The audit reports implemented learner CRUD, parent preference intake, 18-item SNAP-IV, basic social context and grade-related mathematics assessment. Explicit clinician-reported presentation, parent editing of questionnaire answers, fuller social context, device/accessibility and session-only context remain incomplete.

## 3. Child journey and target timing

| Phase | Target | Child experience | Evidence captured |
|---|---:|---|---|
| A. Welcome + choices | 30 sec | Pick a friendly companion/theme; choose sound on/off (with an accessible default) | CP, choices and source=`child` |
| B. Follow-and-try calibration | 40 sec | One or two playful, non-mathematical instructions: e.g., tap a highlighted object, then drag or tap one item | IC, IA; instruction replay, interaction modality, successful task completion |
| C. Independent exploration | 65 sec | One or two grade-relevant manipulatives, no scoring screen, no hints before first response | MP, IMPSA, IA |
| D. Show it another way | 50 sec | Match concrete/pictorial and symbolic/verbal forms; optionally revise a selection | RU, SC, IC |
| E. Learn and try again | 85 sec | Pre-probe → graded help if needed → **new unassisted transfer** problem | SR, IMLR, SC, IMPSA separation |
| F. Gentle ending | 30 sec | Celebrate participation, invite a parent back or hand over to the main game | Completion and session duration; no ability score from celebrations |
| **Total planned** | **300 sec** | **No timer or forced deadline** | **Provisional evidence, not high-confidence diagnosis or mastery** |

Each phase should be made of **micro-activities with minimal narration and optional replay**. A child does **not** have to fail a pre-test to receive help: if the pre-probe is passed, the system may test a slightly different/new idea or mark this concept as already known and avoid pretending that a learning gain occurred.

## 4. Grade-specific activity design matrix

These mathematical examples are *proposals*. A Sri Lankan Grades 1–5 curriculum/teacher review must confirm that each concept, language choice and difficulty is age- and grade-appropriate. The **same six-phase assessment structure** applies to every grade; only mathematical content, representations, complexity and supports change. The assessment is **not** a game level, leaderboard, coin-earning quest or ordinary MCQ test.

### Grade 1

| Phase | Proposed child-facing interaction | Core evidence/dimensions | Interaction distinction |
|---|---|---|---|
| A — Choice | Pick a bird/animal helper and choose gentle sound or quiet mode | CP: explicitly child-chosen character and sound | No parent proxy |
| B — Follow | “Put the red leaf on the tree” with spoken Sinhala + large targets, tap alternative to drag | IC, IA: follows instruction, replays, help, successful completion, alternative input | No numeracy required |
| C — Independent | Arrange **four counters** in a tray and choose the matching numeral, unassisted | MP/IMPSA: first-attempt accuracy, assistance-free status | Manipulate real-looking objects, not a quiz card |
| D — Represent | Match a group of **three** objects to `3`; show an opportunity to change a selection before confirming | RU, SC | Concrete → numeral match |
| E — Learn/transfer | Pre: compare two small object groups; if needed show one visual demonstration; transfer: compare **different** groups without prompts | SR/IMLR: support stage, post-support independent transfer | New numbers/layouts; do not reuse exact worked item |

### Grade 2

| Phase | Proposed child-facing interaction | Core evidence/dimensions | Interaction distinction |
|---|---|---|---|
| A — Choice | Choose a helper and diagram style (blocks or beads) | CP | Child picks directly |
| B — Follow | “Move the triangle into the outlined box, then tap the star” | IC, IA: two-step direction with optional repetition | Non-mathematical instructions |
| C — Independent | Build `23` using tens sticks and single cubes without a worked example | MP/IMPSA: place-value understanding, unassisted accuracy | Virtual manipulatives |
| D — Represent | Pair a two-digit numeral with matching tens-and-ones blocks; allow deliberate correction | RU, SC | Symbolic ↔ concrete |
| E — Learn/transfer | Pre: solve a small two-digit addition with manipulatives; support: guided tens/ones grouping; transfer: **different** addition without help | SR/IMLR: initial outcome, support level, transfer outcome | Use task pairs calibrated to Grade 2 |

### Grade 3

| Phase | Proposed child-facing interaction | Core evidence/dimensions | Interaction distinction |
|---|---|---|---|
| A — Choice | Choose a mascot and pictorial support preference | CP | Explicit selection |
| B — Follow | “First place the circle on the left, then choose the striped card” | IC, IA | Not a maths question |
| C — Independent | Partition `354` into hundreds, tens and ones with block tiles | MP/IMPSA: first attempt | Interactive place-value board |
| D — Represent | Match a shaded fraction picture (e.g., one of four equal parts) to its symbolic fraction | RU, SC | Visual ↔ fraction symbol |
| E — Learn/transfer | Pre: equal-group multiplication visual; support: repeated-addition demonstration; transfer: new group sizes without a hint | SR/IMLR | New isomorphic item, not a repeated answer |

### Grade 4

| Phase | Proposed child-facing interaction | Core evidence/dimensions | Interaction distinction |
|---|---|---|---|
| A — Choice | Choose a helper and preferred visual representation | CP | No grading |
| B — Follow | Follow a short two-action arrangement instruction with replay option | IC, IA | Calibrates UI comprehension independently |
| C — Independent | Construct a rectangle from unit tiles and determine its perimeter, before hinting | MP/IMPSA | Tile-based construction, not a text MCQ |
| D — Represent | Match equivalent fractions using fraction strips and notation | RU, SC | Strip ↔ symbol |
| E — Learn/transfer | Pre: unfamiliar rectangle-perimeter arrangement; support: show counting all sides or pattern; transfer: new dimensions/layout without hint | SR/IMLR | Compare transfer without and with prior support |

### Grade 5

| Phase | Proposed child-facing interaction | Core evidence/dimensions | Interaction distinction |
|---|---|---|---|
| A — Choice | Select helper and optional audio/visual mode | CP | Age-appropriate; not babyish |
| B — Follow | Short sequencing instruction using abstract shapes/cards | IC, IA | No calculation |
| C — Independent | Build or interpret a decimal number with place-value tiles, before any help | MP/IMPSA | Manipulative place-value board |
| D — Represent | Match fraction/decimal representations with visual strip or number-line marker (after curriculum review) | RU, SC | Pictorial ↔ symbolic/number line |
| E — Learn/transfer | Pre: an unfamiliar number-pattern rule; support: one guided demonstration; transfer: a different sequence with the same structural rule | SR/IMLR | Do not let child memorize the first answer |

**Grade variation principle:** Avoid forcing an exact number of items per grade into five minutes. Use a small pilot-calibrated item bank, with alternative forms and different difficulty bands. A learner's readiness for another grade is considered later in curriculum progress monitoring, **not** an automatic grade promotion from a single brief onboarding.

## 5. Evidence-to-dimension specification

| Dimension | Direct evidence to collect | What is **not** sufficient evidence | Initial output |
|---|---|---|---|
| MP | Correctness on grade- and skill-tagged first attempts with known item parameters | A few undifferentiated quiz responses | Per-skill estimate, sample count, uncertainty |
| IC | Completion of separate non-mathematical direction task; complexity, repeats, clarification | Slow answer or audio replay **alone** | Instruction support preference/needs, confidence |
| SR | Specific support steps delivered; accuracy after each; whether next independent transfer succeeds | `hintUsed=true` alone | Support response summary and best observed scaffold |
| RU | Same concept shown as concrete/pictorial/symbolic or verbal paired tasks; accuracy by representation | Merely switching illustrations | Representation evidence profile, with sample counts |
| SC | Pre-confirmation revisions, reason if observable, verified correctness of revision | Counting all clicks as self-correction | Observable revision and strategy indicators, tentative |
| IA | Input method success, accidental misses, accommodations used, child-initiated pause and completion | Labeling slowness as inattention/ADHD | UI-accessibility adjustments and context flags |
| CP | Explicit child choice (source, date), optionally changed later | Parent selection presented as child's preference | Editable child preference record |

**Do not infer disability, attention disorder, personality, or medication effect from tap precision, click speed, idle time or preference choices.** These can be used carefully to assess interface usability and to decide whether collected mathematical responses are sufficiently comparable.

## 6. Dynamic-learning probe specification (for IMLR)

**Design:** For a selected grade-appropriate concept, create three *distinct* but equivalent item forms, tagged with `conceptId`, `difficultyBand`, `itemFamilyId`, `representation`, and `probeRole`.

1. **Pre-probe (unassisted):** novel item; store initial correctness and whether help appeared **before** first answer.
2. **Support exposure:** if needed, deliver Level 1 (repeat/clarify), Level 2 (visual cue), then Level 3 (worked manipulative demonstration), stopping when sufficient. Store the order and actual support given. Do **not** automatically call this learning progress.
3. **Transfer probe (unassisted):** an unseen but structurally equivalent problem, in another arrangement and with new numbers/objects. Do not show the worked solution or a hint before first answer.
4. **Evidence interpretation:** if transfer succeeds after a previously unsuccessful pre-probe, this is **initial transfer evidence**, not proof of durable learning; confirm over later sessions. If the pre-probe was already correct, do not count it as learning gain.
5. **Low-evidence safeguards:** if the transfer probe is skipped, interrupted, accidentally assisted or influenced by previously encountered content, return **INSUFFICIENT_EVIDENCE** for IMLR.

**Important:** Provide alternative content if Grade 1 learners cannot comfortably read, and validate every language/audio prompt with Sinhala-medium educators.

## 7. Minimum event and schema additions

Use a **versioned, additive** payload. Preserve the current `EvaluatedItemRequest`, API routes, completed assessments, Beta-Binomial estimates, and ELP-X recommendation engine. Do not rewrite historical scores.

| Field (proposed) | Type/example | Purpose |
|---|---|---|
| `assessmentProtocolVersion` | `"onboarding-v2"` | Reproducibility and versioning |
| `activityId`, `itemId`, `conceptId` | IDs | Match activity/item/skill |
| `grade`, `difficultyBand` | Integer/category | Interpret grade fit |
| `dimensionTags` | `['IC','IA']` | What activity was designed to measure |
| `probeRole` | `pre`, `support`, `transfer`, `calibration`, `representation` | Protect IMLR validity |
| `itemFamilyId`, `representation` | IDs / `concrete`, `visual`, `symbolic`, `verbal` | Distinct paired forms |
| `firstResponse`, `firstResponseCorrect` | Response/boolean | Independent evidence |
| `supportBeforeFirstResponse` | boolean | Exclude assisted attempt from IMPSA |
| `supportEvents` | ordered events with level/type/timestamp | Support responsiveness |
| `revisionEvents` | prior/new response and timestamp | Self-correction interpretation |
| `instructionEvents` | delivered/replayed/clarified | Instruction comprehension evidence |
| `interactionMode`, `accessibilitySettings` | tap/drag/etc. | Accessibility and comparability |
| `childPreferenceChoices` | value, source=`child`, timestamp | Separate child from parent preferences |
| `startedAt`, `endedAt`, `pauseEvents` | timestamps/event list | Actual elapsed/active time |
| `incompleteReason`, `qualityFlags` | categories | Missingness/uncertainty |

Store **raw event evidence**, **derived indicators**, and **versioned algorithm outputs** separately. Keep parent/teacher sensitive screening data outside sanitized cross-service profiles. Use timestamps and source attribution for each context observation.

## 8. Provisional IMPSA and IMLR outputs

### IMPSA (initial candidate)

Calculate on **eligible, genuinely unassisted** first attempts, per mathematical concept/grade band; report n, uncertainty and exclusions. Reuse existing Beta-Binomial as a statistical baseline where its assumptions fit. Do not use a final correct answer obtained with hints as independent success. Avoid a single misleading overall score until item coverage and expert-referenced weighting are established.

### IMLR (initial candidate)

Report observed pre-probe status, support level(s), transfer-probe result, whether support was withdrawn, and evidence sufficiency. The initial output could be `TRANSFER_OBSERVED`, `TRANSFER_NOT_YET_OBSERVED`, `ALREADY_DEMONSTRATED`, or `INSUFFICIENT_EVIDENCE`—**not** an arbitrary 0–100 probability yet. A numerical learning-readiness predictor requires reference outcomes, repeated measures, expert validation and model evaluation.

### Example output, **illustrative not validated**

```json
{
  "protocolVersion": "onboarding-v2",
  "grade": 2,
  "impsa": {
    "status": "PROVISIONAL",
    "eligibleUnassistedItems": 2,
    "skillEvidence": [{"conceptId": "place-value", "correctFirstAttempt": true}],
    "uncertaintyNote": "Few observations; revise after gameplay"
  },
  "imlr": {
    "status": "TRANSFER_OBSERVED",
    "conceptId": "two-digit-addition",
    "preProbeCorrect": false,
    "supportDelivered": ["visual-cue"],
    "unassistedTransferCorrect": true,
    "evidenceLevel": "PROVISIONAL"
  }
}
```

## 9. Social learning, ADHD-related patterns and session factors — integration scope

- **Social context:** Preserve parent/teacher ratings with source/date and show strengths and support suggestions without labeling the child. Decision-making, peer comfort, help-seeking, emotional recovery and persistence can be revisited over time, but do not directly penalize IMPSA or IMLR.
- **ADHD information:** Keep professionally reported presentation (if supplied) separate from SNAP-IV screening and game-observed interaction patterns. A change in on-screen activity does not confirm that clinical ADHD presentation has shifted or symptoms have improved.
- **Longitudinal patterns:** Later game sessions may report stable/change/increased/decreased **observed behaviours** in comparable task contexts; repeated caregiver/teacher ratings, if approved, must be interpreted separately. Always allow `INSUFFICIENT_EVIDENCE` and note context/uncertainty.
- **Session check-in:** Parent can optionally indicate whether the child is tired/uncomfortable or requires a break, recorded under the **session** with appropriate retention and privacy rules rather than permanently embedded in the learner's identity.
- **Recommendations:** Adult-facing guidance should connect an observation to a low-risk learning support strategy, e.g., “Visual counters appeared helpful; try them before introducing symbols.” Avoid diagnosis/treatment advice.

## 10. Relation to other MathQuest components

| Component | Sends to Learner Profile | Receives from Learner Profile | Ownership boundary |
|---|---|---|---|
| Authentication / Parent Portal | Authorized parent-child selection, roles, parent context | Child profile status and adult-facing reports | Access and consent management |
| Content Adaptation | Activity/item metadata and teacher-approval status when integrated | **Sanitized** instructional and support needs, concept estimates | Builds/approves adaptation blueprints, not clinical predictions |
| Gameplay Interaction & Behaviour Signal | Event evidence, quality/uncertainty and optional non-sensitive behaviour summaries | Minimal session context as needed | Does not diagnose ADHD; sensing optional |
| Pedagogical Agent & Adaptive Progress | Task outcomes, hint levels, concept mastery/retention evidence | Concept/learning-readiness evidence and permitted support recommendations | Selects scaffolding, revision and difficulty; keep conceptual separation from readiness prediction |
| Child UI / Game renderer | First attempts, help events, transfer performance | Age-appropriate onboarding sequence and settings | Does not calculate clinical presentations |

## 11. Implementation order after expert review

1. **Agree and version the measurement protocol:** item blueprint, event taxonomy, transfer validity, grade fit, success criteria, language/ethics review.
2. **Add child preferences and instruction/interaction calibration** in a separate safe feature increment; write API and UI tests.
3. **Add paired representations, ordered scaffolds and transfer probes** to a pilot grade; capture structured events, guard against leakage, test resume/skip cases.
4. **Pilot the experience across Grades 1–5** with educators and appropriate approvals; verify timing, clarity, accessibility and frustration/boredom.
5. **Generalize the activity generator and item bank** across grades, preserving current endpoints, schemas and existing data.
6. **Introduce provisional IMPSA/IMLR outputs** separately from established existing skill estimates, with explicit uncertainty.
7. **Connect gameplay evidence and longitudinal dashboards** only after ownership/access and shared contracts are agreed with teammates.
8. **Develop ML/hybrid models** after reference labels, participant data governance and evaluation protocol are ready; synthetic data only for plumbing/simulation, not a real-child accuracy claim.

**Regression requirements:** Prior sign-up/sign-in, parent/teacher navigation, learner CRUD/archive, completed v1 onboarding summaries, SNAP-IV raw records, existing math questions and Beta-Binomial calculations, ELP-X recommendations, and the published JSON contracts must continue to work. New fields should be optional for old records and handled by versioned readers.

## 12. Expert-validation checklist

- [ ] Check curriculum fit and skill difficulty for each grade (Sinhala-medium mathematics teachers).
- [ ] Validate Sinhala instructions, pronunciation, pictures and local cultural familiarity.
- [ ] Decide whether five minutes is feasible and whether child/parent phases need separate completion times.
- [ ] Validate the two separate IMPSA and IMLR constructs and acceptable ground-truth outcomes.
- [ ] Review whether the pre/support/transfer items are equivalent and not too easy or overly rehearsed.
- [ ] Define which support progression is age-appropriate and when to offer breaks.
- [ ] Review accessibility without stigmatizing or mistaking motor issues for low mathematics ability.
- [ ] Review social-context questions, source attribution, optional teacher input and recommendation wording.
- [ ] Review SNAP-IV permissions, instrument version/translation, non-diagnostic wording and any longitudinal reassessment frequency.
- [ ] Confirm ethics/consent, minimization, retention and whether any medication-related question is necessary.
- [ ] Evaluate child engagement and parent-to-child transition with age-appropriate usability testing.
- [ ] Agree cross-service contract/version changes with the other three component owners.

## 13. Immediate next development decision

**Do not paste a broad “implement everything” instruction into Copilot.** First obtain expert review of the Grade 1–5 matrix and select a **single pilot grade (suggested: Grade 1)** to test the redesigned six-phase onboarding end to end. Preserve existing code through additive schema changes, feature flags and regression tests.

---

*This is a research and engineering design specification derived from the available repository audit; it does not certify pedagogical validity, screening validity or current implementation of the proposed extensions.*
