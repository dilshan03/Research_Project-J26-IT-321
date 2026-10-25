# IMLR Probe Redesign: Grade 1 Learning-Transfer Assessment (Design Proposal)

**Status:** PROPOSAL for review. Nothing in this document is implemented.
**Component:** Learner Profile & Prediction Engine (Component 1)
**Date:** 2026-10-21
**Basis:** `IMLR_ML_FEASIBILITY.md`, plus a code review of the Grade 1 onboarding-v2 journey
(`journey/grade1.tsx`, `activities.tsx`, `evidence.ts`, `ChildJourney.tsx`), `onboarding_item_bank.py`,
`assessment_evidence.py` and `onboarding_service.py`.

> **About the examples.** Every item, number, wording and threshold-free rule below is a **hypothetical design
> example**. None of it is a validated educational instrument. Curriculum fit, difficulty, Sinhala wording and
> session length must be reviewed by primary mathematics educators (§G). Ethics and child-wellbeing aspects need the
> clinical supervisor's review. No result from this probe may be presented as proof of learning, as a mastery level
> or as a clinical observation.

---

## A. Current assessment and its weaknesses

### A.1 The current sequence (onboarding-v2, `ONBOARDING-V2-ITEMS-v1.0`)

It covers concept `compare_more` in family `g1_compare_more`, as pictorial two-option items. The order is: welcome
and child choices → calibration → count → two representation matches → **pre** → *(support)* → **transfer** →
ending.

| Role | Item | Left | Right | Correct side | Layout (left / right) |
|---|---|---|---|---|---|
| pre | `g1v2_compare_pre` | 5 birds | 3 squirrels | left | cluster / spread |
| support | `g1v2_compare_support` | 3 rabbits | 5 ducks | right | spread / cluster |
| transfer | `g1v2_compare_transfer` | 4 elephants | 6 butterflies | right | spread / cluster |

**How it works:**
- **Routing:** support is shown only when the pre-probe was incorrect, or when help was requested before the first
  answer.
- **Support:** the guided item starts at level 1 (clarification) and escalates after each wrong confirmation to
  level 2 (pairing lines), then level 3 (worked demonstration). It ends on a correct answer or after level 3.
- **Help on the pre and transfer items:** a help button gives level-1 clarification on request.
- **Evidence recorded per item:** support events (level, type, `timestampSeconds`, `deliveredAt`), instruction
  events, revisions, first and final response, attempts, input mode, interaction observations and
  `supportBeforeFirstResponse` (derived from timestamps).
- **Scoring:** the server scores the first response from the answer key and takes probe roles from its own bank.

### A.2 Weaknesses

| # | Weakness | Effect |
|---|---|---|
| W1 | **Answer-position bias.** Support and transfer are both correct on the *right*; the pre-probe was correct on the left. | A child who repeats the side just confirmed in support scores "transfer success" without comparing quantities. |
| W2 | **Predictable layout.** Support and transfer share the same arrangement (spread left, clustered right). | Surface matching instead of transfer. |
| W3 | **Guessing.** Two options give a 50% chance per item. | A single correct answer carries little evidence. |
| W4 | **Single transfer item**, identical for every child. | Low reliability; no information about item difficulty; no generalisation. |
| W5 | **Single pre-probe item.** | The routing decision rests on one answer, itself 50% guessable. |
| W6 | **Routing creates two populations.** Only children who fail the pre-probe receive support. | The support-then-transfer outcome exists only for a selected subgroup (selection bias for any model). |
| W7 | **Transfer outcome feeds the profile.** The transfer item counts as independent evidence for ELP-X and IMPSA at the same time. | Leakage for future machine learning, and support-adjacent evidence mixed into baseline proficiency. |
| W8 | **The IMLR summary treats a missing `supportBeforeFirstResponse` as unassisted.** | Should be UNKNOWN (the evidence rules already do this). |
| W9 | **No explicit support start and end.** Only the delivery time of each support event is recorded. | The support window, and whether help was still on screen at the transfer, cannot be shown. |
| W10 | **No stimulus parameters recorded** (set sizes, difference, arrangement, correct position). | Difficulty and position effects cannot be analysed. |
| W11 | **No in-journey break control** (the older flow had "Pause & Exit"). | Fatigue can't be separated from not understanding. |
| W12 | **Items not reviewed** (`expertReview: PENDING`). | Content validity for Sri Lankan Grade 1 unconfirmed. |
| W13 | **Grades 2–5 have no sequence.** | No evidence at all for those grades. |

