# NSCH 2023–2025 Data Audit (`NSCH_DATA_AUDIT.md`)

**Component:** Learner Profile & Prediction Engine (SLIIT J26-IT-321) — offline ML research only
**Audit date:** 2026-10-21 · **Status:** Audit complete, awaiting review · **No model has been trained.**

> **Scope and non-claims.** This audit asks whether the National Survey of Children's Health (NSCH) public-use
> topical files support a reproducible supervised baseline for predicting **parent-reported history of being told
> by a doctor or other health care provider that the child has ADD/ADHD**. It is a separate methodological
> experiment. It is **not** clinical ADHD diagnosis, **not** classification of the three DSM-5 presentations,
> **not** prediction of presentation change or individual symptom improvement, **not** IMPSA/IMLR estimation, and
> **not** evidence about MathQuest's effectiveness. Nothing from this experiment is to be used on individual children
> in the MathQuest application.

---

## 1. Inventory of available files

All files are in `ml_experiments/data/raw/<year>/`. They were read only; nothing was modified.

| Year | File | Format | Size (bytes) | Records | Columns | SHA-256 |
| :--- | :--- | :--- | ---: | ---: | ---: | :--- |
| 2023 | `nsch_2023e_topical.csv` | CSV, header row, comma-separated | 43,526,521 | **55,162** | 456 | `754A9946…619A64` |
| 2024 | `nsch_2024e_topical.csv` | CSV | 40,852,293 | **51,375** | 457 | `7B72D5D5…28114C` |
| 2025 | `nsch_2025e_topical.csv` | CSV | 35,889,958 | **45,139** | 458 | `29852FA3…543288` |
| 2023 | `2023-NSCH-Topical-Variable-List.pdf` | PDF, 75 pp., dated 31 Jan 2025 (DRB CBDRB-FY24-0321) | 3,023,675 | — | 456 vars | `47C27BEA…A3D7C6` |
| 2024 | `2024-NSCH-Topical-Variable-List.pdf` | PDF, 74 pp., dated 6 Oct 2025 (DRB CBDRB-FY25-0273) | 1,842,808 | — | 457 vars | `0A889A5B…FF78CC3` |
| 2025 | `2025-NSCH-Topical-Variable-List.pdf` | PDF, 72 pp., dated 2 Oct 2026 (DRB CBDRB-FY26-0307) | 1,690,346 | — | 458 vars | `1DCE1528…5AA69EB4` |

Full SHA-256 values:

```
2023/nsch_2023e_topical.csv                754A99464F4B1DA79CF6B6D363E3497FEFFC66C0D141216D705C852348619A64
2024/nsch_2024e_topical.csv                7B72D5D54645275DF0A33979A4077438CE8747AD4C0B0D7A6628BC1CA828114C
2025/nsch_2025e_topical.csv                29852FA39510FF4427CFE5C9205E42453A44D4E17D879E9CDC49885F30543288
2023/2023-NSCH-Topical-Variable-List.pdf   47C27BEA39C099F9EAAAFD33D3ED1C7460AC8F6FDBED0430225B306336A3D7C6
2024/2024-NSCH-Topical-Variable-List.pdf   0A889A5B7988FD50597B360E92AC3AEDBF1FB1D503CD43FCF90137857FF78CC3
2025/2025-NSCH-Topical-Variable-List.pdf   1DCE15281E1C90FEB5B8DDEFD92A22A82BF0C45F75FB7E633D402B3D5AA69EB4
```

**Consistency check:** every CSV column is documented in its year's variable list and every documented variable
exists in the CSV (0 mismatches in each year). `HHID` is unique per record, so each record is one child from one
household (the NSCH samples one child per household).

### 1.1 What is missing (blocking or partially blocking)

The variable lists are useful but are **not the full official codebook or methodology documentation**. Missing:

