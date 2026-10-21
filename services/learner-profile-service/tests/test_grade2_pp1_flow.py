"""
PP1 end-to-end check of the Grade 2 onboarding-v2 flow through the real HTTP API (database-free):
child creation -> parent onboarding steps -> Grade 2 journey submission (exact UI payload captured from the
mocked browser walkthrough) -> server scoring -> stored assessment -> onboarding summary -> parent ELP-X profile.
All collections are in-memory fakes; app.db.mongodb.get_database is patched to fail loudly.
"""

import copy
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient

import app.core.auth as auth_module
import app.db.mongodb as mongodb_module
import app.services.evidence_service as evidence_module
import app.services.learner_service as learner_module
import app.services.onboarding_service as onboarding_module
from app.main import app
from tests._fake_mongo import FakeCollection

PARENT_ID = ObjectId()
UI_PAYLOAD = json.loads((Path(__file__).parent / "fixtures" / "grade2_ui_payload.json").read_text(encoding="utf-8"))
UI_PAYLOAD.pop("_note")
H = {"Authorization": "Bearer parent"}


@pytest.fixture
def db(monkeypatch):
    now = datetime.now(timezone.utc)
    cols = {
        "users": FakeCollection([{"_id": PARENT_ID, "role": "parent", "fullName": "Parent", "email": "p@example.com"}]),
        "sessions": FakeCollection([{"sessionId": "parent", "userId": PARENT_ID, "expiresAt": now + timedelta(days=1)}]),
        "learners": FakeCollection(), "deletions": FakeCollection(), "questionnaires": FakeCollection(),
        "assessments": FakeCollection(), "onboarding": FakeCollection(), "events": FakeCollection(),
    }

    def _no_real_database():
        raise AssertionError("PP1 flow tests must not reach a real database.")

    for module, name, value in [
        (mongodb_module, "get_database", _no_real_database),
        (auth_module, "get_sessions_collection", lambda: cols["sessions"]),
        (auth_module, "get_users_collection", lambda: cols["users"]),
        (learner_module, "get_learners_collection", lambda: cols["learners"]),
        (learner_module, "get_deletion_requests_collection", lambda: cols["deletions"]),
        (onboarding_module, "get_learners_collection", lambda: cols["learners"]),
        (onboarding_module, "get_onboarding_collection", lambda: cols["onboarding"]),
        (onboarding_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
        (onboarding_module, "get_assessments_collection", lambda: cols["assessments"]),
        (evidence_module, "get_learners_collection", lambda: cols["learners"]),
        (evidence_module, "get_assessments_collection", lambda: cols["assessments"]),
        (evidence_module, "get_gameplay_events_collection", lambda: cols["events"]),
        (evidence_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
    ]:
        monkeypatch.setattr(module, name, value)
    return cols


async def _call(method, path, json_body=None):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.request(method, f"/api/v1{path}", json=json_body, headers=H)


async def _parent_onboarding():
    res = await _call("POST", "/learners", {"firstName": "Saduni", "age": 7, "grade": 2, "preferredLanguage": "Sinhala",
                                            "avatarId": "avatar_lion"})
    assert res.status_code == 201, res.text
    lid = res.json()["data"]["learnerId"]
    assert res.json()["data"]["onboardingStatus"] == "NOT_STARTED"
    assert (await _call("GET", f"/learners/{lid}/onboarding")).json()["data"]["currentStep"] == "adhd_information"
    steps = [
        ("/onboarding/adhd-information", {"diagnosisStatus": "no"}, "snap_iv"),
        ("/onboarding/snap-iv/skip", None, "preferences"),
        ("/onboarding/preferences", {"version": "LEARNING-PREF-v1.0", "visualAssistance": "always",
                                     "audioAssistance": "read_on_click", "activityPace": "calm_step_by_step",
                                     "hintStyle": "visual_clue", "celebrationStyle": "gentle_star"}, "social_context"),
        ("/onboarding/social-context", {"version": "SOCIAL-CONTEXT-v1.0", "learningEnvironment": "quiet_room",
                                        "peerCollaboration": "independent_first", "parentInvolvement": "guided_together",
                                        "challengingTaskSupport": "take_a_break"}, "handover"),
    ]
    for path, body, expected_next in steps:
        res = await _call("POST", f"/learners/{lid}{path}", body)
        assert res.status_code == 200, (path, res.text)
        assert res.json()["data"]["nextStep"] == expected_next, path
    return lid


def _skills(profile):
    return {s["skillId"]: s for s in profile["skillEstimates"]}


async def test_full_grade2_flow_from_child_creation_to_parent_profile(db):
    lid = await _parent_onboarding()
    res = await _call("POST", f"/learners/{lid}/onboarding/math-assessment", UI_PAYLOAD)
    assert res.status_code == 200, res.text

    # Stored assessment: server-scored, protocol and versions recorded
    doc = db["assessments"].inserted[0]
    assert doc["learnerId"] == lid and doc["grade"] == 2 and doc["assessmentProtocolVersion"] == "onboarding-v2"
    assert doc["onboardingItemBankVersion"] and doc["evidenceRulesetVersion"]
    assert not any("isFirstResponseCorrect" in i for i in doc["evaluatedItems"])

    # Summary marks onboarding complete; parent profile (live ELP-X) has both skills with sufficient evidence
    summary = (await _call("GET", f"/learners/{lid}/onboarding/summary")).json()["data"]
    assert summary["learner"]["onboardingStatus"] == "COMPLETED" and summary["progress"]["status"] == "COMPLETED"
    assert summary["mathSummary"]["assessmentProtocolVersion"] == "onboarding-v2"
    profile = (await _call("GET", f"/learners/{lid}/profile")).json()
    skills = _skills(profile)
    for sid in ("place_value", "addition"):
        assert skills[sid]["distinctQuestionsAssessed"] == 3, sid
        assert skills[sid]["isEvidenceSufficient"] is True, sid
    assert profile["structuredRecommendations"], "ELP-X-REC recommendations expected"
    sanitized = (await _call("GET", f"/learners/{lid}/profile?sanitized=true")).json()
    assert {s["skillId"] for s in sanitized["skills"]} >= {"place_value", "addition"}


async def test_transfer_keeps_its_separate_role_for_impsa_imlr(db):
    lid = await _parent_onboarding()
    data = (await _call("POST", f"/learners/{lid}/onboarding/math-assessment", UI_PAYLOAD)).json()["data"]
    items = {i["questionId"]: i for i in db["assessments"].inserted[0]["evaluatedItems"]}
    assert items["g2v2_add_transfer_41_26"]["probeRole"] == "transfer"
    assert items["g2v2_add_pre_32_15"]["probeRole"] == "pre"
    assert items["g2v2_add_support_24_33"]["probeRole"] == "support"
    assert items["g2v2_add_support_24_33"]["includedInProficiencyEstimate"] is False
    imlr = data["imlr"]
    assert imlr["conceptId"] == "add_2digit_no_regroup"
    assert imlr["preProbeCorrect"] is False and imlr["unassistedTransferCorrect"] is True
    assert imlr["supportDelivered"]                     # guided support was actually delivered in the UI run
    assert data["impsa"]["eligibleUnassistedItems"] == 6


@pytest.mark.parametrize("change, skill", [
    ("drop:g2v2_match_numeral_to_blocks_52", "place_value"),     # missing evidence
    ("assist:g2v2_build_tens_ones_34", "place_value"),           # help before the first answer
    ("drop:g2v2_add_blocks_21_14", "addition"),
    ("unknown:g2v2_add_transfer_41_26", "addition"),            # assistance not reported -> unknown, not independent
])
async def test_missing_or_assisted_evidence_makes_skill_insufficient(db, change, skill):
    lid = await _parent_onboarding()
    payload = copy.deepcopy(UI_PAYLOAD)
    kind, qid = change.split(":")
    if kind == "drop":
        payload["answers"] = [a for a in payload["answers"] if a["questionId"] != qid]
    else:
        item = next(a for a in payload["answers"] if a["questionId"] == qid)
        if kind == "assist":
            item["supportBeforeFirstResponse"] = True
            item["supportEvents"] = [{"level": 1, "type": "clarification", "timestampSeconds": 0.2}]
        else:
            item.pop("supportBeforeFirstResponse")
            item["hintUsed"] = True
    assert (await _call("POST", f"/learners/{lid}/onboarding/math-assessment", payload)).status_code == 200
    s = _skills((await _call("GET", f"/learners/{lid}/profile")).json())[skill]
    assert s["distinctQuestionsAssessed"] == 2
    assert s["isEvidenceSufficient"] is False and s["provisionalSkillLevel"] == "INSUFFICIENT_EVIDENCE"


async def test_all_seven_dimensions_have_recorded_evidence_and_no_invented_scores(db):
    lid = await _parent_onboarding()
    await _call("POST", f"/learners/{lid}/onboarding/math-assessment", UI_PAYLOAD)
    doc = db["assessments"].inserted[0]
    items = {i["questionId"]: i for i in doc["evaluatedItems"] + doc["excludedItems"]}
    evaluated = doc["evaluatedItems"]

    # CP: child-expressed choices with source 'child'
    assert doc["childPreferences"]["source"] == "child" and doc["childPreferences"]["theme"]
    # IC: non-scored instruction check kept with its instruction events
    cal = items["g2v2_calibration_move"]
    assert cal["exclusionReason"] == "NON_MATHEMATICAL_ITEM" and cal["instructionEvents"]
    # IA: input method / mode, missed drops and raw interaction observations on every presented item
    assert all(i.get("inputMethod") and i.get("interactionMode") and "missedDropCount" in i for i in items.values())
    assert all(i.get("interactionObservations") for i in items.values())
    # MP: independent, server-scored first responses
    assert sum(1 for i in evaluated if i["includedInProficiencyEstimate"]) == 6
    # RU: the same concept in concrete, pictorial and symbolic forms
    assert {i["representation"] for i in evaluated if i["skillId"] == "place_value"} == {"concrete", "pictorial", "symbolic"}
    # SC: genuine revisions before confirming
    assert items["g2v2_build_tens_ones_34"]["revisionEvents"] and items["g2v2_match_blocks_to_numeral_47"]["revisionEvents"]
    # SR: guided support events with timing, then an independent transfer
    assert [e["level"] for e in items["g2v2_add_support_24_33"]["supportEvents"]] == [1, 2]
    assert items["g2v2_add_transfer_41_26"]["independentFirstResponse"] is True
    # Instruction replay recorded where it happened
    assert any(e["action"] == "replayed" for e in items["g2v2_add_blocks_21_14"]["instructionEvents"])

    # No dimension scores are computed or stored anywhere
    text = json.dumps(doc, default=str).lower()
    for invented in ("dimensionscore", "dimension_score", "icscore", "srscore", "attentionscore", "readinessscore"):
        assert invented not in text
