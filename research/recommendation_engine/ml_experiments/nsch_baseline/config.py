"""
Experiment configuration: paths, seed, target, the conservative Tier A feature allowlist and the leakage
exclusion lists. Sources: NSCH_DATA_AUDIT.md and NSCH_FEATURE_DICTIONARY.md.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]                 # research/recommendation_engine/ml_experiments
RAW_DIR = ROOT / "data" / "raw"
ARTIFACT_DIR = ROOT / "artifacts" / "nsch_k2q31a_v1"
REPORT_PATH = ROOT / "NSCH_EXPERIMENT_REPORT.md"

EXPERIMENT_ID = "NSCH-K2Q31A-BASELINE-v1"
SEED = 20261021
VALIDATION_FRACTION = 0.20
AGE_MIN, AGE_MAX = 6, 10

TARGET = "K2Q31A"            # 1 = Yes (ever told ADD/ADHD), 2 = No; blank = excluded
TARGET_POSITIVE, TARGET_NEGATIVE = "1", "2"

DEVELOPMENT_YEARS = (2023, 2024)   # training + validation only
TEST_YEAR = 2025                   # held out; evaluated once, after the pipeline is frozen

# SHA-256 of the raw CSVs recorded in NSCH_DATA_AUDIT.md (verified before use)
RAW_FILES = {
    2023: ("2023/nsch_2023e_topical.csv", "754A99464F4B1DA79CF6B6D363E3497FEFFC66C0D141216D705C852348619A64"),
    2024: ("2024/nsch_2024e_topical.csv", "7B72D5D54645275DF0A33979A4077438CE8747AD4C0B0D7A6628BC1CA828114C"),
    2025: ("2025/nsch_2025e_topical.csv", "29852FA39510FF4427CFE5C9205E42453A44D4E17D879E9CDC49885F30543288"),
}

# ---------------------------------------------------------------------------------------------
# Primary-feature allowlist: Tier A (stable / contextual characteristics) from the feature dictionary.
# Nothing outside this list can enter the model.
# ---------------------------------------------------------------------------------------------
NUMERIC_FEATURES = [
    "SC_AGE_YEARS", "TOTAGE_0_5", "TOTAGE_6_11", "TOTAGE_12_17", "FAMCOUNT", "HHCOUNT", "A1_AGE", "FPL_I1", "K11Q43R",
]
CATEGORICAL_FEATURES = [
    # child
    "SC_SEX", "SC_RACE_R", "SC_HISPANIC_R", "BORNUSA", "HOUSE_GEN", "HHLANGUAGE", "SC_ENGLISH", "BIRTHWT", "K2Q05",
    "AGEPOS4",
    # household and caregiver
    "TOTKIDS_R", "FAMILY_R", "HIGRADE", "A1_GRADE", "A1_SEX", "A1_RELATION", "A1_BORN", "A1_MARITAL", "A1_EMPLOYED_R",
    "A1_ACTIVE", "A1_MENTHEALTH", "A1_PHYSHEALTH", "A2_RELATION",
    # economic context
    "TENURE", "FOODSIT", "ACE1", "K11Q60", "K11Q61", "K11Q62", "S9Q34", "EBTCARDS", "HOMEEVIC", "MISSMORTGAGE",
    "EVERHOMELESS",
    # coverage and geography (also reflect access to diagnosis)
    "CURRINS", "INSTYPE", "INSGAP", "METRO_YN", "MPC_YN",
    # household environment and adverse experiences
    "K9Q40", "VAPE", "ACE3", "ACE4", "ACE5", "ACE6", "ACE7", "ACE8", "ACE9", "ACE10",
    # neighbourhood and family resilience
    "K10Q11", "K10Q12", "K10Q13", "K10Q14", "K10Q20", "K10Q22", "K10Q23", "K10Q30", "K10Q31", "K10Q40_R",
    "K8Q35", "TALKABOUT", "WKTOSOLVE", "STRENGTHS", "HOPEFUL", "K8Q11",
]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# ---------------------------------------------------------------------------------------------
# Never allowed as predictors (checked by tests and at training time)
# ---------------------------------------------------------------------------------------------
OUTCOME_VARIABLES = {"K2Q31A", "K2Q31B", "K2Q31C", "K2Q31D", "ADDTREAT", "MEDSHORT"}
DESIGN_AND_IDENTIFIERS = {"HHID", "YEAR", "FORMTYPE", "FWC", "STRATUM", "FIPSST", "BIRTH_YR", "BIRTH_MO", "BIRTH_YR_F",
                          "CBSAFP_YN", "FPL_I2", "FPL_I3", "FPL_I4", "FPL_I5", "FPL_I6"}
L1_DIRECT_PROXIES = {"SC_CSHCN", "TOTCSHCN", "TOTNONSHCN", "K4Q23", "K4Q22_R", "TREATNEED", "HCABILITY", "HCEXTENT",
                     "MEMORYCOND"} | {f"SC_K2Q{n}" for n in range(10, 24)}
L2_SERVICES_TREATMENT = {
    "K6Q15", "SESCURRSVC", "SESPLANYR", "SESPLANMO", "K4Q36", "K4Q37", "K4Q38", "SPCSERVMO", "K4Q24_R", "K4Q26",
    "K5Q10", "K5Q11", "K5Q20_R", "K5Q21", "K5Q22", "K5Q30", "K5Q31_R", "K5Q32", "DECISIONS_R", "BESTFORCHILD",
    "DISCUSSOPT", "RAISECONC", "K4Q27", "K4Q28X01", "K4Q28X02", "K4Q28X03", "K4Q28X04", "K4Q28X05", "K4Q28X_EAR",
    "APPOINTMENT", "AVAILABLE", "ISSUECOST", "NOTELIG", "NOTOPEN", "TRANSPORTCC", "C4Q04", "ARRANGEHC", "ATHOMEHC",
    "CUTHOURS", "STOPWORK", "AVOIDCHG", "SSI", "SSIDISABILITY", "ACE11",
}
L3_CODIAGNOSES = {f"K2Q{q}{s}" for q in (30, 32, 33, 34, 35, 36, 37, 38, 60) for s in "ABC"} | {
    "K2Q35A_1_YEARS", "K2Q35D", "AUTISMMED", "AUTISMTREAT", "K2Q61A", "CERPALS_DESC", "K2Q42A", "K2Q42B", "K2Q42C",
    "FASD", "RECEVALFASD", "EVALFASD",
}
TIER_B_CONTEMPORANEOUS = {
    "K2Q01", "K7Q84_R", "K7Q85_R", "K7Q70_R", "K7Q82_R", "K7Q83_R", "K7Q04R_R", "K7Q02R_R", "MAKEFRIEND", "BULLIED_R",
    "BULLY", "GRADES", "REPEATED", "K6Q71_R", "K8Q30", "K8Q31", "K8Q32", "K8Q34", "K8Q21", "K9Q96", "K10Q41_R",
    "HOURSLEEP", "BEDTIME", "SCREENTIME", "PHYSACTIV", "K7Q30", "K7Q31", "K7Q32", "K7Q33", "K7Q37", "BMICLASS",
    "BODYIMAGE", "DRESSING", "WALKSTAIRS",
}
FORBIDDEN_FEATURES = (OUTCOME_VARIABLES | DESIGN_AND_IDENTIFIERS | L1_DIRECT_PROXIES | L2_SERVICES_TREATMENT
                      | L3_CODIAGNOSES | TIER_B_CONTEMPORANEOUS)

# Columns that may identify a respondent and must never be displayed
NEVER_DISPLAY = {"HHID", "FIPSST", "STRATUM", "FWC", "YEAR", "BIRTH_YR", "BIRTH_MO"}

# Leakage guard: no allowed feature may predict the target this well on its own (audit screen threshold)
MAX_UNIVARIATE_AUC = 0.65

DISCLAIMER = (
    "The outcome is K2Q31A: whether a PARENT REPORTS that a doctor or other health care provider has EVER told them "
    "the child has ADD/ADHD (US survey data, 2023-2025). This is not a clinical diagnosis, not an ADHD presentation, "
    "and not a prediction about any real MathQuest learner. Research demonstration only."
)
