# NSCH Feature Dictionary for the ADHD-History Baseline (`NSCH_FEATURE_DICTIONARY.md`)

**Population:** children aged 6–10 (`SC_AGE_YEARS` 6–10; all on form T2), NSCH 2023–2025 topical files.
**Status:** draft for review — defines which variables may and may not be used. No model has been trained.

> The outcome is **parent-reported history of being told by a doctor or other health care provider that the child has
> ADD/ADHD**. It is not a clinical diagnosis or an ADHD presentation, and no variable here may be described as a
> "symptom score", "diagnostic marker" or "risk of ADHD" for an individual child.

**How to read the "Univariate AUC" column.** It comes from a screening statistic on pooled 2023–2024 ages 6–10: the
in-sample ROC-AUC of predicting `K2Q31A=1` from each variable's per-category target rate, with blank as its own
category. 0.5 = no association. It is optimistic and is used **only** to flag leakage, never to select features for a
final model. "Blank %" is the share of empty cells at ages 6–10 per year (2023/2024/2025).

---

## 1. Outcome variables (never predictors)

| Variable | Role | Recode | Notes |
| :--- | :--- | :--- | :--- |
| `K2Q31A` | **Primary target Y1** — "ever told" ADD/ADHD | 1 → 1, 2 → 0, blank → **exclude record** | Blank 0.7–0.8 % at ages 6–10. Never infer the label from follow-up items. |
| `K2Q31B` | **Secondary target Y2** — currently has ADD/ADHD | Y2 = 1 if `K2Q31A=1` and `K2Q31B=1`; Y2 = 0 if `K2Q31A=2`; otherwise exclude | Only for a sensitivity analysis; "no longer current" records (29–43/yr) are excluded from Y2, not counted as 0. |
| `K2Q31C` | Severity (parent description) | — | Outcome-side; **not** a target in this experiment and never a predictor. |
| `K2Q31D` | Current ADHD medication | — | Treatment information; excluded. |
| `ADDTREAT` | Behavioural treatment, past 12 months | — | Treatment information; excluded. |
| `MEDSHORT` | Medication shortage (2025 only) | — | Treatment information and not present in training years; excluded. |

## 2. Never used as predictors (identifiers, design, metadata)

| Variable(s) | Reason |
| :--- | :--- |
| `HHID` | Record identifier. |
| `YEAR`, `FORMTYPE` | Constant within the experiment (year defines the split; all ages 6–10 are T2). |
| `FWC` | Survey weight — used for weighting/estimation only. |
| `STRATUM`, `FIPSST` | Survey design variables (state also encodes sampling/composition differences between years; univariate AUC 0.58). |
| All `*_IF` imputation flags, `BIRTH_YR_F` | Data-processing metadata. |
| `SC_AGE_LT4`, `SC_AGE_LT6`, `SC_AGE_LT9`, `SC_AGE_LT10` | Not applicable at ages 6–10. |
| `BIRTH_YR`, `BIRTH_MO` | Duplicate age information that differs by survey year (use `SC_AGE_YEARS`). |
| `CBSAFP_YN` | Disclosure-suppressed geography, 27–40 % blank and changing by year. |
| `FPL_I2`–`FPL_I6` | Alternative imputations of `FPL_I1`; used only for multiple-imputation sensitivity analysis, never as extra features. |
| Variables not present in all three years | `ASTHMAATTACK`, `CYSTFIB_DESC`, `CYSTFIB_SCREEN`, `EVALFASD`, `FASD_YEARS`, `HOURSOFCARE`, `MEDSHORT`, `MOVES`, `MULTIPLECOND`, `OUTDOORSWKDAY`, `OUTDOORSWKEND`, `PLACESLIVED`. |
| Diet items whose form coverage changed (`FRUIT`, `VEGETABLES`, `SUGARDRINK`) | Not asked on T2 in every year → not comparable across years. |

## 3. Excluded because of target leakage

### L1 — direct proxies of the target (excluded from **all** models)