---

## B. Proposed assessment structure

### B.1 Principles
1. **One clearly defined construct per family**, with an *item model* that fixes the mathematics and varies only
   the surface (objects, positions, arrangement).
2. **Several unseen transfer items**, matched in difficulty to the pre-probe items and counterbalanced for answer
   position and layout.
3. **An explicit, recorded support window** with a clear start and end. Correct answers given during support are
   never transfer evidence.
4. **Independence is shown, never assumed.** Missing assistance evidence means UNKNOWN.
5. **Descriptive reporting only.** No mastery, readiness or frustration thresholds, and no learning-gain claims.
6. **The child stays in control.** Breaks, help on request, audio, and tap alternatives to drag remain available.

### B.2 Sequence (one family; about 6–9 short items, length to be piloted)

| Phase | Role | Items | Help | Counts as |
|---|---|---|---|---|
| P: pre | `pre` | **2** unseen items, same item-model cell | On request only (recorded) | Independent pre evidence if no help before the first response |
| S: support | `support` | **1–2** worked or guided items (different objects and numbers from every P and T item) | Built in: L1 clarify → L2 visual cue → L3 worked demonstration | Never independent; never transfer |
| B: boundary | — | Short neutral transition ("Now you try!"); support visuals removed | — | Marks the end of the support window |
| T: transfer | `transfer` | **3** unseen items, same cell as P, counterbalanced | On request only (recorded) | Independent transfer evidence if no help before the first response |
| *(optional, future)* D: delayed | `delayed_transfer` | Unseen items from the same pool in a later session | On request only | Separate delayed-transfer evidence |

**Routing (decision for review, §G).**
- **Option U (recommended): universal brief support.** Every child receives S after P. This removes the routing
  threshold and the selection bias (W6), and gives everyone a comparable "dose" whose escalation level is recorded.
  Children who answered P correctly still see a short guided example. That is an acceptable cost, and still gives
  information.
- **Option R: routed support,** as today. It requires an explicit, provisional, configurable rule (not a mastery
  threshold), and analysis must treat the two populations separately.

**Breaks and accessibility, in every phase.**
- A child-initiated **break** button is always visible. A break is recorded as an event, **is not support**, and
  never ends the item. Items interrupted by a break are flagged, not discarded.
- Existing features stay:
  - Sinhala audio (only when a `si-LK` voice exists);
  - tap alternative to drag; keyboard access; 48px targets;
  - reduced motion;
  - instruction replay;
  - no visible timer, no score shown to the child, and neutral feedback during P and T (no "correct/wrong").

### B.3 Response format
- **Primary format: choose one of three groups** ("Which group has the most?"). Chance falls to 1/3 per item. With
  three transfer items, the chance of answering all three correctly by guessing is (1/3)³ ≈ 3.7%, against 50% for
  one two-option item today.
- **Secondary format, for educator review: a constructed response with manipulatives.** "Put *more* fish in this
  bowl than in that one." The child builds a set with the existing drag/tap tokens. Any count above the reference
  (up to a cap) is correct, so guessing is far less likely. It is the same "more" relation, but more demanding to
  produce. Educators should decide whether it measures the same construct for 6-year-olds before it is used as a
  transfer item.
- **Not recommended for Grade 1:** typed numeric entry (motor and reading load), and more than three groups
  (visual crowding).

---

## C. Example Grade 1 question family (hypothetical)

### C.1 Family definition
- `itemFamilyId`: `g1_compare_most_v3` *(hypothetical ID)*
- `conceptId`: `compare_quantities_most` — identify which of three collections has the greatest number of objects
  (quantities up to 9).
- **Item-model cell (fixed for P and T):**
  - three sets, each 3–9 objects;
  - largest minus second-largest = **2**;
  - one object type per set, all objects the same size;
  - **incongruent arrangement:** the largest set is the most tightly clustered, so spread or length does not give
    the answer.
