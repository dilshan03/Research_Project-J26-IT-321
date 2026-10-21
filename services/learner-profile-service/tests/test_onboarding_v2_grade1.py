"""
Database-free tests for the Grade 1 onboarding-v2 activity journey (ONBOARDING-V2-ITEMS-v1.0).
Payloads mirror what apps/web .../onboarding/journey sends. In-memory collections only.
"""

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


def _journey(pre_answer="right", transfer_answer="right", include_support=True):
    answers = [
        _item("g1v2_calibration_move", "red_leaf", first="green_leaf", role="calibration", method="drag",
              dimensionTags=["IC", "IA"], missedDropCount=1),
        _item("g1v2_count_fruit_4", 4, method="drag", revisions=[{"priorResponse": 5, "newResponse": 4, "timestampSeconds": 9}]),
        _item("g1v2_match_objects_to_numeral_3", 3, revisions=[{"priorResponse": 4, "newResponse": 3, "timestampSeconds": 3}]),
        _item("g1v2_match_numeral_to_group_5", "group_5"),
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
        assert elpx["totalDistinctQuestionsEvaluated"] == 5  # count, 2 representation, pre, transfer
        assert elpx["totalCorrectFirstResponses"] == 4

        # Provisional IMPSA and IMLR summaries
        impsa = res.json()["data"]["impsa"]
        assert impsa is not None and impsa["eligibleUnassistedItems"] == 5
        imlr = res.json()["data"]["imlr"]
        assert imlr is not None and imlr["status"] == "TRANSFER_OBSERVED"
        assert imlr["preProbeCorrect"] is False and imlr["unassistedTransferCorrect"] is True

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
        assert math_sum["impsa"]["eligibleUnassistedItems"] == 5
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
    # Grade 2 has its own items (tests/test_onboarding_v2_grade2.py); Grades 3-5 are not built yet
    assert all(get_onboarding_v2_items_for_grade(g) == [] for g in (3, 4, 5))
