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
)

# Test User and Session IDs
TEST_PARENT_A_SESSION = f"test_session_parent_a_{uuid.uuid4().hex[:8]}"
TEST_PARENT_B_SESSION = f"test_session_parent_b_{uuid.uuid4().hex[:8]}"
TEST_TEACHER_SESSION = f"test_session_teacher_{uuid.uuid4().hex[:8]}"

TEST_PARENT_A_ID = ObjectId()
TEST_PARENT_B_ID = ObjectId()
TEST_TEACHER_ID = ObjectId()


@pytest.fixture(autouse=True)
async def setup_test_database():
    """Seeds temporary test users and sessions, and cleans them up after tests."""
    await connect_to_database()
    users_col = get_users_collection()
    sessions_col = get_sessions_collection()
    learners_col = get_learners_collection()

    now = datetime.now(timezone.utc)
    future = now + timedelta(days=1)

    # Insert test users
    await users_col.insert_many([
        {
            "_id": TEST_PARENT_A_ID,
            "role": "parent",
            "fullName": "Test Parent Alpha",
            "email": f"parent_alpha_{uuid.uuid4().hex[:6]}@example.com",
            "username": "parent_alpha",
            "createdAt": now,
        },
        {
            "_id": TEST_PARENT_B_ID,
            "role": "parent",
            "fullName": "Test Parent Beta",
            "email": f"parent_beta_{uuid.uuid4().hex[:6]}@example.com",
            "username": "parent_beta",
            "createdAt": now,
        },
        {
            "_id": TEST_TEACHER_ID,
            "role": "teacher",
            "fullName": "Test Teacher Gamma",
            "email": f"teacher_gamma_{uuid.uuid4().hex[:6]}@example.com",
            "username": "teacher_gamma",
            "createdAt": now,
        },
    ])

    # Insert test sessions
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
        {
            "sessionId": TEST_TEACHER_SESSION,
            "userId": TEST_TEACHER_ID,
            "rememberMe": False,
            "createdAt": now,
            "expiresAt": future,
        },
    ])

    yield

    # Teardown: delete test data
    await users_col.delete_many({"_id": {"$in": [TEST_PARENT_A_ID, TEST_PARENT_B_ID, TEST_TEACHER_ID]}})
    await sessions_col.delete_many({"sessionId": {"$in": [TEST_PARENT_A_SESSION, TEST_PARENT_B_SESSION, TEST_TEACHER_SESSION]}})
    await learners_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_A_ID), str(TEST_PARENT_B_ID)]}})
    await close_database_connection()


@pytest.mark.asyncio
async def test_health_endpoints():
    """Verify health endpoints respond correctly."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        res_api = await client.get("/api/health")
        assert res_api.status_code == 200
        assert res_api.json()["success"] is True


@pytest.mark.asyncio
async def test_unauthenticated_requests_rejected():
    """Verify 401 is returned when session cookie and auth header are missing."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_get = await client.get("/api/v1/learners")
        assert res_get.status_code == 401

        res_post = await client.post(
            "/api/v1/learners",
            json={"firstName": "Nimal", "age": 7, "grade": 2},
        )
        assert res_post.status_code == 401


@pytest.mark.asyncio
async def test_teacher_cannot_create_learner():
    """Verify 403 Forbidden is returned when a teacher attempts parent-only learner creation."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("mathquest_session", TEST_TEACHER_SESSION)
        res = await client.post(
            "/api/v1/learners",
            json={"firstName": "Student A", "age": 7, "grade": 2},
        )
        assert res.status_code == 403
        assert "Only registered parent accounts" in res.json()["detail"]


@pytest.mark.asyncio
async def test_validation_rejects_invalid_age_and_grade():
    """Verify 422 is returned when age or grade are out of valid primary ranges (age 6-10, grade 1-5)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)

        # Age too low (5)
        res_age_low = await client.post(
            "/api/v1/learners",
            json={"firstName": "TooYoung", "age": 5, "grade": 1},
        )
        assert res_age_low.status_code == 422

        # Age too high (12)
        res_age_high = await client.post(
            "/api/v1/learners",
            json={"firstName": "TooOld", "age": 12, "grade": 5},
        )
        assert res_age_high.status_code == 422

        # Grade too low (0)
        res_grade_low = await client.post(
            "/api/v1/learners",
            json={"firstName": "BabyGrade", "age": 6, "grade": 0},
        )
        assert res_grade_low.status_code == 422

        # Grade too high (6)
        res_grade_high = await client.post(
            "/api/v1/learners",
            json={"firstName": "HighSchool", "age": 9, "grade": 6},
        )
        assert res_grade_high.status_code == 422


