# Expert-Informed Personalized Learning Support Ruleset (`personalization_rules_v0.1.md`)

**Component:** Learner Profile & Prediction Engine (SLIIT Final-Year Research Project J26-IT-321)  
**Status:** DRAFT Specification (v0.1) — For Research & Expert Review Only  
**Target Cohort:** Sri Lankan Children Aged 6–10 (Grades 1–5) with ADHD-Related Learning Support Needs  
**Scope:** Strictly Non-Diagnostic; Formative Educational Recommendations Only  

---

## Executive Summary & Non-Diagnostic Principles

This document specifies sixteen candidate rules across six functional categories (RS1–RS6) for the MathQuest recommendation engine. The engine interprets learner characteristics, mathematics assessment evidence, and interaction signals to recommend formative educational supports.

### Fundamental Scientific Boundaries
1. **No Automated Clinical Diagnosis**: The engine never assigns an ADHD diagnosis, nor does it infer clinical presentation from SNAP-IV scores or game telemetry.
2. **Personalization over Group Categorization**: Children with similar attention patterns require different educational scaffolding depending on language, motor coordination, and mathematical readiness.
3. **Parent Report $\neq$ Clinical Reference Label**: Parent-reported diagnostic history is unverified caregiver recall. Supervised ML research on ADHD presentation classification strictly requires documented clinical reference labels.
4. **Non-Equivalence in Longitudinal Tracking**: Longitudinal shifts in parent-reported questionnaire indicators reflect home behavioral observations; they must **never** be claimed as a clinical presentation shift or a MathQuest "cure".
5. **No Speculative Frustration Thresholds or Mandatory Breaks**: Rest breaks remain optional, context-sensitive, and child-guided. No arbitrary click-rate or idle-second thresholds are assumed without empirical validation.

---

## Category RS1: Learner Characteristic Interpretation

### Rule `MQ-RS1-01`: Child-Expressed Sensory Comfort Priority
- **Rule Name**: Child Sensory Agency Over Adult Default Configuration
- **Research Purpose**: Honor child agency and prevent sensory overload by prioritizing child-chosen auditory and visual preferences over adult defaults.
- **Required Inputs**: `source` (must be `"child"`), `soundMode` (`str`), `theme` (`str`), `avatarId` (`str`)
- **Optional Inputs**: `audioAssistance` (`str`, from parent), `visualAssistance` (`str`, from parent)
- **Trigger Condition**:
  ```python
  if childPreferences is not None and childPreferences.source == "child":
      if childPreferences.soundMode in ["quiet", "off"] and parentPreferences.audioAssistance == "read_everything":
          trigger_rule = True
  ```
- **Recommended Action**: Honor child sensory choice: mute ambient audio and background sound; convert automatic spoken prompts into optional "tap-to-hear" speech bubbles.
- **Parent/Teacher Explanation (EN)**: "Your child selected quiet sound mode. Spoken guidance is set to 'tap-to-hear' so audio plays only when clicked, supporting calm focus."
- **Parent/Teacher Explanation (SI)**: "දරුවා නිහඬ ශබ්ද මාදිලිය තෝරාගෙන ඇත. එමනිසා අවශ්‍ය විටෙක පමණක් ක්ලික් කර ශ්‍රව්‍ය උපදෙස් ලබා ගැනීමට සකසා ඇත."
- **Evidence Reference**: Boston Children's Hospital (Lee & Sinclair-McBride, n.d.), Skill 1 & 9 (PDF pp. 3–6, 38–40); NICE NG87 Section 1.4 (printed pp. 13–16 / PDF pp. 13–16).
- **Relationship to R1–R8**: Operationalizes Rule R8 (positive, observable learner agency).
- **Status**: Literature-informed proposal.
- **Missing-Data Behaviour**: If `childPreferences` is null, preserve parent-configured `audioAssistance`.
- **Conflict & Priority**: Priority 1 (Child Sensory Agency). Overrides adult defaults for auditory volume and themes.
- **Examples**:
  - *Positive*: Child chooses `soundMode: 'off'`, parent set `audioAssistance: 'read_everything'`. Engine activates tap-to-hear mode.
  - *Negative*: Child chooses `soundMode: 'gentle'`, parent set `audioAssistance: 'read_on_click'`. No conflict, rule does not override.
  - *Insufficient Evidence*: `childPreferences` not submitted; rule evaluates to neutral default.
- **Evaluation Feasibility**: Can be evaluated using existing Onboarding v2 schema (`ChildPreferenceChoices`).

---

### Rule `MQ-RS1-02`: High Inattention Screening Context Interpretation
- **Rule Name**: Contextual Accommodations for High Inattention Screening Indicators
- **Research Purpose**: Interpret high parent-reported inattention on SNAP-IV to recommend focus accommodations without assigning a clinical label.
- **Required Inputs**: `inattentionAverage` (`float`, 0.00–3.00), `totalScore` (`int`)
- **Optional Inputs**: `diagnosisStatus` (`AdhdDiagnosisStatus`), `reportedPresentation` (`AdhdReportedPresentation`)
- **Trigger Condition**:
  ```python
  if snapIvSummary is not None:
      if snapIvSummary.inattentionAverage >= 1.78:
          trigger_rule = True
  ```
- **Recommended Action**: Recommend `TASK_CHUNKING` (breaking quests into single-step goals) and high-contrast visual uncluttering; attach non-diagnostic disclaimer.
- **Parent/Teacher Explanation (EN)**: "Home observation indicates frequent attentional fatigue during sustained tasks. We recommend concise, single-step mathematics milestones with visual checklists."
- **Parent/Teacher Explanation (SI)**: "දෙමාපිය ඇගයීමට අනුව දරුවා දිගු වේලාවක් අවධානය රඳවා ගැනීමට වෙහෙසෙන බව පෙනේ. එබැවින් කෙටි පියවර සහ පැහැදිලි දෘශ්‍ය සලකුණු සහිත අභ්‍යාස නිර්දේශ කෙරේ."
- **Evidence Reference**: AAP 2019 Guideline KAS 2 & 5b (printed pp. 5–7, 11–12 / PDF pp. 5–7, 11–12); NICE NG87 Section 1.3 & 1.5 (printed pp. 12–13, 17–22 / PDF pp. 12–13, 17–22).
- **Relationship to R1–R8**: Aligns with Rule R8 (actionable educational pattern, not clinical deficit).
- **Status**: Literature-informed proposal; specific cutoff (1.78) **requires expert review** for Sri Lankan cohorts.
- **Missing-Data Behaviour**: If SNAP-IV is skipped (optional step), suppress rule; never penalize learner.
- **Conflict & Priority**: Priority 4 (Task Structure).
- **Examples**:
  - *Positive*: `inattentionAverage: 2.22`. Engine triggers `TASK_CHUNKING` and visual uncluttering recommendation.
  - *Negative*: `inattentionAverage: 0.67`. Rule does not trigger.
  - *Insufficient Evidence*: SNAP-IV step not completed; rule outputs `INSUFFICIENT_EVIDENCE`.
