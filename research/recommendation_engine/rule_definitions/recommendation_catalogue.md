# Personalized Support Recommendation Catalogue (`recommendation_catalogue.md`)

**Component:** Learner Profile & Prediction Engine (SLIIT Final-Year Research Project J26-IT-321)  
**Status:** DRAFT Specification (v0.1) — For Research & Expert Review Only  
**Scope:** Strictly Non-Diagnostic; Formative Educational Recommendations Only  

---

## 1. Overview & Pedagogical Purpose

This catalogue defines the standardized vocabulary of **personalized learning support recommendations** produced by the MathQuest recommendation engine. Every recommendation is designed to provide actionable, strengths-based, and non-stigmatizing formative guidance for primary school children (Grades 1–5, ages 6–10) in Sri Lanka.

### Core Architecture Principles
1. **Separation of Profile from Delivery**: This catalogue generates structured recommendations inside the `learner-profile-service`. Actual game mechanics execution belongs to `content-adaptation-service` and avatar rendering belongs to `pedagogical-agent`.
2. **Learner Agency & Choice**: Child-expressed preferences take precedence over adult default configurations for sensory elements (avatar, sound mode, theme).
3. **Non-Stigmatizing Explainability**: Reason codes and bilingual descriptions focus on observable task engagement, mathematical representations, and environmental adjustments—never on deficit labels.

---

## 2. Recommendation Strategy Catalogue

