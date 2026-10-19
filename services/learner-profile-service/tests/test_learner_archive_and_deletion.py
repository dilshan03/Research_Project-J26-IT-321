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
    get_deletion_requests_collection,
)

TEST_PARENT_A_SESSION = f"test_session_archive_a_{uuid.uuid4().hex[:8]}"
TEST_PARENT_B_SESSION = f"test_session_archive_b_{uuid.uuid4().hex[:8]}"

TEST_PARENT_A_ID = ObjectId()
TEST_PARENT_B_ID = ObjectId()


@pytest.fixture(autouse=True)
async def setup_test_database():
    """Seeds temporary test users and sessions, and cleans them up after tests."""
    await connect_to_database()
    users_col = get_users_collection()
    sessions_col = get_sessions_collection()
    learners_col = get_learners_collection()
    del_col = get_deletion_requests_collection()

    now = datetime.now(timezone.utc)
    future = now + timedelta(days=1)

    await users_col.insert_many([
        {
            "_id": TEST_PARENT_A_ID,
            "role": "parent",
            "fullName": "Test Archive Parent A",
            "email": f"parent_a_{uuid.uuid4().hex[:6]}@example.com",
            "username": "parent_archive_a",
            "createdAt": now,
        },
        {
            "_id": TEST_PARENT_B_ID,
            "role": "parent",
            "fullName": "Test Archive Parent B",
            "email": f"parent_b_{uuid.uuid4().hex[:6]}@example.com",
            "username": "parent_archive_b",
            "createdAt": now,
        },
    ])

    await sessions_col.insert_many([
        {
            "sessionId": TEST_PARENT_A_SESSION,
            "userId": TEST_PARENT_A_ID,
            "rememberMe": False,
            "createdAt": now,
            "expiresAt": future,
        },
        {
            "sessionId": TEST_PARENT_B_SESSION,
            "userId": TEST_PARENT_B_ID,
            "rememberMe": False,
            "createdAt": now,
            "expiresAt": future,
        },
    ])

    yield

    # Clean up test records
    await users_col.delete_many({"_id": {"$in": [TEST_PARENT_A_ID, TEST_PARENT_B_ID]}})
    await sessions_col.delete_many({"sessionId": {"$in": [TEST_PARENT_A_SESSION, TEST_PARENT_B_SESSION]}})
    await learners_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_A_ID), str(TEST_PARENT_B_ID)]}})
    await del_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_A_ID), str(TEST_PARENT_B_ID)]}})
    await close_database_connection()