| Missing item | Why it matters | Effect on readiness |
| :--- | :--- | :--- |
| **Official codebook / data dictionary defining special missing codes** (`.L`, `.M`, `.N`, `.D`) | The variable lists only mention `.L` inside skip rules (e.g. `Skip if K2Q31B in (2,.L)`); `.M`, `.N` and `.D` are never defined. In the CSV, **every** missing value is an empty cell, so logical skip, no valid response, not-in-universe, don't-know and refused cannot be told apart directly. | Partially blocking: logical skips can be reconstructed from documented skip rules; the remaining blanks can only be treated as "item non-response, type unknown". |
| **SAS/Stata versions of the files** (which normally keep the special missing codes) | Would let us separate refused/don't-know from no-valid-response. | Optional but recommended. |
| **NSCH Methodology Report and the "Guide to analysis with weights / combining years"** for each year | Needed to confirm the correct variance-estimation design (strata, clusters), the weighting method, how to combine years, nonresponse adjustment and the imputation method for `FPL_I1–6`, `A1_GRADE`, `HHCOUNT`, `SC_SEX`, `SC_RACE_R`, `SC_HISPANIC_R`, `TENURE`. | Blocking for design-based uncertainty estimates; not blocking for an unweighted development baseline. |
| **Questionnaires (T2 instrument) for each year** | To confirm question order and context effects (e.g. whether functioning items are asked before or after the condition list). | Recommended. |
| **2023 value labels for `HOUSE_GEN`** (no codes printed) and `LIVEUSA_MO` (values listed without labels) | Cannot label these categories for 2023 from the supplied documents. | Minor; codes are documented in 2024–2025. |

---

## 2. Children aged 6–10

- **Age variable:** `SC_AGE_YEARS` ("Age of Selected Child – In Years"), integer 0–17, **never blank** in any year.
  Children under one year carry additional month flags (`SC_AGE_LT4/LT6/LT9/LT10`), irrelevant for ages 6–10.
- **Questionnaire form:** `FORMTYPE` T1 = ages 0–5, T2 = 6–11, T3 = 12–17 (verified empirically: min/max age per form
  is exactly 0–5, 6–11, 12–17 in all three years). **All children aged 6–10 completed form T2.** Variables marked
  `(T1)` only (e.g. `DISTRACTED`, `SIMPLEADDITION`) are therefore unavailable for this age group.

| Year | Ages 6–10 (unweighted) | Age 6 | Age 7 | Age 8 | Age 9 | Age 10 | Sum of `FWC` (ages 6–10) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2023 | 12,654 | 2,658 | 2,496 | 2,551 | 2,489 | 2,460 | ≈ 20.05 M |
| 2024 | 12,660 | 2,203 | 2,408 | 2,563 | 2,626 | 2,860 | ≈ 20.11 M |
| 2025 | 10,826 | 2,019 | 2,013 | 2,118 | 2,392 | 2,284 | ≈ 20.27 M |

---

## 3. ADHD outcome variables (documented wording and categories)

All six are on forms T1/T2/T3 and are **parent-reported**. Documented codes are exactly as below; the CSV stores no
other codes for these variables. Blank = missing (type not distinguishable in CSV, see §5).

| Variable | Label / wording (abridged) | Documented codes | Universe / skip rule | Years |
| :--- | :--- | :--- | :--- | :--- |
| `K2Q31A` | "Has a doctor or other health care provider **EVER told you** that this child has … ADD or ADHD?" | 1 = Yes, 2 = No | All children | 2023–2025 (identical wording) |
| `K2Q31B` | "If yes, does this child **CURRENTLY** have the condition?" | 1 = Yes, 2 = No | Skip if `K2Q31A=2` | 2023–2025 |
| `K2Q31C` | Severity: "If yes, is it:" | 1 = Mild, 2 = Moderate, 3 = Severe | Skip if `K2Q31B in (2,.L)` | 2023–2025 |
| `K2Q31D` | "Is this child **CURRENTLY taking medication** for ADD or ADHD?" | 1 = Yes, 2 = No | Skip if `K2Q31A=2` | 2023–2025 |
| `ADDTREAT` | "**During the past 12 months**, did this child receive **behavioral treatment** for ADD or ADHD …?" | 1 = Yes, 2 = No | Skip if `K2Q31A=2` | 2023–2025 |
| `MEDSHORT` | "During the past 12 months, have **medication shortages** negatively impacted this child's ADD or ADHD treatment?" | 1 = Yes, 2 = No, 3 = No ADD/ADHD prescription in past 12 months | Skip if `K2Q31A=2` | **2025 only** |

### 3.1 Observed distributions, ages 6–10 (unweighted counts)

