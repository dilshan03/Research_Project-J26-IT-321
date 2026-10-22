"""
Database-free tests for the Grade 3 onboarding-v2 activity journey (ONBOARDING-V2-ITEMS-v1.0, Grade 3 items).
Payloads mirror what apps/web .../onboarding/journey/Grade3Journey sends. In-memory collections only.
"""

from collections import Counter

import pytest

from app.core.elpx_engine import MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL
from app.db.onboarding_item_bank import get_onboarding_v2_items_for_grade
from app.services import assessment_evidence as ev
from tests.test_math_assessment_submission import G2_LEARNER, _submit, db  # noqa: F401 (fixture)
from tests.test_onboarding_v2_grade1 import CHILD_PREFS, _item

G3 = get_onboarding_v2_items_for_grade(3)
G3_LEARNER = "lrn_b1_grade3"
INDEPENDENT_ROLES = (None, "representation", "pre", "transfer")


@pytest.fixture
def db3(db):  # noqa: F811
    """Adds a synthetic Grade 3 learner (same parent) to the in-memory collections."""
    base = next(d for d in db["learners"].docs if d["learnerId"] == G2_LEARNER)
    db["learners"].docs.append({**base, "learnerId": G3_LEARNER, "grade": 3, "age": 8})
    prefs = next(d for d in db["questionnaires"].docs if d["learnerId"] == G2_LEARNER)
    db["questionnaires"].docs.append({**prefs, "learnerId": G3_LEARNER})
    return db


def _journey(pre="12", transfer="10", include_support=True, build=347):
    answers = [
        _item("g3v2_calibration_move", "red_ball", role="calibration", method="drag", dimensionTags=["IC", "IA"]),
        _item("g3v2_build_hto_347", build, method="drag",
              revisions=[{"priorResponse": 357, "newResponse": 347, "timestampSeconds": 14}]),
        _item("g3v2_match_blocks_to_numeral_258", 258, revisions=[{"priorResponse": 852, "newResponse": 258, "timestampSeconds": 5}]),
        _item("g3v2_match_numeral_to_blocks_406", "blocks_4_0_6"),
        _item("g3v2_mult_groups_2x4", 8),
        _item("g3v2_mult_pre_4x3", int(pre), role="pre", itemFamilyId="g3_mult_equal_groups"),
    ]
    if include_support:
        answers.append(_item(
            "g3v2_mult_support_3x5", 15, first=8, role="support", support_before=True, itemFamilyId="g3_mult_equal_groups",
            support_events=[{"level": 1, "type": "clarification", "timestampSeconds": 0},
                            {"level": 2, "type": "visual_cue", "timestampSeconds": 8.0}],
        ))
    answers.append(_item("g3v2_mult_transfer_5x2", int(transfer), role="transfer", itemFamilyId="g3_mult_equal_groups"))
    return answers


def test_every_grade3_skill_has_at_least_three_independent_server_scored_items():
    independent = Counter(i["skillId"] for i in G3 if i["probeRole"] in INDEPENDENT_ROLES)
    assert set(independent) == {"place_value", "multiplication"}
    assert all(n >= MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL for n in independent.values()), independent
    for item in G3:
        assert item["expertReview"] == "PENDING"
        assert item["correctAnswer"] not in (None, "")
        if item.get("options"):
            assert str(item["correctAnswer"]) in {o["id"] for o in item["options"]}


def test_sequence_items_are_distinct_and_answer_positions_differ():
    seq = {i["probeRole"]: i for i in G3 if i["itemFamilyId"] == "g3_mult_equal_groups"}
    assert set(seq) == {"pre", "support", "transfer"}
    assert len({i["questionId"] for i in seq.values()}) == 3
    assert len({i["correctAnswer"] for i in seq.values()}) == 3          # new numbers each time
    positions = {r: [o["id"] for o in i["options"]].index(str(i["correctAnswer"])) for r, i in seq.items()}
    assert len(set(positions.values())) == 3                                # answer never in the same place


def test_independent_groups_item_does_not_share_an_answer_with_the_sequence():
    # Avoids carrying an answer over between the picture item and the pre-probe/transfer (e.g. 3 x 4 vs 4 x 3).
    groups = next(i for i in G3 if i["questionId"] == "g3v2_mult_groups_2x4")
    seq_answers = {i["correctAnswer"] for i in G3 if i["itemFamilyId"] == "g3_mult_equal_groups"}
    assert groups["correctAnswer"] not in seq_answers


