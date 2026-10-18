# Research Evidence Mapping Matrix (`evidence_mapping.md`)

**Component:** Learner Profile & Prediction Engine (SLIIT Final-Year Research J26-IT-321)  
**Purpose:** Maps synthesized clinical and pedagogical evidence from literature and expert consultations to the ten core research functions of the engine.

---

## 1. Personalized Educational Recommendations

| Proposed Strategy / Recommendation Code | Supporting Evidence Source | Specific Page / Section Reference | Intended Educational Use in MathQuest | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Micro-Task Chunking & Pacing (`TASK_CHUNKING`)** | Boston Children's Hospital (Lee et al., 2020) & NICE NG87 (2018) | BCH Skill 6 (pp. 26-30); NICE NG87 Section 1.5 & Terms (pp. 38-39) | Deconstruct multi-step arithmetic or complex quest objectives into smaller "mini-tasks" with intermediate progress check-ins to prevent working memory overload. | Must not fragment mathematical concepts to the extent that structural relationships between steps are lost. | Yes (Calibrate task length for Grade 1-2 vs 4-5) |
| **Structured Rest Breaks (`REST_BREAK_OFFER`)** | Boston Children's Hospital (Lee et al., 2020) & NICE NG87 (2018) | BCH Skill 2 (p. 8), Skill 6 (p. 26), Skill 8 (p. 34); NICE Terms 'Environmental Modifications' (pp. 38-39) | Provide non-punitive 5-minute movement or relaxation breaks (or a gentle "I need a break" button) when signs of cognitive fatigue or sustained effort emerge. | Must be optional and child-initiated to avoid interrupting a state of deep concentration ("hyperfocus"). | Yes (Validate trigger threshold in game telemetry) |
| **Effort-Focused Reinforcement (`EFFORT_PRAISE`)** | Boston Children's Hospital (Lee et al., 2020) | BCH Skill 1 (p. 4), Skill 2 (p. 8), Skill 9 (pp. 38-40) | Anchor feedback and celebrations on persistence, strategy revision, and effort rather than speed or raw correct counts, protecting academic self-esteem. | Automated game audio/visuals must feel authentic to primary school children and avoid repetitive over-praising. | No (Strong consensus in pediatric psychology) |
| **Auditory & Spoken Instruction Support (`AUDIO_INSTRUCTION`)** | IES WWC Math Guide (Fuchs et al., 2021) & NICE NG87 (2018) | IES Recommendation 2 (pp. 11-14); NICE Section 1.4.5 (p. 15) | Offer optional read-aloud spoken Sinhala (or English) prompts for all mathematical narrative and directions, mitigating reading decoding barriers. | Audio must be clear, natural, and recorded with native Sinhala pronunciation; voiceover speed must be calibrated. | Yes (Review audio recordings with Sinhala-medium educators) |

---

## 2. ADHD-Related Learner Characteristics

| Proposed Strategy / Concept | Supporting Evidence Source | Specific Page / Section Reference | Intended Educational Use in MathQuest | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Non-Diagnostic Observational Tracking** | AAP Guideline (Wolraich et al., 2019) & NICE NG87 (2018) | AAP KAS 1 & 2 (pp. 5-7); NICE Section 1.3.1-1.3.3 (p. 12) | Record patterns of inattention, response latency, and impulsivity strictly as behavioral context for interface personalization, never for clinical categorization. | In-game telemetry cannot control for outside-game distractions, sensory issues, or home stressors. | No (Core ethical boundary established) |
| **Individualized Support over Group Stereotyping** | AAP Guideline (Wolraich et al., 2019) & Expert Feedback (Sivalingam, 2026) | AAP KAS 5b (p. 11); Review Log (R5/R8) | Treat each learner as an individual; children with identical parent-reported presentation subtypes require different scaffolding depending on language, motor, and cognitive profiles. | Prevents simplistic rule heuristics (e.g., assuming all inattentive children need identical screen layouts). | Yes (Ongoing pedagogical co-design) |
| **Accommodations vs. Skill Remediation Distinction** | AAP Guideline (Wolraich et al., 2019) | AAP Section 'School Programming and Supports' (p. 16) | Explicitly separate accommodations (e.g., untimed tasks, auditory narration, high contrast) from skill remediation (learning foundational addition, fractions). | Accommodations remove barriers but do not replace systematic mathematical instruction. | No (Established educational policy standard) |

