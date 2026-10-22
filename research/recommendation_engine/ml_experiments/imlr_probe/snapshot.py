"""
Prediction-time snapshot: evidence available BEFORE the transfer phase begins, frozen with a content hash.

Prediction time = the BOUNDARY_SHOWN event (support visuals removed, before any transfer item). The builder only
reads events whose seq is below the boundary, so appending later events can never change the snapshot.

Safeguards
  - Feature names come from a fixed allowlist; anything else raises LeakageError.
  - No transfer item ID, transfer answer, transfer correctness, outcome or post-transfer summary can appear.
  - A transfer item presented (or referenced) before the boundary is a protocol violation.
  - Optional ELP-X features are RECOMPUTED with the unmodified production engine from pre-probe items whose
    assistance status is NONE_CONFIRMED only. Stored or live ELP-X profiles are never read.
  - Teaching responses are summarised only as ASSISTED performance.
"""

import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import events as ev
from . import forms, protocol

ELPX_ENGINE_PATH = Path(__file__).resolve().parents[4] / "services" / "learner-profile-service" / "app" / "core" / "elpx_engine.py"

FEATURE_ALLOWLIST = (
    "pre_items_presented", "pre_items_answered", "pre_independent_correct", "pre_independent_incorrect",
    "pre_assisted", "pre_assistance_unknown", "pre_child_help_requests", "pre_revisions",
    "pre_instruction_replays", "pre_first_response_seconds",
    "teaching_items_presented", "teaching_items_answered", "teaching_max_support_level",
    "teaching_support_events", "teaching_assisted_first_try_correct",
    "breaks_before_prediction_time",
    "elpx_pre_transfer",
)
FORBIDDEN_KEY_FRAGMENTS = ("transfer_", "outcome", "label", "target", "imlr", "impsa", "snap_iv", "adhd")


class LeakageError(RuntimeError):
    pass


class SnapshotError(ValueError):
    pass


def canonical_hash(obj: Any) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest().upper()