| Item | 2023 | 2024 | 2025 |
| :--- | :--- | :--- | :--- |
| `K2Q31A` Yes / No / blank | 1,684 / 10,883 / 87 | 1,886 / 10,678 / 96 | 1,634 / 9,109 / 83 |
| Unweighted "ever told" rate | 13.40 % | 15.01 % | 15.21 % |
| **Weighted** (`FWC`) "ever told" prevalence | **11.82 %** | **12.68 %** | **13.32 %** |
| `K2Q31B` current Yes / No (among `A=1`) | 1,635 / 29 | 1,826 / 43 | 1,577 / 37 |
| `K2Q31C` Mild / Moderate / Severe / blank (among `B=1`) | 571 / 815 / 239 / 10 | 632 / 932 / 259 / 3 | 544 / 792 / 236 / 5 |
| `K2Q31D` medication Yes / No (among `A=1`) | 959 / 715 | 1,110 / 767 | 965 / 659 |
| `ADDTREAT` Yes / No (among `A=1`) | 933 / 749 | 1,014 / 868 | 798 / 828 |
| `MEDSHORT` Yes / No / no prescription | — | — | 346 / 814 / 414 |

Weighted prevalence by single year of age rises from about 8 % at age 6 to 15–18 % at age 10 in every year. Boys are
reported about twice as often as girls (e.g. 2023: 1,178 boys vs 506 girls with `K2Q31A=1`).

### 3.2 Skip-pattern consistency (ages 6–10)

- The follow-up items are answered **only** when `K2Q31A=1`, except for a few records where `K2Q31A` is blank but a
  follow-up was answered: `K2Q31D` answered with blank target 16 / 15 / 17 times (2023/24/25); `K2Q31B` 2 / 1 / 1 times.
  **These records must not be relabelled from their follow-ups**; they are excluded from the labelled set.
- Records with `K2Q31A=1` but a blank follow-up exist (e.g. `K2Q31B` blank: 20 / 17 / 20) — item non-response.
- No `K2Q31A=2` record has any follow-up answered (skip logic respected).

---

## 4. Label validity: what this outcome is and is not

- **Parent recall of being told**, not a verified diagnosis. No medical records, clinician assessment, DSM-5
  criteria, rating scales or multi-informant information are present.
- **No presentation subtype** (inattentive / hyperactive-impulsive / combined) exists anywhere in the files, so the
  data **cannot** provide clinically verified presentation labels.
- **"Ever told"** includes children whose condition is reported as no longer current (29–43 per year at 6–10).
- **Severity** (`K2Q31C`) is the parent's description, not a clinical severity rating.
- **Cross-sectional:** each year is an independent sample of different households. There is **no child-level
  linkage across years**, so true longitudinal outcomes (presentation change, symptom improvement, treatment response)
  cannot be studied. 2023 → 2025 differences are population-level, not within-child change.
- **Detection and access bias:** whether a child has been "told" depends on access to care, insurance, state, school
  referral practices and cultural factors, not only on the child's behaviour.
- **Population:** US children; findings do not transfer to Sri Lankan children or to MathQuest users.

---

## 5. Missing-data representation and patterns

- **Encoding:** blank cell = missing of any kind. Explicit "don't know" exists only where it is a documented answer
  code (e.g. `BLOOD_SCREEN` 3 = "Don't Know" from 2025; `DENTALSERV7`).
- **Structural (logical-skip) blanks** are large for follow-up items (e.g. `K2Q31B` ≈ 86 % blank at ages 6–10 because
  most children have `K2Q31A=2`). These can be reconstructed from the documented skip rules and are **not** missing
  information; they mean "not applicable".
- **Item non-response** for core child/household variables at ages 6–10 is generally ≤ 4 %; Adult-2 items are blank
  ≈ 17 % mainly because there is no second adult (`A2_RELATION = 8` skip); `MPC_YN` ≈ 14 %, `METRO_YN` ≈ 10 % and
  `CBSAFP_YN` 27–40 % are blank for disclosure/geography reasons; `BIRTHWT` ≈ 5 %.
- With a 46-variable candidate context set (Tier A in the feature dictionary), only **≈ 65 % of training records and
  ≈ 64 % of 2025 records are complete cases** → complete-case analysis would discard about a third of the data and is
  not recommended.
