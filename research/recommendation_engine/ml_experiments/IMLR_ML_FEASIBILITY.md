# IMLR Supervised-Learning Feasibility Audit

**Component:** Learner Profile & Prediction Engine (Component 1)
**Date:** 2026-10-21
**Scope:** read-only review of the repository code, local research files and local data files. No database was
queried and no child record was read. No model was trained and no outcomes were generated.

## Readiness classification: **BLOCKED_INSUFFICIENT_REAL_DATA**

An IMLR prediction model cannot be trained or validated yet. The reasons:

1. **One probe only.** The application contains exactly one pre → support → transfer sequence: Grade 1, concept
   `compare_more`. It was merged on 2026-10-19 (commit `be65e24`), two days before this audit.
2. **One sequence per child.** A child can complete the baseline once (a second submission returns HTTP 409), so
   each child yields at most one labelled example. Children who answer the pre-probe correctly never receive
   support, so they don't count as IMLR examples at all.
3. **Grades 2–5 have no transfer sequences**, and gameplay events cannot record one (§3.5).
4. **The real dataset size is unknown.** Database counts were not queried (authorisation was not given). Given how
   recently the probe was released, the number of genuine (non-test) sequences is expected to be very small or
   zero; this must be confirmed with the aggregate-only query in §10.
5. **Even with enough children, the current label is weak:** a single two-option item (50% chance level) whose
   correct side and layout match the support item (§6).

`PROTOTYPE_ONLY_WITH_SYNTHETIC_DATA` was considered and rejected. A synthetic prototype would need invented
learning outcomes, which the task forbids. It also shows nothing about MathQuest children. Synthetic records would
be acceptable **only** for software tests of a future pipeline, never as model results (§9).

---

## 1. Answers to the ten questions

| # | Question | Finding |
|---|---|---|
| 1 | Sufficient dataset of genuine independent-transfer outcomes? | **No.** One Grade 1 probe, at most one sequence per child, released 2026-10-19. No anonymised real dataset exists in the repository. |
| 2 | Unique learners / valid transfer sequences? | **Not counted (database access not authorised).** Upper bound: one sequence per onboarding-v2 Grade 1 assessment. Only children who needed support count for IMLR. Grades 2–5: 0 (no transfer items exist). Gameplay: 0 (no producer, no fields). |
| 3 | Inputs recorded before the transfer outcome? | Listed in §4: earlier items in the same session, the pre-probe, the support item, child choices and parent questionnaires. Recorded per item, in presentation order, with times relative to each item. |
| 4 | How is independent success defined and checked? | On the server (`ASSESS-EVIDENCE-v1.0`): correctness of the first response is computed from the answer key; independence needs an explicit `supportBeforeFirstResponse = false`. The IMLR summary uses a **looser** rule (§5.2). |
| 5 | Support events and difficulty captured consistently? | Support yes, for the Grade 1 v2 journey only (level, type, time). Difficulty **no**: v2 items have no difficulty field; v1 items have uncalibrated `easy/medium/hard` labels; gameplay events have neither. |
| 6 | Can repeated records from one child leak between training and test? | Not at present (one baseline per child). Siblings share a parent account and household context, and future gameplay sequences would repeat children, so splits must be grouped by learner **and** parent account (§8). |
| 7 | Are transfer items genuinely new and comparable? | Partly. New animals and numbers, same family and concept. But the transfer copies the support item's correct side (`right`) and layout (spread left, cluster right), while the pre-probe had the opposite. Every child sees the same single transfer item (§6). |
| 8 | Features that reveal the target? | Every assessment-level output computed after the transfer (§4.3), including the **stored ELP-X profile and IMPSA summary, which include the transfer item**. |
| 9 | Missing observations that prevent valid training? | Real counts; more than one transfer item per child; counterbalanced items; difficulty parameters; Grades 2–5 sequences; delayed or longitudinal transfer; gameplay fields for support timing and probe role; a reliable label (§7). |
| 10 | Can ELP-X estimates serve as historical features without leakage? | **Not the stored ones.** The stored `elpxProfile` is computed from all independent items **including the transfer**. ELP-X must be recomputed from items before the transfer only, with the same engine and versions (§4.2). The live profile also absorbs later gameplay and is never admissible. |

