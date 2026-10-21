"""
Tests for the descriptive RU / SC / IC / IA summaries (DIM-DESCRIPTIVE-v0.1).
Pure-function tests plus end-to-end submissions through the in-memory API. No database.
"""

import json

from app.services.dimension_summaries import (
    DIMENSION_SUMMARY_STATUS,
    DIMENSION_SUMMARY_VERSION,
    compute_dimension_summaries,
    dimension_summaries_for,
)
from tests.test_math_assessment_submission import G1_LEARNER, G2_LEARNER, _submit, db  # noqa: F401 (fixture)
from tests.test_onboarding_v2_grade1 import _journey as g1_journey
from tests.test_onboarding_v2_grade2 import _journey as g2_journey

FORBIDDEN_WORDS = ("adhd", "attention", "impulsiv", "hyperactiv", "deficit", "low", "high", "weak", "strong", "level")


def _ev(qid, rep="pictorial", included=True, correct=True, role=None, revisions=0, replays=0, support_before=False, **extra):
    return {
        "questionId": qid, "representation": rep, "includedInProficiencyEstimate": included,
        "correctFirstResponse": correct, "probeRole": role, "responseStatus": "ANSWERED",
        "revisionEvents": [{"priorResponse": 1, "newResponse": 2}] * revisions,
        "instructionEvents": [{"action": "delivered"}] + [{"action": "replayed"}] * replays,
        "supportBeforeFirstResponse": support_before, **extra,
    }


CALIBRATION = {"questionId": "g1v2_calibration_move", "responseStatus": "ANSWERED", "exclusionReason": "NON_MATHEMATICAL_ITEM",
               "firstConfirmedResponse": "green_leaf", "userAnswer": "red_leaf", "attempts": 2, "missedDropCount": 1,
               "instructionEvents": [{"action": "delivered"}, {"action": "replayed"}], "inputMethod": "drag",
               "interactionMode": "touch"}


class TestPureSummaries:
    def test_representation_counts_use_independent_first_responses_only(self):
        s = compute_dimension_summaries([
            _ev("a", "concrete"), _ev("b", "pictorial", correct=False), _ev("c", "symbolic"),
            _ev("d", "symbolic", included=False, role="support"),        # guided: never counted
        ], [])["representationUnderstanding"]
        assert s["byRepresentation"]["concrete"] == {"independentItems": 1, "correctFirstResponses": 1}
        assert s["byRepresentation"]["pictorial"] == {"independentItems": 1, "correctFirstResponses": 0}
        assert s["byRepresentation"]["symbolic"] == {"independentItems": 1, "correctFirstResponses": 1}
        assert s["representationsObserved"] == ["concrete", "pictorial", "symbolic"]
        assert s["itemsNotIndependent"] == 1

    def test_self_correction_counts_revisions_and_their_outcome(self):
        s = compute_dimension_summaries([_ev("a", revisions=2), _ev("b", revisions=1, correct=False), _ev("c")], [])["selfCorrection"]
        assert s == {**s, "itemsObserved": 3, "itemsWithRevisions": 2, "totalRevisions": 3,
                     "revisedItemsFirstConfirmedCorrect": 1, "revisedItemsFirstConfirmedIncorrect": 1}

    def test_instruction_comprehension_uses_calibration_and_replays(self):
        s = compute_dimension_summaries(
            [_ev("a", replays=2), _ev("b", support_before=True), _ev("c", role="support", included=False, support_before=True)],
            [CALIBRATION],
        )["instructionComprehension"]
        assert s["calibration"] == {"presented": True, "firstAttemptOnTarget": False, "attempts": 2,
                                    "instructionReplays": 1, "missedDrops": 1}
        assert s["itemsObserved"] == 4 and s["itemsWithInstructionReplay"] == 2 and s["totalInstructionReplays"] == 3
        assert s["helpRequestedBeforeFirstResponse"] == 1           # the guided item's support is not a request

    def test_calibration_on_target_first_time(self):
        s = compute_dimension_summaries([], [{**CALIBRATION, "firstConfirmedResponse": "red_apple", "attempts": 1}])
        assert s["instructionComprehension"]["calibration"]["firstAttemptOnTarget"] is True

    def test_interaction_counts_and_unmeasured_values_stay_null(self):
        obs = {"pageEvents": [{"type": "hidden", "atMs": 10}, {"type": "visible", "atMs": 900}], "invalidTapCount": 2, "truncated": False}
        s = compute_dimension_summaries(
            [_ev("a", inputMethod="select", interactionMode="touch", interactionObservations=obs),
             _ev("b", inputMethod="drag", interactionMode="touch", missedDropCount=0)],
            [CALIBRATION, {"questionId": "x", "responseStatus": "SKIPPED"}],
        )["interactionAccessibility"]
        assert s["itemsPresented"] == 4 and s["itemsAnswered"] == 3 and s["itemsSkipped"] == 1
        assert s["inputMethods"] == {"select": 1, "drag": 2} and s["interactionModes"] == {"touch": 3}
        assert s["missedDrops"] == 1 and s["itemsWithMissedDrops"] == 1
        assert s["pageHiddenEvents"] == 1 and s["invalidTaps"] == 2
        empty = compute_dimension_summaries([_ev("a")], [])["interactionAccessibility"]
        assert empty["missedDrops"] is None and empty["invalidTaps"] is None     # not measured, not zero

    def test_output_is_descriptive_only(self):
        s = compute_dimension_summaries([_ev("a", revisions=1)], [CALIBRATION])
        assert s["version"] == DIMENSION_SUMMARY_VERSION and s["status"] == DIMENSION_SUMMARY_STATUS
        keys = json.dumps(_keys(s)).lower()
        assert not any(word in keys for word in FORBIDDEN_WORDS), keys    # no labels, levels or scores in field names

    def test_only_onboarding_v2_records_get_summaries(self):
        assert dimension_summaries_for({"assessmentProtocolVersion": "onboarding-v1", "evaluatedItems": [_ev("a")]}) is None
        older_v2 = {"assessmentProtocolVersion": "onboarding-v2", "evaluatedItems": [_ev("a")], "excludedItems": []}
        assert dimension_summaries_for(older_v2)["selfCorrection"]["itemsObserved"] == 1   # computed on read


