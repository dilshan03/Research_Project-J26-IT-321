"""
Database-free tests for the Grade 1 onboarding-v2 activity journey (ONBOARDING-V2-ITEMS-v1.0).
Payloads mirror what apps/web .../onboarding/journey sends. In-memory collections only.
"""

from collections import Counter

from app.core.elpx_engine import MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL
from app.db.onboarding_item_bank import get_onboarding_v2_items_for_grade
from app.services import assessment_evidence as ev
from tests.test_math_assessment_submission import G1_LEARNER, G2_LEARNER, _submit, db  # noqa: F401 (fixture)

CHILD_PREFS = {"source": "child", "avatarId": "avatar_owl", "theme": "animal_friends", "soundMode": "quiet",
               "chosenAt": "2026-10-19T08:00:00Z"}


def _item(qid, answer, first=None, role=None, support_before=False, support_events=None, revisions=None,
          mode="touch", method="select", seconds=6.4, **extra):
    item = {
        "questionId": qid, "userAnswer": answer, "firstConfirmedResponse": answer if first is None else first,
        "attempts": 1 if first is None else 2, "responseTimeSeconds": seconds, "hintUsed": bool(support_events),
        "supportBeforeFirstResponse": support_before, "supportEvents": support_events or [],
        "revisionEvents": revisions or [], "interactionMode": mode, "inputMethod": method,
        "instructionEvents": [{"action": "delivered", "timestampSeconds": 0}, {"action": "replayed", "timestampSeconds": 2.1}],
        "responseStatus": "answered", **extra,
    }
    if role:
        item["probeRole"] = role
    return item


def _journey(pre_answer="right", transfer_answer="right", include_support=True, independent_compare="left"):
    answers = [
        _item("g1v2_calibration_move", "red_leaf", first="green_leaf", role="calibration", method="drag",
              dimensionTags=["IC", "IA"], missedDropCount=1),
        _item("g1v2_count_fruit_4", 4, method="drag", revisions=[{"priorResponse": 5, "newResponse": 4, "timestampSeconds": 9}]),
        _item("g1v2_match_objects_to_numeral_3", 3, revisions=[{"priorResponse": 4, "newResponse": 3, "timestampSeconds": 3}]),
        _item("g1v2_match_numeral_to_group_5", "group_5"),
        _item("g1v2_compare_independent_7_4", independent_compare, revisions=[{"priorResponse": "right", "newResponse": "left", "timestampSeconds": 4}]),
        _item("g1v2_compare_pre", pre_answer, role="pre", itemFamilyId="g1_compare_more"),
    ]
    if include_support:
        answers.append(_item(
            "g1v2_compare_support", "right", first="left", role="support", support_before=True, itemFamilyId="g1_compare_more",
            support_events=[{"level": 1, "type": "clarification", "timestampSeconds": 0},
                            {"level": 2, "type": "visual_cue", "timestampSeconds": 7.5}],
        ))
    answers.append(_item("g1v2_compare_transfer", transfer_answer, role="transfer", itemFamilyId="g1_compare_more"))
    return answers


