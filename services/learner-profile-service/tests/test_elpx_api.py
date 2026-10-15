"""
Integration tests for ELP-X Versioned Profile & Continuous Gameplay Evidence APIs
Component: services/learner-profile-service/tests/test_elpx_api.py
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.mongodb import (
    connect_to_database,
    close_database_connection,
    get_users_collection,
    get_sessions_collection,
    get_learners_collection,
    get_assessments_collection,
    get_gameplay_events_collection,
    get_questionnaires_collection,
)

TEST_PARENT_SESSION = f"test_session_elpx_p_{uuid.uuid4().hex[:8]}"
TEST_OTHER_PARENT_SESSION = f"test_session_elpx_other_{uuid.uuid4().hex[:8]}"
TEST_PARENT_ID = ObjectId()
TEST_OTHER_PARENT_ID = ObjectId()


@pytest.fixture(autouse=True)
async def setup_elpx_test_db():
    await connect_to_database()
    users_col = get_users_collection()
    sessions_col = get_sessions_collection()
    learners_col = get_learners_collection()
    assessments_col = get_assessments_collection()
    events_col = get_gameplay_events_collection()
    quest_col = get_questionnaires_collection()

    now = datetime.now(timezone.utc)
    future = now + timedelta(days=1)

    await users_col.insert_many([
        {"_id": TEST_PARENT_ID, "role": "parent", "fullName": "ELP-X Parent", "email": "elpx_parent@test.com", "createdAt": now},
        {"_id": TEST_OTHER_PARENT_ID, "role": "parent", "fullName": "Other Parent", "email": "other_parent@test.com", "createdAt": now},
    ])

    await sessions_col.insert_many([
        {"sessionId": TEST_PARENT_SESSION, "userId": TEST_PARENT_ID, "expiresAt": future, "createdAt": now},
        {"sessionId": TEST_OTHER_PARENT_SESSION, "userId": TEST_OTHER_PARENT_ID, "expiresAt": future, "createdAt": now},
    ])

    yield

    # Clean up
    await users_col.delete_many({"_id": {"$in": [TEST_PARENT_ID, TEST_OTHER_PARENT_ID]}})
    await sessions_col.delete_many({"sessionId": {"$in": [TEST_PARENT_SESSION, TEST_OTHER_PARENT_SESSION]}})
    await learners_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_ID), TEST_PARENT_ID]}})
    await assessments_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_ID), TEST_PARENT_ID]}})
    await quest_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_ID), TEST_PARENT_ID]}})
    await close_database_connection()


@pytest.mark.asyncio

async def test_elpx_profile_and_continuous_evidence_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a child learner profile
        create_res = await client.post(
            "/api/v1/learners",
            headers={"Authorization": f"Bearer {TEST_PARENT_SESSION}"},
            json={
                "firstName": "Sithum",
                "age": 7,
                "grade": 2,
                "preferredLanguage": "Sinhala",
            },
        )
        assert create_res.status_code == 201
        learner_id = create_res.json()["data"]["learnerId"]

        # 2. Initially with zero assessments or gameplay events
        prof_res = await client.get(
            f"/api/v1/learners/{learner_id}/profile",
            headers={"Authorization": f"Bearer {TEST_PARENT_SESSION}"},
        )
        assert prof_res.status_code == 200
        prof_data = prof_res.json()
        assert prof_data["learnerId"] == learner_id
        assert prof_data["profileVersion"] == "ELP-X-PROFILE-v1.0"
        assert prof_data["algorithmVersion"] == "ELP-X-v1.0"
        assert prof_data["evidenceStatus"] == "INSUFFICIENT"
        assert prof_data["totalDistinctQuestionsEvaluated"] == 0

        # 3. Ingest gameplay activity evidence (3 distinct items for 'addition')
        event_1_id = f"ev_add_1_{uuid.uuid4().hex[:6]}"
        event_2_id = f"ev_add_2_{uuid.uuid4().hex[:6]}"
        event_3_id = f"ev_add_3_{uuid.uuid4().hex[:6]}"

        ingest_res = await client.post(
            f"/api/v1/learners/{learner_id}/evidence",
            headers={"Authorization": f"Bearer {TEST_PARENT_SESSION}"},
            json={
                "events": [
                    {
                        "eventId": event_1_id,
                        "learnerId": learner_id,
                        "questionId": "g2_add_01",
                        "skillId": "addition",
                        "correctFirstResponse": True,
                        "attempts": 1,
                        "hintsUsed": 0,
                        "responseTime": 4.5,
                        "sourceComponent": "gameplay-engine",
                    },
                    {
                        "eventId": event_2_id,
                        "learnerId": learner_id,
                        "questionId": "g2_add_02",
                        "skillId": "addition",
                        "correctFirstResponse": True,
                        "attempts": 1,
                        "hintsUsed": 0,
                        "responseTime": 5.2,
                        "sourceComponent": "gameplay-engine",
                    },
                    {
                        "eventId": event_3_id,
                        "learnerId": learner_id,
                        "questionId": "g2_add_03",
                        "skillId": "addition",
                        "correctFirstResponse": True,
                        "attempts": 1,
                        "hintsUsed": 0,
                        "responseTime": 3.8,
                        "sourceComponent": "gameplay-engine",
                    },
                ]
            },
        )
        assert ingest_res.status_code == 200
        ingest_data = ingest_res.json()
        assert ingest_data["processedCount"] == 3
        assert ingest_data["duplicateCount"] == 0

        # 4. Ingest duplicate eventId (Idempotency verification)
        dup_res = await client.post(
            f"/api/v1/learners/{learner_id}/evidence",
            headers={"Authorization": f"Bearer {TEST_PARENT_SESSION}"},
            json={
                "eventId": event_1_id,  # duplicate
                "learnerId": learner_id,
                "questionId": "g2_add_01",
                "skillId": "addition",
                "correctFirstResponse": True,
                "attempts": 1,
                "hintsUsed": 0,
                "responseTime": 4.5,
                "sourceComponent": "gameplay-engine",
            },
        )
        assert dup_res.status_code == 200
        dup_data = dup_res.json()
        assert dup_data["processedCount"] == 0
        assert dup_data["duplicateCount"] == 1

        # 5. Ingest repeated item attempt on same questionId (g2_add_01)
        # Even with a different eventId, the questionId is identical,
        # so distinctQuestionsAssessed must NOT increase.
        repeat_item_ev = f"ev_add_repeat_{uuid.uuid4().hex[:6]}"
        repeat_res = await client.post(
            f"/api/v1/learners/{learner_id}/evidence",
            headers={"Authorization": f"Bearer {TEST_PARENT_SESSION}"},
            json={
                "eventId": repeat_item_ev,
                "learnerId": learner_id,
                "questionId": "g2_add_01",  # Repeated questionId
                "skillId": "addition",
                "correctFirstResponse": True,
                "attempts": 2,
                "hintsUsed": 1,
                "responseTime": 3.0,
                "sourceComponent": "gameplay-engine",
            },
        )
        assert repeat_res.status_code == 200
        assert repeat_res.json()["processedCount"] == 1

        # 6. Fetch profile and verify distinct items count = 3 (not 4)
        updated_prof = await client.get(
            f"/api/v1/learners/{learner_id}/profile",
            headers={"Authorization": f"Bearer {TEST_PARENT_SESSION}"},
        )
        assert updated_prof.status_code == 200
        u_data = updated_prof.json()
        assert u_data["totalDistinctQuestionsEvaluated"] == 3
        add_skill = next(s for s in u_data["skillEstimates"] if s["skillId"] == "addition")
        assert add_skill["distinctQuestionsAssessed"] == 3
        assert add_skill["correctFirstResponses"] == 3
        assert add_skill["estimatedProficiency"] == 0.80  # Beta(1+3, 1+0) = 4/5 = 0.80
        assert add_skill["provisionalSkillLevel"] == "PROFICIENT"
        assert add_skill["isEvidenceSufficient"] is True

        # 7. Test Sanitized profile endpoint (?sanitized=true) for Content Adaptation
        sanitized_res = await client.get(
            f"/api/v1/learners/{learner_id}/profile?sanitized=true",
            headers={"Authorization": f"Bearer {TEST_PARENT_SESSION}"},
        )
        assert sanitized_res.status_code == 200
        san_data = sanitized_res.json()
        assert "skills" in san_data
        assert "pedagogicalRecommendations" in san_data
        assert "learningAdaptations" in san_data
        # Must not contain private questionnaire or raw scores
        assert "snapIvResponses" not in san_data
        assert "totalScore" not in san_data

        # 8. Test Authorization: Another parent must NOT be allowed to view this profile
        forbidden_res = await client.get(
            f"/api/v1/learners/{learner_id}/profile",
            headers={"Authorization": f"Bearer {TEST_OTHER_PARENT_SESSION}"},
        )
        assert forbidden_res.status_code == 403
