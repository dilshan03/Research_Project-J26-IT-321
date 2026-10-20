"""
Database-free unit tests for server-side assessment evidence rules (B1, ASSESS-EVIDENCE-v1.0).
Uses the real MATH-QB-v1.0 question bank; no database access.
"""

import pytest

from app.db.question_bank import get_question_by_id, get_questions_for_grade
from app.schemas.onboarding import MathItemAnswerSubmission
from app.services import assessment_evidence as ev


def _approved(grade):
    return {q["questionId"] for q in get_questions_for_grade(grade, include_answers=True)}


def _evaluate(answers, grade=1, **kwargs):
    kwargs.setdefault("protocol_version", "onboarding-v1")
    return ev.evaluate_submission(
        answers=[MathItemAnswerSubmission(**a) for a in answers],
        learner_grade=grade,
        approved_question_ids=_approved(grade),
        question_lookup=get_question_by_id,
        **kwargs,
    )


def _only_evaluated(answer, grade=1):
    result = _evaluate([answer], grade)
    assert len(result["evaluatedItems"]) == 1, result["excludedItems"]
    return result["evaluatedItems"][0]


def _only_excluded(answer, grade=1):
    result = _evaluate([answer], grade)
    assert len(result["excludedItems"]) == 1, result["evaluatedItems"]
    return result["excludedItems"][0]


# g1_num_count_01 (visual, options opt_3..opt_6, correct opt_5); g1_sub_basic_03 (numeric, correct 4)
COUNT_Q = "g1_num_count_01"
NUMERIC_Q = "g1_sub_basic_03"


class TestFirstResponseCorrectness:
    def test_correct_first_response_is_server_verified(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                                "hintUsed": False, "responseTimeSeconds": 7.2})
        assert item["correctFirstResponse"] is True
        assert item["firstResponseSource"] == ev.FIRST_RESPONSE_SERVER_VERIFIED
        assert item["isCorrect"] is True
        assert item["includedInProficiencyEstimate"] is True

    def test_incorrect_first_response_is_kept_even_if_later_corrected(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_4",
                                "attempts": 2, "hintUsed": False})
        assert item["isCorrect"] is True
        assert item["correctFirstResponse"] is False
        assert item["includedInProficiencyEstimate"] is True

    @pytest.mark.parametrize("client_flag,first,expected", [(True, "opt_4", False), (False, "opt_5", True)])
    def test_client_server_disagreement_uses_server_value(self, client_flag, first, expected):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": first, "firstConfirmedResponse": first,
                                "isFirstResponseCorrect": client_flag, "hintUsed": False})
        assert item["correctFirstResponse"] is expected
        assert item["clientReportedFirstResponseCorrect"] is client_flag
        assert ev.FLAG_FIRST_RESPONSE_MISMATCH in item["qualityFlags"]

    def test_agreeing_client_flag_is_not_flagged(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                                "isFirstResponseCorrect": True, "hintUsed": False})
        assert ev.FLAG_FIRST_RESPONSE_MISMATCH not in item["qualityFlags"]

    def test_missing_first_response_with_multiple_attempts_is_unknown(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "attempts": 3, "hintUsed": False})
        assert item["correctFirstResponse"] is None
        assert item["firstResponseSource"] == ev.FIRST_RESPONSE_UNKNOWN
        assert ev.FLAG_FIRST_RESPONSE_UNKNOWN in item["qualityFlags"]
        assert item["includedInProficiencyEstimate"] is False

    def test_client_flag_alone_is_never_authoritative(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_3", "attempts": 2,
                                "isFirstResponseCorrect": True, "hintUsed": False})
        assert item["correctFirstResponse"] is None
        assert ev.FLAG_CLIENT_FIRST_RESPONSE_UNVERIFIED in item["qualityFlags"]
        assert item["includedInProficiencyEstimate"] is False

    def test_unsupplied_attempts_do_not_imply_single_attempt(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "hintUsed": False})
        assert item["correctFirstResponse"] is None

    def test_single_supplied_attempt_uses_final_answer_as_first_response(self):
        item = _only_evaluated({"questionId": NUMERIC_Q, "userAnswer": 4, "attempts": 1, "hintUsed": False})
        assert item["correctFirstResponse"] is True
        assert item["firstResponseSource"] == ev.FIRST_RESPONSE_SINGLE_ATTEMPT


