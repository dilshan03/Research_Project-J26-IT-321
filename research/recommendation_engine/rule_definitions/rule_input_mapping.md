# Rule Input Mapping Specification (`rule_input_mapping.md`)

**Component:** Learner Profile & Prediction Engine (SLIIT Final-Year Research Project J26-IT-321)  
**Status:** DRAFT Specification (v0.1) — For Research & Expert Review Only  
**Scope:** Strictly Non-Diagnostic; Formative Educational Recommendations Only  

---

## 1. Overview & Provenance Principles

This document specifies all data fields required, optionally utilized, or planned for the MathQuest Expert-Informed Personalized Learning Support Ruleset. Every input field is mapped to its exact schema location, source attribution, implementation status, and clinical/ethical guardrails.

### Source Attribution Categories
1. **Child (`source: 'child'`)**: Directly expressed preferences, avatar choices, sound mode, and in-game interactions.
2. **Parent / Caregiver (`source: 'parent'`)**: Home context, learning environment preferences, SNAP-IV behavioral observations, and parent-reported healthcare diagnoses.
3. **Assessment Engine (`source: 'assessment'`)**: Server-evaluated item accuracy, probe roles, support events, and response latencies.
4. **Clinical Professional (`source: 'clinician'`)**: Independently documented clinical diagnosis reference labels (required for future supervised ML classification; never assigned by MathQuest).

---

## 2. Complete Input Field Inventory

