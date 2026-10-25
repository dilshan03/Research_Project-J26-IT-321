"""
Descriptive onboarding-v2 dimension summaries (DIM-DESCRIPTIVE-v0.1).

Turns the evidence already stored for an onboarding-v2 assessment into transparent counts for four
of the seven onboarding dimensions:
  RU  Representation Understanding      SC  Self-Correction
  IC  Instruction Comprehension         IA  Interaction Accessibility & Engagement
(MP is estimated by ELP-X and SR is summarised by IMLR; CP is the child's own recorded choice.)

Deliberately descriptive: counts and sample sizes only. There are no thresholds, levels, labels,
scores or models, and nothing here feeds ELP-X, IMPSA, IMLR or recommendations. The interpretation
of these counts is pending review with Sri Lankan primary educators. Nothing here is an attention,
impulsivity or ADHD indicator; slowness or page switches are reported as observations only.
"""

from collections import Counter
from typing import Any, Dict, Iterable, List, Optional

from app.db.onboarding_item_bank import CALIBRATION_TARGET_OBJECT_IDS
from app.services.assessment_evidence import (
    ASSISTED_PROBE_ROLES,
    EXCLUDED_NON_MATHEMATICAL,
    STATUS_ANSWERED,
    STATUS_NOT_PRESENTED,
    STATUS_SKIPPED,
)

DIMENSION_SUMMARY_VERSION = "DIM-DESCRIPTIVE-v0.1"
DIMENSION_SUMMARY_STATUS = "DESCRIPTIVE_PENDING_EDUCATOR_REVIEW"
DIMENSION_SUMMARY_NOTE = (
    "Descriptive counts from one short onboarding session. No thresholds, levels or labels are applied; "
    "interpretation is pending educator review. Not a diagnosis and not an attention or ADHD indicator."
)

REPRESENTATIONS = ("concrete", "pictorial", "symbolic")


def _instruction_actions(item: Dict[str, Any], action: str) -> int:
    return sum(1 for e in item.get("instructionEvents") or [] if e.get("action") == action)


def _representation_understanding(evaluated: List[Dict[str, Any]]) -> Dict[str, Any]:
    independent = [i for i in evaluated if i.get("includedInProficiencyEstimate") is True]
    by_rep: Dict[str, Dict[str, int]] = {}
    for rep in REPRESENTATIONS:
        items = [i for i in independent if i.get("representation") == rep]
        by_rep[rep] = {
            "independentItems": len(items),
            "correctFirstResponses": sum(1 for i in items if i.get("correctFirstResponse") is True),
        }
    return {
        "byRepresentation": by_rep,
        "representationsObserved": [rep for rep in REPRESENTATIONS if by_rep[rep]["independentItems"] > 0],
        "independentItemsWithoutRepresentation": sum(1 for i in independent if i.get("representation") not in REPRESENTATIONS),
        "itemsNotIndependent": len(evaluated) - len(independent),
        "sampleNote": "Only independent first responses are counted; one to three items per representation, "
                      "so counts are not comparable as rates.",
    }


def _self_correction(evaluated: List[Dict[str, Any]]) -> Dict[str, Any]:
    answered = [i for i in evaluated if i.get("responseStatus") == STATUS_ANSWERED]
    revised = [i for i in answered if i.get("revisionEvents")]
    return {
        "itemsObserved": len(answered),
        "itemsWithRevisions": len(revised),
        "totalRevisions": sum(len(i["revisionEvents"]) for i in revised),
        "revisedItemsFirstConfirmedCorrect": sum(1 for i in revised if i.get("correctFirstResponse") is True),
        "revisedItemsFirstConfirmedIncorrect": sum(1 for i in revised if i.get("correctFirstResponse") is False),
        "revisionNote": "Revisions are changes made before confirming the first answer. In build and shade "
                        "activities, taking a piece back counts as a revision.",
    }


