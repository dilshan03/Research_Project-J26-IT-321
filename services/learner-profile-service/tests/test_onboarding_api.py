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
    get_onboarding_collection,
    get_questionnaires_collection,
    get_assessments_collection,
)


TEST_PARENT_A_SESSION = f"onboarding_test_session_parent_a_{uuid.uuid4().hex[:8]}"
TEST_PARENT_B_SESSION = f"onboarding_test_session_parent_b_{uuid.uuid4().hex[:8]}"
TEST_TEACHER_SESSION = f"onboarding_test_session_teacher_{uuid.uuid4().hex[:8]}"

TEST_PARENT_A_ID = ObjectId()
TEST_PARENT_B_ID = ObjectId()
TEST_TEACHER_ID = ObjectId()


@pytest.fixture(autouse=True)
async def setup_test_database():
    """Seeds test users, sessions, and cleans collections after tests."""
    await connect_to_database()
    users_col = get_users_collection()
    sessions_col = get_sessions_collection()
    learners_col = get_learners_collection()
    onboarding_col = get_onboarding_collection()
    questionnaires_col = get_questionnaires_collection()
    assessments_col = get_assessments_collection()

    now = datetime.now(timezone.utc)
    future = now + timedelta(days=1)

    # Insert test users
    await users_col.insert_many([
        {
            "_id": TEST_PARENT_A_ID,
            "role": "parent",
            "fullName": "Onboarding Parent Alpha",
            "email": f"ob_parent_a_{uuid.uuid4().hex[:6]}@example.com",
            "username": "ob_parent_a",
            "createdAt": now,
        },
        {
            "_id": TEST_PARENT_B_ID,
            "role": "parent",
            "fullName": "Onboarding Parent Beta",
            "email": f"ob_parent_b_{uuid.uuid4().hex[:6]}@example.com",
            "username": "ob_parent_b",
            "createdAt": now,
        },
        {
            "_id": TEST_TEACHER_ID,
            "role": "teacher",
            "fullName": "Onboarding Teacher Gamma",
            "email": f"ob_teacher_g_{uuid.uuid4().hex[:6]}@example.com",
            "username": "ob_teacher_g",
            "createdAt": now,
        },
    ])

    # Insert test sessions
    await sessions_col.insert_many([
        {
            "sessionId": TEST_PARENT_A_SESSION,
            "userId": str(TEST_PARENT_A_ID),
            "role": "parent",
            "createdAt": now,
            "expiresAt": future,
        },
        {
            "sessionId": TEST_PARENT_B_SESSION,
            "userId": str(TEST_PARENT_B_ID),
            "role": "parent",
            "createdAt": now,
            "expiresAt": future,
        },
        {
            "sessionId": TEST_TEACHER_SESSION,
            "userId": str(TEST_TEACHER_ID),
            "role": "teacher",
            "createdAt": now,
            "expiresAt": future,
        },
    ])

    yield

    # Clean up test artifacts
    await users_col.delete_many({"_id": {"$in": [TEST_PARENT_A_ID, TEST_PARENT_B_ID, TEST_TEACHER_ID]}})
    await sessions_col.delete_many({"sessionId": {"$in": [TEST_PARENT_A_SESSION, TEST_PARENT_B_SESSION, TEST_TEACHER_SESSION]}})
    await learners_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_A_ID), str(TEST_PARENT_B_ID)]}})
    await onboarding_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_A_ID), str(TEST_PARENT_B_ID)]}})
    await questionnaires_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_A_ID), str(TEST_PARENT_B_ID)]}})
    await assessments_col.delete_many({"parentId": {"$in": [str(TEST_PARENT_A_ID), str(TEST_PARENT_B_ID)]}})
    await close_database_connection()