| Field Name | Data Type | Source Location / Schema | Source Attribution | Implementation Status | Ethical / Clinical Guardrails |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `learnerId` | `str` | `OnboardingProgressResponse` / `LearnerProfile` | System | Implemented | Pseudonymized UUID; no PII exposed to algorithms. |
| `grade` | `int` (1–5) | `MathAssessmentSubmissionRequest.grade` | Parent / System | Implemented | Bounds mathematical difficulty and curriculum targets. |
| `visualAssistance` | `str` | `LearningPreferencesRequest.visualAssistance` | Parent | Implemented | Valid values: `'always'`, `'sometimes'`, `'minimal'`. |
| `audioAssistance` | `str` | `LearningPreferencesRequest.audioAssistance` | Parent | Implemented | Valid values: `'read_everything'`, `'read_on_click'`, `'off'`. |
| `activityPace` | `str` | `LearningPreferencesRequest.activityPace` | Parent | Implemented | Valid values: `'calm_step_by_step'`, `'regular'`, `'flexible'`. |
| `hintStyle` | `str` | `LearningPreferencesRequest.hintStyle` | Parent | Implemented | Valid values: `'visual_clue'`, `'step_guide'`, `'audio_hint'`. |
| `celebrationStyle` | `str` | `LearningPreferencesRequest.celebrationStyle` | Parent | Implemented | Valid values: `'gentle_star'`, `'badge_sound'`, `'minimal'`. |
| `avatarId` | `str` | `ChildPreferenceChoices.avatarId` | Child | Implemented (v2) | Child-chosen companion; overrides adult defaults. |
| `soundMode` | `str` | `ChildPreferenceChoices.soundMode` | Child | Implemented (v2) | Valid values: `'gentle'`, `'quiet'`, `'off'`. Child agency priority. |
| `theme` | `str` | `ChildPreferenceChoices.theme` | Child | Implemented (v2) | Valid values: `'watercolor_island'`, etc. Child agency priority. |
| `learningEnvironment` | `str` | `SocialContextRequest.learningEnvironment` | Parent | Implemented | Valid values: `'quiet_room'`, `'shared_living_space'`, `'with_parent_nearby'`. |
| `peerCollaboration` | `str` | `SocialContextRequest.peerCollaboration` | Parent | Implemented | Valid values: `'independent_first'`, `'with_sibling_peer'`, `'group_friendly'`. |
| `parentInvolvement` | `str` | `SocialContextRequest.parentInvolvement` | Parent | Implemented | Valid values: `'guided_together'`, `'check_in_after'`, `'child_independent'`. |
| `challengingTaskSupport` | `str` | `SocialContextRequest.challengingTaskSupport` | Parent | Implemented | Valid values: `'take_a_break'`, `'break_down_step'`, `'parent_hug_reassurance'`. |
| `diagnosisStatus` | `AdhdDiagnosisStatus` | `AdhdInformationRequest.diagnosisStatus` | Parent | Implemented | Values: `'yes'`, `'no'`, `'not_sure'`, `'prefer_not_to_say'`. Unverified recall. |
| `reportedPresentation` | `AdhdReportedPresentation` | `AdhdInformationRequest.reportedPresentation` | Parent | Implemented | Values: `'predominantly_inattentive'`, `'predominantly_hyperactive_impulsive'`, `'combined'`, `'not_specified'`. Parent recall, NOT verified label. |
| `inattentionAverage` | `float` (0.00–3.00) | `SnapIvScoreSummary.inattentionAverage` | Parent | Implemented | Non-diagnostic screening indicator; never equates to clinical diagnosis. |
| `hyperactivityAverage` | `float` (0.00–3.00) | `SnapIvScoreSummary.hyperactivityAverage` | Parent | Implemented | Non-diagnostic screening indicator; never equates to clinical diagnosis. |
| `isFirstResponseCorrect` | `bool` | `EvaluatedQuestionItem.isFirstResponseCorrect` | Assessment | Implemented | Evaluates unassisted initial attempt accuracy. |
| `supportBeforeFirstResponse` | `bool` | `EvaluatedQuestionItem.supportBeforeFirstResponse` | Assessment | Implemented | True if hint/support was opened before answering; isolates unassisted trials. |
| `supportEvents` | `List[SupportEvent]` | `EvaluatedQuestionItem.supportEvents` | Assessment | Implemented (v2) | Tracks level (1–3) and scaffold type delivered during item attempt. |
| `probeRole` | `ProbeRole` | `EvaluatedQuestionItem.probeRole` | Assessment | Implemented (v2) | Values: `'calibration'`, `'pre'`, `'support'`, `'transfer'`, `'representation'`. |
| `representationType` | `RepresentationType` | `EvaluatedQuestionItem.representationType` | Assessment | Implemented (v2) | Values: `'concrete'`, `'pictorial'`, `'visual'`, `'symbolic'`, `'verbal'`. |
| `responseLatencySeconds` | `float` | `EvaluatedQuestionItem.responseLatencySeconds` | Assessment | Implemented | Response duration; ethically blocked from penalizing accuracy scores. |
| `missedDropCount` | `int` | `EvaluatedQuestionItem.missedDropCount` | Telemetry | Implemented (v2) | Motor/device usability indicator; never treated as maths or attention deficit. |
| `inputMethod` | `InputMethod` | `EvaluatedQuestionItem.inputMethod` | Telemetry | Implemented (v2) | Values: `'drag'`, `'tap'`, `'select'`. Distinguishes fine-motor modes. |
| `clinicalReferenceLabel` | `str` | Planned Clinical Dataset Schema | Clinician | Planned (Offline Only) | Documented clinical diagnosis; mandatory prerequisite for supervised ML. |
| `preSessionCheckInState` | `Dict[str, str]` | Planned Pre-Session Check-In Schema | Child / Parent | Planned (Proposed) | Captures acute fatigue, hunger, or distress; rules out ephemeral confounders. |

---

## 3. Input Validation & Missing Data Protocols

1. **Mandatory vs. Optional Fallbacks**:
   - `grade` is strictly mandatory for any mathematics rule.
   - If learning preferences or social context are missing, engine falls back to neutral, non-intrusive defaults (e.g., standard pace, calm visual cues, optional audio available on click).
   - If assessment items for a skill are fewer than 3, proficiency rules suppress categorical labels and output `INSUFFICIENT_EVIDENCE`.

2. **Integrity Guardrail on Clinical Status**:
   - `diagnosisStatus` and `reportedPresentation` are strictly parent-reported recollections.
   - Algorithms must **never** treat these as clinically verified reference labels for training supervised classification models.
   - A missing or `'prefer_not_to_say'` diagnosis status must **never** prevent a child from receiving appropriate educational scaffolding.
