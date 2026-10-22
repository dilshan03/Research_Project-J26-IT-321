"""
Database-free tests for the Grade 4 and Grade 5 onboarding-v2 activity journeys (ONBOARDING-V2-ITEMS-v1.0).
Payloads mirror what apps/web .../onboarding/journey/UpperGradeJourney sends. In-memory collections only.
"""

from collections import Counter

import pytest

from app.core.elpx_engine import MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL
from app.db.onboarding_item_bank import get_onboarding_v2_items_for_grade
from app.services import assessment_evidence as ev
from tests.test_math_assessment_submission import G2_LEARNER, _submit, db  # noqa: F401 (fixture)
from tests.test_onboarding_v2_grade1 import CHILD_PREFS, _item

INDEPENDENT_ROLES = (None, "representation", "pre", "transfer")

# Per grade: skills, the learn-and-transfer family, and one child's answers in journey order.
# The pre-probe answer is wrong, so guided support is shown; everything else is right.
GRADES = {
    4: {
        "skills": {"fractions", "measurement_geometry"},
        "family": "g4_perimeter_rectangle",
        "concept": "perimeter_unit_edges",
        "shade": ("g4v2_shade_fraction_3_4", 3, [{"priorResponse": 4, "newResponse": 3, "timestampSeconds": 6}]),
        "read": ("g4v2_match_strip_to_fraction_2_3", "2/3"),
        "match": ("g4v2_equivalent_strip_1_2", "strip_2_4"),
        "independent": ("g4v2_perimeter_square_2x2", 8),
        "pre": ("g4v2_perimeter_pre_3x2", 6),           # area instead of perimeter: wrong
        "support": ("g4v2_perimeter_support_4x2", 12, 8),
        "transfer": ("g4v2_perimeter_transfer_5x2", 14),
        "skill2": "measurement_geometry",
    },
    5: {
        "skills": {"decimals", "number_patterns"},
        "family": "g5_pattern_add_rule",
        "concept": "pattern_find_rule",
        "shade": ("g5v2_shade_tenths_0_6", 6, [{"priorResponse": 7, "newResponse": 6, "timestampSeconds": 8}]),
        "read": ("g5v2_match_tiles_to_decimal_0_4", "0.4"),
        "match": ("g5v2_compare_decimals_0_7_0_45", "0.7"),
        "independent": ("g5v2_pattern_towers_1_3_5", 7),
        "pre": ("g5v2_pattern_pre_plus4", 18),          # +1 instead of +4: wrong
        "support": ("g5v2_pattern_support_plus4", 14, 13),
        "transfer": ("g5v2_pattern_transfer_plus3", 16),
        "skill2": "number_patterns",
    },
}


@pytest.fixture
def grade_db(db):  # noqa: F811
    """Adds synthetic Grade 4 and Grade 5 learners (same parent) to the in-memory collections."""
    base = next(d for d in db["learners"].docs if d["learnerId"] == G2_LEARNER)
    prefs = next(d for d in db["questionnaires"].docs if d["learnerId"] == G2_LEARNER)
    for grade in GRADES:
        db["learners"].docs.append({**base, "learnerId": f"lrn_b1_grade{grade}", "grade": grade, "age": 5 + grade})
        db["questionnaires"].docs.append({**prefs, "learnerId": f"lrn_b1_grade{grade}"})
    return db


def _journey(grade, include_support=True, **overrides):
    g = {**GRADES[grade], **overrides}
    family = g["family"]
    shade_id, shade_answer, shade_revisions = g["shade"]
    answers = [
        _item(f"g{grade}v2_calibration_move", "red_ball", role="calibration", method="drag", dimensionTags=["IC", "IA"]),
        _item(shade_id, shade_answer, method="tap", revisions=shade_revisions),
        _item(*g["read"]),
        _item(*g["match"]),
        _item(*g["independent"]),
        _item(*g["pre"], role="pre", itemFamilyId=family),
    ]
    if include_support:
        support_id, final, first = g["support"]
        answers.append(_item(
            support_id, final, first=first, role="support", support_before=True, itemFamilyId=family,
            support_events=[{"level": 1, "type": "clarification", "timestampSeconds": 0},
                            {"level": 2, "type": "visual_cue", "timestampSeconds": 9.0}],
        ))
    answers.append(_item(*g["transfer"], role="transfer", itemFamilyId=family))
    return answers


@pytest.mark.parametrize("grade", [4, 5])
def test_every_skill_has_at_least_three_independent_server_scored_items(grade):
    items = get_onboarding_v2_items_for_grade(grade)
    independent = Counter(i["skillId"] for i in items if i["probeRole"] in INDEPENDENT_ROLES)
    assert set(independent) == GRADES[grade]["skills"]
    assert all(n >= MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL for n in independent.values()), independent
    for item in items:
        assert item["expertReview"] == "PENDING"
        assert item["correctAnswer"] not in (None, "")
        if item.get("options"):
            assert str(item["correctAnswer"]) in {o["id"] for o in item["options"]}


