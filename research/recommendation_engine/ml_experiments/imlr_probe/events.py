"""
Interaction event definitions, support window and per-item assistance status.

An event log is a list of dicts: {"seq": int (strictly increasing), "t": float seconds from session start
(non-decreasing), "type": <EVENT TYPE>, ...payload}. Ordering decisions ("before the first response") use `seq`.

Assistance status (per answered item):
  NONE_CONFIRMED  explicit evidence of no help: the item's recorder reported assistanceRecording = "complete",
                  no support started before or at the first confirmed response, the item is not a teaching item,
                  and (for transfer items) the teaching window had closed before the item was presented.
  ASSISTED        any support started before or at the first confirmed response, or the item is a teaching item.
  UNKNOWN         anything else: missing or incomplete recording, open teaching window, malformed support events.
                  A missing record is NEVER treated as unassisted.
  NOT_APPLICABLE  no confirmed response (the item is unanswered).
Correctness is derived only from the form's answer key; any correctness value in an event is ignored.
"""

from typing import Any, Dict, List, Optional

from . import protocol

# Event types
SESSION_STARTED = "SESSION_STARTED"
ITEM_PRESENTED = "ITEM_PRESENTED"
INSTRUCTION = "INSTRUCTION"                  # action: delivered | replayed | clarified
SUPPORT_STARTED = "SUPPORT_STARTED"          # supportId, level 1-3, origin protocol | child_request
SUPPORT_ENDED = "SUPPORT_ENDED"              # supportId
RESPONSE_REVISED = "RESPONSE_REVISED"        # tentative selection changed before confirmation
RESPONSE_CONFIRMED = "RESPONSE_CONFIRMED"    # position
ITEM_SKIPPED = "ITEM_SKIPPED"
ITEM_ENDED = "ITEM_ENDED"                    # assistanceRecording: complete | incomplete
BREAK_STARTED = "BREAK_STARTED"              # child-initiated; a break is never support
BREAK_ENDED = "BREAK_ENDED"
TEACHING_WINDOW_STARTED = "TEACHING_WINDOW_STARTED"
TEACHING_WINDOW_ENDED = "TEACHING_WINDOW_ENDED"
BOUNDARY_SHOWN = "BOUNDARY_SHOWN"            # transition screen; support visuals removed; prediction time
SESSION_ENDED = "SESSION_ENDED"

EVENT_TYPES = {SESSION_STARTED, ITEM_PRESENTED, INSTRUCTION, SUPPORT_STARTED, SUPPORT_ENDED, RESPONSE_REVISED,
               RESPONSE_CONFIRMED, ITEM_SKIPPED, ITEM_ENDED, BREAK_STARTED, BREAK_ENDED, TEACHING_WINDOW_STARTED,
               TEACHING_WINDOW_ENDED, BOUNDARY_SHOWN, SESSION_ENDED}

NONE_CONFIRMED = "NONE_CONFIRMED"
ASSISTED = "ASSISTED"
UNKNOWN = "UNKNOWN"
NOT_APPLICABLE = "NOT_APPLICABLE"

# Item-level flags
FLAG_RECORDING_MISSING = "ASSISTANCE_RECORDING_MISSING"
FLAG_RECORDING_INCOMPLETE = "ASSISTANCE_RECORDING_INCOMPLETE"
FLAG_SUPPORT_EVENT_MALFORMED = "SUPPORT_EVENT_MALFORMED"
FLAG_TEACHING_WINDOW_OPEN = "TEACHING_WINDOW_OPEN_AT_PRESENTATION"
FLAG_BREAK_DURING_ITEM = "BREAK_DURING_ITEM"
FLAG_HELP_AFTER_FIRST_RESPONSE = "HELP_AFTER_FIRST_RESPONSE"
FLAG_NOT_PRESENTED = "NOT_PRESENTED"


class EventLogError(ValueError):
    pass


def validate_log(events: List[Dict[str, Any]]) -> None:
    last_seq, last_t = None, None
    for e in events:
        if e.get("type") not in EVENT_TYPES:
            raise EventLogError(f"Unknown event type: {e.get('type')!r}")
        seq, t = e.get("seq"), e.get("t")
        if not isinstance(seq, int) or (last_seq is not None and seq <= last_seq):
            raise EventLogError("seq must be an int and strictly increasing")
        if not isinstance(t, (int, float)) or (last_t is not None and t < last_t):
            raise EventLogError("t must be a number and non-decreasing")
        last_seq, last_t = seq, t