- **Evaluation Feasibility**: Evaluated with existing `SnapIvScoreSummary`.

---

### Rule `MQ-RS1-03`: Home Learning Environment & Co-Play Accommodation
- **Rule Name**: Collaborative Learning & Reassurance Alignment
- **Research Purpose**: Adapt scaffolding based on physical home learning environment and parental co-play comfort.
- **Required Inputs**: `learningEnvironment` (`str`), `parentInvolvement` (`str`), `challengingTaskSupport` (`str`)
- **Optional Inputs**: `peerCollaboration` (`str`)
- **Trigger Condition**:
  ```python
  if socialContext is not None:
      if socialContext.learningEnvironment == "shared_living_space" or socialContext.parentInvolvement == "guided_together":
          trigger_rule = True
  ```
- **Recommended Action**: Recommend `COLLABORATIVE_LEARNING` (co-play quest modes with turn-taking) and parent-guided encouragement prompts.
- **Parent/Teacher Explanation (EN)**: "Your home study space is shared and interactive. We suggest joint math discovery activities designed for collaborative parent-child exploration."
- **Parent/Teacher Explanation (SI)**: "පවුලේ සාමාජිකයන් සමඟ එක්ව ඉගෙනීමට දරුවා කැමති බව පෙනේ. දෙමාපියන්ට දරුවා සමඟ එක්ව විසඳිය හැකි සහයෝගී ක්‍රීඩා නිර්දේශ කෙරේ."
- **Evidence Reference**: Boston Children's Hospital (Lee & Sinclair-McBride, n.d.), Skill 1 & 2 (PDF pp. 3–10).
- **Relationship to R1–R8**: Aligns with Rule R8.
- **Status**: Supervisor-accepted concept.
- **Missing-Data Behaviour**: If `socialContext` is missing, defaults to independent self-paced activities.
- **Conflict & Priority**: Priority 4 (Social/Environmental Context).
- **Examples**:
  - *Positive*: `parentInvolvement: 'guided_together'`. Engine recommends co-play mode.
  - *Negative*: `parentInvolvement: 'child_independent'`. Rule does not trigger co-play.
  - *Insufficient Evidence*: Social context step omitted; neutral defaults applied.
- **Evaluation Feasibility**: Evaluated with existing `SocialContextRequest`.

---

## Category RS2: Personalized Support Recommendations

### Rule `MQ-RS2-01`: Concrete Manipulative Scaffolding for Emerging Concepts
- **Rule Name**: Concrete-Representational-Abstract (CRA) Visual Scaffolding
- **Research Purpose**: Provide virtual concrete objects (counters, fruit blocks) before symbolic equations when a mathematical concept is in the emerging stage.
- **Required Inputs**: `skillId` (`str`), `provisionalSkillLevel` (`str`), `distinctQuestionsAssessed` (`int`)
- **Optional Inputs**: `representationType` (`RepresentationType`), `visualAssistance` (`str`)
- **Trigger Condition**:
  ```python
  if distinctQuestionsAssessed >= 3 and provisionalSkillLevel == "EMERGING":
      trigger_rule = True
  ```
- **Recommended Action**: Recommend `CRA_SCAFFOLDING`: lock abstract symbolic equations; present interactive virtual manipulatives and 2D pictorial counters with tactile placement.
- **Parent/Teacher Explanation (EN)**: "The learner is developing foundational understanding. We recommend using virtual counters and pictorial models before practicing abstract numbers."
- **Parent/Teacher Explanation (SI)**: "මූලික සංකල්ප වර්ධනය වෙමින් පවතී. වියුක්ත සමීකරණ වලට පෙර, ගණන් කළ හැකි දෘශ්‍ය රූප ආධාරයෙන් පුහුණු වීම නිර්දේශ කෙරේ."
- **Evidence Reference**: IES WWC 2021 Practice Guide, Recommendation 3 (printed pp. 21–28 / PDF pp. 28–35; supported by 28 studies); Boston Children's Hospital Skill 6 (PDF pp. 26–30).
- **Relationship to R1–R8**: Directly operationalizes Rule R2 (suggest worked example or smaller step rather than repeating same item; supervisor accepted).
- **Status**: Supervisor-accepted concept; specific item progression counts require expert review.
- **Missing-Data Behaviour**: If `distinctQuestionsAssessed < 3`, suppress proficiency-based scaffolding and trigger `ASSESSMENT_EXPANSION`.
- **Conflict & Priority**: Priority 3 (Foundational Scaffolding). Overrides extension challenges.
- **Examples**:
  - *Positive*: `skillId: 'addition'`, `distinctQuestionsAssessed: 4`, `provisionalSkillLevel: 'EMERGING'`. Recommends `CRA_SCAFFOLDING`.
  - *Negative*: `skillId: 'addition'`, `provisionalSkillLevel: 'PROFICIENT'`. Rule does not trigger.
  - *Insufficient Evidence*: `distinctQuestionsAssessed: 1`. Suppressed; outputs `INSUFFICIENT_EVIDENCE`.
- **Evaluation Feasibility**: Evaluated with existing `elpxProfile` and `EvaluatedQuestionItem`.

---

### Rule `MQ-RS2-02`: Micro-Task Step Deconstruction for Multi-Step Tasks
- **Rule Name**: Working Memory Offloading via Step-by-Step Task Chunking
- **Research Purpose**: Prevent working memory overload in multi-step problems (e.g., two-digit addition with regrouping, two-step word problems) by presenting single-action micro-steps.
- **Required Inputs**: `grade` (`int`), `operation` (`str`), `aggregate_hints_used` (`int`), `aggregate_attempts` (`int`)
- **Optional Inputs**: `activityPace` (`str`), `inattentionAverage` (`float`)
- **Trigger Condition**:
  ```python
  if (aggregate_hints_used >= 2 or activityPace == "calm_step_by_step") and task_step_count > 1:
      trigger_rule = True
  ```