- **Surface variables (varied and counterbalanced):** object type, correct position (left / middle / right), which
  smaller set is spread out, mirror arrangement.
- **Not used in this cell:** object-size conflict and difference of 1. These are candidate *harder* cells for later,
  after educator review.

### C.2 Items for form A (positions rotate in forms B and C)

| Item | Role | Left | Middle | Right | Correct | Objects |
|---|---|---|---|---|---|---|
| `g1v3_most_P1` | pre | 5 | **7** | 4 | middle | birds |
| `g1v3_most_P2` | pre | 6 | 4 | **8** | right | fruit |
| `g1v3_most_S1` | support | **6** | 4 | 3 | left | rabbits (guided pairing) |
| `g1v3_most_S2` | support (optional) | 3 | **5** | 2 | middle | ducks (worked demonstration) |
| `g1v3_most_T1` | transfer | **8** | 6 | 5 | left | elephants |
| `g1v3_most_T2` | transfer | 5 | 4 | **7** | right | butterflies |
| `g1v3_most_T3` | transfer | 4 | **7** | 5 | middle | fish |

**Design notes:**
- **Matching difficulty.** P and T share the cell. The largest set is 7–8 and the gap is 2 in every P and T item.
  The S items use smaller numbers, so the support doesn't preview the transfer numbers.
- **No position copying.** Across the three T items each position is correct exactly once. Over a form, the correct
  positions are spread across left, middle and right, so a child who always picks one position, or repeats the last
  support answer, cannot answer every transfer item correctly. Each item's `correctPosition` is recorded.
- **Counterbalanced forms.** Forms A, B and C rotate the correct positions as a Latin square, and object types
  rotate as well. The server assigns the form and records `formId`. Item order within P and T may be randomised;
  the presented order is recorded.
- **Unseen items.** No P, S or T item repeats within a child. S items are never reused as T items. Gameplay
  re-assessment must draw from a pool of parallel unseen items (pool size to be agreed). No item seen in onboarding
  may be used as later transfer evidence.

### C.3 Second family (sketch, for a later sequence)
- `itemFamilyId`: `g1_one_more_v3` *(hypothetical)*
- `conceptId`: `one_more_than` — "Which group has one more than this group?"
- Format: three-choice, quantities 2–9; distractors are the same number and one fewer.
- Two families give two independent transfer sequences per child, which helps reliability and keeps any summary from
  hanging on a single concept.

---

## D. Recommended response and assistance evidence fields

These are additions to the existing per-item record (`MathItemAnswerSubmission` / `evaluatedItems`). Fields marked
*server* are authoritative on the server and are never trusted from the client. Correctness is never sent by the
client.

### D.1 Identifiers and versions (per submission / per item)

| Field | Level | Source | Purpose |
|---|---|---|---|
| `assessmentProtocolVersion` (e.g. `onboarding-v3`) | submission | client, validated | Protocol separation from v1/v2 |
| `imlrProbeVersion` (e.g. `IMLR-PROBE-G1-v0.1`) | submission | server | Probe design version |
| `itemBankVersion` | submission | server | Answer keys and item specifications |
| `formId`, `sequenceId` | submission | server-assigned | Counterbalancing; groups P/S/T |
| `questionId`, `itemFamilyId`, `conceptId`, `probeRole`, `representation` | item | server | Already exist; server wins |
| `itemModelCell` (e.g. `max7-9_gap2_incongruent`) | item | server | Difficulty cell |
| `presentationIndex` | item | client, checked | Actual order shown |

### D.2 Stimulus and response options (held by the server; the client receives no answers)

| Field | Purpose |
|---|---|
| `responseOptions[]`: `{optionId, position (0–2), setSize, arrangement}` | Option layout as presented (no images or free text) |
| `correctPosition` (*server*) | Position-bias analysis |
| `responseFormat` (`select_one_of_3` / `construct_set`) | Format comparison |
| `selectedOptionId` / `constructedCount` (first and final) | Response; correctness derived on the server |

### D.3 Assistance and timing

