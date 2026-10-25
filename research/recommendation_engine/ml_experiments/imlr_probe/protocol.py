"""Versioned IMLR probe protocol definition (Grade 1, research prototype)."""

from typing import Dict, List, Tuple

PROTOCOL_ID = "IMLR-PROBE-G1"
PROTOCOL_VERSION = "0.1.0-prototype"
PROTOCOL_STATUS = "RESEARCH_PROTOTYPE_NOT_FOR_USE_WITH_CHILDREN"
SNAPSHOT_SCHEMA_VERSION = "IMLR-SNAPSHOT-v0.1"
OUTCOME_SCHEMA_VERSION = "IMLR-OUTCOME-v0.1"

# Item roles
PRE = "pre"
TEACHING = "teaching"
TRANSFER = "transfer"
ROLES = (PRE, TEACHING, TRANSFER)

# Phase sequence and item counts (Decision 1: every learner receives the teaching phase)
PHASES: Tuple[Tuple[str, int], ...] = ((PRE, 2), (TEACHING, 2), (TRANSFER, 3))
TEACHING_IS_UNIVERSAL = True

RESPONSE_FORMAT = "select_one_of_3"
N_OPTIONS = 3
CHANCE_LEVEL = 1 / N_OPTIONS

# Help policy per role
HELP_POLICY: Dict[str, str] = {
    PRE: "on_child_request_only",
    TEACHING: "built_in_standardised_script",   # L1 clarify -> L2 visual cue -> L3 worked demonstration
    TRANSFER: "on_child_request_only",
}
SUPPORT_LEVELS = {1: "clarification", 2: "visual_cue", 3: "worked_demonstration"}
SUPPORT_ORIGINS = ("protocol", "child_request")

# Visual presentation varied independently of the correct answer (Decision 3)
PATTERNS = ("row", "grid", "scatter")
SPACINGS = ("tight", "medium", "wide")
EXTENT_MODES = ("equal_spacing", "equal_extent")   # neither total length nor density consistently signals "most"

NON_CLAIMS: List[str] = [
    "Research prototype only; not a validated educational or clinical instrument.",
    "A correct transfer response does not prove permanent or genuine learning.",
    "The teaching phase is not claimed to cause any improvement.",
    "Three transfer questions do not constitute a validated learning-readiness measure.",
    "No mastery, frustration or readiness thresholds are applied.",
    "No ADHD diagnosis, presentation or symptom change is inferred; ADHD reports and SNAP-IV are never used.",
]

APPROVALS_REQUIRED: List[str] = [
    "Primary mathematics educators: concept, number range, item-model cell, items, response format, Sinhala wording, "
    "session length.",
    "Clinical supervisor: universal teaching phase, neutral feedback, breaks and help-on-request, reporting wording "
    "and audience, data minimisation.",
    "Ethics approval and consent for research use of the recorded fields.",
    "Component 1 sign-off before any integration into the onboarding journey (feature-flagged, separate protocol).",
]


def protocol_descriptor() -> Dict[str, object]:
    return {
        "protocolId": PROTOCOL_ID,
        "protocolVersion": PROTOCOL_VERSION,
        "status": PROTOCOL_STATUS,
        "phases": [{"role": r, "items": n} for r, n in PHASES],
        "teachingIsUniversal": TEACHING_IS_UNIVERSAL,
        "responseFormat": RESPONSE_FORMAT,
        "chanceLevel": CHANCE_LEVEL,
        "helpPolicy": HELP_POLICY,
        "nonClaims": NON_CLAIMS,
        "approvalsRequired": APPROVALS_REQUIRED,
    }
