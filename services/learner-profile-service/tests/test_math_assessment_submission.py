"""
Database-free endpoint tests for POST /learners/{id}/onboarding/math-assessment and the
GET /learners/{id}/profile baseline path after B1 (ASSESS-EVIDENCE-v1.0).

All MongoDB collections are in-memory fakes; app.db.mongodb.get_database is patched to fail
loudly, so no test here can reach a database.
"""

from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient

import app.core.auth as auth_module
import app.db.mongodb as mongodb_module
import app.services.evidence_service as evidence_module
import app.services.learner_service as learner_module
import app.services.onboarding_service as onboarding_module
from app.main import app
from app.services.assessment_evidence import EVIDENCE_RULESET_VERSION
from tests._fake_mongo import FakeCollection

PARENT_ID = ObjectId()
TEACHER_ID = ObjectId()
G1_LEARNER = "lrn_b1_grade1"
G2_LEARNER = "lrn_b1_grade2"


@pytest.fixture
def db(monkeypatch):
    now = datetime.now(timezone.utc)
    learner_base = {
        "parentId": str(PARENT_ID), "firstName": "Kasun", "age": 6, "preferredLanguage": "Sinhala",
        "avatarId": "avatar_1", "onboardingStatus": "IN_PROGRESS", "isArchived": False,
        "createdAt": now, "updatedAt": now,
    }
    cols = {
        "users": FakeCollection([
            {"_id": PARENT_ID, "role": "parent", "fullName": "Parent", "email": "p@example.com"},
            {"_id": TEACHER_ID, "role": "teacher", "fullName": "Teacher", "email": "t@example.com"},
        ]),
        "sessions": FakeCollection([
            {"sessionId": "parent", "userId": PARENT_ID, "expiresAt": now + timedelta(days=1)},
            {"sessionId": "teacher", "userId": TEACHER_ID, "expiresAt": now + timedelta(days=1)},
        ]),
        "learners": FakeCollection([
            {**learner_base, "learnerId": G1_LEARNER, "grade": 1},
            {**learner_base, "learnerId": G2_LEARNER, "grade": 2},
        ]),
        "questionnaires": FakeCollection([
            {"learnerId": lid, "parentId": str(PARENT_ID),
             "learningPreferences": {"visualAssistance": "always", "audioAssistance": "off",
                                     "activityPace": "regular", "hintStyle": "visual_clue",
                                     "celebrationStyle": "gentle_star"},
             "snapIv": {"totalScore": 0}}
            for lid in (G1_LEARNER, G2_LEARNER)
        ]),
        "assessments": FakeCollection(),
        "onboarding": FakeCollection(),
        "events": FakeCollection(),
    }

    def _no_real_database():
        raise AssertionError("Assessment tests must not reach a real database.")

    patches = [
        (mongodb_module, "get_database", _no_real_database),
        (auth_module, "get_sessions_collection", lambda: cols["sessions"]),
        (auth_module, "get_users_collection", lambda: cols["users"]),
        (learner_module, "get_learners_collection", lambda: cols["learners"]),
        (onboarding_module, "get_learners_collection", lambda: cols["learners"]),
        (onboarding_module, "get_onboarding_collection", lambda: cols["onboarding"]),
        (onboarding_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
        (onboarding_module, "get_assessments_collection", lambda: cols["assessments"]),
        (evidence_module, "get_learners_collection", lambda: cols["learners"]),
        (evidence_module, "get_assessments_collection", lambda: cols["assessments"]),
        (evidence_module, "get_gameplay_events_collection", lambda: cols["events"]),
        (evidence_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
    ]
    for module, name, value in patches:
        monkeypatch.setattr(module, name, value)
    return cols


async def _submit(learner_id, answers, grade, session="parent", **extra):
    payload = {"version": "MATH-QB-v1.0", "grade": grade, "answers": answers, **extra}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.post(
            f"/api/v1/learners/{learner_id}/onboarding/math-assessment",
            json=payload, headers={"Authorization": f"Bearer {session}"},
        )


async def _profile(learner_id):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.get(f"/api/v1/learners/{learner_id}/profile", headers={"Authorization": "Bearer parent"})


LEGACY_G2_ANSWERS = [
    {"questionId": "g2_add_2digit_01", "userAnswer": "opt_37", "attempts": 1, "responseTimeSeconds": 8.5},
    {"questionId": "g2_mult_groups_02", "userAnswer": "opt_12", "attempts": 1, "responseTimeSeconds": 12.0},
    {"questionId": "g2_num_compare_03", "userAnswer": "opt_82", "attempts": 1, "responseTimeSeconds": 5.2},
    {"questionId": "g2_word_sub_04", "userAnswer": 15, "attempts": 1, "responseTimeSeconds": 14.1},
]

# Shape of the current Living Canvas submission for Grade 1: one manipulative item answered,
# three items never shown but sent with empty answers and a hard-coded correctness flag.
CANVAS_G1_ANSWERS = [
    {"questionId": "g1_num_count_01", "userAnswer": "opt_5", "attempts": 1, "responseTimeSeconds": 21.4,
     "hintUsed": False, "firstConfirmedResponse": "opt_5", "isFirstResponseCorrect": True,
     "demonstrationUsed": False, "selfCorrectionsCount": 1},
] + [
    {"questionId": qid, "userAnswer": "", "attempts": 1, "responseTimeSeconds": 6.5, "hintUsed": False,
     "firstConfirmedResponse": "", "isFirstResponseCorrect": True, "demonstrationUsed": False,
     "selfCorrectionsCount": 0}
    for qid in ("g1_add_basic_02", "g1_sub_basic_03", "g1_shape_rec_04")
]


class TestLegacyV1Compatibility:
    async def test_legacy_payload_keeps_v1_summary_values(self, db):
        res = await _submit(G2_LEARNER, LEGACY_G2_ANSWERS, grade=2)
        assert res.status_code == 200
        summary = res.json()["data"]
        assert (summary["totalQuestions"], summary["correctAnswers"], summary["accuracyPercentage"],
                summary["evidenceLevel"]) == (4, 4, 100.0, "SUFFICIENT")
        assert all(s["totalQuestions"] == 1 and s["accuracyPercentage"] == 100.0 for s in summary["skills"])
        assert summary["evidenceRulesetVersion"] == EVIDENCE_RULESET_VERSION

    async def test_stored_document_keeps_existing_fields_and_adds_evidence(self, db):
        await _submit(G2_LEARNER, LEGACY_G2_ANSWERS, grade=2)
        doc = db["assessments"].inserted[0]
        for key in ("evaluatedItems", "elpxProfile", "skills", "recommendations", "accuracyPercentage",
                    "assessmentProtocolVersion", "questionBankVersion", "thresholdVersion"):
            assert key in doc
        assert doc["excludedItems"] == []
        assert doc["evidenceSummary"]["answeredItems"] == 4
        assert db["learners"].docs[1]["onboardingStatus"] == "COMPLETED"

    async def test_identical_resubmission_returns_existing_result_and_conflict_is_rejected(self, db):
        assert (await _submit(G1_LEARNER, CANVAS_G1_ANSWERS, grade=1)).status_code == 200
        again = await _submit(G1_LEARNER, CANVAS_G1_ANSWERS, grade=1)
        assert again.status_code == 200
        assert again.json()["data"]["evidenceSummary"]["unansweredItems"] == 3
        conflicting = [dict(CANVAS_G1_ANSWERS[0], userAnswer="opt_4")] + CANVAS_G1_ANSWERS[1:]
        assert (await _submit(G1_LEARNER, conflicting, grade=1)).status_code == 409
        assert len(db["assessments"].inserted) == 1


class TestEvidenceIntegrity:
    async def test_unseen_items_are_not_scored_as_attempts_or_correct(self, db):
        res = await _submit(G1_LEARNER, CANVAS_G1_ANSWERS, grade=1)
        summary = res.json()["data"]
        assert (summary["totalQuestions"], summary["correctAnswers"], summary["evidenceLevel"]) == (1, 1, "INSUFFICIENT")
        assert summary["evidenceSummary"]["unansweredItems"] == 3
        elpx = summary["elpxProfile"]
        assert elpx["totalDistinctQuestionsEvaluated"] == 1
        assert elpx["totalCorrectFirstResponses"] == 1
        doc = db["assessments"].inserted[0]
        assert [i["questionId"] for i in doc["excludedItems"]] == ["g1_add_basic_02", "g1_sub_basic_03", "g1_shape_rec_04"]

    async def test_server_overrides_contradictory_client_correctness(self, db):
        answers = [dict(CANVAS_G1_ANSWERS[0], userAnswer="opt_5", firstConfirmedResponse="opt_4", attempts=2)]
        res = await _submit(G1_LEARNER, answers, grade=1)
        elpx = res.json()["data"]["elpxProfile"]
        assert elpx["totalCorrectFirstResponses"] == 0
        item = db["assessments"].inserted[0]["evaluatedItems"][0]
        assert item["correctFirstResponse"] is False
        assert item["clientReportedFirstResponseCorrect"] is True

    async def test_assisted_and_calibration_items_do_not_reach_elpx(self, db):
        answers = [
            {"questionId": "calib_red_leaf", "userAnswer": "leaf_tapped", "probeRole": "calibration",
             "dimensionTags": ["IC", "IA"], "hintUsed": False, "attempts": 1},
            dict(CANVAS_G1_ANSWERS[0], supportBeforeFirstResponse=True),
            {"questionId": "g1_add_basic_02", "userAnswer": "opt_4", "firstConfirmedResponse": "opt_4",
             "hintUsed": False, "responseTimeSeconds": 11.0},
        ]
        res = await _submit(G1_LEARNER, answers, grade=1, assessmentProtocolVersion="onboarding-v2")
        data = res.json()["data"]
        assert data["totalQuestions"] == 2
        assert data["elpxProfile"]["totalDistinctQuestionsEvaluated"] == 1
        assert [s["skillId"] for s in data["elpxProfile"]["skillEstimates"]] == ["addition"]
        assert data["evidenceSummary"]["nonMathematicalItems"] == 1
        assert data["evidenceSummary"]["assistedFirstResponseItems"] == 1

    async def test_submission_without_approved_items_is_rejected_and_not_saved(self, db):
        res = await _submit(G1_LEARNER, [{"questionId": "g3_place_val_01", "userAnswer": "opt_a"},
                                         {"questionId": "unknown_q", "userAnswer": "x"}], grade=1)
        assert res.status_code == 422
        assert db["assessments"].inserted == []
        assert db["learners"].docs[0]["onboardingStatus"] == "IN_PROGRESS"

    async def test_teacher_cannot_submit_assessment(self, db):
        res = await _submit(G1_LEARNER, CANVAS_G1_ANSWERS, grade=1, session="teacher")
        assert res.status_code == 403
        assert db["assessments"].inserted == []


class TestProfileBaselinePath:
    async def test_profile_uses_only_independent_server_verified_items(self, db):
        answers = [
            dict(CANVAS_G1_ANSWERS[0], userAnswer="opt_5", firstConfirmedResponse="opt_4", attempts=2),
            {"questionId": "g1_add_basic_02", "userAnswer": "opt_5", "hintUsed": True, "attempts": 1},
        ] + CANVAS_G1_ANSWERS[2:]
        await _submit(G1_LEARNER, answers, grade=1)
        profile = (await _profile(G1_LEARNER)).json()
        assert profile["totalDistinctQuestionsEvaluated"] == 1
        assert profile["totalCorrectFirstResponses"] == 0

    async def test_legacy_stored_record_profile_is_unchanged(self, db):
        """Records created before B1 have no evidence keys and keep their historical calculation."""
        db["assessments"].docs.append({
            "learnerId": G1_LEARNER, "grade": 1, "completedAt": datetime.now(timezone.utc),
            "evaluatedItems": [
                {"questionId": "g1_num_count_01", "skillId": "number_sense", "isCorrect": True,
                 "correctFirstResponse": True, "userAnswer": "opt_5", "attempts": 1, "hintUsed": False},
                {"questionId": "g1_add_basic_02", "skillId": "addition", "isCorrect": False,
                 "correctFirstResponse": True, "userAnswer": "", "attempts": 1, "hintUsed": False},
            ],
        })
        before = [dict(i) for i in db["assessments"].docs[0]["evaluatedItems"]]
        profile = (await _profile(G1_LEARNER)).json()
        assert profile["totalDistinctQuestionsEvaluated"] == 2
        assert profile["totalCorrectFirstResponses"] == 1
        assert db["assessments"].docs[0]["evaluatedItems"] == before