- **Recommended Action**: Recommend `TASK_CHUNKING`: present each arithmetic operation as an isolated micro-step with intermediate confirmation before revealing the next step.
- **Parent/Teacher Explanation (EN)**: "Frequent hint requests indicate high working memory load. Dividing multi-step problems into clear mini-steps reduces frustration."
- **Parent/Teacher Explanation (SI)**: "කාර්යයන් පියවර කිහිපයකින් සමන්විත වන විට දරුවාට වෙහෙස විය හැක. එබැවින් ගැටළුව කුඩා පියවර වලට වෙන් කර පෙන්වීම වඩාත් පහසු වේ."
- **Evidence Reference**: Boston Children's Hospital (Lee & Sinclair-McBride, n.d.), Skill 6 "How to Get Things Done - Mini-tasks" (PDF pp. 26–30); NICE NG87 Terms 'Environmental Modifications' (printed pp. 38–39 / PDF pp. 38–39).
- **Relationship to R1–R8**: Supports Rule R2 (smaller steps on struggle; accepted) and Rule R8.
- **Status**: Literature-informed proposal.
- **Missing-Data Behaviour**: If hint telemetry is missing, defaults to standard curriculum step presentation.
- **Conflict & Priority**: Priority 4 (Task Structure & Pacing).
- **Examples**:
  - *Positive*: Child needed 3 hints across multi-step quest; `TASK_CHUNKING` activated.
  - *Negative*: Child solves multi-step quest on first attempt without hints. Rule does not trigger.
  - *Insufficient Evidence*: Single item attempted; rule does not trigger.
- **Evaluation Feasibility**: Evaluated with existing `MathAssessmentSubmissionRequest` telemetry.

---

### Rule `MQ-RS2-03`: Optional Context-Sensitive Rest Pause
- **Rule Name**: Optional Cognitive Fatigue Relief Pause
- **Research Purpose**: Offer an optional, non-punitive brief stretch or break when prolonged effort or difficulty indicates fatigue, without forcing interruptions.
- **Required Inputs**: `sessionDurationMinutes` (`float`), `challengingTaskSupport` (`str`)
- **Optional Inputs**: `preSessionCheckInState` (`Dict[str, str]`, proposed)
- **Trigger Condition**:
  ```python
  if (sessionDurationMinutes >= 15.0 and challengingTaskSupport == "take_a_break") or (preSessionCheckInState.get("fatigue") == "tired"):
      trigger_rule = True
  ```
- **Recommended Action**: Recommend `OPTIONAL_REST_BREAK`: display an unobtrusive, gentle "Take a quick stretch" button or avatar break prompt. **Must remain voluntary and dismissible.**
- **Parent/Teacher Explanation (EN)**: "After 15 minutes of sustained math play, an optional short stretch break is made available. Breaks remain child-guided so they do not interrupt deep focus."
- **Parent/Teacher Explanation (SI)**: "මිනිත්තු 15ක අඛණ්ඩ ගණිත අභ්‍යාස වලින් පසු, අවශ්‍ය නම් කෙටි විවේකයක් ගැනීමට දරුවාට අවස්ථාව ලබා දේ."
- **Evidence Reference**: Boston Children's Hospital (Lee & Sinclair-McBride, n.d.), Skill 2 & 8 (PDF pp. 8, 34); NICE NG87 'Environmental Modifications' (printed pp. 38–39 / PDF pp. 38–39).
- **Relationship to R1–R8**: Refines Rule R6 (Revision required; ensures break is optional and non-intrusive without arbitrary telemetry thresholds).
- **Status**: Supervisor-revision-pending (revised to be voluntary and individualized).
- **Missing-Data Behaviour**: If session duration is unknown, break prompt is only accessible manually via on-screen icon.
- **Conflict & Priority**: Priority 4 (Pacing). Never interrupts an active, unsubmitted calculation.
- **Examples**:
  - *Positive*: Child has played for 18 minutes; parent indicated `take_a_break`. Gentle break button glows softly on screen.
  - *Negative*: Child has played for 5 minutes. Rule does not trigger.
  - *Insufficient Evidence*: Session time untracked; rule remains dormant.
- **Evaluation Feasibility**: Evaluated with `sessionStartedAt` and `sessionEndedAt` in `MathAssessmentSubmissionRequest`.

---

### Rule `MQ-RS2-04`: Concept Introduction with Accessible Small Numbers
- **Rule Name**: Accessible Number Magnitude During Conceptual Introduction
- **Research Purpose**: Restrict arithmetic operands to single-digit or familiar quantities when introducing new mathematical procedures to minimize calculation burden.
- **Required Inputs**: `conceptIntroduction` — an explicit, provenance-backed record (source `assessment` item-bank probe role or `system` curriculum sequence, with an instrument and a stated basis) that the concept's stage is `introduction`
- **Optional Inputs**: `provisionalSkillLevel` from ELP-X (`str`), `conceptId` (`str`)
- **Trigger Condition** (revised in MQ-REC v0.1):
  ```python
  # A missing or INSUFFICIENT_EVIDENCE ELP-X estimate means the learner's knowledge is UNKNOWN.
  # It is never, on its own, evidence that the concept is being introduced.
  if conceptIntroduction is not None and concept.stage == "introduction" \
          and elpxLevel in (None, "INSUFFICIENT_EVIDENCE"):
      trigger_rule = True
  ```
