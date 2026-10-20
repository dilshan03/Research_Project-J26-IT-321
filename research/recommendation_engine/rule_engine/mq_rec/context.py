"""
Versioned learner-context input (MQ-LEARNER-CONTEXT-v0.1).

Every input group is optional except `learnerRef` and `grade`, and carries its own provenance.
Missing values stay `None`; nothing is defaulted or estimated here.

Parent-reported ADHD information and clinician-documented reference labels are separate types,
so they can never be confused. Neither is used by any educational rule.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

SCHEMA_VERSION = "MQ-LEARNER-CONTEXT-v0.1"

SOURCES = {"child", "parent", "assessment", "telemetry", "system", "clinician"}

# Allowed values mirror the existing onboarding contracts (read-only reference).
SOUND_MODES = {"gentle", "quiet", "off"}
VISUAL_ASSISTANCE = {"always", "sometimes", "minimal"}
AUDIO_ASSISTANCE = {"read_everything", "read_on_click", "off"}
ACTIVITY_PACE = {"calm_step_by_step", "regular", "flexible"}
HINT_STYLE = {"visual_clue", "step_guide", "audio_hint"}
CELEBRATION_STYLE = {"gentle_star", "badge_sound", "minimal"}
LEARNING_ENVIRONMENT = {"quiet_room", "shared_living_space", "with_parent_nearby"}
PEER_COLLABORATION = {"independent_first", "with_sibling_peer", "group_friendly"}
PARENT_INVOLVEMENT = {"guided_together", "check_in_after", "child_independent"}
CHALLENGING_TASK_SUPPORT = {"take_a_break", "break_down_step", "parent_hug_reassurance"}
SKILL_LEVELS = {"PROFICIENT", "DEVELOPING", "EMERGING", "INSUFFICIENT_EVIDENCE"}
INPUT_METHODS = {"drag", "tap", "select"}
DIAGNOSIS_STATUS = {"yes", "no", "not_sure", "prefer_not_to_say"}
REPORTED_PRESENTATION = {
    "predominantly_inattentive", "predominantly_hyperactive_impulsive", "combined", "not_specified",
}


class ContextValidationError(ValueError):
    """Raised when a learner context is malformed. Invalid input is rejected, never repaired."""


@dataclass(frozen=True)
class Provenance:
    source: str
    instrument: Optional[str] = None
    collectedAt: Optional[str] = None
    verificationStatus: str = "NOT_VERIFIED"


@dataclass(frozen=True)
class ChildPreferences:
    provenance: Provenance
    soundMode: Optional[str] = None
    theme: Optional[str] = None
    avatarId: Optional[str] = None


@dataclass(frozen=True)
class ParentLearningPreferences:
    provenance: Provenance
    visualAssistance: Optional[str] = None
    audioAssistance: Optional[str] = None
    activityPace: Optional[str] = None
    hintStyle: Optional[str] = None
    celebrationStyle: Optional[str] = None


@dataclass(frozen=True)
class SocialContext:
    provenance: Provenance
    learningEnvironment: Optional[str] = None
    peerCollaboration: Optional[str] = None
    parentInvolvement: Optional[str] = None
    challengingTaskSupport: Optional[str] = None


@dataclass(frozen=True)
class SkillEvidence:
    """One ELP-X skill estimate, consumed as-is (no Bayesian recalculation here)."""

    skillId: str
    provisionalSkillLevel: str
    distinctQuestionsAssessed: Optional[int] = None
    isEvidenceSufficient: Optional[bool] = None
    skillName: Optional[str] = None


@dataclass(frozen=True)
class MathEvidence:
    provenance: Provenance
    skills: Tuple[SkillEvidence, ...] = ()


@dataclass(frozen=True)
class InteractionObservations:
    """Interface observations. Recorded only; never treated as maths or attention evidence."""

    provenance: Provenance
    missedDropCount: Optional[int] = None
    inputMethod: Optional[str] = None
    responseLatencySeconds: Optional[float] = None


@dataclass(frozen=True)
class ParentReportedAdhdContext:
    """Unverified parent recall. Never a clinical label and never used to select support."""

    provenance: Provenance
    diagnosisStatus: Optional[str] = None
    reportedPresentation: Optional[str] = None


@dataclass(frozen=True)
class SnapIvSummary:
    """Optional parent questionnaire summary. Not used by any enabled rule (no cutoffs applied)."""

    provenance: Provenance
    inattentionAverage: Optional[float] = None
    hyperactivityAverage: Optional[float] = None


@dataclass(frozen=True)
class ClinicalReference:
    """Clinician-documented reference label (offline research only). Never used by educational rules."""

    provenance: Provenance
    label: Optional[str] = None


@dataclass(frozen=True)
class LearnerContext:
    schemaVersion: str
    learnerRef: str
    grade: int
    childPreferences: Optional[ChildPreferences] = None
    learningPreferences: Optional[ParentLearningPreferences] = None
    socialContext: Optional[SocialContext] = None
    mathEvidence: Optional[MathEvidence] = None
    interactionObservations: Optional[InteractionObservations] = None
    parentReportedAdhdContext: Optional[ParentReportedAdhdContext] = None
    snapIvSummary: Optional[SnapIvSummary] = None
    clinicalReference: Optional[ClinicalReference] = None
    notes: Dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "LearnerContext":
        return _parse_context(data)


# --------------------------------------------------------------------------------------------
# Parsing and validation
# --------------------------------------------------------------------------------------------

def _require(cond: bool, message: str) -> None:
    if not cond:
        raise ContextValidationError(message)


def _enum(value: Any, allowed: set, name: str) -> Optional[str]:
    if value is None:
        return None
    _require(value in allowed, f"{name}={value!r} is not one of {sorted(allowed)}")
    return value


def _provenance(raw: Any, group: str, expected_sources: set) -> Provenance:
    _require(isinstance(raw, dict), f"{group}.provenance is required")
    source = raw.get("source")
    _require(source in SOURCES, f"{group}.provenance.source={source!r} is not a known source")
    _require(source in expected_sources, f"{group}.provenance.source must be one of {sorted(expected_sources)}")
    return Provenance(
        source=source,
        instrument=raw.get("instrument"),
        collectedAt=raw.get("collectedAt"),
        verificationStatus=raw.get("verificationStatus", "NOT_VERIFIED"),
    )


def _group(data: Dict[str, Any], key: str) -> Optional[Dict[str, Any]]:
    raw = data.get(key)
    if raw is None:
        return None
    _require(isinstance(raw, dict), f"{key} must be an object")
    return raw


def _parse_context(data: Dict[str, Any]) -> LearnerContext:
    _require(isinstance(data, dict), "learner context must be an object")
    _require(data.get("schemaVersion") == SCHEMA_VERSION,
             f"schemaVersion must be {SCHEMA_VERSION!r} (got {data.get('schemaVersion')!r})")
    learner_ref = data.get("learnerRef")
    _require(isinstance(learner_ref, str) and learner_ref.strip() != "", "learnerRef (pseudonymous) is required")
    grade = data.get("grade")
    _require(isinstance(grade, int) and not isinstance(grade, bool) and 1 <= grade <= 5,
             "grade is required and must be an integer from 1 to 5")

    child = None
    if (raw := _group(data, "childPreferences")) is not None:
        # Any source is accepted for the record, but only source 'child' activates child-agency rules.
        child = ChildPreferences(
            provenance=_provenance(raw.get("provenance"), "childPreferences", {"child", "parent", "system"}),
            soundMode=_enum(raw.get("soundMode"), SOUND_MODES, "childPreferences.soundMode"),
            theme=raw.get("theme"),
            avatarId=raw.get("avatarId"),
        )

    prefs = None
    if (raw := _group(data, "learningPreferences")) is not None:
        prefs = ParentLearningPreferences(
            provenance=_provenance(raw.get("provenance"), "learningPreferences", {"parent"}),
            visualAssistance=_enum(raw.get("visualAssistance"), VISUAL_ASSISTANCE, "visualAssistance"),
            audioAssistance=_enum(raw.get("audioAssistance"), AUDIO_ASSISTANCE, "audioAssistance"),
            activityPace=_enum(raw.get("activityPace"), ACTIVITY_PACE, "activityPace"),
            hintStyle=_enum(raw.get("hintStyle"), HINT_STYLE, "hintStyle"),
            celebrationStyle=_enum(raw.get("celebrationStyle"), CELEBRATION_STYLE, "celebrationStyle"),
        )

    social = None
    if (raw := _group(data, "socialContext")) is not None:
        social = SocialContext(
            provenance=_provenance(raw.get("provenance"), "socialContext", {"parent"}),
            learningEnvironment=_enum(raw.get("learningEnvironment"), LEARNING_ENVIRONMENT, "learningEnvironment"),
            peerCollaboration=_enum(raw.get("peerCollaboration"), PEER_COLLABORATION, "peerCollaboration"),
            parentInvolvement=_enum(raw.get("parentInvolvement"), PARENT_INVOLVEMENT, "parentInvolvement"),
            challengingTaskSupport=_enum(raw.get("challengingTaskSupport"), CHALLENGING_TASK_SUPPORT,
                                         "challengingTaskSupport"),
        )

    math = None
    if (raw := _group(data, "mathEvidence")) is not None:
        skills = []
        seen = set()
        for s in raw.get("skills") or []:
            _require(isinstance(s, dict) and isinstance(s.get("skillId"), str), "each skill needs a skillId")
            _require(s["skillId"] not in seen, f"duplicate skillId {s['skillId']!r}")
            seen.add(s["skillId"])
            n = s.get("distinctQuestionsAssessed")
            _require(n is None or (isinstance(n, int) and n >= 0), "distinctQuestionsAssessed must be >= 0")
            skills.append(SkillEvidence(
                skillId=s["skillId"],
                provisionalSkillLevel=_enum(s.get("provisionalSkillLevel"), SKILL_LEVELS, "provisionalSkillLevel")
                or _missing_level(s["skillId"]),
                distinctQuestionsAssessed=n,
                isEvidenceSufficient=s.get("isEvidenceSufficient"),
                skillName=s.get("skillName"),
            ))
        math = MathEvidence(
            provenance=_provenance(raw.get("provenance"), "mathEvidence", {"assessment"}),
            skills=tuple(skills),
        )

    obs = None
    if (raw := _group(data, "interactionObservations")) is not None:
        drops = raw.get("missedDropCount")
        _require(drops is None or (isinstance(drops, int) and drops >= 0), "missedDropCount must be >= 0")
        latency = raw.get("responseLatencySeconds")
        _require(latency is None or (isinstance(latency, (int, float)) and latency >= 0),
                 "responseLatencySeconds must be >= 0")
        obs = InteractionObservations(
            provenance=_provenance(raw.get("provenance"), "interactionObservations", {"telemetry", "assessment"}),
            missedDropCount=drops,
            inputMethod=_enum(raw.get("inputMethod"), INPUT_METHODS, "inputMethod"),
            responseLatencySeconds=latency,
        )

    adhd = None
    if (raw := _group(data, "parentReportedAdhdContext")) is not None:
        prov = _provenance(raw.get("provenance"), "parentReportedAdhdContext", {"parent"})
        _require(prov.verificationStatus == "NOT_VERIFIED",
                 "parent-reported ADHD context must have verificationStatus 'NOT_VERIFIED'; "
                 "clinician-documented labels belong in clinicalReference")
        adhd = ParentReportedAdhdContext(
            provenance=prov,
            diagnosisStatus=_enum(raw.get("diagnosisStatus"), DIAGNOSIS_STATUS, "diagnosisStatus"),
            reportedPresentation=_enum(raw.get("reportedPresentation"), REPORTED_PRESENTATION, "reportedPresentation"),
        )

    snap = None
    if (raw := _group(data, "snapIvSummary")) is not None:
        for key in ("inattentionAverage", "hyperactivityAverage"):
            v = raw.get(key)
            _require(v is None or (isinstance(v, (int, float)) and 0 <= v <= 3), f"{key} must be within 0-3")
        snap = SnapIvSummary(
            provenance=_provenance(raw.get("provenance"), "snapIvSummary", {"parent"}),
            inattentionAverage=raw.get("inattentionAverage"),
            hyperactivityAverage=raw.get("hyperactivityAverage"),
        )

    clinical = None
    if (raw := _group(data, "clinicalReference")) is not None:
        clinical = ClinicalReference(
            provenance=_provenance(raw.get("provenance"), "clinicalReference", {"clinician"}),
            label=raw.get("label"),
        )

    return LearnerContext(
        schemaVersion=SCHEMA_VERSION,
        learnerRef=learner_ref,
        grade=grade,
        childPreferences=child,
        learningPreferences=prefs,
        socialContext=social,
        mathEvidence=math,
        interactionObservations=obs,
        parentReportedAdhdContext=adhd,
        snapIvSummary=snap,
        clinicalReference=clinical,
        notes=dict(data.get("notes") or {}),
    )


def _missing_level(skill_id: str) -> str:
    raise ContextValidationError(f"skill {skill_id!r} needs a provisionalSkillLevel from ELP-X")


def load_context(path: Path | str) -> Tuple[LearnerContext, Dict[str, Any]]:
    """Loads a JSON scenario; returns the parsed context and the raw (anonymised) input."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return LearnerContext.from_dict(raw), raw
