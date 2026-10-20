"""
SYNTHETIC interaction fixtures for tests and the demo.

Each scenario is a hand-written script of interface events ("answer correctly", "ask for help", ...) used to
exercise code paths. They are not simulated learners, carry no learning model, and must never be used as
training data or reported as results.
"""

from typing import Any, Dict, List, Optional

from . import events as ev
from . import forms, protocol

SYNTHETIC_NOTICE = "SYNTHETIC FIXTURE - scripted interface events for software tests only; not learner data."


class SessionBuilder:
    def __init__(self, form: Dict[str, Any]):
        self.form = form
        self.events: List[Dict[str, Any]] = []
        self.t = 0.0
        self._support = 0
        self.add(ev.SESSION_STARTED)

    def add(self, etype: str, dt: float = 1.0, **payload: Any) -> "SessionBuilder":
        self.t = round(self.t + dt, 3)
        self.events.append({"seq": len(self.events) + 1, "t": self.t, "type": etype, **payload})
        return self

    def _position(self, item: Dict[str, Any], answer: str) -> int:
        if answer == "correct":
            return item["correctPosition"]
        return next(p for p in range(3) if p != item["correctPosition"])

    def item(self, item: Dict[str, Any], answer: Optional[str] = "correct", help_before: int = 0,
             help_after: bool = False, revise: bool = False, replay: bool = False, take_break: bool = False,
             recording: Optional[str] = "complete", end_item: bool = True, origin: str = "child_request",
             skip: bool = False) -> "SessionBuilder":
        iid = item["itemId"]
        self.add(ev.ITEM_PRESENTED, itemId=iid)
        self.add(ev.INSTRUCTION, 0.5, itemId=iid, action="delivered")
        if replay:
            self.add(ev.INSTRUCTION, 2.0, itemId=iid, action="replayed")
        if take_break:
            self.add(ev.BREAK_STARTED, 1.0)
            self.add(ev.BREAK_ENDED, 20.0)
        for level in range(1, help_before + 1):
            self._support += 1
            self.add(ev.SUPPORT_STARTED, 2.0, itemId=iid, supportId=f"s{self._support}", level=level, origin=origin)
            self.add(ev.SUPPORT_ENDED, 3.0, itemId=iid, supportId=f"s{self._support}")
        if skip:
            self.add(ev.ITEM_SKIPPED, 4.0, itemId=iid)
        elif answer is not None:
            if revise:
                self.add(ev.RESPONSE_REVISED, 2.0, itemId=iid, position=self._position(item, "incorrect"))
            self.add(ev.RESPONSE_CONFIRMED, 3.0, itemId=iid, position=self._position(item, answer))
        if help_after:
            self._support += 1
            self.add(ev.SUPPORT_STARTED, 1.0, itemId=iid, supportId=f"s{self._support}", level=1, origin="child_request")
            self.add(ev.SUPPORT_ENDED, 2.0, itemId=iid, supportId=f"s{self._support}")
        if end_item:
            payload = {} if recording is None else {"assistanceRecording": recording}
            self.add(ev.ITEM_ENDED, 0.5, itemId=iid, **payload)
        return self

    def teaching(self, item: Dict[str, Any], wrong_tries: int = 0) -> "SessionBuilder":
        """Standardised teaching item: L1 on entry, escalating after each wrong try (max L3)."""
        iid = item["itemId"]
        self.add(ev.ITEM_PRESENTED, itemId=iid)
        level = 1
        self._support += 1
        self.add(ev.SUPPORT_STARTED, 0.5, itemId=iid, supportId=f"s{self._support}", level=level, origin="protocol")
        for _ in range(wrong_tries):
            self.add(ev.RESPONSE_CONFIRMED, 3.0, itemId=iid, position=self._position(item, "incorrect"))
            if level < 3:
                level += 1
                self._support += 1
                self.add(ev.SUPPORT_STARTED, 1.0, itemId=iid, supportId=f"s{self._support}", level=level, origin="protocol")
        self.add(ev.RESPONSE_CONFIRMED, 3.0, itemId=iid, position=item["correctPosition"])
        self.add(ev.SUPPORT_ENDED, 0.5, itemId=iid, supportId=f"s{self._support}")
        self.add(ev.ITEM_ENDED, 0.5, itemId=iid, assistanceRecording="complete")
        return self


def _run(form: Dict[str, Any], pre: List[Dict[str, Any]], teach_wrong: List[int], transfer: List[Dict[str, Any]],
         close_window: bool = True, boundary: bool = True, end: bool = True) -> List[Dict[str, Any]]:
    b = SessionBuilder(form)
    for item, kw in zip(forms.items_by_role(form, protocol.PRE), pre):
        b.item(item, **kw)
    b.add(ev.TEACHING_WINDOW_STARTED)
    for item, wrong in zip(forms.items_by_role(form, protocol.TEACHING), teach_wrong):
        b.teaching(item, wrong)
    if close_window:
        b.add(ev.TEACHING_WINDOW_ENDED)
    if boundary:
        b.add(ev.BOUNDARY_SHOWN, 2.0)
    for item, kw in zip(forms.items_by_role(form, protocol.TRANSFER), transfer):
        b.item(item, **kw)
    if end:
        b.add(ev.SESSION_ENDED)
    return b.events


OK, NO = {"answer": "correct"}, {"answer": "incorrect"}

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "all_independent": {
        "description": "Pre 1/2 correct; teaching with one escalation; three transfer answers without help.",
        "build": lambda f: _run(f, [OK, NO], [1, 0], [OK, NO, OK]),
    },
    "pre_correct_still_taught": {
        "description": "Both pre items correct; the standardised teaching phase is still delivered (Decision 1).",
        "build": lambda f: _run(f, [OK, OK], [0, 0], [OK, OK, NO]),
    },
    "help_before_transfer_response": {
        "description": "Child asks for help on transfer item 2 before answering.",
        "build": lambda f: _run(f, [NO, NO], [2, 1], [OK, {"answer": "correct", "help_before": 1}, NO]),
    },
    "help_after_transfer_response": {
        "description": "Help requested only after the first transfer response was confirmed.",
        "build": lambda f: _run(f, [OK, NO], [0, 1], [{"answer": "incorrect", "help_after": True}, OK, OK]),
    },
    "missing_assistance_record": {
        "description": "Transfer item 3 has no ITEM_ENDED record; item 2 reports incomplete recording.",
        "build": lambda f: _run(f, [NO, OK], [1, 0], [OK, {"answer": "correct", "recording": "incomplete"},
                                                         {"answer": "correct", "end_item": False}]),
    },
    "unanswered_transfer": {
        "description": "Transfer item 2 skipped; item 3 presented but never answered.",
        "build": lambda f: _run(f, [OK, NO], [0, 0], [OK, {"skip": True}, {"answer": None}]),
    },
    "break_during_transfer": {
        "description": "Child takes a break during transfer item 1, then answers; a break is not support.",
        "build": lambda f: _run(f, [NO, NO], [1, 1], [{"answer": "correct", "take_break": True}, NO, OK]),
    },
    "teaching_window_not_closed": {
        "description": "Teaching window never closed before transfer: independence cannot be confirmed.",
        "build": lambda f: _run(f, [OK, NO], [0, 0], [OK, OK, OK], close_window=False),
    },
}


def scenario(name: str, form: Dict[str, Any]) -> List[Dict[str, Any]]:
    return SCENARIOS[name]["build"](form)