- **Recommended Action**: Recommend `ACCESSIBLE_NUMBERS`: use small, familiar numbers while the concept is being introduced. **No grade-specific number limits are applied**; the earlier draft bounds ($n \le 10$ for Grades 1–2, $n \le 20$ for Grades 3–5) were withdrawn because they lack reviewed justification.
- **Parent/Teacher Explanation (EN)**: "When introducing this new math concept, small, friendly numbers are used so your child can master the mathematical idea before tackling larger calculations."
- **Parent/Teacher Explanation (SI)**: "නව ගණිත සංකල්පයක් හඳුන්වා දීමේදී සරල සංඛ්‍යා භාවිත කෙරේ. එමගින් ගණනය කිරීමේ බරකින් තොරව සංකල්පය තේරුම් ගැනීමට හැකි වේ."
- **Evidence Reference**: IES WWC 2021 Practice Guide, Recommendation 1, Step 2 (printed p. 6 / PDF p. 13; supported by 43 studies).
- **Relationship to R1–R8**: Aligns with Rule R2 (smaller steps on struggle; accepted).
- **Status**: Literature-informed proposal (strong WWC evidence base). **Input-gated**: no MathQuest source currently produces explicit concept-introduction records, so the rule is inactive in practice until one does.
- **Missing-Data Behaviour**: If no explicit concept-introduction evidence is provided, the rule is not applied and reports `CONCEPT_INTRODUCTION_EVIDENCE_MISSING`. If a concept is marked as introduced but ELP-X already holds an established estimate for it, no recommendation is made and `CONCEPT_ALREADY_ESTIMATED` is reported.
- **Conflict & Priority**: Priority 3 (Scaffolding).
- **Examples**:
  - *Positive*: Curriculum sequence records "Equal Groups" multiplication as being introduced and ELP-X has no estimate for it; `ACCESSIBLE_NUMBERS` recommended (no numeric bound imposed).
  - *Negative*: Concept stage is `practice`/`review`, or ELP-X already reports DEVELOPING/PROFICIENT; rule does not trigger.
  - *Insufficient Evidence*: ELP-X estimate missing but no introduction record; learner knowledge is unknown, rule not applied (missing-evidence notice).
- **Evaluation Feasibility**: Requires a concept-introduction record (planned input; see `rule_input_mapping.md`). `probeRole` and `conceptId` from the Onboarding v2 schema could supply it in future, but are not yet mapped.

---

## Category RS3: IMPSA-Related Educational Evidence

### Rule `MQ-RS3-01`: Isolation of Unassisted Bernoulli First-Attempts
- **Rule Name**: Unassisted Mathematical Independence Isolation
- **Research Purpose**: Strictly isolate first responses completed without prior assistance, preventing hint-assisted answers from inflating independent problem-solving estimates.
- **Required Inputs**: `isFirstResponseCorrect` (`bool`), `supportBeforeFirstResponse` (`bool`), `distinctQuestionsAssessed` (`int`)
- **Optional Inputs**: `hintsUsed` (`int`)
- **Trigger Condition**:
  ```python
  eligible_items = [
      item for item in evaluated_items 
      if item.supportBeforeFirstResponse is False
  ]
  if len(eligible_items) >= 3:
      trigger_rule = True
  ```
- **Recommended Action**: Formulate provisional IMPSA strictly from `eligible_items`. Calculate posterior Beta-Binomial proficiency ($\alpha = 1 + c, \beta = 1 + n - c$) with 95% Credible Interval and uncertainty note.
- **Parent/Teacher Explanation (EN)**: "This indicator reflects tasks your child solved completely independently, without opening hints or worked examples. Assisted successes are analyzed separately."
- **Parent/Teacher Explanation (SI)**: "මෙම ඇගයීම දරුවා කිසිදු උපකාරයකින් තොරව තනිව විසඳූ ගැටළු මත පමණක් පදනම් වේ. උපකාර සහිතව විසඳූ ගැටළු වෙනම සලකා බලයි."
- **Evidence Reference**: MathQuest Expert Review Pack (2026), Rule R3 (printed p. 1 / PDF p. 1); Sivalingam Consultation (Rule R3 accepted); AAP 2019 Guideline (printed p. 6 / PDF p. 6).
- **Relationship to R1–R8**: Directly operationalizes Rule R3 (*Record supported success separately from independent success*; accepted by external supervisor).
- **Status**: Supervisor-accepted concept. Scoring formula remains a provisional research proposal.
- **Missing-Data Behaviour**: If `len(eligible_items) < 3`, output `ImpsaSummary.status = 'INSUFFICIENT_EVIDENCE'`.
- **Conflict & Priority**: Priority 2 (Measurement Integrity). Assisted successes can never be reclassified as unassisted.
- **Examples**:
  - *Positive*: Child attempts 5 questions; opens hints on 2; solves remaining 3 with 2 correct first attempts. IMPSA computed on $n=3, c=2$.
  - *Negative*: Child attempts 5 questions; opens hints before answering all 5. Eligible unassisted items = 0; IMPSA returns `INSUFFICIENT_EVIDENCE`.
  - *Insufficient Evidence*: 2 unassisted questions attempted; returns `INSUFFICIENT_EVIDENCE`.
- **Evaluation Feasibility**: Evaluated with existing `EvaluatedQuestionItem.supportBeforeFirstResponse` in `ImpsaSummary`.

---

### Rule `MQ-RS3-02`: Non-Penalizing Latency Safeguard
- **Rule Name**: Response Time Decoupling from Mathematical Ability
- **Research Purpose**: Prevent response latencies (deliberation time, motor pauses, language processing) from penalizing IMPSA accuracy estimates.
- **Required Inputs**: `responseLatencySeconds` (`float`), `isFirstResponseCorrect` (`bool`)
- **Optional Inputs**: `missedDropCount` (`int`), `inputMethod` (`InputMethod`)
- **Trigger Condition**:
  ```python
  if responseLatencySeconds > 45.0 and isFirstResponseCorrect is True:
      trigger_rule = True
  ```
- **Recommended Action**: Maintain full accuracy credit for the correct response. Log deliberation time as an interaction pacing metric (`PacingObservation`), never as an inattention or skill penalty.
- **Parent/Teacher Explanation (EN)**: "Your child took extra time to solve this task thoughtfully and found the correct answer. In MathQuest, taking time to think is fully respected and never penalized."
- **Parent/Teacher Explanation (SI)**: "දරුවා වැඩි වේලාවක් සිතා බලා නිවැරදි පිළිතුර සොයාගෙන ඇත. ගැඹුරින් සිතා බැලීමට කාලය ගැනීම ගණිතයේදී ඉතා අගය කෙරේ."
- **Evidence Reference**: AAP 2019 Guideline KAS 2 (ruling out motor, processing speed, and language factors; printed pp. 5–7 / PDF pp. 5–7); Sivalingam Consultation (Rule R5 accepted with clarification).
- **Relationship to R1–R8**: Directly operationalizes Rule R5 (*Do NOT infer inattention or ADHD from slow responses*; accepted with clarification).
- **Status**: Supervisor-accepted concept (with clinical clarification on confounding factors).
- **Missing-Data Behaviour**: If latency is missing, evaluate accuracy normally.
- **Conflict & Priority**: Priority 2 (Ethical Non-Penalization).
- **Examples**:
  - *Positive*: Response latency = 72s; answer is correct. 100% accuracy recorded; zero point deductions.
  - *Negative*: Response latency = 12s; answer correct. Normal evaluation.
  - *Insufficient Evidence*: Latency unavailable; evaluation proceeds on accuracy alone.