def _for_item(events: List[Dict[str, Any]], item_id: str, etype: str) -> List[Dict[str, Any]]:
    return [e for e in events if e["type"] == etype and e.get("itemId") == item_id]


def _first(events: List[Dict[str, Any]], etype: str) -> Optional[Dict[str, Any]]:
    return next((e for e in events if e["type"] == etype), None)


def teaching_window(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    start, end = _first(events, TEACHING_WINDOW_STARTED), _first(events, TEACHING_WINDOW_ENDED)
    return {"startedSeq": start["seq"] if start else None, "endedSeq": end["seq"] if end else None,
            "startedT": start["t"] if start else None, "endedT": end["t"] if end else None,
            "closed": bool(start and end and end["seq"] > start["seq"])}


def item_evidence(item: Dict[str, Any], events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """All evidence for one form item, with assistance status. `item` comes from the form (holds the key)."""
    iid, role = item["itemId"], item["role"]
    flags: List[str] = []
    presented = _for_item(events, iid, ITEM_PRESENTED)
    confirms = _for_item(events, iid, RESPONSE_CONFIRMED)
    supports = _for_item(events, iid, SUPPORT_STARTED)
    ended = _for_item(events, iid, ITEM_ENDED)
    first = confirms[0] if confirms else None

    if not presented:
        flags.append(FLAG_NOT_PRESENTED)
    pres_seq = presented[0]["seq"] if presented else None

    malformed = [s for s in supports if s.get("level") not in protocol.SUPPORT_LEVELS
                 or s.get("origin") not in protocol.SUPPORT_ORIGINS]
    if malformed:
        flags.append(FLAG_SUPPORT_EVENT_MALFORMED)

    before = [s for s in supports if first is not None and s["seq"] <= first["seq"]]
    if first is not None and any(s["seq"] > first["seq"] for s in supports):
        flags.append(FLAG_HELP_AFTER_FIRST_RESPONSE)

    if pres_seq is not None:
        end_seq = ended[0]["seq"] if ended else None
        breaks = [b for b in events if b["type"] == BREAK_STARTED and b["seq"] > pres_seq
                  and (end_seq is None or b["seq"] < end_seq)]
        if breaks:
            flags.append(FLAG_BREAK_DURING_ITEM)

    recording = ended[0].get("assistanceRecording") if ended else None
    if not ended or recording is None:
        flags.append(FLAG_RECORDING_MISSING)
    elif recording != "complete":
        flags.append(FLAG_RECORDING_INCOMPLETE)

    window_open = False
    if role == protocol.TRANSFER and pres_seq is not None:
        win = teaching_window(events)
        window_open = not (win["closed"] and win["endedSeq"] < pres_seq)
        if window_open:
            flags.append(FLAG_TEACHING_WINDOW_OPEN)

    if first is None:
        status = NOT_APPLICABLE
    elif role == protocol.TEACHING or before:
        status = ASSISTED                              # positive evidence of help wins over incomplete records
    elif malformed or window_open or recording != "complete":
        status = UNKNOWN
    else:
        status = NONE_CONFIRMED

    first_position = first.get("position") if first else None
    correct_first = None if first is None else first_position == item["correctPosition"]
    return {
        "itemId": iid,
        "role": role,
        "presented": bool(presented),
        "presentedSeq": pres_seq,
        "answered": first is not None,
        "skipped": bool(_for_item(events, iid, ITEM_SKIPPED)),
        "firstResponseSeq": first["seq"] if first else None,
        "firstResponseSeconds": (first["t"] - presented[0]["t"]) if (first and presented) else None,
        "firstResponsePosition": first_position,
        "correctFirstResponse": correct_first,       # from the answer key only
        "revisions": len([e for e in _for_item(events, iid, RESPONSE_REVISED)
                          if first is None or e["seq"] < first["seq"]]),
        "instructionReplays": len([e for e in _for_item(events, iid, INSTRUCTION)
                                   if e.get("action") in ("replayed", "clarified")]),
        "supportBeforeFirstResponse": [{"level": s.get("level"), "origin": s.get("origin")} for s in before],
        "supportLevels": [s.get("level") for s in supports],
        "childHelpRequests": len([s for s in supports if s.get("origin") == "child_request"]),
        "assistanceRecording": recording,
        "assistanceStatus": status,
        "flags": flags,
    }