| Field | Definition |
|---|---|
| `itemPresentedAt` (ISO) + offsets in seconds from item start | Clock for every event (monotonic offsets; one wall-clock stamp per item) |
| `firstResponseOffsetSeconds` | Time of the first *confirmed* response |
| `supportEvents[]`: `{level, type, origin: "protocol" \| "child_request", startOffsetSeconds, endOffsetSeconds}` | Adds **origin** and **start/end**, so the time help was visible is known (today only delivery time is recorded) |
| `supportWindow` (per sequence): `{startedAt, endedAt}` | Explicit start (first S item shown) and end (boundary screen shown; support visuals removed) |
| `assistanceRecording` | `"complete"` only when the recorder was active for the whole item and the support list is present (even if empty). Otherwise `"incomplete"` or absent. |
| `assistanceStatus` (*server, derived*) | `NONE_CONFIRMED` / `ASSISTED` / `UNKNOWN` (§E.1) |
| `instructionEvents[]` | Already exists (delivered / replayed / clarified / audio) |
| `revisionEvents[]` | Already exists (changes before confirmation) |
| `breakEvents[]`: `{startOffsetSeconds, endOffsetSeconds}` | Child-initiated breaks; **not** support. The reason is never asked. |
| `interactionMode`, `inputMethod`, `missedDropCount` | Already exist; accessibility context only |
| `accessibilityAdaptations` | e.g. `{audio: true, tapAlternativeUsed: true}`; preferences, not diagnoses |

### D.4 Data minimisation
- **Not collected:** audio, video, gaze, free text, exact birth dates, device identifiers, break reasons, or any
  ADHD or SNAP-IV data in the probe.
- The existing aggregated `interactionObservations` stay as they are. No new fine-grained pointer traces are
  proposed.

---

## E. Proposed independent-transfer outcome definition

### E.1 Assistance status (per item, derived on the server)
- **`NONE_CONFIRMED`** requires all of:
  - `assistanceRecording == "complete"`;
  - a `supportEvents` list is present (empty is allowed);
  - no support event with `startOffsetSeconds <= firstResponseOffsetSeconds`;
  - the item is not a `support` item;
  - a first confirmed response exists.
- **`ASSISTED`** if any support event started before or at the first response, or the item's role is `support`.
- **`UNKNOWN`** in every other case: recording incomplete, support list missing, timestamps missing, or a
  hint/demonstration flag without timing. **A missing record is never treated as unassisted.**

### E.2 Per-item transfer outcome
For each `transfer` item in a **valid sequence**:

| Outcome | Condition |
|---|---|
| `INDEPENDENT_CORRECT` | Answered; `assistanceStatus = NONE_CONFIRMED`; first confirmed response correct per the server's key |
| `INDEPENDENT_INCORRECT` | As above, but the first response is incorrect |
| `NOT_INDEPENDENT` | `assistanceStatus = ASSISTED` |
| `INDEPENDENCE_UNKNOWN` | `assistanceStatus = UNKNOWN` |
| `NOT_ANSWERED` | Not presented, skipped, or invalid |

A **valid sequence** has:
- the same `itemFamilyId` and `itemModelCell` for P and T;
- P presented before S, and S before T;
- the support window closed before the first T item was shown;
- every T `questionId` unseen by this child;
- no `PROBE_ROLE_MISMATCH` or `FIRST_RESPONSE_CORRECTNESS_MISMATCH`.

Correct answers during S are recorded as **assisted performance** and are never transfer evidence.

### E.3 Summarising several items (descriptive, no thresholds)
Report:
- **`k / n`**: independent-correct transfer items out of independent-classified transfer items, with per-item detail;
- the **chance level** (1/3 per three-choice item), shown alongside;
- the counts of not-independent, unknown and unanswered items;
- the pre-probe `k / n`, shown separately;
- the maximum support level reached in S.

Rules for interpretation:
- **No** "ready / not ready", "mastered" or "frustrated" labels, and no cut-offs.
- **No** gain score. "Pre 0/2 → transfer 3/3" is described, never called a learning gain, because the items differ,
  practice and order effects exist, and the numbers are small.
- **Optional, for later:** after calibration, a Bayesian or IRT summary of independent transfer with an uncertainty
  interval, reported as provisional and never as a certified score.

### E.4 Safeguards for future machine-learning records
- **Prediction time** = when the first T item is presented (end of the support window). Every feature must be
  recorded before it.