@pytest.mark.asyncio
async def test_complete_onboarding_pipeline():
    """
    End-to-end test verifying:
    1. Child creation under Parent A
    2. Resumable progress tracking initialization
    3. Cross-parent and teacher access rejection (HTTP 403)
    4. Saving learning preferences
    5. Saving SNAP-IV with accurate 18-item inattention and hyperactivity subscale scoring
    6. Saving optional social context
    7. Fetching grade-specific math questions (without leaking answers)
    8. Submitting math assessment and accurate scoring
    9. Final completion status and profile summary
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Create child under Parent A
        res_create = await client.post(
            "/api/v1/learners",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
            json={
                "firstName": "Kasun",
                "preferredName": "Kasu",
                "age": 7,
                "grade": 2,
                "preferredLanguage": "Sinhala",
                "avatarId": "avatar_elephant",
            },
        )
        assert res_create.status_code == 201
        learner_data = res_create.json()["data"]
        learner_id = learner_data["learnerId"]
        assert learner_data["onboardingStatus"] == "NOT_STARTED"

        # Step 2: Parent A checks onboarding progress
        res_prog = await client.get(
            f"/api/v1/learners/{learner_id}/onboarding",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
        )
        assert res_prog.status_code == 200
        prog_data = res_prog.json()["data"]
        assert prog_data["learnerId"] == learner_id
        assert prog_data["currentStep"] == "preferences"
        assert prog_data["status"] == "IN_PROGRESS"
        assert prog_data["preferencesCompleted"] is False

        # Step 3: Verify Cross-parent ownership protection (Parent B cannot access Kasun's onboarding)
        res_unauth = await client.get(
            f"/api/v1/learners/{learner_id}/onboarding",
            headers={"Authorization": f"Bearer {TEST_PARENT_B_SESSION}"},
        )
        assert res_unauth.status_code == 403

        # Teacher cannot access parent-only onboarding
        res_teacher = await client.get(
            f"/api/v1/learners/{learner_id}/onboarding",
            headers={"Authorization": f"Bearer {TEST_TEACHER_SESSION}"},
        )
        assert res_teacher.status_code == 403

        # Step 4: Save Learning Preferences
        res_pref = await client.post(
            f"/api/v1/learners/{learner_id}/onboarding/preferences",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
            json={
                "version": "LEARNING-PREF-v1.0",
                "visualAssistance": "always",
                "audioAssistance": "read_everything",
                "activityPace": "calm_step_by_step",
                "hintStyle": "visual_clue",
                "celebrationStyle": "gentle_star",
            },
        )
        assert res_pref.status_code == 200
        assert res_pref.json()["data"]["nextStep"] == "snap_iv"

        # Step 5: Save SNAP-IV 18-Item Questionnaire
        # Score items 1-9 (Inattention) with 2, items 10-18 (Hyperactivity) with 1
        snap_responses = []
        for i in range(1, 19):
            score = 2 if i <= 9 else 1
            snap_responses.append({"itemId": i, "score": score})

        res_snap = await client.post(
            f"/api/v1/learners/{learner_id}/onboarding/snap-iv",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
            json={
                "version": "SNAP-IV-18-v1.0",
                "responses": snap_responses,
                "respondentRelation": "parent",
            },
        )
        assert res_snap.status_code == 200
        snap_summary = res_snap.json()["data"]
        # Inattention sum = 9 * 2 = 18, avg = 2.0
        assert snap_summary["inattentionTotal"] == 18
        assert snap_summary["inattentionAverage"] == 2.0
        # Hyperactivity sum = 9 * 1 = 9, avg = 1.0
        assert snap_summary["hyperactivityTotal"] == 9
        assert snap_summary["hyperactivityAverage"] == 1.0
        assert snap_summary["totalScore"] == 27
        assert "NOT constitute an ADHD diagnosis" in snap_summary["disclaimer"]

        # Step 6: Save optional Social Context
        res_soc = await client.post(
            f"/api/v1/learners/{learner_id}/onboarding/social-context",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
            json={
                "version": "SOCIAL-CONTEXT-v1.0",
                "learningEnvironment": "quiet_room",
                "peerCollaboration": "independent_first",
                "parentInvolvement": "guided_together",
                "challengingTaskSupport": "break_down_step",
            },
        )
        assert res_soc.status_code == 200

        # Step 7: Get Math Questions for Grade 2 child
        res_q = await client.get(
            f"/api/v1/learners/{learner_id}/onboarding/math-questions",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
        )
        assert res_q.status_code == 200
        questions = res_q.json()["data"]
        assert len(questions) >= 3
        # Assert answers and explanations are NOT leaked to student
        for q in questions:
            assert "correctAnswer" not in q
            assert "explanationEn" not in q
            assert q["grade"] == 2

        # Step 8: Submit Math Assessment Answers
        # Submit correct answers for questions
        answers = [
            {"questionId": "g2_add_2digit_01", "userAnswer": "opt_37", "attempts": 1, "responseTimeSeconds": 8.5},
            {"questionId": "g2_mult_groups_02", "userAnswer": "opt_12", "attempts": 1, "responseTimeSeconds": 12.0},
            {"questionId": "g2_num_compare_03", "userAnswer": "opt_82", "attempts": 1, "responseTimeSeconds": 5.2},
            {"questionId": "g2_word_sub_04", "userAnswer": 15, "attempts": 1, "responseTimeSeconds": 14.1},
        ]
        res_math = await client.post(
            f"/api/v1/learners/{learner_id}/onboarding/math-assessment",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
            json={
                "version": "MATH-QB-v1.0",
                "grade": 2,
                "answers": answers,
            },
        )
        assert res_math.status_code == 200
        math_res = res_math.json()["data"]
        assert math_res["totalQuestions"] == 4
        assert math_res["correctAnswers"] == 4
        assert math_res["accuracyPercentage"] == 100.0
        assert math_res["evidenceLevel"] == "SUFFICIENT"
        assert len(math_res["strengths"]) > 0

        # Step 9: Verify Onboarding Summary & Child Profile Status
        res_summary = await client.get(
            f"/api/v1/learners/{learner_id}/onboarding/summary",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
        )
        assert res_summary.status_code == 200
        summary = res_summary.json()["data"]
        assert summary["learner"]["onboardingStatus"] == "COMPLETED"
        assert summary["progress"]["status"] == "COMPLETED"
        assert summary["learningPreferences"]["visualAssistance"] == "always"
        assert summary["snapIvSummary"]["totalScore"] == 27
        assert summary["mathSummary"]["accuracyPercentage"] == 100.0


@pytest.mark.asyncio
async def test_snap_iv_validation_rejects_missing_items():
    """Validates that SNAP-IV endpoint rejects submissions with fewer than 18 items."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create learner
        res = await client.post(
            "/api/v1/learners",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
            json={"firstName": "TestChild", "age": 8, "grade": 3},
        )
        learner_id = res.json()["data"]["learnerId"]

        # Submit only 10 items
        incomplete_items = [{"itemId": i, "score": 1} for i in range(1, 11)]
        res_bad = await client.post(
            f"/api/v1/learners/{learner_id}/onboarding/snap-iv",
            headers={"Authorization": f"Bearer {TEST_PARENT_A_SESSION}"},
            json={"responses": incomplete_items},
        )
        assert res_bad.status_code == 422