- **Evaluation Feasibility**: Evaluated with existing `responseLatencySeconds` field.

---

### Rule `MQ-RS3-03`: Sparse Assessment Evidence Suppression
- **Rule Name**: Uncertainty Reporting for Sparse Observations
- **Research Purpose**: Suppress categorical proficiency classifications when sample size is below evidence sufficiency threshold, preventing premature labeling.
- **Required Inputs**: `distinctQuestionsAssessed` (`int`)
- **Optional Inputs**: `credibleIntervalWidth` (`float`)
- **Trigger Condition**:
  ```python
  if distinctQuestionsAssessed < 3:
      trigger_rule = True
  ```
- **Recommended Action**: Set `provisionalSkillLevel = "INSUFFICIENT_EVIDENCE"`. Suppress skill ratings and trigger `ASSESSMENT_EXPANSION` recommendation.
- **Parent/Teacher Explanation (EN)**: "Fewer than 3 questions have been completed for this topic. More practice is needed before a reliable learning profile can be shown."
- **Parent/Teacher Explanation (SI)**: "මෙම මාතෘකාව යටතේ තවමත් සම්පූර්ණ කර ඇත්තේ ප්‍රශ්න 3කට අඩුවෙනි. විශ්වාසදායක පැතිකඩක් පෙන්වීමට පෙර තවත් කෙටි අභ්‍යාස කිහිපයක් අවශ්‍ය වේ."
- **Evidence Reference**: MathQuest Expert Review Pack (2026), Rule R7 (printed p. 2 / PDF p. 2); Sivalingam Consultation (Rule R7 accepted in principle).
- **Relationship to R1–R8**: Directly operationalizes Rule R7 (*Report 'insufficient evidence' rather than a fixed learner category*; accepted by external supervisor).
- **Status**: Supervisor-accepted concept in principle. The specific threshold ($n < 3$) is an **ELP-X engineering heuristic** requiring expert calibration.
- **Missing-Data Behaviour**: $n=0$ returns explicit missing-data notice.
- **Conflict & Priority**: Priority 2 (Uncertainty Safeguard). Overrides all categorical proficiency classifications.
- **Examples**:
  - *Positive*: Child answered 2 questions correctly (100% raw accuracy). Proficiency classification suppressed; returns `INSUFFICIENT_EVIDENCE`.
  - *Negative*: Child answered 4 questions (3 correct, 1 incorrect). $n \ge 3$; provisional skill level evaluated.
  - *Insufficient Evidence*: Zero questions answered; returns `INSUFFICIENT_EVIDENCE`.
- **Evaluation Feasibility**: Fully implemented in ELP-X engine (`elpx_engine.py:144–154`).

---

## Category RS4: IMLR-Related Educational Evidence

### Rule `MQ-RS4-01`: Dynamic Assessment Scaffolding Separation
- **Rule Name**: Dynamic Scaffolding & Unassisted Transfer Separation
- **Research Purpose**: Separate assisted performance from unassisted transfer, ensuring assisted responses are documented as learning support rather than independent competence.
- **Required Inputs**: `probeRole` (`ProbeRole`), `supportDelivered` (`List[str]`), `isFirstResponseCorrect` (`bool`)
- **Optional Inputs**: `supportEvents` (`List[SupportEvent]`)
- **Trigger Condition**:
  ```python
  if probeRole == ProbeRole.SUPPORT and len(supportDelivered) > 0:
      trigger_rule = True
  ```
- **Recommended Action**: Record item outcome as `SUPPORTED_SUCCESS` or `SUPPORTED_STRUGGLE`. Queue an unassisted transfer item (`probeRole = ProbeRole.TRANSFER`) for subsequent administration.
- **Parent/Teacher Explanation (EN)**: "Your child successfully completed this task with step-by-step guidance. A comparable unassisted task will be provided later to observe independent learning."
- **Parent/Teacher Explanation (SI)**: "දරුවා මඟපෙන්වීම් සහිතව මෙම ගැටළුව සාර්ථකව විසඳන ලදී. දරුවාට එය තනිව විසඳිය හැකිදැයි බැලීමට පසුව සමාන අභ්‍යාසයක් ලබා දෙනු ඇත."
- **Evidence Reference**: IES WWC 2021 Practice Guide, Recommendation 1 (printed pp. 5–7 / PDF pp. 12–14); Review Pack Rule R3 & R4 (printed p. 1 / PDF p. 1); Sivalingam Consultation (Rules R3/R4).
- **Relationship to R1–R8**: Operationalizes Rules R3 and R4.
- **Status**: Supervisor-accepted concept (scaffolding separation accepted; reassessment requires flexible timing).
- **Missing-Data Behaviour**: If `probeRole` is unspecified, defaults to standard non-dynamic assessment.
- **Conflict & Priority**: Priority 3 (Dynamic Assessment Integrity).
- **Examples**:
  - *Positive*: Child fails pre-probe; receives Level 2 visual scaffold; answers correctly. Logged as `SUPPORTED_SUCCESS`. Transfer probe queued.
  - *Negative*: Child answers pre-probe correctly without support. Logged as unassisted success; transfer probe not needed.
  - *Insufficient Evidence*: Probe role missing; evaluated under standard protocol.
- **Evaluation Feasibility**: Evaluated with Onboarding v2 schema (`ProbeRole`, `supportDelivered`).

---