@pytest.mark.parametrize("grade", [4, 5])
def test_sequence_items_are_distinct_and_answer_positions_differ(grade):
    items = get_onboarding_v2_items_for_grade(grade)
    seq = {i["probeRole"]: i for i in items if i["itemFamilyId"] == GRADES[grade]["family"]}
    assert set(seq) == {"pre", "support", "transfer"}
    assert len({i["questionId"] for i in seq.values()}) == 3
    assert len({i["correctAnswer"] for i in seq.values()}) == 3
    positions = {r: [o["id"] for o in i["options"]].index(str(i["correctAnswer"])) for r, i in seq.items()}
    assert len(set(positions.values())) == 3


@pytest.mark.parametrize("grade", [4, 5])
class TestUpperGradeJourney:
    async def test_full_journey_gives_elpx_enough_independent_evidence(self, grade_db, grade):
        res = await _submit(f"lrn_b1_grade{grade}", _journey(grade), grade=grade, assessmentProtocolVersion="onboarding-v2",
                            childPreferences=CHILD_PREFS, sessionStartedAt="2026-10-21T08:00:00Z",
                            sessionEndedAt="2026-10-21T08:08:00Z")
        assert res.status_code == 200
        g = GRADES[grade]
        doc = grade_db["assessments"].inserted[0]
        items = {i["questionId"]: i for i in doc["evaluatedItems"]}

        assert items[g["pre"][0]]["correctFirstResponse"] is False
        assert items[g["support"][0]]["includedInProficiencyEstimate"] is False
        assert items[g["transfer"][0]]["correctFirstResponse"] is True
        assert items[g["read"][0]]["correctFirstResponse"] is True       # string answers ("2/3", "0.4") match
        assert items[g["match"][0]]["correctFirstResponse"] is True
        assert items[g["shade"][0]]["correctFirstResponse"] is True
        calibration = next(i for i in doc["excludedItems"] if i["questionId"] == f"g{grade}v2_calibration_move")
        assert calibration["exclusionReason"] == ev.EXCLUDED_NON_MATHEMATICAL

        skills = {s["skillId"]: s for s in res.json()["data"]["elpxProfile"]["skillEstimates"]}
        assert set(skills) == g["skills"]
        assert all(s["distinctQuestionsAssessed"] == 3 and s["isEvidenceSufficient"] for s in skills.values())
        assert skills[g["skill2"]]["correctFirstResponses"] == 2              # independent + transfer; pre wrong

        data = res.json()["data"]
        assert data["imlr"]["status"] == "TRANSFER_OBSERVED" and data["imlr"]["conceptId"] == g["concept"]
        assert data["impsa"]["eligibleUnassistedItems"] == 6

    async def test_help_before_answering_removes_item_from_independent_evidence(self, grade_db, grade):
        answers = _journey(grade)
        shade = answers[1]
        shade["supportBeforeFirstResponse"] = True
        shade["supportEvents"] = [{"level": 2, "type": "visual_cue", "timestampSeconds": 3.0}]
        res = await _submit(f"lrn_b1_grade{grade}", answers, grade=grade, assessmentProtocolVersion="onboarding-v2")
        skill1 = next(iter(GRADES[grade]["skills"] - {GRADES[grade]["skill2"]}))
        skills = {s["skillId"]: s for s in res.json()["data"]["elpxProfile"]["skillEstimates"]}
        assert skills[skill1]["distinctQuestionsAssessed"] == 2
        assert skills[skill1]["provisionalSkillLevel"] == "INSUFFICIENT_EVIDENCE"

    async def test_wrong_shading_is_scored_wrong_on_the_server(self, grade_db, grade):
        shade_id, answer, _ = GRADES[grade]["shade"]
        await _submit(f"lrn_b1_grade{grade}", _journey(grade, shade=(shade_id, answer + 1, [])), grade=grade,
                      assessmentProtocolVersion="onboarding-v2")
        item = next(i for i in grade_db["assessments"].inserted[0]["evaluatedItems"] if i["questionId"] == shade_id)
        assert item["correctFirstResponse"] is False

    async def test_items_are_not_approved_for_another_grade(self, grade_db, grade):
        res = await _submit(G2_LEARNER, _journey(grade), grade=2, assessmentProtocolVersion="onboarding-v2")
        assert res.status_code == 422


async def test_grade5_common_decimal_misconception_is_scored_wrong(grade_db):
    # "Longer is larger": choosing 0.45 over 0.7
    res = await _submit("lrn_b1_grade5", _journey(5, match=("g5v2_compare_decimals_0_7_0_45", "0.45")), grade=5,
                        assessmentProtocolVersion="onboarding-v2")
    assert res.status_code == 200
    item = next(i for i in grade_db["assessments"].inserted[0]["evaluatedItems"]
                if i["questionId"] == "g5v2_compare_decimals_0_7_0_45")
    assert item["correctFirstResponse"] is False