@pytest.mark.asyncio
async def test_archive_and_restore_workflow():
    """Verify archive and restore lifecycle, active filtering, and idempotency."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)

        # 1. Create two learners under Parent A
        res_1 = await client.post(
            "/api/v1/learners",
            json={"firstName": "ActiveChild1", "age": 7, "grade": 2, "preferredLanguage": "Sinhala"},
        )
        assert res_1.status_code == 201
        child_1 = res_1.json()["data"]
        learner_1_id = child_1["learnerId"]
        assert child_1["isArchived"] is False

        res_2 = await client.post(
            "/api/v1/learners",
            json={"firstName": "ActiveChild2", "age": 8, "grade": 3, "preferredLanguage": "Sinhala"},
        )
        assert res_2.status_code == 201
        child_2 = res_2.json()["data"]
        learner_2_id = child_2["learnerId"]

        # 2. List learners (should see 2 active children)
        res_list = await client.get("/api/v1/learners")
        assert res_list.status_code == 200
        active_list = res_list.json()["data"]
        assert len(active_list) == 2

        # 3. Archive Child 1
        res_archive = await client.post(f"/api/v1/learners/{learner_1_id}/archive")
        assert res_archive.status_code == 200
        archived_data = res_archive.json()["data"]
        assert archived_data["isArchived"] is True
        assert archived_data["archivedAt"] is not None
        assert archived_data["archivedBy"] == str(TEST_PARENT_A_ID)

        # 4. Check active learners list: Child 1 should be gone, Child 2 remains
        res_active = await client.get("/api/v1/learners")
        assert res_active.status_code == 200
        active_ids = [l["learnerId"] for l in res_active.json()["data"]]
        assert learner_1_id not in active_ids
        assert learner_2_id in active_ids

        # 5. Check archived learners query (?is_archived=true)
        res_archived_only = await client.get("/api/v1/learners?is_archived=true")
        assert res_archived_only.status_code == 200
        archived_ids = [l["learnerId"] for l in res_archived_only.json()["data"]]
        assert learner_1_id in archived_ids
        assert learner_2_id not in archived_ids

        # 6. Check include_archived=true
        res_all = await client.get("/api/v1/learners?include_archived=true")
        assert res_all.status_code == 200
        assert len(res_all.json()["data"]) == 2

        # 7. Idempotent archive: archiving again succeeds safely
        res_archive_again = await client.post(f"/api/v1/learners/{learner_1_id}/archive")
        assert res_archive_again.status_code == 200
        assert res_archive_again.json()["data"]["isArchived"] is True

        # 8. Restore Child 1
        res_restore = await client.post(f"/api/v1/learners/{learner_1_id}/restore")
        assert res_restore.status_code == 200
        restored_data = res_restore.json()["data"]
        assert restored_data["isArchived"] is False
        assert restored_data["archivedAt"] is None

        # 9. Verify Child 1 is back in active list
        res_active_again = await client.get("/api/v1/learners")
        assert res_active_again.status_code == 200
        assert learner_1_id in [l["learnerId"] for l in res_active_again.json()["data"]]


@pytest.mark.asyncio
async def test_archived_learner_blocked_from_workflows():
    """Verify archived learners cannot access active onboarding or continuous gameplay ingestion."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)

        # Create and archive a child
        res = await client.post(
            "/api/v1/learners",
            json={"firstName": "TestWorkflow", "age": 6, "grade": 1, "preferredLanguage": "Sinhala"},
        )
        assert res.status_code == 201
        learner_id = res.json()["data"]["learnerId"]

        # Archive learner
        await client.post(f"/api/v1/learners/{learner_id}/archive")

        # 1. Onboarding get/resume should be rejected
        res_onboarding = await client.get(f"/api/v1/learners/{learner_id}/onboarding")
        assert res_onboarding.status_code == 400
        assert "archived" in res_onboarding.json()["detail"].lower()

        # 2. Saving preferences should be rejected
        res_pref = await client.post(
            f"/api/v1/learners/{learner_id}/onboarding/preferences",
            json={
                "visualAssistance": "high_contrast",
                "audioAssistance": "sinhala_voiceover",
                "activityPace": "relaxed",
                "hintStyle": "step_by_step",
                "celebrationStyle": "gentle_stars",
            },
        )
        assert res_pref.status_code == 400
        assert "archived" in res_pref.json()["detail"].lower()

        # 3. Continuous gameplay activity ingestion should be rejected
        res_evidence = await client.post(
            f"/api/v1/learners/{learner_id}/evidence",
            json={
                "eventId": f"ev_{uuid.uuid4().hex[:8]}",
                "learnerId": learner_id,
                "questionId": "q_math_g1_001",
                "skillId": "counting_objects",
                "correctFirstResponse": True,
                "attempts": 1,
                "hintsUsed": 0,
                "responseTime": 4.5,
                "sourceComponent": "gameplay-engine",
            },
        )
        assert res_evidence.status_code == 400
        assert "archived" in res_evidence.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cross_parent_archive_restore_forbidden():
    """Verify Parent B cannot archive or restore Parent A's learner."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Parent A creates child
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)
        res_create = await client.post(
            "/api/v1/learners",
            json={"firstName": "ParentAChild", "age": 7, "grade": 2},
        )
        assert res_create.status_code == 201
        learner_id = res_create.json()["data"]["learnerId"]

        # Switch to Parent B
        client.cookies.set("mathquest_session", TEST_PARENT_B_SESSION)

        # Parent B attempts to archive Parent A's child -> 403 Forbidden
        res_b_archive = await client.post(f"/api/v1/learners/{learner_id}/archive")
        assert res_b_archive.status_code == 403

        # Switch back to Parent A to archive own child
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)
        res_a_archive = await client.post(f"/api/v1/learners/{learner_id}/archive")
        assert res_a_archive.status_code == 200

        # Switch to Parent B to attempt restore -> 403 Forbidden
        client.cookies.set("mathquest_session", TEST_PARENT_B_SESSION)
        res_b_restore = await client.post(f"/api/v1/learners/{learner_id}/restore")
        assert res_b_restore.status_code == 403


@pytest.mark.asyncio
async def test_permanent_deletion_request_workflow():
    """Verify permanent deletion request submission, status check, idempotency, and non-destructive nature."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Parent A creates child
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)
        res_create = await client.post(
            "/api/v1/learners",
            json={"firstName": "ChildToDelete", "age": 9, "grade": 4},
        )
        assert res_create.status_code == 201
        learner_id = res_create.json()["data"]["learnerId"]

        # Switch to Parent B: Parent B cannot submit deletion request for Parent A's child
        client.cookies.set("mathquest_session", TEST_PARENT_B_SESSION)
        res_b_req = await client.post(
            f"/api/v1/learners/{learner_id}/deletion-request",
            json={"reason": "Parent B unauthorized attempt"},
        )
        assert res_b_req.status_code == 403

        # Parent A submits deletion request
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)
        res_req = await client.post(
            f"/api/v1/learners/{learner_id}/deletion-request",
            json={"reason": "Family moving overseas and withdrawing consent"},
        )
        assert res_req.status_code == 201
        del_data = res_req.json()["data"]
        assert del_data["status"] == "PENDING_REVIEW"
        assert del_data["learnerId"] == learner_id
        assert del_data["parentId"] == str(TEST_PARENT_A_ID)
        assert del_data["reason"] == "Family moving overseas and withdrawing consent"

        # Learner record STILL EXISTS (non-destructive safety rule)
        res_get_learner = await client.get(f"/api/v1/learners/{learner_id}")
        assert res_get_learner.status_code == 200
        assert res_get_learner.json()["data"]["firstName"] == "ChildToDelete"

        # Repeated request submission is idempotent and safe (returns existing request)
        res_repeat = await client.post(
            f"/api/v1/learners/{learner_id}/deletion-request",
            json={"reason": "Duplicate submission attempt"},
        )
        assert res_repeat.status_code in (200, 201)
        assert res_repeat.json()["data"]["requestId"] == del_data["requestId"]

        # Parent A checks deletion request status for learner
        res_status = await client.get(f"/api/v1/learners/{learner_id}/deletion-request")
        assert res_status.status_code == 200
        assert res_status.json()["data"]["status"] == "PENDING_REVIEW"

        # Switch to Parent B: Parent B cannot view status of Parent A's deletion request
        client.cookies.set("mathquest_session", TEST_PARENT_B_SESSION)
        res_b_status = await client.get(f"/api/v1/learners/{learner_id}/deletion-request")
        assert res_b_status.status_code == 403

        # Parent A lists all their deletion requests
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)
        res_list = await client.get("/api/v1/learners/deletion-requests")
        assert res_list.status_code == 200
        assert len(res_list.json()["data"]) >= 1