- **Target candidates:**
  - item-level `INDEPENDENT_CORRECT` vs `INDEPENDENT_INCORRECT` (other outcomes excluded), grouped by child;
  - or a child-level `k / n`.
- **Later T outcomes must not predict earlier ones.** For a child-level target, no T-item data is a feature.
- **Never features:**
  - any T response, timing, revision or support;
  - `imlrSummary`, `impsaSummary`, stored ELP-X, accuracy and skills;
  - recommendations;
  - session end and duration;
  - the live profile and later gameplay;
  - ADHD reports and SNAP-IV (also not substitute labels).
- **Recompute ELP-X** from items before the transfer only, with a fixed engine version.
- **Grouped splits** by learner and parent account; a later cohort as the temporal hold-out; stratify by
  `imlrProbeVersion` and `formId`.
- **An allowlist plus automated leakage tests**, as in the NSCH pipeline.
- **Design decision for review:** whether T items should be kept out of the stored onboarding ELP-X snapshot
  (removes W7 at the source, but changes ELP-X input selection) or kept in and recomputed at extraction time.

---

## F. Requirements for Grades 2–5 expansion

Each grade needs at least one family meeting all of the following:

1. **A single named concept** and an item model with difficulty-defining parameters (number range, regrouping,
   representation), approved by educators.
2. **At least 2 pre, 1–2 support and 3 transfer items** in the same cell, counterbalanced across ≥ 3 forms, with a
   pool of unseen parallel items for later gameplay.
3. **A response format suited to the age.**
   - Grades 2–3: three or four choices, or constructed responses with manipulatives (base-ten blocks, equal groups).
   - Grades 4–5: constructed numeric entry is possible if the reading and motor load is acceptable.
   - The reading load stays minimal, with Sinhala audio support.
4. **Support scripts** for L1 clarify, L2 visual cue and L3 worked demonstration, using numbers different from every
   P and T item.
5. **The same evidence fields (§D) and outcome definition (§E).**
6. **Age vs grade.** Children aged 6–10 may be above or below grade level. Pre-items should allow an adjacent-grade
   cell, decided by educators, without labelling the child.

**Candidate concepts (hypothetical; educators to confirm against the Sri Lankan syllabus):**

| Grade | Concept | Format idea |
|---|---|---|
| 2 | Two-digit place value (tens and ones) | Build a number with tens and ones blocks |
| 2 | Addition within 20 without regrouping | Three choices with pictures |
| 3 | Multiplication as equal groups | Choose the matching array |
| 4 | Perimeter with unit tiles | Count edges and choose the total |
| 4 | Equivalent fractions | Fraction strips |
| 5 | Decimal place value | Tenths tiles |
| 5 | Number patterns (rule finding) | Constructed next term |

---

## G. Expert-review questions

### For primary mathematics educators
1. Does "which of three groups has the most (up to 9, gap of 2)" match Sri Lankan Grade 1 expectations at the start
   of the year? Should the cell be smaller (up to 5) or larger (up to 10)?
2. Are 2 pre-items and 3 transfer items an acceptable load for a 6-year-old in one sitting, alongside the other
   onboarding activities? What is the maximum session length?
3. Do the incongruent arrangements (largest set clustered) test number rather than spread, without being unfair?
4. Is "build a set with more than this one" the *same* construct as choosing the larger set, or a harder, different
   one?
5. Are the support scripts (pairing, then a worked demonstration) appropriate in Sinhala, and do they teach the
   concept rather than the answer position?
6. Which second Grade 1 concept should follow ("one more than", or another)?
7. Which concepts and cells should Grades 2–5 use (§F), and how should above- and below-grade children be handled?
8. How many parallel unseen items per cell are needed for later gameplay re-assessment?

### For the clinical supervisor
1. Is universal brief support (Option U) preferable to routed support (Option R) for child wellbeing and fairness?
2. Is neutral, non-evaluative feedback during the pre and transfer items acceptable for 6–10-year-olds, including
   children whose parents report ADHD?
3. Are always-available breaks (recorded, reason never asked) and help on request appropriate, given that both
   affect what counts as independent?
4. Is the descriptive `k / n` with chance level shown, and no readiness labels, acceptable wording for parents and
   teachers?