class TestEmptySkippedAndInvalid:
    @pytest.mark.parametrize("empty", ["", "   "])
    def test_empty_answer_is_unanswered_and_never_correct(self, empty):
        item = _only_excluded({"questionId": COUNT_Q, "userAnswer": empty, "attempts": 1})
        assert item["responseStatus"] == ev.STATUS_UNANSWERED
        assert item["includedInProficiencyEstimate"] is False
        assert "isCorrect" not in item and "correctFirstResponse" not in item

    def test_unseen_item_with_hardcoded_client_correctness_is_not_scored(self):
        """Mirrors the current Living Canvas payload for items never shown to the child."""
        result = _evaluate([{"questionId": "g1_add_basic_02", "userAnswer": "", "firstConfirmedResponse": "",
                             "isFirstResponseCorrect": True, "responseTimeSeconds": 6.5, "hintUsed": False}])
        assert result["evaluatedItems"] == []
        excluded = result["excludedItems"][0]
        assert excluded["responseStatus"] == ev.STATUS_UNANSWERED
        assert excluded["clientReportedFirstResponseCorrect"] is True
        assert result["evidenceSummary"]["unansweredItems"] == 1

    @pytest.mark.parametrize("declared,status", [("skipped", ev.STATUS_SKIPPED), ("not_presented", ev.STATUS_NOT_PRESENTED)])
    def test_declared_skipped_or_not_presented(self, declared, status):
        item = _only_excluded({"questionId": COUNT_Q, "userAnswer": "", "responseStatus": declared})
        assert item["responseStatus"] == status

    def test_declared_skipped_with_an_answer_is_invalid(self):
        item = _only_excluded({"questionId": COUNT_Q, "userAnswer": "opt_5", "responseStatus": "skipped"})
        assert item["responseStatus"] == ev.STATUS_INVALID
        assert ev.FLAG_RESPONSE_STATUS_CONFLICT in item["qualityFlags"]

    def test_non_numeric_answer_to_numeric_question_is_invalid(self):
        item = _only_excluded({"questionId": NUMERIC_Q, "userAnswer": "four", "attempts": 1})
        assert item["responseStatus"] == ev.STATUS_INVALID
        assert ev.FLAG_NON_NUMERIC_ANSWER in item["qualityFlags"]

    def test_numeric_string_answer_is_accepted(self):
        item = _only_evaluated({"questionId": NUMERIC_Q, "userAnswer": "4", "attempts": 1, "hintUsed": False})
        assert item["isCorrect"] is True

    def test_answer_outside_options_is_a_genuine_incorrect_answer(self):
        """The Living Canvas maps 7 placed apples to 'opt_7', which is not a listed option."""
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_7", "firstConfirmedResponse": "opt_7",
                                "hintUsed": False})
        assert item["isCorrect"] is False and item["correctFirstResponse"] is False
        assert ev.FLAG_ANSWER_NOT_IN_OPTIONS in item["qualityFlags"]


class TestAssistanceEvidence:
    def test_assisted_first_response_is_not_independent(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                                "supportBeforeFirstResponse": True})
        assert item["correctFirstResponse"] is True
        assert item["independentFirstResponse"] is False
        assert item["includedInProficiencyEstimate"] is False
        assert ev.FLAG_ASSISTED_FIRST_RESPONSE in item["qualityFlags"]

    def test_explicit_unassisted_flag_is_stored_and_used(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                                "supportBeforeFirstResponse": False, "hintUsed": True})
        assert item["supportBeforeFirstResponse"] is False
        assert item["independentFirstResponse"] is True
        assert item["includedInProficiencyEstimate"] is True

    def test_missing_support_flag_is_not_stored_or_assumed(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5"})
        assert "supportBeforeFirstResponse" not in item
        assert item["independentFirstResponse"] is None
        assert ev.FLAG_ASSISTANCE_NOT_REPORTED in item["qualityFlags"]
        assert item["includedInProficiencyEstimate"] is False

    @pytest.mark.parametrize("assistance", [{"hintUsed": True}, {"hintUsed": False, "demonstrationUsed": True}])
    def test_hint_or_demonstration_without_timing_is_unknown(self, assistance):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                                **assistance})
        assert item["independentFirstResponse"] is None
        assert ev.FLAG_ASSISTANCE_TIMING_UNKNOWN in item["qualityFlags"]
        assert item["includedInProficiencyEstimate"] is False

    def test_no_reported_assistance_counts_as_unassisted(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                                "hintUsed": False, "demonstrationUsed": False})
        assert item["independentFirstResponse"] is True

    def test_support_probe_role_never_counts_as_independent(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                                "supportBeforeFirstResponse": False, "probeRole": "support"})
        assert item["includedInProficiencyEstimate"] is False
        assert ev.FLAG_SUPPORT_PROBE_ROLE in item["qualityFlags"]