| Variable(s) | Why | Univariate AUC |
| :--- | :--- | ---: |
| `SC_CSHCN`, `TOTCSHCN`, `TOTNONSHCN` | Special-health-care-needs status/counts, derived from screener items that ADHD and its treatment trigger (counts include the selected child). | 0.835 / 0.806 / 0.753 |
| `SC_K2Q10`–`SC_K2Q23` | CSHCN screener: prescription medication, extra care, limitation, special therapy, **need for treatment of an emotional/behavioural condition** (`SC_K2Q22/23`). | 0.65–0.78 |
| `K4Q23` | Medication for emotions, **concentration** or behaviour — overlaps ADHD medication. | 0.784 |
| `K4Q22_R`, `TREATNEED` | Mental-health professional treatment and the problem behind it. | 0.714 / 0.715 |
| `HCABILITY`, `HCEXTENT` | Whether health conditions affect the child's abilities (includes ADHD). | 0.766 / 0.693 |
| `MEMORYCOND` | "Serious difficulty concentrating, remembering or making decisions" — a core attention construct, i.e. the outcome concept itself. | 0.763 |

### L2 — services, treatment and system contact likely downstream of the diagnosis (excluded from the primary model)

`K6Q15`, `SESCURRSVC`, `SESPLANYR`, `SESPLANMO` (special-education plan); `K4Q36`, `K4Q37`, `K4Q38`, `SPCSERVMO`
(special services); `K4Q24_R`, `K4Q26` (specialist visit); `K5Q10`, `K5Q11` (referral); `K5Q20_R`, `K5Q21`, `K5Q22`,
`K5Q30`, `K5Q31_R`, `K5Q32` (care coordination, provider–school communication); `DECISIONS_R`, `BESTFORCHILD`,
`DISCUSSOPT`, `RAISECONC` (treatment decisions); `K4Q27`, `K4Q28X01`–`K4Q28X05`, `K4Q28X_EAR` and the reasons
`APPOINTMENT`, `AVAILABLE`, `ISSUECOST`, `NOTELIG`, `NOTOPEN`, `TRANSPORTCC` (unmet care incl. mental health);
`C4Q04` (frustration getting services); `ARRANGEHC`, `ATHOMEHC`, `CUTHOURS`, `STOPWORK`, `AVOIDCHG` (caregiving burden
due to the child's health); `SSI`, `SSIDISABILITY`; `ACE11` (treated unfairly because of a health condition).
Univariate AUCs in this group reach 0.69.

### L3 — co-occurring diagnoses from the same "ever told" battery (sensitivity model only)

`K2Q30A–C` learning disability (0.646), `K2Q32A–C` depression, `K2Q33A–C` anxiety (0.664), `K2Q34A–C`
behaviour/conduct problems (0.756), `K2Q35A`, `K2Q35A_1_YEARS`, `K2Q35B–D`, `AUTISMMED`, `AUTISMTREAT` autism,
`K2Q36A–C` developmental delay, `K2Q37A–C` speech/language disorder, `K2Q38A–C` Tourette syndrome, `K2Q60A–C`
intellectual disability, `K2Q61A`, `CERPALS_DESC` cerebral palsy, `K2Q42A–C` epilepsy, `FASD`, `RECEVALFASD`.
These are reported by the same parent at the same time and arise from the same clinical contacts, so their timing
relative to the ADHD report is unknown. They are not used in the primary model; a separately labelled sensitivity
model may include the `…A` "ever told" items to show how much performance depends on co-diagnosis.

### Structural-blank (skip-pattern) leakage

Any follow-up item whose blank/non-blank status depends on a condition question (e.g. `K2Q30B` blank when
`K2Q30A=2`) carries information about the parent item. Such follow-ups are excluded with their parent item. For
retained variables, structural blanks are recoded to an explicit **"not applicable"** level derived from the
documented skip rule — never mixed with item non-response.

## 4. Tier A — stable or contextual characteristics (primary-model candidates)

These are fixed early in life or describe the household context. Because the survey is cross-sectional, **none can be
shown to precede the outcome**; they are the closest available approximation to "available before the target".
Interpretation notes: insurance and metropolitan status also reflect **access to diagnosis** (detection bias);
parental mental health and ACEs can both influence and be influenced by the child's difficulties.

| Variable | Label | Codes (2025 list) | Blank % 6–10 (23/24/25) | Univariate AUC |
| :--- | :--- | :--- | :--- | ---: |
| `SC_AGE_YEARS` | Age of Selected Child - In Years (S1) | integer 6–10 | 0.0/0.0/0.0 | 0.571 |
| `SC_SEX` | Sex of Selected Child (S1) | 1=Male; 2=Female | 0.0/0.0/0.0 | 0.595 |
| `SC_RACE_R` | Race of Selected Child, Detailed (S1) | 1=White alone; 2=Black or African American alone; 3=American Indian or Alaska Native alone; 4=Asian alone; 5=Native Hawaiian and Other Pacific Islander alone; 7=Two or More Races | 0.0/0.0/0.0 | 0.535 |
| `SC_HISPANIC_R` | Hispanic Origin of Selected Child, Recode (S1) | 1=Hispanic or Latino; 2=Not Hispanic or Latino | 0.0/0.0/0.0 | 0.517 |
| `BORNUSA` | Born in the United States | 1=Yes; 2=No | 0.6/0.7/0.7 | 0.509 |
| `HOUSE_GEN` | Parental Nativity | 1=1st gen; 2=2nd gen; 3=3rd+ gen; 4=Other (2023 labels not printed in the 2023 list) | 1.2/1.5/1.4 | 0.558 |
| `HHLANGUAGE` | Primary Household Language (S1) | 1=English; 2=Spanish; 3=Other | 0.5/0.5/0.4 | 0.530 |
| `SC_ENGLISH` | SC Speaks English (S1) | 1=Very well; 2=Well; 3=Not well; 4=Not at all | 1.3/1.4/1.0 | 0.519 |
| `BIRTHWT` | Birth Weight Status | 1=Very low (<1,500 g); 2=Low (<2,500 g); 3=Not low | 4.7/4.6/4.6 | 0.515 |
| `K2Q05` | Born 3 or More Weeks Before Due Date | 1=Yes; 2=No | 0.8/1.1/0.9 | 0.526 |
| `AGEPOS4` | Birth Order of Selected Children in Household (S1) | 1=Only child; 2=Oldest; 3=Second oldest; 4=Third oldest; 5=Fourth or more | 0.0/0.0/0.0 | 0.543 |
| `TOTKIDS_R` | Number of Children in Household (S1) | 1; 2; 3; 4=4+ | 0.0/0.0/0.0 | 0.522 |
| `TOTAGE_0_5`, `TOTAGE_6_11`, `TOTAGE_12_17` | Count of children in each age band | count | 0.0/0.0/0.0 | 0.507–0.521 |
| `FAMILY_R` | Family Structure | 1=Two bio/adoptive parents, married; 2=…not married; 3=Two parents (≥1 not bio/adoptive), married; 4=…not married; 5=Single mother; 6=Single father; 7=Grandparent household; 8=Other relation | 2.7/2.6/2.9 | 0.564 |
| `FAMCOUNT` | Number of People That Are Family Members | count | 3.2/3.1/3.6 | 0.542 |
| `HHCOUNT` | Number of People Living at Address | count (imputed where needed) | 0.0/0.0/0.0 | 0.532 |
| `HIGRADE` | Highest Level of Education among Reported Adults | 1=Less than high school; 2=High school (incl. vocational/trade/business); 3=More than high school | 0.0/0.0/0.0 | 0.516 |
| `A1_GRADE` | Adult 1 - Highest Completed Year of School | 1–9 (8th grade or less … doctorate) | 0.0/0.0/0.0 | 0.545 |
| `A1_AGE` | Adult 1 - Age in Years | 18–70+ | 3.0/2.9/3.3 | 0.562 |
| `A1_SEX` | Adult 1 - Sex | 1=Male; 2=Female | 2.9/2.9/3.2 | 0.542 |
| `A1_RELATION` | Adult 1 - How Related to Child | 1=Bio/adoptive parent; 2=Step-parent; 3=Grandparent; 4=Foster; 6=Other relative; 7=Other non-relative | 2.6/2.4/2.8 | 0.525 |
| `A1_BORN` | Adult 1 - Where Born | 1=In the US; 2=Outside the US | 2.9/2.8/3.2 | 0.547 |
| `A1_MARITAL` | Adult 1 - Marital Status | 1=Married … 6=Widowed | 3.2/3.1/3.4 | 0.536 |
| `A1_EMPLOYED_R` | Adult 1 - Current Employment Status | 1=Full-time … 6=Retired | 4.1/3.1/3.5 | 0.525 |
| `A1_ACTIVE` | Adult 1 - Active Duty | 1=Never served … 4=Past active duty | 3.2/3.0/3.3 | 0.507 |
| `A1_MENTHEALTH` | Adult 1 - Mental or Emotional Health | 1=Excellent … 5=Poor | 3.2/3.1/3.4 | 0.597 |
| `A1_PHYSHEALTH` | Adult 1 - Physical Health | 1=Excellent … 5=Poor | 3.2/3.1/3.3 | 0.580 |
| `A2_RELATION` | Adult 2 - How Related to Child | 8=Only one primary adult caregiver; 1=Bio/adoptive parent … | 3.3/3.1/3.4 | 0.552 |
| `FPL_I1` | Family Poverty Ratio, First Implicate | 50 (≤50 %) … 400 (≥400 %) | 0.0/0.0/0.0 | 0.534 |
| `TENURE` | Housing tenure | 1=Owned with mortgage or loan; 2=Owned free and clear; 3=Rented; 4=Occupied without payment of rent | 0.0/0.0/0.0 | 0.519 |
| `K11Q43R` | How Many Times Moved to New Address | count | 2.7/2.9/3.3 | 0.571 |
| `FOODSIT` | Food Situation in Household - Past 12 Months | 1=Always afford good nutritious meals; 2=Always enough but not always the right kinds; 3=Sometimes not enough; 4=Often not enough | 2.1/2.3/2.6 | 0.563 |
| `ACE1` | Hard to Cover Basics Like Food or Housing | 1=Never … 4=Very often | 1.5/1.6/1.9 | 0.571 |
| `K11Q60`, `K11Q61`, `K11Q62`, `S9Q34`, `EBTCARDS` | Cash assistance, food stamps, free/reduced meals, WIC, school meal debit | 1=Yes; 2=No | 2.2–2.9 | 0.506–0.543 |
| `HOMEEVIC` | Worried about Being Evicted | 1=Always … 5=Never | 1.9/2.0/2.3 | 0.528 |
| `MISSMORTGAGE`, `EVERHOMELESS` | Housing hardship | 1=Yes; 2=No; 3=Don't know | 2.1–2.7 | 0.522–0.529 |
| `CURRINS`, `INSTYPE`, `INSGAP` | Insurance coverage, type, gaps (**access/detection**) | categorical | 0.5–1.6 | 0.510–0.577 |
| `METRO_YN`, `MPC_YN` | Metropolitan status (**access/detection**) | 1=Yes; 2=No | ≈10 / ≈14 | 0.511 / 0.513 |
| `K9Q40`, `VAPE` | Household smoking / vaping | 1=Yes; 2=No | 1.6–2.8 | 0.519–0.523 |
| `ACE3`–`ACE10` | Adverse childhood experiences ("ever") | 1=Yes; 2=No | 3.3–4.1 | 0.510–0.560 |
| `K10Q11`–`K10Q14`, `K10Q20`, `K10Q22`, `K10Q23` | Neighbourhood amenities / conditions | 1=Yes; 2=No | 2.1–2.9 | 0.507–0.526 |
| `K10Q30`, `K10Q31`, `K10Q40_R` | Neighbourhood support and safety | 1=Definitely agree … 4=Definitely disagree | 2.5–3.2 | 0.530–0.548 |
| `K8Q35` | Someone to Turn To for Emotional Support (parent) | 1=Yes; 2=No | 1.8/2.0/2.2 | 0.507 |
| `TALKABOUT`, `WKTOSOLVE`, `STRENGTHS`, `HOPEFUL` | Family resilience | 1=All of the time … 4=None of the time | 3.5–4.1 | 0.537–0.564 |
| `K8Q11` | Days Family Eats a Meal Together | 1=0 days … 4=Every day | 1.5/1.8/1.9 | 0.532 |

No Tier A variable reaches a univariate AUC of 0.60, so a Tier-A-only model is expected to show only **modest**
discrimination. That is an honest result, not a failure.

## 5. Tier B — contemporaneous functioning and behaviour ("functional-profile" model only)

Measured at the same time as the outcome and plausibly **caused by** ADHD, its treatment or school responses to it.
They may not be described as early or independent predictors. Use only in a separately labelled model, reported next
to Tier A results, so the gap between the two is visible.

| Variable | Label | Codes | Blank % 6–10 (23/24/25) | Univariate AUC |
| :--- | :--- | :--- | :--- | ---: |
| `K2Q01` | General Health | 1=Excellent … 5=Poor | 0.2/0.3/0.2 | 0.594 |
| `K7Q84_R` | Works to Finish Tasks Started | 1=Always … 4=Never | 1.3/1.4/1.2 | 0.733 |
| `K7Q85_R` | Stays Calm and In Control When Challenged | 1=Always … 4=Never | 1.2/1.5/1.1 | 0.736 |
| `K7Q70_R` | Argues Too Much | 1=Always … 4=Never | 1.3/1.4/1.3 | 0.672 |
| `K7Q82_R` | Cares About Doing Well in School | 1=Always … 4=Never | 1.3/1.5/1.3 | 0.681 |
| `K7Q83_R` | Does All Required Homework | 1=Always … 4=Never | 1.5/1.6/1.4 | 0.691 |
| `K7Q04R_R` | Times School Contacted Household About Problems | 1=None; 2=1 time; 3=2+ times | 1.2/1.8/1.9 | 0.705 |
| `K7Q02R_R` | Days Missed School - Illness or Injury | 1=None … 5=11+ days; 6=Not enrolled in school (separate level, not part of the scale) | 1.1/1.1/1.0 | 0.555 |
| `MAKEFRIEND` | Difficulty Making or Keeping Friends | 1=No … 3=A lot | 1.2/1.3/1.2 | 0.684 |
| `BULLIED_R` | Bullied, Picked On, or Excluded | 1=Never … 5=Almost every day | 1.2/1.4/1.2 | 0.664 |
| `BULLY` | Bullies Others | 1=Never … 5=Almost every day | 1.2/1.4/1.3 | 0.611 |
| `GRADES` | Grades Received in School | 1=Mostly A's … 5=Mostly D's or lower; 6=School does not give these grades (separate level) | 1.3/1.3/1.2 | 0.652 |
| `REPEATED` | Repeated Any Grades | 1=Yes; 2=No | 1.4/1.5/1.3 | 0.529 |
| `K6Q71_R` | Shows Interest and Curiosity | 1=Always … 4=Never | 0.9/1.0/0.9 | 0.608 |
| `K8Q30` | Handling Demands of Raising Children | 1=Very well … 4=Not well at all | 1.2/1.4/1.6 | 0.586 |
| `K8Q31` | Felt Child Hard to Care For | 1=Never … 5=Always | 1.5/1.8/2.0 | 0.750 |
| `K8Q32` | Felt Child Really Bothers You | 1=Never … 5=Always | 1.6/1.9/2.0 | 0.700 |
| `K8Q34` | Felt Angry with Child | 1=Never … 5=Always | 1.8/2.0/2.0 | 0.636 |
| `K8Q21` | Share Ideas / Talk About Things That Matter | 1=Very well … 4=Not well at all | 1.5/1.8/1.8 | 0.620 |
| `K9Q96` | Other Adult Child Can Rely On | 1=Yes; 2=No | 2.8/3.1/3.5 | 0.505 |
| `K10Q41_R` | Child Is Safe at School | 1=Definitely agree … 4=Definitely disagree | 2.9/3.1/3.6 | 0.535 |
| `HOURSLEEP`, `BEDTIME` | Sleep duration and regular bedtime | ordinal | 1.0–1.2 | 0.557 / 0.515 |
| `SCREENTIME`, `PHYSACTIV` | Screen time; days with 60 min activity | ordinal | 1.1–1.6 | 0.563 / 0.532 |
| `K7Q30`–`K7Q33`, `K7Q37` | Sports, clubs, lessons, events, volunteering | 1=Yes; 2=No / ordinal | 1.2–1.8 | 0.513–0.560 |
| `BMICLASS`, `BODYIMAGE` | BMI percentile class; body-image concern | ordinal | 7.2/6.7/6.9 and ≈0.9 | 0.519 / 0.530 |
| `DRESSING`, `WALKSTAIRS` | Functional difficulty | 1=Yes; 2=No | ≤1.0 | 0.528 / 0.504 |

Note: `K8Q31` and `K8Q32` (parent stress) and `K7Q84_R`/`K7Q85_R` (task persistence, self-control) score close to
the L1 proxies. If any Tier B model is reported, it must state that these items describe current behaviour and parent
experience, not antecedent risk factors.

## 6. Encoding rules (to be applied identically to all years)

1. Read CSVs as strings; blank = missing. Never treat a numeric code as missing.
2. Structural blanks → explicit category `NOT_APPLICABLE` from the documented skip rule; remaining blanks →
   explicit category `MISSING` (categorical) or a missing indicator plus train-fitted imputation (numeric).
3. Nominal variables → one-hot; ordinal Likert-type items → ordered integers (direction recorded) with an optional
   one-hot variant for tree-free models; "Don't know" codes → their own level, never mapped onto the scale.
4. Rare levels (< 1 % in training data) merged into an `OTHER` level, using training data only.
5. Numeric counts (`FAMCOUNT`, `HHCOUNT`, `K11Q43R`, `A1_AGE`, `FPL_I1`) kept numeric; top-codes (e.g. FPL 400 = 400 %+,
   age 70 = 70+) documented as censoring, not true values.
6. All encoders and imputers fitted on training years only and applied unchanged to 2025.