### Rule `MQ-RS4-02`: Flexible Reassessment Probe Scheduling
- **Rule Name**: Flexible Transfer Interval Scheduling
- **Research Purpose**: Avoid rigid immediate retesting following assisted success, allowing flexible transfer probing after an interleaved activity or in a subsequent session.
- **Required Inputs**: `probeRole` (`ProbeRole`), `conceptId` (`str`), `sessionSequence` (`int`)
- **Optional Inputs**: `activityPace` (`str`)
- **Trigger Condition**:
  ```python
  if priorItem.probeRole == ProbeRole.SUPPORT and priorItem.isCorrect is True:
      # Schedule transfer probe flexibly after at least 1 interleaved task or next session
      transfer_delay_tasks = 1 if activityPace == "calm_step_by_step" else 2
      schedule_transfer_probe(conceptId, delay=transfer_delay_tasks)
  ```
- **Recommended Action**: Schedule the unassisted transfer probe (`ProbeRole.TRANSFER`) after 1–2 interleaved tasks of a different topic or in the next session, preventing immediate short-term mimicry.
- **Parent/Teacher Explanation (EN)**: "Following guided practice, an unassisted check-in is scheduled flexibly after other activities to verify durable understanding without creating test anxiety."
- **Parent/Teacher Explanation (SI)**: "මඟපෙන්වීම් වලින් පසු, දරුවාට පීඩනයක් නොවන පරිදි වෙනත් ක්‍රියාකාරකමකට පසුව එම සංකල්පය තනිව විසඳීමට අවස්ථාව ලබා දේ."
- **Evidence Reference**: Ms. Pathmasri Sivalingam Verbal Consultation Feedback (Rule R4: *Reassessment timing must be flexible rather than fixed*); IES 2021 Rec 1 (printed p. 5 / PDF p. 12).
- **Relationship to R1–R8**: Directly operationalizes Rule R4 (Revision required: flexible timing requested).
- **Status**: Supervisor-revision-pending. Scheduling window **requires expert review**.
- **Missing-Data Behaviour**: If session sequence is unavailable, schedules transfer probe at the start of the next session.
- **Conflict & Priority**: Priority 4 (Assessment Scheduling).
- **Examples**:
  - *Positive*: Guided addition completed; game presents a visual shape challenge before presenting the unassisted addition transfer item.
  - *Negative*: Immediate identical retest attempted. Blocked by rule.
  - *Insufficient Evidence*: Transfer probe not reached; status remains `PROVISIONAL`.
- **Evaluation Feasibility**: Implemented in Onboarding v2 item bank sequencing.

---

### Rule `MQ-RS4-03`: Qualitative Learning Readiness Categorization
- **Rule Name**: Categorical Learning Readiness Status Formulation
- **Research Purpose**: Express IMLR as descriptive qualitative categories rather than a spurious pseudo-precise mathematical score.
- **Required Inputs**: `preProbeCorrect` (`Optional[bool]`), `supportDelivered` (`List[str]`), `unassistedTransferCorrect` (`Optional[bool]`)
- **Optional Inputs**: `conceptId` (`str`)
- **Trigger Condition**:
  ```python
  if preProbeCorrect is False and len(supportDelivered) > 0:
      if unassistedTransferCorrect is True:
          imlr_status = "TRANSFER_OBSERVED"
      elif unassistedTransferCorrect is False:
          imlr_status = "TRANSFER_NOT_YET_OBSERVED"
      else:
          imlr_status = "INSUFFICIENT_EVIDENCE"
  elif preProbeCorrect is True:
      imlr_status = "ALREADY_DEMONSTRATED"
  ```
- **Recommended Action**: Output qualitative status in `ImlrSummary.status` with explicit uncertainty note stating that dynamic intake observations do not certify long-term retention.
- **Parent/Teacher Explanation (EN)**: "Your child showed readiness to learn: after a guided visual explanation, they successfully solved a new transfer problem independently."
- **Parent/Teacher Explanation (SI)**: "ඉගෙනුම් සූදානම නිරීක්ෂණය විය: කෙටි මඟපෙන්වීමකින් පසු දරුවා නව ගැටළුවක් තනිව විසඳීමට සමත් විය."
- **Evidence Reference**: MathQuest Onboarding Activity Design (2026), Section 8; IES WWC 2021 Practice Guide (printed pp. 5–7 / PDF pp. 12–14).
- **Relationship to R1–R8**: Aligns with Rule R4 and R8.
- **Status**: Literature-informed proposal; status categories require expert review.
- **Missing-Data Behaviour**: If transfer probe was not administered or skipped, output `INSUFFICIENT_EVIDENCE`.
- **Conflict & Priority**: Priority 3 (Qualitative Reporting).
- **Examples**:
  - *Positive*: Pre-probe incorrect; hint delivered; transfer probe correct. Status: `TRANSFER_OBSERVED`.
  - *Negative*: Pre-probe incorrect; hint delivered; transfer probe incorrect. Status: `TRANSFER_NOT_YET_OBSERVED`.
  - *Insufficient Evidence*: Pre-probe incorrect; child exited session before transfer probe. Status: `INSUFFICIENT_EVIDENCE`.
- **Evaluation Feasibility**: Fully modeled in existing `ImlrSummary` schema.

---

## Category RS5: Longitudinal Support Review

### Rule `MQ-RS5-01`: Multi-Session Mathematical Evidence Consolidation
- **Rule Name**: Multi-Session Cumulative Skill Evidence Ingestion
- **Research Purpose**: Incrementally update Beta-Binomial mathematical skill estimates across multiple gameplay days, preventing single-session fatigue from distorting long-term profiles.
- **Required Inputs**: `historicalSessions` (`List[Dict]`), `currentSessionEvaluatedItems` (`List[Dict]`), `skillId` (`str`)
- **Optional Inputs**: `daysBetweenSessions` (`int`)
- **Trigger Condition**:
  ```python
  total_historical_items = sum(s.get("distinctQuestions", 0) for s in historicalSessions)
  if total_historical_items >= 3 and len(historicalSessions) >= 2:
      trigger_rule = True
  ```