5. Is the data in §D minimal and proportionate? Should any field be removed?
6. Should the summary be shown to parents at all, or only to teachers and researchers?
7. Is it confirmed that ADHD information and SNAP-IV must never be used as substitute labels or predictors for
   learning readiness?

---

## H. Proposed integration files and ownership boundaries

All proposed changes sit inside **Component 1 (Learner Profile & Prediction Engine)**. They are additive, behind a
protocol version and a feature flag; onboarding-v1/v2 records and contracts stay readable and unchanged.

| Area | File (proposed) | Change |
|---|---|---|
| Item bank | `services/learner-profile-service/app/db/imlr_probe_bank.py` (new) | v3 families, cells, forms and answer keys; `expertReview` status |
| Evidence rules | `app/services/assessment_evidence.py` | Three-state `assistanceStatus`; support-window and sequence-validity checks; new flags; v2 logic kept for v2 records |
| Schemas | `app/schemas/onboarding.py` | Optional additive fields from §D (no breaking changes) |
| Summary | `app/services/onboarding_service.py` | Descriptive transfer summary for v3; v2 `imlrSummary` left as is for v2 records |
| API | `app/api/v1/onboarding.py` | Server-assigned form for the activity-items endpoint (answers stripped) |
| Frontend templates | `apps/web/.../onboarding/journey/activities.tsx` (or new files) | Three-choice compare, optional build-a-set, break control, boundary screen |
| Recorder | `journey/evidence.ts` | Support origin and start/end, support window, break events, `assistanceRecording` |
| Journey | `journey/ChildJourney.tsx`, new `grade1_v3.tsx` | v3 sequence behind a flag; v2 journey kept for rollback |
| Wording | `apps/web/src/shared/i18n/childText.ts` | New Sinhala strings (educator-reviewed) |
| Tests | `services/learner-profile-service/tests/`, `apps/web/tests/onboarding/` | Assistance tri-state, sequence validity, counterbalancing, no client correctness, v1/v2 regression |

**Decisions needed before implementation:**
- **ELP-X input selection:** whether T items are excluded from the stored snapshot (§E.4). This affects ELP-X
  behaviour and needs explicit approval; the ELP-X algorithm itself is not changed.
- **Admin dashboard:** showing v3 evidence there is a later, separate change.

**Not touched:** MQ-REC, authentication, the Admin Dashboard, MongoDB contents and other components' services
(Behaviour Signal, Content Adaptation, Pedagogical Engine). If gameplay is later used for delayed transfer, the
gameplay evidence schema must carry `probeRole`, `itemFamilyId`, `conceptId`, support events with timing, and
measured response time. That needs agreement with the owners of the components that send gameplay events.

---

## I. Checklist for approving implementation

**Content (educators)**
- [ ] Grade 1 concept, item-model cell and number range approved.
- [ ] P/S/T items and three counterbalanced forms approved; Sinhala wording reviewed.
- [ ] Response formats approved (three-choice; build-a-set yes or no).
- [ ] Session length and item count approved.

**Ethics and wellbeing (clinical supervisor)**
- [ ] Routing option chosen (U or R).
- [ ] Neutral feedback, breaks and help-on-request approved.
- [ ] Descriptive reporting wording and audience (parent / teacher / researcher) approved.
- [ ] Data fields (§D) confirmed as minimal; ADHD/SNAP-IV exclusion confirmed.

**Technical (Component 1)**
- [ ] Decision on keeping T items out of the stored ELP-X snapshot.
- [ ] Protocol and version names agreed (`onboarding-v3`, `IMLR-PROBE-G1-v0.1`).
- [ ] Rule: missing assistance evidence is always UNKNOWN; client correctness never trusted.
- [ ] v1/v2 compatibility and rollback flag confirmed.
- [ ] Test plan agreed: tri-state assistance, sequence validity, counterbalancing coverage, no repeated items, no
      leakage fields in the summary.

**Research**
- [ ] Pre-registration of the descriptive summary and the future ML target (§E.4).
- [ ] Ethics approval and consent covering research use of the new fields.
- [ ] Plan for a small pilot to check timing, item difficulty and position effects before wider use.