class TestGrade1Journey:
    async def test_full_journey_scores_on_server_and_separates_evidence(self, db):
        res = await _submit(G1_LEARNER, _journey(), grade=1, assessmentProtocolVersion="onboarding-v2",
                            childPreferences=CHILD_PREFS, sessionStartedAt="2026-10-19T08:00:00Z",
                            sessionEndedAt="2026-10-19T08:05:10Z")
        assert res.status_code == 200
        doc = db["assessments"].inserted[0]
        assert doc["assessmentProtocolVersion"] == "onboarding-v2"
        assert doc["childPreferences"]["source"] == "child" and doc["childPreferences"]["theme"] == "animal_friends"
        assert doc["sessionStartedAt"] is not None and doc["sessionEndedAt"] is not None

        # Calibration kept as non-mathematical evidence with its events, never scored
        calibration = next(i for i in doc["excludedItems"] if i["questionId"] == "g1v2_calibration_move")
        assert calibration["exclusionReason"] == ev.EXCLUDED_NON_MATHEMATICAL
        assert calibration["missedDropCount"] == 1 and calibration["inputMethod"] == "drag"

        items = {i["questionId"]: i for i in doc["evaluatedItems"]}
        assert items["g1v2_compare_pre"]["correctFirstResponse"] is False  # 'right' is wrong; server key is 'left'
        assert items["g1v2_compare_support"]["includedInProficiencyEstimate"] is False
        assert items["g1v2_compare_transfer"]["correctFirstResponse"] is True
        assert ev.FLAG_TRANSFER_WITHOUT_PRE_PROBE not in items["g1v2_compare_transfer"]["qualityFlags"]
        assert items["g1v2_count_fruit_4"]["revisionEvents"][0]["newResponse"] == 4
        assert items["g1v2_count_fruit_4"]["activityId"] == "g1_count_basket"  # server metadata

        elpx = res.json()["data"]["elpxProfile"]
        assert elpx["totalDistinctQuestionsEvaluated"] == 6  # count, 2 representation, independent compare, pre, transfer
        assert elpx["totalCorrectFirstResponses"] == 5

        # Provisional IMPSA and IMLR summaries
        impsa = res.json()["data"]["impsa"]
        assert impsa is not None and impsa["eligibleUnassistedItems"] == 6
        imlr = res.json()["data"]["imlr"]
        assert imlr is not None and imlr["status"] == "TRANSFER_OBSERVED"
        assert imlr["preProbeCorrect"] is False and imlr["unassistedTransferCorrect"] is True

    async def test_comparison_skill_reaches_the_unchanged_evidence_minimum(self, db):
        assert MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL == 3          # the requirement itself is not relaxed
        res = await _submit(G1_LEARNER, _journey(), grade=1, assessmentProtocolVersion="onboarding-v2")
        skills = {s["skillId"]: s for s in res.json()["data"]["elpxProfile"]["skillEstimates"]}
        comparison = skills["number_comparison"]
        assert comparison["distinctQuestionsAssessed"] == 3     # independent compare, pre, transfer (support excluded)
        assert comparison["isEvidenceSufficient"] is True
        assert comparison["provisionalSkillLevel"] != "INSUFFICIENT_EVIDENCE"
        assert comparison["correctFirstResponses"] == 2          # pre answered wrongly in this journey
        item = next(i for i in db["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == "g1v2_compare_independent_7_4")
        assert item["includedInProficiencyEstimate"] is True and item["correctFirstResponse"] is True
        assert item["revisionEvents"][0]["newResponse"] == "left"

    async def test_help_before_the_independent_comparison_leaves_the_skill_insufficient(self, db):
        answers = _journey()
        compare = next(a for a in answers if a["questionId"] == "g1v2_compare_independent_7_4")
        compare["supportBeforeFirstResponse"] = True
        compare["supportEvents"] = [{"level": 1, "type": "clarification", "timestampSeconds": 2.0}]
        res = await _submit(G1_LEARNER, answers, grade=1, assessmentProtocolVersion="onboarding-v2")
        comparison = next(s for s in res.json()["data"]["elpxProfile"]["skillEstimates"] if s["skillId"] == "number_comparison")
        assert comparison["distinctQuestionsAssessed"] == 2
        assert comparison["provisionalSkillLevel"] == "INSUFFICIENT_EVIDENCE"   # not forced to pass

    async def test_wrong_independent_comparison_is_scored_wrong_and_imlr_is_unchanged(self, db):
        res = await _submit(G1_LEARNER, _journey(independent_compare="right"), grade=1, assessmentProtocolVersion="onboarding-v2")
        item = next(i for i in db["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == "g1v2_compare_independent_7_4")
        assert item["correctFirstResponse"] is False
        imlr = res.json()["data"]["imlr"]                         # the learn-and-transfer sequence is evaluated alone
        assert imlr["status"] == "TRANSFER_OBSERVED" and imlr["preProbeCorrect"] is False

    async def test_support_item_cannot_be_relabelled_as_independent(self, db):
        answers = _journey()
        support = next(a for a in answers if a["questionId"] == "g1v2_compare_support")
        support["probeRole"] = "transfer"
        support["supportBeforeFirstResponse"] = False
        await _submit(G1_LEARNER, answers, grade=1, assessmentProtocolVersion="onboarding-v2")
        item = next(i for i in db["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == "g1v2_compare_support")
        assert item["probeRole"] == "support"
        assert item["clientReportedProbeRole"] == "transfer"
        assert ev.FLAG_PROBE_ROLE_MISMATCH in item["qualityFlags"]
        assert item["includedInProficiencyEstimate"] is False

    async def test_transfer_without_pre_probe_is_flagged(self, db):
        answers = [a for a in _journey() if a["questionId"] != "g1v2_compare_pre"]
        await _submit(G1_LEARNER, answers, grade=1, assessmentProtocolVersion="onboarding-v2")
        item = next(i for i in db["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == "g1v2_compare_transfer")
        assert ev.FLAG_TRANSFER_WITHOUT_PRE_PROBE in item["qualityFlags"]

    async def test_assisted_pre_probe_is_not_independent(self, db):
        answers = _journey(pre_answer="left")
        pre = next(a for a in answers if a["questionId"] == "g1v2_compare_pre")
        pre["supportBeforeFirstResponse"] = True
        pre["supportEvents"] = [{"level": 1, "type": "clarification", "timestampSeconds": 1.0}]
        await _submit(G1_LEARNER, answers, grade=1, assessmentProtocolVersion="onboarding-v2")
        item = next(i for i in db["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == "g1v2_compare_pre")
        assert item["correctFirstResponse"] is True and item["includedInProficiencyEstimate"] is False

    async def test_skipped_item_is_not_scored_and_has_no_invented_time(self, db):
        answers = _journey(include_support=False)
        answers[1] = {"questionId": "g1v2_count_fruit_4", "userAnswer": "", "attempts": 1, "responseStatus": "skipped",
                      "hintUsed": False, "instructionEvents": [{"action": "delivered", "timestampSeconds": 0}]}
        await _submit(G1_LEARNER, answers, grade=1, assessmentProtocolVersion="onboarding-v2")
        skipped = next(i for i in db["assessments"].inserted[0]["excludedItems"] if i["questionId"] == "g1v2_count_fruit_4")
        assert skipped["responseStatus"] == ev.STATUS_SKIPPED
        assert skipped["responseTimeSeconds"] is None

    async def test_grade1_items_are_not_approved_for_grade2(self, db):
        res = await _submit(G2_LEARNER, _journey(), grade=2, assessmentProtocolVersion="onboarding-v2")
        assert res.status_code == 422
        assert db["assessments"].inserted == []

    async def test_v1_grade1_payload_still_scored(self, db):
        res = await _submit(G1_LEARNER, [{"questionId": "g1_num_count_01", "userAnswer": "opt_5", "attempts": 1,
                                          "hintUsed": False, "responseTimeSeconds": 8.0}], grade=1)
        assert res.status_code == 200
        assert res.json()["data"]["totalQuestions"] == 1

    async def test_get_onboarding_summary_returns_v2_details(self, db):
        await _submit(G1_LEARNER, _journey(), grade=1, assessmentProtocolVersion="onboarding-v2",
                      childPreferences=CHILD_PREFS, sessionStartedAt="2026-10-19T08:00:00Z",
                      sessionEndedAt="2026-10-19T08:05:10Z")
        from app.services.onboarding_service import get_onboarding_summary
        from tests.test_math_assessment_submission import PARENT_ID
        summary = await get_onboarding_summary(learner_id=G1_LEARNER, parent_id=str(PARENT_ID))
        assert summary["progress"]["assessmentProtocolVersion"] == "onboarding-v2"
        math_sum = summary["mathSummary"]
        assert math_sum["assessmentProtocolVersion"] == "onboarding-v2"
        assert math_sum["childPreferences"]["theme"] == "animal_friends"
        assert math_sum["impsa"]["eligibleUnassistedItems"] == 6
        assert math_sum["imlr"]["status"] == "TRANSFER_OBSERVED"
        assert len(math_sum["evaluatedItems"]) > 0


def test_item_bank_answer_keys_present_and_roles_valid():
    items = get_onboarding_v2_items_for_grade(1)
    assert {i["probeRole"] for i in items} == {None, "representation", "pre", "support", "transfer"}
    for item in items:
        assert item["correctAnswer"] not in (None, "")
        assert item["expertReview"] == "PENDING"
        if item.get("options"):
            assert item["correctAnswer"] in {o["id"] for o in item["options"]}
    independent = Counter(i["skillId"] for i in items if i["probeRole"] in (None, "representation", "pre", "transfer"))
    assert all(n >= MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL for n in independent.values()), independent
    new = next(i for i in items if i["questionId"] == "g1v2_compare_independent_7_4")
    assert new["skillId"] == "number_comparison" and new["probeRole"] is None
    assert new["itemFamilyId"] != "g1_compare_more"             # outside the pre -> support -> transfer family
    # Grades 2-5 have their own items and tests (test_onboarding_v2_grade2.py, _grade3.py, _grades4_5.py)
    assert not any(i["grade"] != 1 for i in items)
