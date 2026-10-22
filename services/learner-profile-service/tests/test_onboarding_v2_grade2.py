"""
Database-free tests for the Grade 2 onboarding-v2 activity journey (ONBOARDING-V2-ITEMS-v1.0, Grade 2 items).
Payloads mirror what apps/web .../onboarding/journey/Grade2Journey sends. In-memory collections only.
"""

from collections import Counter

from app.core.elpx_engine import MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL
from app.db.onboarding_item_bank import get_onboarding_v2_items_for_grade
from app.services import assessment_evidence as ev
from tests.test_math_assessment_submission import G1_LEARNER, G2_LEARNER, _submit, db  # noqa: F401 (fixture)
from tests.test_onboarding_v2_grade1 import CHILD_PREFS, _item

G2 = get_onboarding_v2_items_for_grade(2)
INDEPENDENT_ROLES = (None, "representation", "pre", "transfer")


def _journey(pre="47", transfer="67", include_support=True, build=34):
    answers = [
        _item("g2v2_calibration_move", "red_ball", role="calibration", method="drag", dimensionTags=["IC", "IA"]),
        _item("g2v2_build_tens_ones_34", build, method="drag",
              revisions=[{"priorResponse": 44, "newResponse": 34, "timestampSeconds": 12}]),
        _item("g2v2_match_blocks_to_numeral_47", 47, revisions=[{"priorResponse": 74, "newResponse": 47, "timestampSeconds": 4}]),
        _item("g2v2_match_numeral_to_blocks_52", "blocks_5_2"),
        _item("g2v2_add_blocks_21_14", 35),
        _item("g2v2_add_pre_32_15", int(pre), role="pre", itemFamilyId="g2_add_no_regroup"),
    ]
    if include_support:
        answers.append(_item(
            "g2v2_add_support_24_33", 57, first=56, role="support", support_before=True, itemFamilyId="g2_add_no_regroup",
            support_events=[{"level": 1, "type": "clarification", "timestampSeconds": 0},
                            {"level": 2, "type": "visual_cue", "timestampSeconds": 9.0}],
        ))
    answers.append(_item("g2v2_add_transfer_41_26", int(transfer), role="transfer", itemFamilyId="g2_add_no_regroup"))
    return answers


def test_every_grade2_skill_has_at_least_three_independent_server_scored_items():
    independent = Counter(i["skillId"] for i in G2 if i["probeRole"] in INDEPENDENT_ROLES)
    assert set(independent) == {"place_value", "addition"}
    assert all(n >= MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL for n in independent.values()), independent
    for item in G2:
        assert item["expertReview"] == "PENDING"
        assert item["correctAnswer"] not in (None, "")
        if item.get("options"):
            assert str(item["correctAnswer"]) in {o["id"] for o in item["options"]}


def test_sequence_items_are_distinct_and_answer_positions_differ():
    seq = {i["probeRole"]: i for i in G2 if i["itemFamilyId"] == "g2_add_no_regroup"}
    assert set(seq) == {"pre", "support", "transfer"}
    assert len({i["questionId"] for i in seq.values()}) == 3
    assert len({i["correctAnswer"] for i in seq.values()}) == 3          # new numbers each time
    positions = {r: [o["id"] for o in i["options"]].index(str(i["correctAnswer"])) for r, i in seq.items()}
    assert len(set(positions.values())) == 3                                # answer never in the same place


