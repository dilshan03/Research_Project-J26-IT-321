"""
Transfer-outcome evaluation (after prediction time) and research-record assembly.

Per transfer item:
  INDEPENDENT_CORRECT    answered, assistanceStatus NONE_CONFIRMED, first confirmed response correct (answer key)
  INDEPENDENT_INCORRECT  as above, first response incorrect
  HELPED                 support started before or at the first response
  ASSISTANCE_UNKNOWN     independence not established (missing/incomplete record, teaching window open, ...)
  UNANSWERED             not presented, skipped or no confirmed response

The summary is descriptive (k of n, chance level shown). It applies no threshold and makes no learning-gain claim.
"""

from typing import Any, Dict, List

from . import events as ev
from . import forms, protocol
from .snapshot import LeakageError, prediction_cutoff, verify_frozen

INDEPENDENT_CORRECT = "INDEPENDENT_CORRECT"
INDEPENDENT_INCORRECT = "INDEPENDENT_INCORRECT"
HELPED = "HELPED"
ASSISTANCE_UNKNOWN = "ASSISTANCE_UNKNOWN"
UNANSWERED = "UNANSWERED"
OUTCOMES = (INDEPENDENT_CORRECT, INDEPENDENT_INCORRECT, HELPED, ASSISTANCE_UNKNOWN, UNANSWERED)

INTERPRETATION = (
    "Descriptive count of new comparison questions answered correctly without help, shown beside the chance level. "
    "It is not a learning-readiness score, does not show that the teaching caused improvement, and does not "
    "establish permanent learning. Pending educator and clinical-supervisor review."
)


def _classify(e: Dict[str, Any]) -> str:
    if not e["answered"]:
        return UNANSWERED
    status = e["assistanceStatus"]
    if status == ev.ASSISTED:
        return HELPED
    if status == ev.NONE_CONFIRMED:
        return INDEPENDENT_CORRECT if e["correctFirstResponse"] else INDEPENDENT_INCORRECT
    return ASSISTANCE_UNKNOWN


def evaluate_transfer(form: Dict[str, Any], log: List[Dict[str, Any]],
                      previously_seen: List[str] = ()) -> Dict[str, Any]:
    ev.validate_log(log)
    boundary = prediction_cutoff(log)
    items = []
    for it in forms.items_by_role(form, protocol.TRANSFER):
        e = ev.item_evidence(it, log)
        outcome = _classify(e)
        flags = list(e["flags"])
        if e["presentedSeq"] is not None and e["presentedSeq"] < boundary["seq"]:
            flags.append("PRESENTED_BEFORE_PREDICTION_TIME")
            outcome = ASSISTANCE_UNKNOWN if outcome in (INDEPENDENT_CORRECT, INDEPENDENT_INCORRECT) else outcome
        if it["itemId"] in set(previously_seen):
            flags.append("ITEM_PREVIOUSLY_SEEN")
            outcome = ASSISTANCE_UNKNOWN if outcome in (INDEPENDENT_CORRECT, INDEPENDENT_INCORRECT) else outcome
        items.append({"itemId": it["itemId"], "presentationIndex": it["presentationIndex"],
                      "assistanceStatus": e["assistanceStatus"], "outcome": outcome, "flags": flags,
                      "evidenceFromSeq": e["presentedSeq"]})

    counts = {o: sum(1 for i in items if i["outcome"] == o) for o in OUTCOMES}
    k = counts[INDEPENDENT_CORRECT]
    n = k + counts[INDEPENDENT_INCORRECT]
    return {
        "outcomeSchemaVersion": protocol.OUTCOME_SCHEMA_VERSION,
        "formId": form["formId"],
        "predictionTimeSeq": boundary["seq"],
        "items": items,
        "counts": counts,
        "independentCorrect": k,
        "independentClassified": n,
        "chanceLevelPerItem": protocol.CHANCE_LEVEL,
        "description": f"{k} of {n} new questions answered correctly without help "
                       f"(chance per question {protocol.CHANCE_LEVEL:.2f}; "
                       f"{counts[HELPED]} helped, {counts[ASSISTANCE_UNKNOWN]} unknown, {counts[UNANSWERED]} unanswered)",
        "interpretation": INTERPRETATION,
    }


def build_research_record(snapshot: Dict[str, Any], outcome: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pairs a frozen prediction-time snapshot (inputs) with the transfer outcome (label), keeping them separate.
    Refuses tampered snapshots, mismatched forms, label evidence from before prediction time and key overlap.
    No model is trained here; records built from synthetic fixtures are for tests only.
    """
    if not verify_frozen(snapshot):
        raise LeakageError("Snapshot hash mismatch: the frozen snapshot was modified.")
    if snapshot["meta"]["formId"] != outcome["formId"]:
        raise LeakageError("Snapshot and outcome belong to different forms.")
    cutoff = snapshot["meta"]["predictionTime"]["seq"]
    early = [i["itemId"] for i in outcome["items"] if i["evidenceFromSeq"] is not None and i["evidenceFromSeq"] < cutoff]
    if early:
        raise LeakageError(f"Label evidence recorded before prediction time: {early}")

    n = outcome["independentClassified"]
    label = {
        "independentTransferCorrect": outcome["independentCorrect"],
        "independentTransferClassified": n,
        "itemOutcomes": {i["itemId"]: i["outcome"] for i in outcome["items"]},
        "status": "USABLE" if n > 0 else "NO_VALID_TRANSFER_EVIDENCE",
    }
    overlap = set(label) & set(snapshot["features"])
    if overlap:
        raise LeakageError(f"Label and input share keys: {sorted(overlap)}")
    return {
        "recordSchemaVersion": "IMLR-RESEARCH-RECORD-v0.1",
        "inputs": snapshot,
        "label": label,
        "separation": {"predictionTimeSeq": cutoff, "inputSnapshotSha256": snapshot["snapshotSha256"],
                       "labelFromEventsAtOrAfterSeq": cutoff},
    }