- **Imputed variables** (with `_IF` flags): `A1_GRADE`, `HHCOUNT`, `SC_SEX`, `SC_RACE_R`, `SC_HISPANIC_R`, `TENURE`;
  family poverty ratio has **six multiple-imputation implicates** `FPL_I1`–`FPL_I6` (+ `FPL_IF`).

---

## 6. Survey design and sampling

| Element | Variable | Observation |
| :--- | :--- | :--- |
| Child weight | `FWC` | Present every year; ages 6–10 weights range ≈ 20–58,000 (max/min ratio ≈ 2,700) → large design effect; unweighted and weighted prevalences differ by 1.5–2 points. |
| State | `FIPSST` | 51 values (50 states + DC). The unweighted state mix changes by year (largest sample: California 2023, California 2024, Kansas 2025), so **unweighted** composition shifts between years. |
| Stratum | `STRATUM` | Values `1` and `2A` (documented in the question text as "2A = Stratum 2a"). |
| Cluster / household | `HHID` | Unique per record (one child per household). No separate PSU variable. |
| Year | `YEAR` | Constant per file. |

**To be verified against the (missing) methodology documents:** the usual NSCH guidance is to define strata as
`FIPSST × STRATUM`, treat `HHID` as the cluster, and divide weights by the number of years when pooling years.
These rules are **not** stated in the supplied files and must be confirmed before reporting design-based estimates.

Sampling limitations visible in the supplied files: one child per household, large weight variation, disclosure-
limited geography (`MPC_YN`, `METRO_YN`, `CBSAFP_YN` partly blank), household language limited to English / Spanish /
Other (`HHLANGUAGE`), US-only. Details such as the sampling frame, data-collection modes, response rates and
nonresponse adjustment are described in the NSCH methodology reports, which are **not** among the supplied files and
must be consulted before publication.

---

## 7. Cross-year comparability (2023 → 2025)

- **ADHD items:** identical wording and codes for `K2Q31A–D` and `ADDTREAT` in all three years. `MEDSHORT` is new in 2025.
- **Variables not present in every year (exclude from cross-year models):** `ASTHMAATTACK` (2025), `CYSTFIB_DESC`
  (2024–25), `CYSTFIB_SCREEN` (2023–24), `EVALFASD` (2023–24), `FASD_YEARS` (2025), `HOURSOFCARE` (2025),
  `MEDSHORT` (2025), `MOVES` (2024–25), `MULTIPLECOND` (2025), `OUTDOORSWKDAY`/`OUTDOORSWKEND` (2023–24), `PLACESLIVED` (2023).
- **Coding/form changes among common variables (17 detected; most are wording-only):** substantive ones are
  `BLOOD_SCREEN` (adds 3 = Don't Know in 2025); `FRUIT`, `VEGETABLES`, `SUGARDRINK` (moved from T1-only to all forms in
  later years — not comparable for ages 6–10 across years); `HOUSE_GEN`/`LIVEUSA_MO` (2023 labels missing from
  documentation); `ALLERGIES_DESC` (2023 data contain codes 1/2/3 while the 2023 list documents 1 = Mild,
  4 = Moderate/Severe → data/documentation mismatch). Wording-only: `A1_GRADE`, `A2_GRADE`, `INSTYPE`, `K5Q20_R`,
  `WGTCONC`, `DRAWAFACE`, `HOURSLEEP05`.
- **Prevalence drift:** weighted "ever told" prevalence at ages 6–10 rises 11.8 % → 12.7 % → 13.3 %. A temporal test
  must account for this (calibration-in-the-large will shift).

---

## 8. Target-leakage audit (summary)

Leakage was assessed in two ways: (a) conceptually, from wording and skip rules; (b) empirically, with a
**univariate screen** on pooled 2023–2024 ages 6–10: for each variable, the in-sample ROC-AUC of predicting
`K2Q31A=1` from its per-category target rate (blank as its own category). This is a screening statistic, not a model.