class TestQuestionValidation:
    def test_question_from_another_grade_is_excluded(self):
        item = _only_excluded({"questionId": "g3_place_val_01", "userAnswer": "opt_a"}, grade=1)
        assert item["exclusionReason"] == ev.EXCLUDED_NOT_APPROVED_FOR_GRADE
        assert item["questionGrade"] == 3

    def test_unknown_question_is_excluded_not_silently_dropped(self):
        result = _evaluate([{"questionId": "not_in_bank", "userAnswer": "opt_5"}])
        assert result["excludedItems"][0]["exclusionReason"] == ev.EXCLUDED_UNKNOWN_QUESTION
        assert result["evidenceSummary"]["unknownQuestionItems"] == 1
        assert result["approvedItemsSubmitted"] == 0

    def test_duplicate_question_keeps_first_occurrence(self):
        result = _evaluate([
            {"questionId": COUNT_Q, "userAnswer": "opt_4", "attempts": 1, "hintUsed": False},
            {"questionId": COUNT_Q, "userAnswer": "opt_5", "attempts": 1, "hintUsed": False},
        ])
        assert [i["userAnswer"] for i in result["evaluatedItems"]] == ["opt_4"]
        assert result["excludedItems"][0]["exclusionReason"] == ev.EXCLUDED_DUPLICATE

    def test_request_grade_and_protocol_inconsistencies_are_flagged(self):
        result = _evaluate([{"questionId": COUNT_Q, "userAnswer": "opt_5"}], grade=1,
                           request_grade=2, protocol_version="banana")
        assert ev.FLAG_REQUEST_GRADE_MISMATCH in result["evidenceSummary"]["flags"]
        assert ev.FLAG_UNRECOGNIZED_PROTOCOL_VERSION in result["evidenceSummary"]["flags"]


class TestCalibrationExclusion:
    @pytest.mark.parametrize("qid", ["calib_red_leaf", COUNT_Q])
    def test_calibration_items_never_contribute(self, qid):
        result = _evaluate([{"questionId": qid, "userAnswer": "tap_leaf", "probeRole": "calibration",
                             "hintUsed": False, "attempts": 1}])
        assert result["evaluatedItems"] == []
        assert result["excludedItems"][0]["exclusionReason"] == ev.EXCLUDED_NON_MATHEMATICAL
        assert result["evidenceSummary"]["nonMathematicalItems"] == 1
        assert result["evidenceSummary"]["unansweredItems"] == 0


class TestLegacyAndRecording:
    def test_legacy_v1_payload_is_scored_as_before(self):
        """Payload used by the existing (MongoDB-backed) onboarding API test."""
        result = _evaluate([
            {"questionId": "g2_add_2digit_01", "userAnswer": "opt_37", "attempts": 1, "responseTimeSeconds": 8.5},
            {"questionId": "g2_mult_groups_02", "userAnswer": "opt_12", "attempts": 1, "responseTimeSeconds": 12.0},
            {"questionId": "g2_num_compare_03", "userAnswer": "opt_82", "attempts": 1, "responseTimeSeconds": 5.2},
            {"questionId": "g2_word_sub_04", "userAnswer": 15, "attempts": 1, "responseTimeSeconds": 14.1},
        ], grade=2)
        items = result["evaluatedItems"]
        assert len(items) == 4 and all(i["isCorrect"] for i in items)
        assert all(i["firstResponseSource"] == ev.FIRST_RESPONSE_SINGLE_ATTEMPT for i in items)
        # No assistance information was sent, so independence is unknown rather than assumed.
        assert all(i["includedInProficiencyEstimate"] is False for i in items)

    def test_current_standard_view_payload_counts_as_independent(self):
        """The existing Standard view always sends attempts, responseTimeSeconds and hintUsed."""
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "attempts": 1,
                                "responseTimeSeconds": 9.0, "hintUsed": False})
        assert item["includedInProficiencyEstimate"] is True

    def test_unsupplied_measurements_are_not_fabricated(self):
        item = _only_evaluated({"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                                "hintUsed": False})
        assert item["responseTimeSeconds"] is None
        assert ev.FLAG_RESPONSE_TIME_NOT_RECORDED in item["qualityFlags"]
        assert item["demonstrationUsed"] is None
        assert item["selfCorrectionsCount"] is None

    def test_select_proficiency_items_passes_legacy_records_through(self):
        legacy = {"questionId": "q1", "isCorrect": True}
        new_included = {"questionId": "q2", "includedInProficiencyEstimate": True}
        new_excluded = {"questionId": "q3", "includedInProficiencyEstimate": False}
        assert ev.select_proficiency_items([legacy, new_included, new_excluded]) == [legacy, new_included]

    def test_evidence_summary_counts(self):
        result = _evaluate([
            {"questionId": COUNT_Q, "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5", "hintUsed": False,
             "responseTimeSeconds": 5.0},
            {"questionId": "g1_add_basic_02", "userAnswer": ""},
            {"questionId": NUMERIC_Q, "userAnswer": "", "responseStatus": "skipped"},
            {"questionId": "g1_shape_rec_04", "userAnswer": "", "responseStatus": "not_presented"},
        ])
        s = result["evidenceSummary"]
        assert (s["submittedItems"], s["answeredItems"], s["unansweredItems"], s["skippedItems"],
                s["notPresentedItems"], s["independentFirstResponseItems"]) == (4, 1, 1, 1, 1, 1)
        assert s["evidenceRulesetVersion"] == ev.EVIDENCE_RULESET_VERSION
