"""
Database-free tests for onboarding evidence integrity:
- legacy (Grades 2-5) payloads without invented timing or unseen questions;
- raw interaction observations (ONBOARDING-INTERACTION-OBS-v1.0) stored separately and never scored;
- backward compatibility with submissions and records that have no observations.
"""

import copy

import pytest
from pydantic import ValidationError

from app.core.elpx_engine import compute_elpx_profile_from_evaluated_items
from app.db.question_bank import get_question_by_id, get_questions_for_grade
from app.schemas.onboarding import (
    INTERACTION_OBSERVATION_VERSION,
    MAX_OBSERVATION_EVENTS,
    InteractionObservations,
    MathItemAnswerSubmission,
)
from app.services import assessment_evidence as ev

GRADE = 2
BANK = get_questions_for_grade(GRADE, include_answers=True)
APPROVED = {q["questionId"] for q in BANK}


def _correct(q):
    return q["correctAnswer"]


def _evaluate(answers, grade=GRADE):
    return ev.evaluate_submission(
        answers=[MathItemAnswerSubmission(**a) for a in answers],
        learner_grade=grade,
        approved_question_ids=APPROVED,
        question_lookup=get_question_by_id,
        protocol_version="onboarding-v1",
    )


OBSERVATIONS = {
    "version": INTERACTION_OBSERVATION_VERSION,
    "parameters": {"burstMaxGapMs": 500, "burstMinTaps": 3, "idleThresholdMs": 10000, "maxEventsPerList": 50},
    "observedDurationMs": 25000,
    "idleTimeBeforeFirstActionMs": 2300,
    "pointerDownCount": 7,
    "keyDownCount": 0,
    "tapBursts": [{"startMs": 3000, "endMs": 3600, "tapCount": 4}],
    "idleIntervals": [{"startMs": 4000, "durationMs": 12000}],
    "pageEvents": [{"type": "hidden", "atMs": 5000}, {"type": "visible", "atMs": 9000}],
    "hiddenDurationMs": 4000,
    "invalidTapCount": 2,
    "invalidTaps": [{"atMs": 3100}, {"atMs": 3300}],
    "truncated": False,
}


# --- Priority 1: legacy payloads -------------------------------------------------------------

class TestLegacyTimingAndPresentation:
    def test_omitted_response_time_is_stored_as_not_recorded(self):
        q = BANK[0]
        item = _evaluate([{"questionId": q["questionId"], "userAnswer": _correct(q), "attempts": 1,
                           "hintUsed": False}])["evaluatedItems"][0]
        assert item["responseTimeSeconds"] is None
        assert ev.FLAG_RESPONSE_TIME_NOT_RECORDED in item["qualityFlags"]
        assert item["correctFirstResponse"] is True  # correctness still derived on the server

    def test_measured_response_time_is_preserved(self):
        q = BANK[0]
        item = _evaluate([{"questionId": q["questionId"], "userAnswer": _correct(q),
                           "responseTimeSeconds": 3.4}])["evaluatedItems"][0]
        assert item["responseTimeSeconds"] == 3.4
        assert ev.FLAG_RESPONSE_TIME_NOT_RECORDED not in item["qualityFlags"]

    def test_presented_but_skipped_item_is_excluded_not_scored(self):
        q = BANK[0]
        result = _evaluate([{"questionId": q["questionId"], "userAnswer": "", "attempts": 1,
                             "hintUsed": True, "responseStatus": "skipped"}])
        assert result["evaluatedItems"] == []
        assert result["excludedItems"][0]["responseStatus"] == ev.STATUS_SKIPPED
        assert result["excludedItems"][0]["responseTimeSeconds"] is None

    def test_unseen_questions_absent_from_payload_create_no_records(self):
        shown, unseen = BANK[0], BANK[1]
        result = _evaluate([{"questionId": shown["questionId"], "userAnswer": _correct(shown)}])
        ids = {it["questionId"] for it in result["evaluatedItems"] + result["excludedItems"]}
        assert ids == {shown["questionId"]}
        assert unseen["questionId"] not in ids

    def test_server_ignores_client_correctness_claims(self):
        q = BANK[0]
        item = _evaluate([{"questionId": q["questionId"], "userAnswer": "__wrong__",
                           "firstConfirmedResponse": "__wrong__", "isFirstResponseCorrect": True}])["evaluatedItems"]
        # Either evaluated as incorrect or excluded as invalid; never credited because the client said so
        assert all(it["correctFirstResponse"] is False for it in item)


# --- Priority 2: raw interaction observations -----------------------------------------------