| Leakage class | Examples (univariate AUC) | Decision |
| :--- | :--- | :--- |
| **Target and target-derived** | `ADDTREAT` 0.999, `K2Q31D` 0.997, `K2Q31B` 0.995, `K2Q31C` 0.983, `MEDSHORT` | **Never predictors** (their blank/non-blank pattern alone encodes the target). |
| **Direct proxies / screener items covering ADHD** | `SC_CSHCN` 0.835, `TOTCSHCN` 0.806, `K4Q23` emotions/concentration/behaviour medication 0.784, `SC_K2Q22`/`SC_K2Q23` need treatment for emotional/behavioural condition 0.78, `SC_K2Q10–12` medication 0.77, `HCABILITY` 0.766, `MEMORYCOND` serious difficulty concentrating 0.763, `TOTNONSHCN` 0.753 | **Excluded** from all reported models. |
| **Treatment / services / system contact likely downstream of diagnosis** | `K4Q22_R` 0.714, `TREATNEED`, `K6Q15` special-education plan 0.687, `SESCURRSVC`, `SESPLANYR`, `K4Q36–K4Q38` special services, care-coordination and decision items | **Excluded** from the primary model. |
| **Co-occurring diagnoses from the same "ever told" battery** | `K2Q34A` behaviour/conduct 0.756, `K2Q33A` anxiety 0.664, `K2Q30A` learning disability 0.646, autism, speech, developmental delay | Excluded from the primary model; allowed only in a clearly labelled sensitivity model. |
| **Contemporaneous functioning / behaviour (symptom-adjacent)** | `K8Q31` child hard to care for 0.750, `K7Q85_R` stays calm 0.736, `K7Q84_R` finishes tasks 0.733, `K7Q04R_R` school contacted about problems 0.705, `MAKEFRIEND` 0.684, `BULLIED_R` 0.664, `GRADES` 0.652 | Not leakage in the strict sense, but measured at the same time and possibly caused by the condition or its treatment. Only in a separately labelled "functional-profile" model. |
| **Stable / contextual characteristics** | `SC_SEX` 0.595, `SC_AGE_YEARS` 0.571, household, socio-economic, birth and family context (all ≤ ≈ 0.60 individually) | Candidate predictors for the primary model. |

52 variables have univariate AUC ≥ 0.65; none of the stable context variables does. **Because the survey is
cross-sectional, no variable can be proven to precede the outcome**; "before the target" can only be approximated by
characteristics that are stable or fixed early in life (sex, birth weight, prematurity, nativity, family context).
The full classification is in `NSCH_FEATURE_DICTIONARY.md`.

---

## 9. Readiness verdict

| Question | Answer |
| :--- | :--- |
| Are the three years' data files present and readable? | **Yes** (CSV + variable list for 2023, 2024, 2025). |
| Is a binary, documented, consistently-worded label available? | **Yes** — `K2Q31A` (parent-reported "ever told"), plus `K2Q31B` (current) as a secondary definition. |
| Enough labelled cases at ages 6–10? | **Yes** — train 2023+2024: 25,131 labelled (3,570 positive, 14.2 %); 2025: 10,743 labelled (1,634 positive, 15.2 %). |
| Clinically verified or presentation-level labels? | **No — not available in this dataset and must not be claimed.** |
| Child-level longitudinal outcomes? | **No — independent cross-sections.** |
| Ready to train? | **Conditionally.** A development baseline is technically feasible, but before training: (1) obtain the official codebook/methodology documents (§1.1); (2) approve the feature tiers and the target definition; (3) approve installing a modelling library (scikit-learn is **not** installed; pandas/numpy are). |

---

## 10. How this audit was produced (reproducibility)

1. Read each CSV with pandas as **strings with no NA conversion** (`dtype=str, keep_default_na=False`) so that
   blanks and codes are seen exactly as stored; counted rows, columns, per-variable values and blanks.
2. Extracted the variable-list PDFs to text (pypdf) and parsed each entry (name, label, forms, question, codes, skip notes).
3. Cross-checked CSV columns against the variable lists; compared codes and forms across years.
4. Restricted to `SC_AGE_YEARS` 6–10, computed counts, `FWC`-weighted prevalence, skip-pattern cross-tabulations and
   per-variable blank shares.
5. Ran the univariate leakage screen on pooled 2023–2024 ages 6–10.

The audit scripts were run from a temporary working directory and are **not committed**, because this task was
limited to documentation. They can be added under `ml_experiments/` after review if required.

**Git:** `ml_experiments/data/raw/` is already excluded by the repository `.gitignore` (lines 38–39) and none of the
raw files are tracked. Before any derived child-level files are created, a matching ignore rule for derived data
(e.g. `ml_experiments/data/processed/`) should be added.