def _keys(value):
    if isinstance(value, dict):
        return [k for k in value if not k.endswith("Note") and k != "note"] + [x for v in value.values() for x in _keys(v)]
    if isinstance(value, list):
        return [x for v in value for x in _keys(v)]
    return []


class TestThroughTheApi:
    async def test_grade1_journey_returns_and_stores_summaries(self, db):
        res = await _submit(G1_LEARNER, g1_journey(), grade=1, assessmentProtocolVersion="onboarding-v2")
        assert res.status_code == 200
        dims = res.json()["data"]["dimensionSummaries"]
        assert db["assessments"].inserted[0]["dimensionSummaries"] == dims

        ru = dims["representationUnderstanding"]["byRepresentation"]
        assert ru["concrete"]["independentItems"] == 2      # count fruit, match objects -> numeral
        assert ru["symbolic"]["independentItems"] == 1      # numeral -> group
        assert ru["pictorial"]["independentItems"] == 3     # independent compare, pre, transfer (guided excluded)
        assert dims["selfCorrection"]["itemsWithRevisions"] == 3
        ic = dims["instructionComprehension"]
        assert ic["calibration"]["firstAttemptOnTarget"] is False and ic["calibration"]["attempts"] == 2
        assert dims["interactionAccessibility"]["missedDrops"] == 1

        # Descriptive only: ELP-X and IMLR are unchanged by the summaries
        assert res.json()["data"]["imlr"]["status"] == "TRANSFER_OBSERVED"

    async def test_grade2_journey_counts_build_revisions(self, db):
        res = await _submit(G2_LEARNER, g2_journey(), grade=2, assessmentProtocolVersion="onboarding-v2")
        dims = res.json()["data"]["dimensionSummaries"]
        assert dims["representationUnderstanding"]["representationsObserved"] == ["concrete", "pictorial", "symbolic"]
        assert dims["selfCorrection"]["totalRevisions"] == 2

    async def test_v1_submission_has_no_summaries(self, db):
        res = await _submit(G1_LEARNER, [{"questionId": "g1_num_count_01", "userAnswer": "opt_5", "attempts": 1,
                                          "hintUsed": False, "responseTimeSeconds": 8.0}], grade=1)
        assert res.json()["data"]["dimensionSummaries"] is None

    async def test_onboarding_summary_includes_dimension_summaries(self, db):
        await _submit(G1_LEARNER, g1_journey(), grade=1, assessmentProtocolVersion="onboarding-v2")
        from app.services.onboarding_service import get_onboarding_summary
        from tests.test_math_assessment_submission import PARENT_ID
        summary = await get_onboarding_summary(learner_id=G1_LEARNER, parent_id=str(PARENT_ID))
        assert summary["mathSummary"]["dimensionSummaries"]["version"] == DIMENSION_SUMMARY_VERSION
        assert summary["progress"]["dimensionSummaries"]["version"] == DIMENSION_SUMMARY_VERSION