def _instruction_comprehension(evaluated: List[Dict[str, Any]], calibration: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    presented = evaluated + ([calibration] if calibration else [])
    calibration_summary: Dict[str, Any] = {"presented": calibration is not None}
    if calibration is not None:
        first = calibration.get("firstConfirmedResponse")
        calibration_summary.update({
            "firstAttemptOnTarget": (first in CALIBRATION_TARGET_OBJECT_IDS) if first not in (None, "") else None,
            "attempts": calibration.get("attempts"),
            "instructionReplays": _instruction_actions(calibration, "replayed"),
            "missedDrops": calibration.get("missedDropCount"),
        })
    return {
        "calibration": calibration_summary,
        "itemsObserved": len(presented),
        "itemsWithInstructionReplay": sum(1 for i in presented if _instruction_actions(i, "replayed") > 0),
        "totalInstructionReplays": sum(_instruction_actions(i, "replayed") for i in presented),
        "totalClarifications": sum(_instruction_actions(i, "clarified") for i in presented),
        # Help the child asked for before answering an independent item (guided items are excluded:
        # their support is part of the item, not a request).
        "helpRequestedBeforeFirstResponse": sum(
            1 for i in evaluated
            if i.get("supportBeforeFirstResponse") is True and i.get("probeRole") not in ASSISTED_PROBE_ROLES
        ),
    }


def _interaction_accessibility(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    presented = [i for i in items if i.get("responseStatus") != STATUS_NOT_PRESENTED]
    observed = [i["interactionObservations"] for i in presented if i.get("interactionObservations")]
    invalid_counts = [o.get("invalidTapCount") for o in observed if o.get("invalidTapCount") is not None]
    missed = [i.get("missedDropCount") for i in presented if i.get("missedDropCount") is not None]
    return {
        "itemsPresented": len(presented),
        "itemsAnswered": sum(1 for i in presented if i.get("responseStatus") == STATUS_ANSWERED),
        "itemsSkipped": sum(1 for i in presented if i.get("responseStatus") == STATUS_SKIPPED),
        "inputMethods": dict(Counter(i["inputMethod"] for i in presented if i.get("inputMethod"))),
        "interactionModes": dict(Counter(i["interactionMode"] for i in presented if i.get("interactionMode"))),
        "missedDrops": sum(missed) if missed else None,
        "itemsWithMissedDrops": sum(1 for m in missed if m > 0),
        "itemsWithInteractionObservations": len(observed),
        "pageHiddenEvents": sum(1 for o in observed for e in o.get("pageEvents") or [] if e.get("type") == "hidden"),
        "invalidTaps": sum(invalid_counts) if invalid_counts else None,
        "observationsTruncated": any(o.get("truncated") for o in observed),
        "observationNote": "Counts of how the child interacted (input method, missed drops, leaving the page). "
                           "They describe accessibility and context only.",
    }


def compute_dimension_summaries(evaluated_items: Iterable[Dict[str, Any]],
                                excluded_items: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Descriptive RU / SC / IC / IA summaries from stored onboarding-v2 items (pure; no I/O)."""
    evaluated = list(evaluated_items or [])
    excluded = list(excluded_items or [])
    calibration = next((i for i in excluded if i.get("exclusionReason") == EXCLUDED_NON_MATHEMATICAL
                        and i.get("responseStatus") != STATUS_NOT_PRESENTED), None)
    return {
        "version": DIMENSION_SUMMARY_VERSION,
        "status": DIMENSION_SUMMARY_STATUS,
        "note": DIMENSION_SUMMARY_NOTE,
        "representationUnderstanding": _representation_understanding(evaluated),
        "selfCorrection": _self_correction(evaluated),
        "instructionComprehension": _instruction_comprehension(evaluated, calibration),
        "interactionAccessibility": _interaction_accessibility(evaluated + excluded),
    }


def dimension_summaries_for(assessment_doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Stored summaries, or computed on read for older onboarding-v2 records; None for other protocols."""
    if not assessment_doc or assessment_doc.get("assessmentProtocolVersion") != "onboarding-v2":
        return None
    return assessment_doc.get("dimensionSummaries") or compute_dimension_summaries(
        assessment_doc.get("evaluatedItems", []), assessment_doc.get("excludedItems", [])
    )