---

## 2. Data-source status

| Source | Location | Status for IMLR | Notes |
|---|---|---|---|
| Grade 1 onboarding-v2 journey | `apps/web/.../onboarding/journey/` (`grade1.tsx`, `activities.tsx`, `evidence.ts`, `ChildJourney.tsx`) | **Only source of transfer sequences** | One `compare_more` sequence; support shown only if the pre-probe was not independently correct. |
| v2 item bank (server answer keys) | `services/learner-profile-service/app/db/onboarding_item_bank.py` (`ONBOARDING-V2-ITEMS-v1.0`) | Available | 6 Grade 1 items; probe roles and families defined on the server; `expertReview: PENDING`; no difficulty field; **0 items for Grades 2–5**. |
| v1 question bank | `app/db/question_bank.py` (`MATH-QB-v1.0`) | **Unusable for IMLR** | 17 items for Grades 1–5 (4/4/3/3/3); no probe roles, families or support; difficulty labels uncalibrated. |
| Assessment records | MongoDB `assessments`, built by `onboarding_service.submit_math_assessment` | **Not queried** | Fields in §4. One baseline per learner (409 on resubmission). |
| Provisional IMLR / IMPSA summaries | `imlrSummary`, `impsaSummary` on assessment records | Not queried; **cannot be features** | Contain or depend on the target (§4.3). The admin research dashboard can show suppressed aggregate IMLR status counts to an authorised admin. |
| Evidence-integrity rules | `app/services/assessment_evidence.py` (`ASSESS-EVIDENCE-v1.0`) | Available | Defines first-response correctness, independence and transfer-integrity flags (§5). |
| ELP-X | `app/core/elpx_engine.py` (`ELP-X-v1.0`), `app/services/evidence_service.py` | Engine reusable for recomputation | Stored snapshot leaks (§4.2). |
| Gameplay evidence events | MongoDB `gameplay_events`; ingest `POST /learners/{id}/evidence` | **No producer found** | Only tests call the endpoint. Schema lacks probe role, family, concept, support timing and difficulty. `responseTime` defaults to `0.0`. |
| Pedagogical engine data | `services/pedagogical-engine/decision-api/data/*.json` | **Out of scope (another component)** | Structure inspected only: the interactions file is empty; the progress file holds 1 record with identifying fields (not read further). No pre/support/transfer structure. |
| Synthetic learner interactions | `services/pedagogical-engine/learner-model/data/synthetic_adhd_interactions.csv` | **Not admissible** | 2,400 simulated rows (another component) with a latent "true mastery", archetypes and an `inattention_index`. The outcomes are simulated and the data has no transfer design. Using it would train on fabricated outcomes and an ADHD-linked construct. |
| MQ-REC scenarios | `research/recommendation_engine/test_scenarios/scenarios/` | Not admissible | 8 synthetic contexts for rule tests; they contain no outcomes. |
| NSCH survey | `ml_experiments/data/raw/` | Not relevant | US survey; no mathematics learning or transfer outcomes. |

---

## 3. How the current sequence works (code-verified)

### 3.1 Grade 1 `compare_more` probe
The order is fixed: calibration → count → two representation matches → **pre** → *(support)* → **transfer** →
ending.

| Item | questionId | Left group | Right group | Correct | Layout |
|---|---|---|---|---|---|
| Pre-probe (`pre`) | `g1v2_compare_pre` | 5 birds | 3 squirrels | **left** | left clustered, right spread |
| Guided support (`support`) | `g1v2_compare_support` | 3 rabbits | 5 ducks | **right** | left spread, right clustered |
| Transfer (`transfer`) | `g1v2_compare_transfer` | 4 elephants | 6 butterflies | **right** | left spread, right clustered |