def _load_elpx_engine():
    if not ELPX_ENGINE_PATH.is_file():
        return None
    spec = importlib.util.spec_from_file_location("_imlr_elpx_engine_readonly", ELPX_ENGINE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _elpx_pre_transfer(pre: List[Dict[str, Any]]) -> Dict[str, Any]:
    eligible = [p for p in pre if p["assistanceStatus"] == ev.NONE_CONFIRMED]
    engine = _load_elpx_engine()
    if engine is None:
        return {"available": False, "reason": "ELP-X engine file not available"}
    est = engine.compute_skill_estimate(len(eligible), sum(1 for p in eligible if p["correctFirstResponse"]))
    return {
        "available": True,
        "algorithmVersion": engine.ALGORITHM_VERSION,
        "engineSha256": hashlib.sha256(ELPX_ENGINE_PATH.read_bytes()).hexdigest().upper(),
        "intervalMethod": "scipy.stats.beta" if engine.HAS_SCIPY else "normal approximation (scipy unavailable)",
        "evidence": "pre-probe items with assistanceStatus NONE_CONFIRMED only",
        "distinctQuestionsAssessed": est["distinctQuestionsAssessed"],
        "correctFirstResponses": est["correctFirstResponses"],
        "estimatedProficiency": est["estimatedProficiency"],
        "credibleInterval": est["credibleInterval"],
        "provisionalSkillLevel": est["provisionalSkillLevel"],
    }


def prediction_cutoff(log: List[Dict[str, Any]]) -> Dict[str, Any]:
    boundary = next((e for e in log if e["type"] == ev.BOUNDARY_SHOWN), None)
    if boundary is None:
        raise SnapshotError("No BOUNDARY_SHOWN event: prediction time is undefined.")
    return boundary


def _assert_no_transfer_before(form: Dict[str, Any], pre_cutoff: List[Dict[str, Any]]) -> None:
    transfer_ids = {it["itemId"] for it in forms.items_by_role(form, protocol.TRANSFER)}
    early = [e for e in pre_cutoff if e.get("itemId") in transfer_ids]
    if early:
        raise LeakageError(f"Transfer item events before prediction time: {[e['type'] for e in early]}")


def assert_no_leakage(snapshot: Dict[str, Any], form: Dict[str, Any]) -> None:
    features = snapshot["features"]
    unknown = set(features) - set(FEATURE_ALLOWLIST)
    if unknown:
        raise LeakageError(f"Features outside the allowlist: {sorted(unknown)}")

    def walk(v: Any, where: str) -> None:
        if isinstance(v, dict):
            for k, x in v.items():
                if any(f in str(k).lower() for f in FORBIDDEN_KEY_FRAGMENTS):
                    raise LeakageError(f"Forbidden key {k!r} at {where}")
                walk(x, f"{where}.{k}")
        elif isinstance(v, list):
            for i, x in enumerate(v):
                walk(x, f"{where}[{i}]")

    walk(snapshot, "$")
    text = json.dumps(snapshot)
    for it in forms.items_by_role(form, protocol.TRANSFER):
        if it["itemId"] in text:
            raise LeakageError(f"Transfer item {it['itemId']} referenced in the snapshot")


def build_prediction_snapshot(form: Dict[str, Any], log: List[Dict[str, Any]], include_elpx: bool = True) -> Dict[str, Any]:
    ev.validate_log(log)
    boundary = prediction_cutoff(log)
    pre_cutoff = [e for e in log if e["seq"] < boundary["seq"]]
    _assert_no_transfer_before(form, pre_cutoff)

    pre = [ev.item_evidence(it, pre_cutoff) for it in forms.items_by_role(form, protocol.PRE)]
    teach = [ev.item_evidence(it, pre_cutoff) for it in forms.items_by_role(form, protocol.TEACHING)]
    window = ev.teaching_window(pre_cutoff)

    features: Dict[str, Any] = {
        "pre_items_presented": sum(p["presented"] for p in pre),
        "pre_items_answered": sum(p["answered"] for p in pre),
        "pre_independent_correct": sum(1 for p in pre if p["assistanceStatus"] == ev.NONE_CONFIRMED and p["correctFirstResponse"]),
        "pre_independent_incorrect": sum(1 for p in pre if p["assistanceStatus"] == ev.NONE_CONFIRMED and not p["correctFirstResponse"]),
        "pre_assisted": sum(1 for p in pre if p["assistanceStatus"] == ev.ASSISTED),
        "pre_assistance_unknown": sum(1 for p in pre if p["assistanceStatus"] == ev.UNKNOWN),
        "pre_child_help_requests": sum(p["childHelpRequests"] for p in pre),
        "pre_revisions": sum(p["revisions"] for p in pre),
        "pre_instruction_replays": sum(p["instructionReplays"] for p in pre),
        "pre_first_response_seconds": [p["firstResponseSeconds"] for p in pre],
        "teaching_items_presented": sum(t["presented"] for t in teach),
        "teaching_items_answered": sum(t["answered"] for t in teach),
        "teaching_max_support_level": max([lvl for t in teach for lvl in t["supportLevels"] if lvl] or [0]),
        "teaching_support_events": sum(len(t["supportLevels"]) for t in teach),
        # Correct first tries during teaching are ASSISTED performance, never independent evidence
        "teaching_assisted_first_try_correct": sum(1 for t in teach if t["answered"] and t["correctFirstResponse"]),
        "breaks_before_prediction_time": sum(1 for e in pre_cutoff if e["type"] == ev.BREAK_STARTED),
    }
    if include_elpx:
        features["elpx_pre_transfer"] = _elpx_pre_transfer(pre)

    meta = {
        "snapshotSchemaVersion": protocol.SNAPSHOT_SCHEMA_VERSION,
        "protocolId": protocol.PROTOCOL_ID,
        "protocolVersion": protocol.PROTOCOL_VERSION,
        "formId": form["formId"],
        "seed": form["seed"],
        "predictionTime": {"event": ev.BOUNDARY_SHOWN, "seq": boundary["seq"], "t": boundary["t"]},
        "teachingWindowClosedBeforePredictionTime": window["closed"],
        "eventsUsed": len(pre_cutoff),
        "inputEventsSha256": canonical_hash(pre_cutoff),
        "featureAllowlist": list(FEATURE_ALLOWLIST),
    }
    snapshot = {"meta": meta, "features": features}
    snapshot["snapshotSha256"] = canonical_hash(snapshot)
    assert_no_leakage(snapshot, form)
    return snapshot


def verify_frozen(snapshot: Dict[str, Any]) -> bool:
    body = {k: v for k, v in snapshot.items() if k != "snapshotSha256"}
    return canonical_hash(body) == snapshot.get("snapshotSha256")


def pre_probe_evidence(form: Dict[str, Any], log: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Per-item pre-probe evidence (recorded separately from transfer outcomes), from pre-boundary events only."""
    cutoff: Optional[int] = prediction_cutoff(log)["seq"]
    return [ev.item_evidence(it, [e for e in log if e["seq"] < cutoff]) for it in forms.items_by_role(form, protocol.PRE)]