- **Recommended Action**: Combine independent Bernoulli trials across days: $n_{\text{cum}} = \sum n_i, c_{\text{cum}} = \sum c_i$. Recalculate posterior mean and shrink credible interval width.
- **Parent/Teacher Explanation (EN)**: "This skill profile summarizes performance across multiple practice sessions over time, providing a balanced picture of your child's progress."
- **Parent/Teacher Explanation (SI)**: "මෙම කුසලතා පැතිකඩ දින කිහිපයක ක්‍රියාකාරකම් සාරාංශ කර සකස් කර ඇති බැවින්, දරුවාගේ සැබෑ ප්‍රගතිය මනාව පිළිබිඹු කරයි."
- **Evidence Reference**: IES WWC 2021 Practice Guide, Recommendation 1 (Systematic progress monitoring across sessions; printed p. 5 / PDF p. 12; supported by 43 studies).
- **Relationship to R1–R8**: Aligns with Rule R1 (mastery requires performance across multiple opportunities; rejected as rigid hurdle, accepted as cumulative evidence accumulation).
- **Status**: Literature-informed proposal (standard Bayesian updating protocol).
- **Missing-Data Behaviour**: If historical sessions are empty, evaluate current session independently with appropriate wide credible interval.
- **Conflict & Priority**: Priority 3 (Longitudinal Consolidation).
- **Examples**:
  - *Positive*: Day 1 ($n=3, c=1$), Day 2 ($n=3, c=3$). Cumulative $n=6, c=4, p=0.625$. Credible interval narrows from $[0.15, 0.75]$ to $[0.32, 0.85]$.
  - *Negative*: Single session only ($n=3$); historical updating dormant.
  - *Insufficient Evidence*: Total cumulative items $< 3$; status remains `INSUFFICIENT_EVIDENCE`.
- **Evaluation Feasibility**: Uses `GameplayActivityEvidence` and `LearnerHistoryRecord`.

---

### Rule `MQ-RS5-02`: Periodic Questionnaire-Indicator Monitoring
- **Rule Name**: Longitudinal Questionnaire Tracking & Non-Equivalence Safeguard
- **Research Purpose**: Track parent-reported SNAP-IV inattention and hyperactivity indicators across 4–6 month intervals, strictly prohibiting claims of clinical presentation cure.
- **Required Inputs**: `priorSnapIvDate` (`datetime`), `currentSnapIvDate` (`datetime`), `inattentionAverage` (`float`), `hyperactivityAverage` (`float`)
- **Optional Inputs**: `diagnosisStatus` (`AdhdDiagnosisStatus`)
- **Trigger Condition**:
  ```python
  months_elapsed = (currentSnapIvDate - priorSnapIvDate).days / 30.4
  if months_elapsed >= 4.0:
      trigger_rule = True
  ```
- **Recommended Action**: Plot longitudinal indicator trendline on parent dashboard. Attach mandatory disclaimer: *"Indicator changes reflect parental home observations under learning support; they do NOT denote a clinical presentation shift or cure."*
- **Parent/Teacher Explanation (EN)**: "Periodic review shows a decrease in reported home inattention indicators over the past 4 months. Note: This indicates improved task comfort, not a clinical cure."
- **Parent/Teacher Explanation (SI)**: "පසුගිය මාස 4 තුළ දෙමාපිය ඇගයීම් දර්ශකවල ධනාත්මක වෙනසක් පෙනේ. මෙය දරුවාගේ ඉගෙනුම් පහසුව වැඩිවීමක් මිස වෛද්‍යමය සුවවීමක් නොවේ."
- **Evidence Reference**: AAP 2019 Guideline KAS 4 & 6 (Chronic care monitoring schedules; printed pp. 9–10, 16–17 / PDF pp. 9–10, 16–17); NICE NG87 Section 1.8 (printed pp. 32–35 / PDF pp. 32–35).
- **Relationship to R1–R8**: Operationalizes Rule R8 and clinical non-diagnostic safeguards.
- **Status**: Supervisor-accepted concept. Repeat interval (4–6 months) **requires expert review**.
- **Missing-Data Behaviour**: If repeat questionnaire was submitted $< 3$ months prior, flag potential reporting habituation.
- **Conflict & Priority**: Priority 2 (Scientific Integrity Safeguard).
- **Examples**:
  - *Positive*: Questionnaire repeated at 5 months; inattention average decreased from 2.1 to 1.6. Trendline displayed with disclaimer.
  - *Negative*: Questionnaire re-administered at 2 weeks. Suppressed to prevent test-retest habituation.
  - *Insufficient Evidence*: Only one questionnaire completed; trendline unavailable.
- **Evaluation Feasibility**: Uses `SnapIvSubmissionRequest` with historical timestamp logging.

---

## Category RS6: Safety, Uncertainty and Explainability

### Rule `MQ-RS6-01`: Non-Diagnostic Clinical Separation Guardrail
- **Rule Name**: Absolute Prohibition of In-Game Clinical Diagnosis
- **Research Purpose**: Ensure MathQuest never classifies, labels, or infers an ADHD clinical presentation from gameplay, questionnaires, or telemetry.
- **Required Inputs**: `allEngineOutputs` (`Dict[str, Any]`)
- **Optional Inputs**: None
- **Trigger Condition**:
  ```python
  clinical_forbidden_terms = [
      "diagnosed with adhd", "adhd confirmed", "clinical presentation changed",
      "deficit disorder cured", "neuropsychological deficiency confirmed"
  ]
  if any(term in str(allEngineOutputs).lower() for term in clinical_forbidden_terms):
      raise SecurityException("Clinical diagnosis generation is strictly forbidden.")
  ```
- **Recommended Action**: Sanitize all output text. Strip clinical diagnostic language; enforce formative pedagogical phrasing (e.g., "Learner benefited from visual counters").
- **Parent/Teacher Explanation (EN)**: "All MathQuest recommendations are formative educational suggestions to support mathematics learning. MathQuest does not provide medical or clinical diagnoses."
- **Parent/Teacher Explanation (SI)**: "මැත්ක්වෙස්ට්හි සියලුම නිර්දේශ ගණිත ඉගෙනුමට උපකාරී වන අධ්‍යාපනික මඟපෙන්වීම් පමණි. කිසිදු වෛද්‍යමය රෝග විනිශ්චයක් සිදු නොකෙරේ."
- **Evidence Reference**: AAP 2019 Guideline KAS 2 (printed pp. 5–7 / PDF pp. 5–7); NICE NG87 Section 1.2 & 1.3 (printed pp. 8–13 / PDF pp. 8–13); Sivalingam Review (Rule R8 accepted).
- **Relationship to R1–R8**: Foundational ethical safeguard governing Rules R1–R8.
- **Status**: Supervisor-accepted concept (mandatory clinical boundary).
- **Missing-Data Behaviour**: Always active across all states.
- **Conflict & Priority**: Priority 0 (Absolute Compliance Override). Cannot be superseded.
- **Examples**:
  - *Positive*: Draft message containing "Child has inattentive ADHD" intercepted and rewritten to "Child shows preference for visual mini-tasks".
  - *Negative*: Formative message generated correctly; passes through unchanged.
  - *Insufficient Evidence*: N/A.
