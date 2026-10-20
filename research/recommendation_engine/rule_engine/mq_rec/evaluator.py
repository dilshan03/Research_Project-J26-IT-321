"""
Recommendation evaluator (MQ-REC v0.1).

Runs every registered rule in a fixed order, records a trace for each (including disabled rules),
attaches provenance and evidence (MQ-RS6-03), orders recommendations by priority, adds missing-data
and uncertainty notices, and finally applies the non-diagnostic guardrail (MQ-RS6-01).
The result is a plain dict and is fully deterministic for a given input.
"""

from __future__ import annotations

from typing import Any, Dict, List

from . import guardrails
from .context import SCHEMA_VERSION, LearnerContext
from .evidence import evidence_for
from .rules import DISABLED, REGISTRY, SAFEGUARD_APPLIED, TRIGGERED

RULESET_VERSION = "MQ-REC-v0.1"

REQUIRED_PROVENANCE_FIELDS = ("recommendationId", "ruleId", "strategyCode", "reasonCodes", "inputEvidenceSummary")

# ELP-X-REC v1.0 baseline strategy codes; this prototype must not re-emit them.
ELPX_BASELINE_CODES = frozenset({
    "ASSESSMENT_EXPANSION", "SUPPORTED_PRACTICE", "SCAFFOLDED_PRACTICE", "CHALLENGE_EXTENSION",
    "AUDIO_INSTRUCTION", "VISUAL_DEMONSTRATION", "COLLABORATIVE_LEARNING", "ADAPTIVE_HINT_PACING",
    "UNTIMED_MASTERY_PRACTICE",
})

# Child preferences and maths evidence get more specific notices from MQ-RS1-01 and MQ-RS3-03.
_GROUPS = (
    ("learningPreferences", "Parent learning preferences", "preference-based rules were not applied"),
    ("socialContext", "Social context", "no social-context adjustments were made"),
    ("interactionObservations", "Interaction observations", "no interface observations were considered"),
)


def _context_notices(ctx: LearnerContext) -> List[Dict[str, str]]:
    notices = []
    for attr, label, effect in _GROUPS:
        if getattr(ctx, attr) is None:
            notices.append({"code": "INPUT_MISSING",
                            "message": f"{label} not provided: {effect}. No values were assumed."})

    if ctx.parentReportedAdhdContext is not None:
        notices.append({"code": "PARENT_REPORT_NOT_USED",
                        "message": "Parent-reported ADHD information is recorded as unverified parent recall. It is not a "
                                   "clinical label and is not used to select recommendations; support is chosen from "
                                   "this learner's own preferences and mathematics evidence."})
    if ctx.snapIvSummary is not None:
        notices.append({"code": "SNAP_IV_NOT_USED",
                        "message": "SNAP-IV summary is present but no enabled rule uses it; no screening cutoff is applied "
                                   "(cutoffs are not normed for this cohort and require expert review)."})
    if ctx.clinicalReference is not None:
        notices.append({"code": "CLINICAL_REFERENCE_NOT_USED",
                        "message": "A clinician-documented reference label is present. It is reserved for approved offline "
                                   "research and is never used by educational rules."})
    obs = ctx.interactionObservations
    if obs is not None and obs.missedDropCount:
        notices.append({"code": "MISSED_DROPS_OBSERVED",
                        "message": f"{obs.missedDropCount} missed drop(s) observed with input method "
                                   f"'{obs.inputMethod or 'unknown'}'. The device-accessibility rule (MQ-RS6-02) is disabled "
                                   "until its threshold is calibrated; consider reviewing tap-to-place manually."})
    return notices


def evaluate(ctx: LearnerContext) -> Dict[str, Any]:
    traces: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []
    notices: List[Dict[str, str]] = []

    for spec in REGISTRY:
        trace: Dict[str, Any] = {
            "ruleId": spec.ruleId,
            "name": spec.name,
            "category": spec.category,
            "priority": spec.priority,
            "specStatus": spec.specStatus,
            "enabled": spec.enabled,
            "expertReviewPending": list(spec.expertReviewPending),
        }
        if not spec.enabled:
            trace.update(status=DISABLED, disabledReason=spec.disabledReason, conditions=[], contributingFeatures=[])
        elif spec.fn is None:
            # Output-level rules (MQ-RS6-01 guardrail, MQ-RS6-03 provenance) are applied below.
            trace.update(status=SAFEGUARD_APPLIED, conditions=[], contributingFeatures=[])
        else:
            outcome = spec.fn(ctx)
            trace.update(
                status=outcome.status,
                conditions=[c.to_dict() for c in outcome.conditions],
                # Features whose condition held: a per-rule attribution that can sit beside future SHAP values.
                contributingFeatures=[c.feature for c in outcome.conditions if c.result is True]
                if outcome.status == TRIGGERED else [],
            )
            for rec in outcome.recommendations:
                rec["rulesetVersion"] = RULESET_VERSION
                rec["evidence"] = evidence_for(spec.ruleId)
                rec["trace"] = {"ruleId": spec.ruleId, "status": outcome.status,
                                "contributingFeatures": trace["contributingFeatures"]}
                recommendations.append(rec)
            notices.extend(outcome.notices)
        traces.append(trace)

    # MQ-RS6-03: every recommendation must carry its provenance
    for rec in recommendations:
        missing = [f for f in REQUIRED_PROVENANCE_FIELDS if rec.get(f) in (None, [], "")]
        if missing:
            raise ValueError(f"Recommendation {rec.get('recommendationId')} is missing provenance: {missing}")
        if rec["strategyCode"] in ELPX_BASELINE_CODES:
            raise ValueError(f"{rec['strategyCode']} is an ELP-X baseline code and must not be duplicated")

    # Deterministic ordering: priority, then rule, then skill
    recommendations.sort(key=lambda r: (r["priority"], r["ruleId"], r["skillId"] or ""))
    notices.extend(_context_notices(ctx))

    output = {
        "engine": {
            "rulesetVersion": RULESET_VERSION,
            "contextSchemaVersion": SCHEMA_VERSION,
            "status": "RESEARCH_PROTOTYPE",
            "nonDiagnostic": True,
            "note": "Formative educational suggestions only. This engine does not diagnose, classify or infer "
                    "any condition and does not replace ELP-X; it adds support suggestions alongside it.",
        },
        "learnerRef": ctx.learnerRef,
        "grade": ctx.grade,
        "recommendations": recommendations,
        "uncertaintyNotices": notices,
        "ruleTraces": traces,
        "summary": {
            "triggered": sorted({t["ruleId"] for t in traces if t["status"] == TRIGGERED}),
            "disabled": [t["ruleId"] for t in traces if t["status"] == DISABLED],
            "recommendationCount": len(recommendations),
        },
    }

    # MQ-RS6-01 (priority 0): reject any diagnostic language or imposed support
    guardrails.check_output(recommendations, output)
    return output