---

## 3. Mathematics Scaffolding and Instructional Adaptations

| Proposed Strategy / Scaffolding Technique | Supporting Evidence Source | Specific Page / Section Reference | Intended Educational Use in MathQuest | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Concrete-Representational-Abstract (CRA) Ladder (`CRA_SCAFFOLDING`)** | IES WWC Math Guide (Fuchs et al., 2021) | IES Recommendation 3 (pp. 21-28); Table 3.1 (p. 23) | Guide learner from 3D/virtual concrete manipulatives (apples, base-10 blocks) to 2D visual representations (dot arrays, number lines) to abstract numerals and equations. | Fading must occur gradually; representations must be mathematically proportional (e.g., tens rod must equal ten single units). | Yes (Curriculum specialist review of virtual objects) |
| **Number Line Spatial Representations (`NUMBER_LINE_SUPPORT`)** | IES WWC Math Guide (Fuchs et al., 2021) | IES Recommendation 4 (pp. 29-39); Examples 4.1-4.10 | Use equidistant linear number lines with benchmark numbers ($0, \frac{1}{2}, 1$) to teach relative magnitude, whole-number addition/subtraction, and fractions. | Linear measurement models may confuse students if tick marks are counted rather than unit lengths/distances. | No (Strong WWC evidence base, 14 studies) |
| **Schema-Based Word Problem Solving (`SCHEMA_INSTRUCTION`)** | IES WWC Math Guide (Fuchs et al., 2021) | IES Recommendation 5 (pp. 40-50); Table 5.1 & 5.2 | Categorize problems by mathematical structure (Change, Combine, Compare, Equal Groups) and use visual prompt cards; explicitly avoid misleading "key words". | Word problems in Sinhala must be natural and age-appropriate; key-word heuristics ("altogether" = addition) must be actively blocked. | Yes (Review Sinhala word problem templates with primary teachers) |
| **Incremental Difficulty with Accessible Numbers (`ACCESSIBLE_NUMBERS`)** | IES WWC Math Guide (Fuchs et al., 2021) | IES Recommendation 1 (pp. 5-10), Step 2 (p. 6) | When introducing a novel mathematical operation or concept, use single-digit or familiar numbers so cognitive load is directed at the concept, not calculation burden. | Once the concept is understood, systematic variation to larger numbers is necessary to avoid under-generalization. | No (Strong WWC evidence base, 43 studies) |

---

## 4. IMPSA — Independent Mathematical Problem-Solving Ability

| Dimension / Evidence Stream | Supporting Evidence Source | Specific Page / Section Reference | Intended Use in IMPSA Formulation | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Unassisted First-Attempt Isolation** | Expert Review Pack (2026) & Sivalingam Consultation (2026) | Review Pack Rule R3 (p. 1); Feedback Log (R3) | Formulate IMPSA strictly from `isFirstResponseCorrect` on items where `supportBeforeFirstResponse == False`. | Excludes items completed after hint/demonstration access to prevent data leakage and artificial inflation of unassisted ability. | Yes (Determine minimum eligible items count) |
| **Separation from Response Speed** | AAP Guideline (Wolraich et al., 2019) & Sivalingam Consultation (2026) | AAP KAS 2 (p. 6); Feedback Log (R5) | Untimed problem solving: Response time is tracked for pacing calibration but ethically blocked from penalizing IMPSA accuracy scores. | Children who reflect deeply or experience fine-motor/language latency must not be penalized in their mathematical ability estimation. | No (Ethical and psychometric consensus) |
| **Bayesian Uncertainty Reporting** | Research Audit & ELP-X Engine (2026) | `elpx_engine.py:74-100`; WWC Level of Evidence criteria | Report IMPSA as a posterior mean accompanied by a 95% Credible Interval and explicit sample count ($n$). | Avoids single misleading point estimates when sample size is low ($n < 3$ returns `INSUFFICIENT_EVIDENCE`). | Yes (Review prior hyperparameter choice $\alpha_0, \beta_0$) |

---

## 5. IMLR — Independent Mathematical Learning Readiness