class TestObservationSchema:
    def test_full_record_is_accepted(self):
        obs = InteractionObservations(**OBSERVATIONS)
        assert obs.version == INTERACTION_OBSERVATION_VERSION
        assert obs.tapBursts[0].tapCount == 4

    def test_unmeasurable_values_stay_null(self):
        obs = InteractionObservations(version=INTERACTION_OBSERVATION_VERSION)
        assert obs.idleTimeBeforeFirstActionMs is None
        assert obs.invalidTapCount is None
        assert obs.hiddenDurationMs is None

    @pytest.mark.parametrize("patch", [
        {"pageEvents": [{"type": "screenshot", "atMs": 1}]},
        {"idleTimeBeforeFirstActionMs": -5},
        {"tapBursts": [{"startMs": 0, "endMs": 10, "tapCount": 1}]},
        {"invalidTaps": [{"atMs": i} for i in range(MAX_OBSERVATION_EVENTS + 1)]},
    ])
    def test_invalid_records_are_rejected(self, patch):
        with pytest.raises(ValidationError):
            InteractionObservations(**{**OBSERVATIONS, **patch})


class TestObservationsAreStoredButNeverScored:
    def _pair(self):
        q1, q2 = BANK[0], BANK[1]
        base = [
            {"questionId": q1["questionId"], "userAnswer": _correct(q1), "firstConfirmedResponse": _correct(q1),
             "responseTimeSeconds": 4.0, "hintUsed": False},
            {"questionId": q2["questionId"], "userAnswer": "__wrong__", "firstConfirmedResponse": "__wrong__",
             "responseTimeSeconds": 9.0, "hintUsed": False},
        ]
        with_obs = copy.deepcopy(base)
        for a in with_obs:
            a["interactionObservations"] = OBSERVATIONS
        return _evaluate(base), _evaluate(with_obs)

    def test_observations_are_preserved_in_their_own_block(self):
        _, observed = self._pair()
        stored = observed["evaluatedItems"][0]["interactionObservations"]
        assert stored["tapBursts"] == OBSERVATIONS["tapBursts"]
        assert stored["pageEvents"][0] == {"type": "hidden", "atMs": 5000.0}
        assert stored["version"] == INTERACTION_OBSERVATION_VERSION

    def test_absent_observations_add_no_key(self):
        plain, _ = self._pair()
        assert all("interactionObservations" not in it for it in plain["evaluatedItems"] + plain["excludedItems"])

    def test_correctness_inclusion_and_flags_are_identical(self):
        plain, observed = self._pair()
        strip = lambda items: [{k: v for k, v in it.items() if k != "interactionObservations"} for it in items]
        assert strip(observed["evaluatedItems"]) == strip(plain["evaluatedItems"])
        assert strip(observed["excludedItems"]) == strip(plain["excludedItems"])
        assert observed["evidenceSummary"] == plain["evidenceSummary"]

    def test_elpx_profile_is_identical(self):
        plain, observed = self._pair()

        def profile(result):
            p = compute_elpx_profile_from_evaluated_items(
                ev.select_proficiency_items(result["evaluatedItems"]), grade=GRADE, learner_id="lrn_test")
            # recommendationId is generated per call, so compare everything else
            recs = [{k: v for k, v in r.items() if k != "recommendationId"} for r in p["structuredRecommendations"]]
            return p["skillEstimates"], recs, p["evidenceStatus"]

        assert profile(plain)[0], "fixture should produce at least one skill estimate"
        assert profile(observed) == profile(plain)

    def test_no_clinical_or_attention_labels_are_added(self):
        _, observed = self._pair()
        text = repr(observed).lower()
        for word in ("adhd", "inattent", "impulsiv", "attention_score", "hyperactiv"):
            assert word not in text


class TestBackwardCompatibility:
    def test_older_payload_without_new_fields_still_evaluates(self):
        q = BANK[0]
        result = _evaluate([{"questionId": q["questionId"], "userAnswer": _correct(q), "attempts": 1,
                             "responseTimeSeconds": 5.0, "hintUsed": False}])
        assert len(result["evaluatedItems"]) == 1
        assert "interactionObservations" not in result["evaluatedItems"][0]

    def test_historical_records_without_observations_reproduce_the_same_profile(self):
        legacy_items = [
            {"questionId": q["questionId"], "skillId": q["skillId"], "skillName": q["skillName"],
             "skillNameSi": q["skillNameSi"], "isCorrect": True, "correctFirstResponse": True}
            for q in BANK[:3]
        ]
        p1 = compute_elpx_profile_from_evaluated_items(ev.select_proficiency_items(legacy_items), GRADE, "lrn_old")
        p2 = compute_elpx_profile_from_evaluated_items(ev.select_proficiency_items(copy.deepcopy(legacy_items)), GRADE, "lrn_old")
        assert p1["skillEstimates"] == p2["skillEstimates"]