All three items share family `g1_compare_more`, concept `compare_more`, a `pictorial` representation and a
**two-option** choice. Each item has a difference of 2 between the groups.

### 3.2 Who receives support
`ChildJourney.tsx` shows support only when `!firstCorrect || assistedBeforeFirst` on the pre-probe. Otherwise the
child goes straight to transfer, and the server labels the result `ALREADY_DEMONSTRATED`.

### 3.3 What support is recorded
On the guided item, support level 1 (`clarification`) is recorded on entry. Each incorrect confirmation escalates
to level 2 (`visual_cue`, pairing lines), then level 3 (`worked_demonstration`). The item ends on a correct answer
or after level 3. On the pre-probe and transfer items, the child can ask for level-1 help.

`evidence.ts` records each support event (`level`, `type`, `timestampSeconds`, `deliveredAt`). It derives
`supportBeforeFirstResponse` from the timestamps, and also sends `demonstrationUsed`, `hintUsed`, the
`revisionEvents`, the `instructionEvents` and the `interactionObservations`.

### 3.4 Grades 2–5
These grades use the legacy flow (`LivingCanvasOnboarding` and the legacy quiz) with the v1 bank. It has no
pre/support/transfer items, no item families and no guided support, so it yields **0** IMLR sequences.

### 3.5 Gameplay events (`GameplayActivityEvidence`)
The schema's fields are: `eventId, learnerId, questionId|activityId, skillId, correctFirstResponse, attempts,
hintsUsed, responseTime (default 0.0), activityTimestamp, sourceComponent`.

It has no probe role, item family, concept, representation, support timing, support level or difficulty, and no
component in the repository sends these events. No longitudinal or delayed-transfer evidence exists.

---

## 4. Feature / target dictionary

Timing is relative to the transfer item's first confirmed response. "Pre-T" means the value is fixed before the
transfer item is shown.

### 4.1 Target (proposed)

| Name | Definition |
|---|---|
| `imlr_transfer_success` (binary) | **1** if, in a valid sequence (§5.3), the transfer item's first confirmed response is server-verified correct (`correctFirstResponse = true`, `firstResponseSource = SERVER_VERIFIED`) **and** `supportBeforeFirstResponse` is explicitly `false`. **0** if the same conditions hold except that the first response is incorrect. |
| Population | Sequences where the pre-probe was **not** independently correct (incorrect first response, or support before it), so support was actually delivered. Pre-correct children are `ALREADY_DEMONSTRATED` and are excluded from the IMLR target; their transfer result is IMPSA-type evidence instead. |
| Excluded from labelling | Transfer not presented, skipped, unanswered or invalid; assisted or unknown-assistance transfer; flags `TRANSFER_WITHOUT_PRE_PROBE`, `PROBE_ROLE_MISMATCH`, `FIRST_RESPONSE_CORRECTNESS_MISMATCH`, `FIRST_RESPONSE_UNKNOWN`; non-v2 protocol; test or developer accounts. |
| Known label limitation | Two options give a **50% chance success rate**: one item measures transfer with very low reliability. |

### 4.2 Candidate predictors (all Pre-T)

`A` = allowed. `C` = allowed with caution. `R` = recompute before use.

| Feature | Source field(s) | Status | Notes |
|---|---|---|---|
| `pre_first_correct` | pre item `correctFirstResponse` | A | Within the IMLR population it is constant by definition (always false or assisted); useful only if the population is widened. |
| `pre_assisted_before_first` | pre `supportBeforeFirstResponse` | A | Separates "asked for help" from "answered incorrectly". |
| `pre_response_time_s` | pre `responseTimeSeconds` | C | Measured time; must not be read as attention or ADHD. |
| `pre_revisions` | pre `revisionEvents` count | C | Revisions before confirmation (SC dimension). |
| `pre_instruction_replays` | pre `instructionEvents` (replayed or clarified) | C | IC dimension. |
| `support_max_level` | support item `max(supportEvents.level)` | A | 1–3; the main "dose" variable. |
| `support_demo_used` | support `demonstrationUsed` | A | Equals `support_max_level == 3`, so use one of the two. |
| `support_attempts` | support `attempts` | C | With two options, a second attempt is forced-correct, so this mainly duplicates `support_max_level`. |
| `support_first_correct` | support `correctFirstResponse` | C | The level-1 clarification is shown first, so this is an *assisted* response. It is admissible (it happens before the transfer) but must be reported as an assisted signal. |
| `count_first_correct`, `match_numeral_first_correct`, `match_group_first_correct` | earlier independent items | A | Same session, before the pre-probe. |
| `prior_elpx_number_sense_p`, `prior_elpx_number_sense_n` | **recomputed** ELP-X over independent items shown before the transfer | R | Use the same engine version (`ELP-X-v1.0`). For `number_comparison` only the pre-probe precedes the transfer (n = 1), which is always `INSUFFICIENT_EVIDENCE`. |
| `calibration_completed`, `calibration_time_s` | calibration item (excluded from scoring, but recorded) | C | Instruction-following check, not maths. |
| `interaction_mode`, `missed_drops` (earlier items) | `interactionMode`, `missedDropCount`, `interactionObservations` | C | Accessibility context only; must never lower ability. |
| `child_sound_mode`, `child_theme` | `childPreferences` (source child) | C | Preference context; unlikely to be causal. |
| `parent_learning_preferences.*` | `questionnaires.learningPreferences` | C | Parent-reported context. |
| `social_context.*` | `questionnaires.socialContext` | C | Contextual only. |
| `grade`, `age` | learner record | C | Grade is constant (1) for the only probe; age is coarse. |

### 4.3 Excluded features (reveal the target, come after it, or are not permitted)

| Feature | Reason |
|---|---|
| Transfer item: `userAnswer`, `firstConfirmedResponse`, `isCorrect`, `correctFirstResponse`, `attempts`, `responseTimeSeconds`, `revisionEvents`, `supportEvents`, `interactionObservations`, `qualityFlags` | Target, or recorded during the target response. |
| `imlrSummary` (all fields) | `status` and `unassistedTransferCorrect` **are** the label. |
| `impsaSummary` (`skillEvidence`, counts, status) | Built from independent items **including the transfer item**. |
| Stored `elpxProfile` (estimates, levels, intervals, `structuredRecommendations`) | Computed with `select_proficiency_items`, which **includes the transfer** (`probeRole: transfer` is independent, so it is included). |
| `accuracyPercentage`, `correctAnswers`, `totalQuestions`, `skills[]`, `strengths`, `areasForGrowth`, `recommendations`, `evidenceSummary`, `evidenceLevel` | Assessment-level aggregates that include the transfer item. |
| `sessionEndedAt`, total session duration | Include the transfer and the ending. |
| Live ELP-X profile (`GET /profile`), gameplay events after the assessment, MQ-REC / ELP-X-REC outputs | Recorded after the outcome. |
| Parent-reported ADHD information, SNAP-IV answers and scores | Not permitted as educational predictors (non-diagnostic policy; sensitive). Also a fairness and ethics risk. |
| `learnerId`, `parentId`, names, emails, timestamps that identify a person | Identifiers. Use them only for grouping splits, never as features. |
| Teammate synthetic `inattention_index`, latent mastery | Fabricated, and ADHD-linked. |

---

## 5. Validity of the outcome definition

### 5.1 Server checks (ASSESS-EVIDENCE-v1.0)
- Correctness of the first response is computed from the answer key on the server; client claims are kept only to
  detect mismatches.
- Assistance is decided as follows:
  - an explicit `supportBeforeFirstResponse` wins;
  - hints or demonstrations with no timing information make independence **unknown**;
  - a missing report gives `ASSISTANCE_NOT_REPORTED`.
- Support-role items are never independent.
- Probe roles and families come from the server bank, so a client cannot relabel them (`PROBE_ROLE_MISMATCH`).
- `TRANSFER_WITHOUT_PRE_PROBE` flags a transfer item with no presented pre-probe from the same family.

### 5.2 Mismatch in the provisional IMLR summary
`onboarding_service.py` computes
`transfer_correct = correctFirstResponse and not supportBeforeFirstResponse`. A **missing**
`supportBeforeFirstResponse` therefore counts as unassisted, whereas the evidence rules treat it as unknown.

The v2 frontend always sends the field, so current records are unaffected. But any training extract must apply the
stricter rule (`independentFirstResponse is True`) rather than reuse `imlrSummary`. The IMLR status also counts
pre-correct children as `ALREADY_DEMONSTRATED`, which is a different construct.

### 5.3 A valid sequence requires
- protocol `onboarding-v2`;
- the pre, support and transfer items all from one `itemFamilyId`, with distinct `questionId`s;
- a pre-probe that was presented and not independently correct;
- at least one support event on the support item;
- an explicitly unassisted, answered transfer;
- none of the flags in §4.1.

---

## 6. Is the transfer item comparable and new?

**In its favour:**
- It is a new item (different animals, numbers and question ID) of the same concept and representation.
- Its numbers differ from both earlier items (4 vs 6).
- No help is shown unless the child asks for it.

**Threats to validity:**
1. **Position and layout confound.** The support and transfer items both have the correct answer on the right,
   with the right group clustered. The pre-probe's correct answer was on the left. A child who repeats the side
   that was just confirmed during support scores "transfer success" without having learnt to compare quantities.
   Learning and perseveration cannot be told apart.
2. **Chance level of 50%** with a single item. Many 1-labels will be guesses, so the observable signal ceiling is
   low.
3. **One fixed item for every child.** There is no item variation, so a model would learn nothing about item
   difficulty and could not generalise beyond this item.
4. **Immediate transfer only.** It measures short-term transfer within the same activity, not durable learning
   readiness.
5. **Fixed order.** Fatigue and order effects are confounded with the sequence position.
6. **Items not reviewed** (`expertReview: PENDING`). Content validity for Sri Lankan Grade 1 is unconfirmed.

---

## 7. Missing observations that block valid training

1. **Real counts.** The number of genuine (non-test) valid sequences is unknown (§10).
2. **Several transfer items per child**, ideally ≥ 3, with counterbalanced correct side and layout. Prefer more
   than two options, or a numeric response, to reduce guessing.
3. **More concepts and families**, so a model can generalise across items.
4. **Difficulty parameters** for v2 items (expert ratings at minimum, later calibration).
5. **Grades 2–5 pre/support/transfer sequences** (none exist; see the earlier Grades 2–5 finding).
6. **Delayed or longitudinal transfer.** This needs gameplay events that carry `probeRole`, `itemFamilyId`,
   `conceptId`, support events with timing, and *measured* response time (no `0.0` default).
7. **A rule for excluding test and developer accounts** before any extract.
8. **Ethics, consent and approval** to use child records for model development, plus an anonymised extract
   procedure.

---

## 8. Leakage and validity assessment

| Risk | Status today | Control |
|---|---|---|
| Target in features (stored ELP-X, IMPSA, accuracy, `imlrSummary`) | **Present in stored records** | Recompute features from items before the transfer only; enforce an allowlist with tests (as in the NSCH pipeline). |
| Features recorded after the outcome (live profile, gameplay, session end) | Possible | Cut-off at the transfer item's first-response time; reject any field recorded later. |
| Same child in train and test | Not possible now (one baseline each) | Group by `learnerId`. |
| Siblings / household | Possible (one parent account, several children) | Group by `parentId` as well. |
| Repeated sequences in future gameplay | Will occur | Group splits; one sequence per child for evaluation, or mixed-effects modelling. |
| Test and developer accounts | Likely in early data | Documented exclusion before extraction. |
| Version drift (item bank, evidence rules, ELP-X) | Possible | Record and stratify by `onboardingItemBankVersion`, `evidenceRulesetVersion` and ELP-X version. |
| Construct contamination (perseveration, guessing) | **Present** (§6) | Fix the instrument before collecting training data. |
| Sensitive-attribute leakage (ADHD report, SNAP-IV) | Policy risk | Excluded by allowlist; checked by a test. |

---

## 9. Recommended training and evaluation strategy (once unblocked)

**Before any training**
1. **Fix the instrument.**
   - Counterbalance correct side and layout across support and transfer items.
   - Use ≥ 3 transfer items per family (randomised variants), with more than two options or numeric responses.
   - Add sequences for more concepts and for Grades 2–5.
   - Get expert review of the items.
2. **Write a pre-registration** covering:
   - the target definition (§4.1);
   - the population (support recipients);
   - the feature allowlist (§4.2);
   - the exclusions (§4.3);
   - the primary metric;
   - the minimum sample size.
3. **Sample size.** Use established criteria for clinical-style prediction models (e.g. Riley et al., 2020, *BMJ*
   368:m441) for the planned number of predictors and the observed outcome prevalence. With few events, limit the
   model to 2–4 predictors.

**Modelling**
- First: a transparent baseline that predicts the observed success rate for everyone, and a
  `support_max_level`-only logistic model.
- Candidate: penalised logistic regression on a small allowlist. Tree models only if the data allows.
- **Hierarchical / IRT option:** once there are several transfer items per child, model item difficulty and child
  ability jointly instead of a per-item classifier.

**Evaluation**
- Grouped splits by learner and parent; a temporal hold-out (later cohort as test), frozen before opening, as in the
  NSCH experiment.
- Nested cross-validation for small samples; no tuning on the hold-out.
- Metrics:
  - Brier score and log loss (primary, since the label is probabilistic and noisy);
  - ROC-AUC with bootstrap intervals;
  - calibration slope and intercept;
  - comparison with the success-rate and support-level baselines;
  - subgroup checks (age, input method, language) for accessibility fairness.
- Report it as a provisional readiness indicator, never a diagnosis, and never as a reason to lower ability
  estimates.

**Software scaffolding (optional, now).** The extraction, leakage guards and test harness could be built and
unit-tested with *clearly labelled synthetic fixtures*. Those fixtures would test code paths only; no metrics would
be reported from them. This can be done only with your approval.

---

## 10. Authorised aggregate count query (not executed)

To replace "unknown" in §1, an authorised administrator can run a **counts-only** aggregation on `assessments`. It
returns no records, IDs or answers, and should run against the local test copy where possible. The result should
report:

- total assessments by `assessmentProtocolVersion` and grade;
- v2 Grade 1 assessments that contain a `transfer` item;
- the number of those where the pre-probe was not independently correct (the IMLR population);
- within that population, transfer outcomes split into: explicitly unassisted and correct, unassisted and
  incorrect, and excluded (with reasons);
- the number of distinct `parentId`s (household groups);
- the number of records flagged as test accounts (needs an agreed definition).

Small cells should be suppressed (< 5), as on the Research & Model Analytics dashboard, which already shows
`imlrSummary.status` counts with suppression to authorised admins.

---

## 11. Exit criteria to reach READY_FOR_TRAINING

- [ ] Instrument revised (counterbalanced, ≥ 3 transfer items per family, ≥ 3 options, expert-reviewed); item bank version bumped.
- [ ] At least the Grade 1 sequence redesigned and deployed; Grades 2–5 sequences specified.
- [ ] Ethics, consent and approval, plus an anonymised extraction procedure, agreed.
- [ ] Exclusion rule for test and developer accounts agreed.
- [ ] Counts from §10 meet the pre-registered minimum sample size for the IMLR population.
- [ ] Feature extraction recomputes ELP-X from items before the transfer, with leakage tests passing.
- [ ] Grouped, time-ordered hold-out defined and frozen before modelling.