| Strategy Code | Strategy Name | Intended Recipient | Evidence Source | Overlap with ELP-X v1.0 | Core Pedagogical Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK_CHUNKING` | Micro-Task Goal Deconstruction | Game Delivery / Child | BCH Skill 6 (PDF pp. 26–30); NICE Section 1.5 | Extends ELP-X `ADAPTIVE_HINT_PACING` | Deconstruct multi-step arithmetic tasks into single-step checkpoints with intermediate reinforcement. |
| `OPTIONAL_REST_BREAK` | Context-Sensitive Movement Break | Child / Parent | BCH Skill 2, 8; NICE NG87 Terms | New (Not in ELP-X) | Offer an optional, non-punitive brief stretch or "I need a break" button when task fatigue is reported. |
| `CRA_SCAFFOLDING` | Concrete-Representational-Abstract Progression | Game Delivery / Teacher | IES 2021 Rec 3 (pp. 21–28) | Extends ELP-X `SUPPORTED_PRACTICE` | Present virtual manipulatives (counters, base-10 blocks) before 2D drawings or abstract numerals. |
| `NUMBER_LINE_SUPPORT` | Linear Number Line Spatial Representation | Game Delivery / Child | IES 2021 Rec 4 (pp. 29–39) | New (Not in ELP-X) | Provide horizontal equidistant number line with landmark anchors ($0, 10, 100$) for addition/subtraction. |
| `SCHEMA_INSTRUCTION` | Word Problem Schema Categorization | Curriculum / Teacher | IES 2021 Rec 5 (pp. 40–50) | New (Not in ELP-X) | Structure word problems using explicit schema diagrams (Change, Combine, Compare, Equal Groups). |
| `ACCESSIBLE_NUMBERS` | Low-Calculation Cognitive Offloading | Game Delivery / Teacher | IES 2021 Rec 1 (pp. 5–10) | New (Not in ELP-X) | Introduce new mathematical concepts with single-digit accessible numbers before scaling magnitude. |
| `EFFORT_PRAISE` | Persistence & Strategy Celebration | Pedagogical Agent / Parent | BCH Skill 1, 9; Sivalingam (2026) | Replaces generic celebrations | Celebrate persistence, self-correction, and strategy experimentation rather than speed or raw score. |
| `AUDIO_INSTRUCTION` | Spoken Dual-Modality Narration | Child Interface | IES Rec 2; NICE Section 1.4 | Preserved from ELP-X | Provide clear spoken Sinhala narration alongside visual text to bypass reading decoding barriers. |
| `UNTIMED_MASTERY_PRACTICE` | Zero-Time-Pressure Exploration | Game Delivery / Child | AAP KAS 2; Sivalingam (2026) | Preserved from ELP-X | Remove countdown timers and clock pressure during foundational learning and assessment tasks. |
| `ASSESSMENT_EXPANSION` | Baseline Data Collection Expansion | Parent / Teacher | ELP-X Specification; Review Pack R7 | Preserved from ELP-X | Advise completing additional varied items when fewer than 3 observations exist for a concept. |
| `FLEXIBLE_TRANSFER_PROBE` | Non-Immediate Concept Reassessment | Assessment Protocol | Sivalingam Review (Rule R4) | New (Not in ELP-X) | Schedule unassisted transfer probes flexibly (interleaved or next session) following scaffolded success. |
| `DEVICE_ACCESSIBILITY_ADJUST` | Tap-to-Place Motor Accommodation | Child Interface | Sivalingam Review (Rule R5) | New (Not in ELP-X) | Switch fine-motor drag-and-drop interactions to tap-to-select mode when interface friction is detected. |
| `CHILD_SENSORY_PREFERENCE` | Child-Chosen Sensory Comfort (**proposed educational preference strategy**) | Child Interface / Parent | BCH Skill 1 & 9 (PDF pp. 3–6, 38–40); NICE NG87 Section 1.4 (pp. 13–16) | New (adjusts delivery of ELP-X `AUDIO_INSTRUCTION`) | When the child chose a quiet or silent sound mode and the parent setting is automatic narration, mute ambient sound and offer spoken prompts as optional tap-to-hear. Produced by rule `MQ-RS1-01`; proposal pending expert review. |

---

## 3. Bilingual Message Templates

### 1. `TASK_CHUNKING`
- **Reason Codes**: `['WORKING_MEMORY_SUPPORT', 'MULTI_STEP_DECONSTRUCTION']`
- **Title (EN)**: Manageable Step-by-Step Quests
- **Title (SI)**: පියවරෙන් පියවර විසඳන කෙටි අභියෝග
- **Description (EN)**: The learner engages best when multi-step problems are divided into bite-sized milestones. Breaking goals down reduces cognitive overload and helps maintain focus.
- **Description (SI)**: දිගු ගණිත ගැටළු කුඩා පියවර වලට වෙන් කර ඉදිරිපත් කිරීමෙන් දරුවාගේ මතකයට වන වෙහෙස අවම වන අතර අවධානය රඳවා ගැනීම පහසු වේ.

### 2. `OPTIONAL_REST_BREAK`
- **Reason Codes**: `['FATIGUE_PREVENTION', 'VOLUNTARY_REST_OFFERED']`
- **Title (EN)**: Optional Rest & Movement Break
- **Title (SI)**: කෙටි විවේකයක් හෝ චලන විරාමයක්
- **Description (EN)**: An optional, calm pause or physical stretch is available. Breaks should be child-guided and voluntary so they never interrupt deep engagement.
- **Description (SI)**: දරුවාට අවශ්‍ය විටෙක ගත හැකි කෙටි විවේකයක් හෝ චලන අවස්ථාවක් ලබා දිය හැක. මෙය දරුවාගේ කැමැත්ත මත පමණක් සිදුවිය යුතුය.

### 3. `CRA_SCAFFOLDING`
- **Reason Codes**: `['CONCRETE_MODEL_RECOMMENDED', 'REPRESENTATION_SCAFFOLD']`
- **Title (EN)**: Visual & Concrete Object Support
- **Title (SI)**: ප්‍රත්‍යක්ෂ භාණ්ඩ හා දෘශ්‍ය ආදර්ශන
- **Description (EN)**: Recommend using virtual counters, fruit blocks, or physical items before moving to abstract equations. Connecting concrete objects to numbers builds solid foundational understanding.
- **Description (SI)**: වියුක්ත සංඛ්‍යා සමීකරණ වලට පෙර, ගණන් කළ හැකි ද්‍රව්‍ය හෝ පින්තූර ආධාරයෙන් ගණිත සංකල්ප පැහැදිලි කිරීමෙන් ශක්තිමත් පදනමක් ගොඩනැගේ.

### 4. `ACCESSIBLE_NUMBERS`
- **Reason Codes**: `['CONCEPT_INTRODUCTION_PHASE', 'CALCULATION_LOAD_REDUCTION']`
- **Title (EN)**: Practice with Familiar, Accessible Numbers
- **Title (SI)**: හුරුපුරුදු සරල සංඛ්‍යා භාවිතය
- **Description (EN)**: When exploring a new mathematical idea, use small, familiar numbers. This lets the child concentrate on the concept itself rather than heavy arithmetic calculation.
- **Description (SI)**: නව ගණිත සංකල්පයක් හඳුන්වා දීමේදී සරල සංඛ්‍යා භාවිත කිරීමෙන්, ගණනය කිරීමේ වෙහෙසකින් තොරව සංකල්පය තේරුම් ගැනීමට දරුවාට හැකි වේ.

### 5. `DEVICE_ACCESSIBILITY_ADJUST`
- **Reason Codes**: `['INTERFACE_MOTOR_ACCOMMODATION', 'TAP_TO_PLACE_ACTIVE']`
- **Title (EN)**: Tap-to-Place Interaction Mode
- **Title (SI)**: පහසු ස්පර්ශ ආදාන ක්‍රමය
- **Description (EN)**: Enable tap-to-select controls rather than precision drag-and-drop. This removes touchscreen motor barriers and ensures the focus stays entirely on mathematical thinking.
- **Description (SI)**: තිරය මත ඇදගෙන යාමේ අපහසුතා මඟහරවා ගැනීමට, සරලව ස්පර්ශ කර පිළිතුරු තේරීමේ පහසුකම සක්‍රිය කරන්න.

### 6. `CHILD_SENSORY_PREFERENCE` (proposed educational preference strategy)
- **Status**: Proposed in MQ-REC v0.1 (research prototype); not yet reviewed by the expert panel.
- **Source rule**: `MQ-RS1-01` (child-expressed sensory comfort priority); applies catalogue Conflict Rule 2.
- **Reason Codes**: `['CHILD_AGENCY_PRIORITY', 'TAP_TO_HEAR_AUDIO']`
- **Title (EN)**: Honour the child's quiet sound choice
- **Title (SI)**: දරුවා තෝරාගත් නිහඬ ශබ්ද මාදිලියට ගරු කිරීම
- **Description (EN)**: Your child selected quiet sound mode. Spoken guidance is set to 'tap-to-hear' so audio plays only when clicked, supporting calm focus.
- **Description (SI)**: දරුවා නිහඬ ශබ්ද මාදිලිය තෝරාගෙන ඇත. එමනිසා අවශ්‍ය විටෙක පමණක් ක්ලික් කර ශ්‍රව්‍ය උපදෙස් ලබා ගැනීමට සකසා ඇත.
- **Boundary**: An educational preference adjustment only. It is never derived from ADHD information, SNAP-IV or response time, and audio always remains available on request.

---

## 4. Priority Ranking & Conflict Resolution

When multiple rules trigger concurrently, the engine resolves priority as follows:

```
Priority 1: Child Sensory Preferences (avatarId, soundMode, theme; CHILD_SENSORY_PREFERENCE) -> Immediate child agency override
Priority 2: Accessibility & Motor Accommodations (DEVICE_ACCESSIBILITY_ADJUST, UNTIMED_MASTERY_PRACTICE)
Priority 3: Foundational Scaffolding & Representations (CRA_SCAFFOLDING, ACCESSIBLE_NUMBERS)
Priority 4: Task Structure & Pacing (TASK_CHUNKING, OPTIONAL_REST_BREAK)
Priority 5: Extension Challenges (CHALLENGE_EXTENSION) -> Suppressed if any active scaffolding is required
```

**Conflict Rule 1 (Scaffolding vs. Extension)**: If a learner shows high proficiency in one skill but demonstrates emerging readiness in a prerequisite skill, `CRA_SCAFFOLDING` and `ACCESSIBLE_NUMBERS` take precedence over `CHALLENGE_EXTENSION`.

**Conflict Rule 2 (Child Sound Choice vs. Parent Audio Preference)**: If a parent requests `audioAssistance: 'read_everything'` but the child selects `soundMode: 'quiet'` or `'off'`, the engine honors the child's sensory comfort by default and provides optional "tap-to-hear" audio rather than automatic speech.