- **Evaluation Feasibility**: Enforced via output filter middleware in `learner-profile-service`.

---

### Rule `MQ-RS6-02`: Device & Motor Usability Disambiguation
- **Rule Name**: Touchscreen Usability Disambiguation
- **Research Purpose**: Identify interface friction (touchscreen inaccuracy, missed drops) and switch interaction modes rather than inferring math difficulty or inattention.
- **Required Inputs**: `missedDropCount` (`int`), `inputMethod` (`InputMethod`)
- **Optional Inputs**: `responseLatencySeconds` (`float`)
- **Trigger Condition**:
  ```python
  if missedDropCount is not None and missedDropCount >= 3 and inputMethod == InputMethod.DRAG:
      trigger_rule = True
  ```
- **Recommended Action**: Recommend `DEVICE_ACCESSIBILITY_ADJUST`: switch interface from drag-and-drop to tap-to-select mode. Attach `INTERFACE_MOTOR_ACCOMMODATION` reason code.
- **Parent/Teacher Explanation (EN)**: "Multiple missed item drops were detected on the touchscreen. We enabled tap-to-select mode to ensure motor coordination does not get in the way of math."
- **Parent/Teacher Explanation (SI)**: "තිරය මත ද්‍රව්‍ය ඇදගෙන යාමේ අපහසුතාවයක් නිරීක්ෂණය විය. ගණිත චින්තනයට බාධාවක් නොවන සේ සරල ස්පර්ශ ක්‍රමය සක්‍රිය කරන ලදී."
- **Evidence Reference**: AAP 2019 Guideline KAS 3 (ruling out motor coordination issues; printed pp. 6, 9 / PDF pp. 6, 9); Sivalingam Consultation (Rule R5 accepted with clarification).
- **Relationship to R1–R8**: Directly operationalizes Rule R5 (*Allow for motor, device, and task factors*; accepted with clarification).
- **Status**: Supervisor-accepted concept.
- **Missing-Data Behaviour**: If `missedDropCount` is null, preserve current input method.
- **Conflict & Priority**: Priority 2 (Accessibility Override).
- **Examples**:
  - *Positive*: `missedDropCount: 4`, `inputMethod: 'drag'`. Switch to tap-to-place recommended.
  - *Negative*: `missedDropCount: 0`. Standard drag mode retained.
  - *Insufficient Evidence*: Usability telemetry not recorded; rule dormant.
- **Evaluation Feasibility**: Evaluated with Onboarding v2 schema (`missedDropCount`, `inputMethod`).

---

### Rule `MQ-RS6-03`: Machine-Readable Reason Code & Explainability
- **Rule Name**: Human-Auditable Transparent Reason Code Attachment
- **Research Purpose**: Ensure every recommendation output is transparent, attaching machine-readable reason codes, input evidence summaries, and ruleset versioning.
- **Required Inputs**: `triggeredRuleId` (`str`), `inputEvidenceSummary` (`Dict[str, Any]`)
- **Optional Inputs**: None
- **Trigger Condition**:
  ```python
  # Always triggers for any generated recommendation
  if recommendation_is_generated:
      attach_reason_codes_and_provenance(rec)
  ```
- **Recommended Action**: Populate `recommendationId`, `strategyCode`, `reasonCodes`, `inputEvidenceSummary`, and `recommendationRulesetVersion` (`'MQ-REC-v0.1'`).
- **Parent/Teacher Explanation (EN)**: "Transparent explanation: This recommendation was generated because the child requested 3 hints and solved the task after seeing a visual demonstration."
- **Parent/Teacher Explanation (SI)**: "පැහැදිලි කිරීම: දරුවා ඉඟි 3ක් භාවිත කිරීමෙන් පසු දෘශ්‍ය ආදර්ශනයක් ආධාරයෙන් ගැටළුව සාර්ථකව විසඳූ බැවින් මෙම නිර්දේශය ඉදිරිපත් කරන ලදී."
- **Evidence Reference**: NICE NG87 Section 1.4 (Tailoring clear explanations; printed p. 13 / PDF p. 13); ELP-X Specification (2026).
- **Relationship to R1–R8**: Operationalizes Rule R8 (observable patterns and suggested support).
- **Status**: Supervisor-accepted concept.
- **Missing-Data Behaviour**: Missing input evidence fields are explicitly noted as `null` in the summary dictionary.
- **Conflict & Priority**: Priority 1 (Explainability Requirement).
- **Examples**:
  - *Positive*: Recommendation emitted with `reasonCodes: ['WORKING_MEMORY_SUPPORT', 'MULTI_STEP_DECONSTRUCTION']` and complete evidence summary.
  - *Negative*: Output without provenance rejected by schema validator.
  - *Insufficient Evidence*: Evaluates normally.
- **Evaluation Feasibility**: Fully supported by ELP-X recommendation schema (`elpx_engine.py:186–203`).

---

## Summary of Candidate Rules by Category

| Category | Description | Candidate Rule IDs | Total Count |
| :--- | :--- | :--- | :---: |
| **RS1** | Learner Characteristic Interpretation | `MQ-RS1-01`, `MQ-RS1-02`, `MQ-RS1-03` | 3 |
| **RS2** | Personalized Support Recommendations | `MQ-RS2-01`, `MQ-RS2-02`, `MQ-RS2-03`, `MQ-RS2-04` | 4 |
| **RS3** | IMPSA-Related Educational Evidence | `MQ-RS3-01`, `MQ-RS3-02`, `MQ-RS3-03` | 3 |
| **RS4** | IMLR-Related Educational Evidence | `MQ-RS4-01`, `MQ-RS4-02`, `MQ-RS4-03` | 3 |
| **RS5** | Longitudinal Support Review | `MQ-RS5-01`, `MQ-RS5-02` | 2 |
| **RS6** | Safety, Uncertainty and Explainability | `MQ-RS6-01`, `MQ-RS6-02`, `MQ-RS6-03` | 3 |
| **TOTAL** | **Comprehensive Specification Ruleset** | | **18 Rules** |