| Dimension / Evidence Stream | Supporting Evidence Source | Specific Page / Section Reference | Intended Use in IMLR Formulation | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Dynamic Assessment Probe Structure** | What Works Clearinghouse (2021) & Review Pack (2026) | IES Rec 1 (pp. 5-7); Review Pack Rule R4 (p. 1) | Sequence: Pre-probe (unassisted failure) $\rightarrow$ Graded scaffold (worked example / cue) $\rightarrow$ Post-transfer probe (unassisted isomorphic item). | Does not count an assisted answer as learning gain; requires an unassisted post-intervention transfer task to observe concept generalization. | Yes (Validate isomorphic problem equivalence in Sinhala curriculum) |
| **Flexible Transfer Timing** | Sivalingam Expert Consultation (2026) | Feedback Log (Rule R4) | Reassessment timing after a scaffolded item must be flexible (e.g., after an interleaved activity or in the subsequent session) rather than an immediate rigid retest. | Immediate retesting risks simple short-term working memory mimicry; delayed retesting risks forgetting due to attention decay. | Yes (Calibrate transfer delay interval with developmental psychologist) |
| **Categorical Readiness Status** | Proposed Activity Design Matrix (2026) | `MathQuest_Onboarding_Activity_Design.md` Section 8 | Output qualitative status (`TRANSFER_OBSERVED`, `TRANSFER_NOT_YET_OBSERVED`, `ALREADY_DEMONSTRATED`, `INSUFFICIENT_EVIDENCE`) instead of an unvalidated 0-100 probability. | Reflects provisional dynamic observation from brief intake; does not claim long-term durable mastery. | Yes (Review status categories with research advisory team) |

---

## 6. SNAP-IV Non-Diagnostic Screening Analysis

| Dimension / Evidence Stream | Supporting Evidence Source | Specific Page / Section Reference | Intended Use in Engine | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **18-Item Dual Subscale Scoring** | AAP Guideline (Wolraich et al., 2019) & NICE NG87 (2018) | AAP KAS 2 (p. 7); NICE Section 1.3.2 (p. 12) | Score Inattention (items 1-9) and Hyperactivity/Impulsivity (items 10-18) on 0-3 scale to produce subscale averages and totals. | Caregiver ratings reflect subjective home observation; they are screening indicators and do not establish clinical diagnosis. | No (Standardized scoring protocol) |
| **Strict Non-Diagnostic Disclaimers** | AAP Guideline (Wolraich et al., 2019) & NICE NG87 (2018) | AAP KAS 2 (pp. 5-7); NICE Section 1.3.2 (p. 12) | Display explicit research disclaimer on all parent/teacher screens: "This score summarizes parental observations for personalized learning support; it does NOT constitute an ADHD diagnosis or clinical assessment." | Protects against misinterpretation, clinical overclaiming, and parental stigmatization. | No (Mandatory ethical requirement) |
| **Sri Lankan Cultural & Language Norms** | Research Audit (2026) & Sivalingam Consultation (2026) | Review Pack Section D (p. 2) | Translation of 18 items into conversational Sinhala with parent-friendly phrasing. | US cutoffs (e.g., >1.80) may not be psychometrically calibrated for Sri Lankan primary cohorts; requires local norm-referencing. | Yes (Formal validation of Sinhala phrasing with local clinical team) |

---

## 7. Clinically Established ADHD Presentation Reference Labels

| Dimension / Requirement | Supporting Evidence Source | Specific Page / Section Reference | Implementation Boundary in MathQuest | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **DSM-5 Presentation Subtypes** | AAP Guideline (Wolraich et al., 2019) & NICE NG87 (2018) | AAP Table 1 & DSM-5 Criteria (p. 6); NICE Section 1.3.3 (p. 12) | Defines the four clinical subtypes: Predominantly Inattentive (ADHD/I), Predominantly Hyperactive-Impulsive (ADHD/HI), Combined (ADHD/C), and Unspecified. | **Crucial Research Safeguard:** In-game telemetry, SNAP-IV, or math scores CANNOT assign these labels. They can only be recorded if provided by a registered healthcare professional. | No (Clinical standard) |
| **Prerequisite for Supervised Machine Learning** | AAP Guideline (Wolraich et al., 2019) & Review Pack (2026) | AAP KAS 2 (p. 5); Expert Review Pack Section A (p. 1) | Supervised ML models aiming to classify presentation subtypes may ONLY be trained offline on datasets with independently documented clinical diagnosis records. | Parent-reported checkboxes (`source: 'parent'`) are unverified recall and cannot serve as gold-standard training labels. | Yes (Ethics committee and clinical supervisor sign-off on training dataset) |