@pytest.mark.asyncio
async def test_parent_creates_multiple_learners_and_lists_them():
    """Verify a parent can create multiple children and retrieve only their own children."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)

        # Create child 1 (Kasun, Grade 2, Age 7)
        res1 = await client.post(
            "/api/v1/learners",
            json={
                "firstName": "Kasun",
                "preferredName": "Kasu",
                "age": 7,
                "grade": 2,
                "preferredLanguage": "Sinhala",
                "avatarId": "avatar_fox",
            },
        )
        assert res1.status_code == 201
        data1 = res1.json()["data"]
        assert data1["firstName"] == "Kasun"
        assert data1["preferredName"] == "Kasu"
        assert data1["age"] == 7
        assert data1["grade"] == 2
        assert data1["onboardingStatus"] == "NOT_STARTED"
        assert data1["learnerId"].startswith("lrn_")
        assert data1["parentId"] == str(TEST_PARENT_A_ID)

        # Create child 2 (Dinithi, Grade 4, Age 9)
        res2 = await client.post(
            "/api/v1/learners",
            json={
                "firstName": "Dinithi",
                "age": 9,
                "grade": 4,
            },
        )
        assert res2.status_code == 201
        data2 = res2.json()["data"]
        assert data2["firstName"] == "Dinithi"
        assert data2["age"] == 9
        assert data2["grade"] == 4

        # List learners for Parent A
        res_list = await client.get("/api/v1/learners")
        assert res_list.status_code == 200
        list_data = res_list.json()
        assert list_data["total"] >= 2
        learner_ids = [c["learnerId"] for c in list_data["data"]]
        assert data1["learnerId"] in learner_ids
        assert data2["learnerId"] in learner_ids


@pytest.mark.asyncio
async def test_parent_can_edit_learner():
    """Verify a parent can update their child's details."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)

        # Create learner
        res_create = await client.post(
            "/api/v1/learners",
            json={"firstName": "Tharindu", "age": 8, "grade": 3},
        )
        learner_id = res_create.json()["data"]["learnerId"]

        # Update preferred name and grade
        res_patch = await client.patch(
            f"/api/v1/learners/{learner_id}",
            json={
                "preferredName": "Thari",
                "grade": 4,
                "age": 9,
            },
        )
        assert res_patch.status_code == 200
        updated = res_patch.json()["data"]
        assert updated["preferredName"] == "Thari"
        assert updated["grade"] == 4
        assert updated["age"] == 9


@pytest.mark.asyncio
async def test_cross_parent_access_forbidden():
    """Verify Parent B CANNOT view or edit Parent A's learner (403 Forbidden)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Parent A creates child
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)
        res_create = await client.post(
            "/api/v1/learners",
            json={"firstName": "ChildOfParentA", "age": 7, "grade": 2},
        )
        parent_a_learner_id = res_create.json()["data"]["learnerId"]

        # Switch to Parent B
        client.cookies.set("mathquest_session", TEST_PARENT_B_SESSION)

        # Parent B tries to GET Parent A's child
        res_get = await client.get(f"/api/v1/learners/{parent_a_learner_id}")
        assert res_get.status_code == 403
        assert "Access denied" in res_get.json()["detail"]

        # Parent B tries to PATCH Parent A's child
        res_patch = await client.patch(
            f"/api/v1/learners/{parent_a_learner_id}",
            json={"firstName": "HackedName"},
        )
        assert res_patch.status_code == 403

        # Parent B lists learners - should NOT see Parent A's child
        res_list_b = await client.get("/api/v1/learners")
        assert res_list_b.status_code == 200
        b_learner_ids = [c["learnerId"] for c in res_list_b.json()["data"]]
        assert parent_a_learner_id not in b_learner_ids


@pytest.mark.asyncio
async def test_age_grade_independence_and_bilingual_comprehension():
    """
    Verify:
    1. Age 10 and Grade 1 is valid, independent, and preserved.
    2. Bilingual selection supports comprehension levels and primary instruction language.
    3. Fields persist through create, patch, and get retrieval.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("mathquest_session", TEST_PARENT_A_SESSION)

        # Create child with Age 10, Grade 1, and Bilingual settings
        res = await client.post(
            "/api/v1/learners",
            json={
                "firstName": "Kavindu",
                "preferredName": "Kavi",
                "age": 10,
                "grade": 1,
                "preferredLanguage": "Bilingual",
                "sinhalaComprehension": "Understands well",
                "englishComprehension": "Understands basic instructions",
                "primaryInstructionLanguage": "Sinhala",
                "avatarId": "avatar_elephant",
            },
        )
        assert res.status_code == 201
        data = res.json()["data"]
        learner_id = data["learnerId"]

        # Verify age and grade independence
        assert data["age"] == 10
        assert data["grade"] == 1
        assert data["preferredLanguage"] == "Bilingual"
        assert data["sinhalaComprehension"] == "Understands well"
        assert data["englishComprehension"] == "Understands basic instructions"
        assert data["primaryInstructionLanguage"] == "Sinhala"

        # Verify retrieval preserves all fields
        res_get = await client.get(f"/api/v1/learners/{learner_id}")
        assert res_get.status_code == 200
        retrieved = res_get.json()["data"]
        assert retrieved["age"] == 10
        assert retrieved["grade"] == 1
        assert retrieved["preferredLanguage"] == "Bilingual"
        assert retrieved["sinhalaComprehension"] == "Understands well"
        assert retrieved["englishComprehension"] == "Understands basic instructions"
        assert retrieved["primaryInstructionLanguage"] == "Sinhala"

        # Update comprehension levels and verify persistence
        res_patch = await client.patch(
            f"/api/v1/learners/{learner_id}",
            json={
                "englishComprehension": "Understands well",
                "primaryInstructionLanguage": "English",
            },
        )
        assert res_patch.status_code == 200
        patched = res_patch.json()["data"]
        assert patched["age"] == 10
        assert patched["grade"] == 1
        assert patched["englishComprehension"] == "Understands well"
        assert patched["primaryInstructionLanguage"] == "English"