class TestGrade2Journey:
    async def test_full_journey_gives_elpx_enough_independent_evidence(self, db):
        res = await _submit(G2_LEARNER, _journey(pre="46"), grade=2, assessmentProtocolVersion="onboarding-v2",
                            childPreferences=CHILD_PREFS, sessionStartedAt="2026-10-21T08:00:00Z",
                            sessionEndedAt="2026-10-21T08:07:00Z")
        assert res.status_code == 200
        doc = db["assessments"].inserted[0]
        items = {i["questionId"]: i for i in doc["evaluatedItems"]}

        # Server scoring and separation of guided evidence
        assert items["g2v2_add_pre_32_15"]["correctFirstResponse"] is False      # 46 is wrong
        assert items["g2v2_add_support_24_33"]["includedInProficiencyEstimate"] is False
        assert items["g2v2_add_transfer_41_26"]["correctFirstResponse"] is True
        assert items["g2v2_build_tens_ones_34"]["revisionEvents"][0]["newResponse"] == 34
        assert items["g2v2_build_tens_ones_34"]["skillId"] == "place_value"
        calibration = next(i for i in doc["excludedItems"] if i["questionId"] == "g2v2_calibration_move")
        assert calibration["exclusionReason"] == ev.EXCLUDED_NON_MATHEMATICAL

        # ELP-X: both skills reach the evidence minimum without counting the guided item
        skills = {s["skillId"]: s for s in res.json()["data"]["elpxProfile"]["skillEstimates"]}
        assert skills["place_value"]["distinctQuestionsAssessed"] == 3
        assert skills["addition"]["distinctQuestionsAssessed"] == 3
        assert skills["place_value"]["isEvidenceSufficient"] and skills["addition"]["isEvidenceSufficient"]
        assert skills["place_value"]["provisionalSkillLevel"] != "INSUFFICIENT_EVIDENCE"
        assert skills["addition"]["correctFirstResponses"] == 2                   # blocks + transfer; pre wrong

        imlr = res.json()["data"]["imlr"]
        assert imlr["status"] == "TRANSFER_OBSERVED" and imlr["conceptId"] == "add_2digit_no_regroup"
        assert res.json()["data"]["impsa"]["eligibleUnassistedItems"] == 6

    async def test_help_before_answering_removes_item_from_independent_evidence(self, db):
        answers = _journey()
        build = next(a for a in answers if a["questionId"] == "g2v2_build_tens_ones_34")
        build["supportBeforeFirstResponse"] = True
        build["supportEvents"] = [{"level": 2, "type": "visual_cue", "timestampSeconds": 3.0}]
        res = await _submit(G2_LEARNER, answers, grade=2, assessmentProtocolVersion="onboarding-v2")
        skills = {s["skillId"]: s for s in res.json()["data"]["elpxProfile"]["skillEstimates"]}
        assert skills["place_value"]["distinctQuestionsAssessed"] == 2
        assert skills["place_value"]["provisionalSkillLevel"] == "INSUFFICIENT_EVIDENCE"   # not forced

    async def test_missing_assistance_report_is_not_independent(self, db):
        answers = _journey()
        for a in answers:
            if a["questionId"] == "g2v2_add_blocks_21_14":
                del a["supportBeforeFirstResponse"]
                a["hintUsed"] = True
        await _submit(G2_LEARNER, answers, grade=2, assessmentProtocolVersion="onboarding-v2")
        item = next(i for i in db["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == "g2v2_add_blocks_21_14")
        assert item["independentFirstResponse"] is None and item["includedInProficiencyEstimate"] is False

    async def test_numeric_answer_outside_options_is_flagged(self, db):
        answers = _journey()
        answers[2]["userAnswer"] = 48
        answers[2]["firstConfirmedResponse"] = 48
        await _submit(G2_LEARNER, answers, grade=2, assessmentProtocolVersion="onboarding-v2")
        item = next(i for i in db["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == "g2v2_match_blocks_to_numeral_47")
        assert ev.FLAG_ANSWER_NOT_IN_OPTIONS in item["qualityFlags"] and item["correctFirstResponse"] is False

    async def test_grade2_items_are_not_approved_for_grade1(self, db):
        res = await _submit(G1_LEARNER, _journey(), grade=1, assessmentProtocolVersion="onboarding-v2")
        assert res.status_code == 422

    async def test_v1_grade2_payload_still_scored(self, db):
        res = await _submit(G2_LEARNER, [{"questionId": "g2_add_2digit_01", "userAnswer": "opt_37", "attempts": 1,
                                          "hintUsed": False, "responseTimeSeconds": 9.0}], grade=2)
        assert res.status_code == 200 and res.json()["data"]["totalQuestions"] == 1