class TestGrade3Journey:
    async def test_full_journey_gives_elpx_enough_independent_evidence(self, db3):
        res = await _submit(G3_LEARNER, _journey(pre="7"), grade=3, assessmentProtocolVersion="onboarding-v2",
                            childPreferences=CHILD_PREFS, sessionStartedAt="2026-10-21T08:00:00Z",
                            sessionEndedAt="2026-10-21T08:08:00Z")
        assert res.status_code == 200
        doc = db3["assessments"].inserted[0]
        items = {i["questionId"]: i for i in doc["evaluatedItems"]}

        assert items["g3v2_mult_pre_4x3"]["correctFirstResponse"] is False       # 7 = 4 + 3, wrong
        assert items["g3v2_mult_support_3x5"]["includedInProficiencyEstimate"] is False
        assert items["g3v2_mult_transfer_5x2"]["correctFirstResponse"] is True
        assert items["g3v2_match_numeral_to_blocks_406"]["correctFirstResponse"] is True
        assert items["g3v2_build_hto_347"]["skillId"] == "place_value"
        assert items["g3v2_build_hto_347"]["revisionEvents"][0]["newResponse"] == 347
        calibration = next(i for i in doc["excludedItems"] if i["questionId"] == "g3v2_calibration_move")
        assert calibration["exclusionReason"] == ev.EXCLUDED_NON_MATHEMATICAL

        skills = {s["skillId"]: s for s in res.json()["data"]["elpxProfile"]["skillEstimates"]}
        assert set(skills) == {"place_value", "multiplication"}
        assert skills["place_value"]["distinctQuestionsAssessed"] == 3
        assert skills["multiplication"]["distinctQuestionsAssessed"] == 3
        assert skills["place_value"]["isEvidenceSufficient"] and skills["multiplication"]["isEvidenceSufficient"]
        assert skills["multiplication"]["correctFirstResponses"] == 2             # groups + transfer; pre wrong

        imlr = res.json()["data"]["imlr"]
        assert imlr["status"] == "TRANSFER_OBSERVED" and imlr["conceptId"] == "mult_equal_groups"
        assert res.json()["data"]["impsa"]["eligibleUnassistedItems"] == 6

    async def test_correct_pre_probe_skips_support_and_still_counts_transfer(self, db3):
        res = await _submit(G3_LEARNER, _journey(include_support=False), grade=3, assessmentProtocolVersion="onboarding-v2")
        assert res.status_code == 200
        skills = {s["skillId"]: s for s in res.json()["data"]["elpxProfile"]["skillEstimates"]}
        assert skills["multiplication"]["distinctQuestionsAssessed"] == 3
        assert skills["multiplication"]["correctFirstResponses"] == 3

    async def test_help_before_answering_removes_item_from_independent_evidence(self, db3):
        answers = _journey()
        build = next(a for a in answers if a["questionId"] == "g3v2_build_hto_347")
        build["supportBeforeFirstResponse"] = True
        build["supportEvents"] = [{"level": 2, "type": "visual_cue", "timestampSeconds": 3.0}]
        res = await _submit(G3_LEARNER, answers, grade=3, assessmentProtocolVersion="onboarding-v2")
        skills = {s["skillId"]: s for s in res.json()["data"]["elpxProfile"]["skillEstimates"]}
        assert skills["place_value"]["distinctQuestionsAssessed"] == 2
        assert skills["place_value"]["provisionalSkillLevel"] == "INSUFFICIENT_EVIDENCE"   # not forced

    async def test_wrong_build_total_is_scored_wrong_on_the_server(self, db3):
        await _submit(G3_LEARNER, _journey(build=437), grade=3, assessmentProtocolVersion="onboarding-v2")
        item = next(i for i in db3["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == "g3v2_build_hto_347")
        assert item["correctFirstResponse"] is False

    async def test_grade3_items_are_not_approved_for_grade2(self, db3):
        res = await _submit(G2_LEARNER, _journey(), grade=2, assessmentProtocolVersion="onboarding-v2")
        assert res.status_code == 422

    async def test_v1_grade3_payload_still_scored(self, db3):
        res = await _submit(G3_LEARNER, [{"questionId": "g3_place_val_01", "userAnswer": "opt_x", "attempts": 1,
                                          "hintUsed": False, "responseTimeSeconds": 9.0}], grade=3)
        assert res.status_code == 200 and res.json()["data"]["totalQuestions"] == 1