---

## 8. Longitudinal Questionnaire-Indicator Monitoring

| Dimension / Strategy | Supporting Evidence Source | Specific Page / Section Reference | Intended Use in MathQuest | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Periodic Multi-Informant Review** | AAP Guideline (Wolraich et al., 2019) & NICE NG87 (2018) | AAP KAS 4 (pp. 9-10); NICE Section 1.8 (pp. 32-35) | Allow repeated caregiver ratings over 4-6 month research intervals to observe behavioral shifts under learning support. | Rating scales administered too frequently suffer from test-retest habituation and parent reporting fatigue. | Yes (Define minimum repeat interval with clinical psychologist) |
| **Separation from Ephemeral Session Fatigue** | Boston Children's Hospital (Lee et al., 2020) & Sivalingam Consultation (2026) | BCH Skill 6 (p. 27); Feedback Log (R5) | Correlate questionnaire trajectories with pre-session check-ins (hunger, fatigue, time of day) to distinguish persistent behavioral shifts from transient daily conditions. | Confounding variables: acute illness, changes in school schedule, family stress, or medication adjustments. | Yes (Validate check-in indicators) |

---

## 9. Mathematical Learning-Progress Monitoring

| Dimension / Strategy | Supporting Evidence Source | Specific Page / Section Reference | Intended Use in MathQuest | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Cumulative Multi-Session Evidence Ingestion** | IES WWC Math Guide (Fuchs et al., 2021) & WWC Appendix C | IES Recommendation 1 (p. 5); Studies Table C.4 (pp. 71-85) | Ingest session activity events (`GameplayActivityEvidence`) across multiple days; update Beta-Binomial posterior skill parameters incrementally. | Prevents one bad day or single-session frustration from permanently downgrading a learner's mastery profile. | No (Standard Bayesian updating protocol) |
| **Retention and Generalization Probes** | IES WWC Math Guide (Fuchs et al., 2021) | IES Recommendation 1, Step 1 (p. 5); Recommendation 5, Step 5 (p. 49) | Periodically interleave previously mastered concepts into new sessions to verify durable retention and prevent decay. | Balancing review vs. forward curriculum progression without boring the learner. | Yes (Determine interleaving frequency with mathematics teachers) |
| **Fluency Building with Progress Charting** | IES WWC Math Guide (Fuchs et al., 2021) | IES Recommendation 6 (pp. 51-55); Example 6.1 (p. 54) | Brief (1-5 min) fluency activities on previously mastered facts with student-visible progress charting ("meet or beat" personal best, private charts). | Must be used only on previously mastered facts; timed pressure on unfamiliar concepts induces acute math anxiety. | Yes (Ensure timer visibility is calm or optional) |

---

## 10. Explainability, Uncertainty and Research Safeguards

| Principle / Safeguard | Supporting Evidence Source | Specific Page / Section Reference | Intended Use in Engine | Known Contextual & Research Limitations | Requires Additional Expert Review? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Sparse Evidence Safeguard (`INSUFFICIENT_EVIDENCE`)** | Expert Review Pack (2026) & Sivalingam Consultation (2026) | Review Pack Rule R7 (p. 2); Feedback Log (R7) | If $n < 3$ distinct items are attempted for a skill, suppress proficiency labels and return `INSUFFICIENT_EVIDENCE` with explicit uncertainty notes. | Prevents the system from making premature, high-stakes claims on insufficient baseline observations. | No (Formally accepted by expert) |
| **Human-Auditable Reason Codes** | ELP-X Specification (2026) & NICE NG87 (2018) | `elpx_engine.py:177-202`; NICE Section 1.4.3 (p. 13) | Every recommendation output must attach machine-readable reason codes (e.g., `['CONCEPT_FOUNDATION_NEEDED', 'HIGH_HINT_DEPENDENCY']`) and transparent justification summaries. | Parents and teachers must understand *why* an accommodation was recommended to maintain trust. | Yes (Review Sinhala and English message wording) |
| **SHAP Feature Importance Transparency** | Proposed Research Workspace Plan (2026) | `ml_experiments/README.md`; Section 3 | In future ML models, compute SHAP attribution values to verify that model predictions are driven by valid pedagogical features rather than spurious proxies. | SHAP values can be computationally intensive; summary plots must be translated into user-friendly explanations. | Yes (Review XAI visualizations with academic supervisors) |
