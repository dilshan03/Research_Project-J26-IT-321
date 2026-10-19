"""
Database-free tests for parent-reported ADHD information and the optional SNAP-IV onboarding flow.

All MongoDB collections are in-memory fakes; app.db.mongodb.get_database is patched to fail
loudly, so no test here can reach a database.
"""

from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

import app.core.auth as auth_module
import app.db.mongodb as mongodb_module
import app.services.evidence_service as evidence_module
import app.services.learner_service as learner_module
import app.services.onboarding_service as onboarding_module
from app.main import app
from app.schemas.onboarding import AdhdInformationRequest
from tests._fake_mongo import FakeCollection

PARENT_ID = ObjectId()
OTHER_PARENT_ID = ObjectId()
TEACHER_ID = ObjectId()
LEARNER = "lrn_adhd_flow"
ARCHIVED_LEARNER = "lrn_adhd_archived"

PRESENTATIONS = [
    "predominantly_inattentive",
    "predominantly_hyperactive_impulsive",
    "combined",
    "not_specified",
]
PREFERENCES = {
    "version": "LEARNING-PREF-v1.0", "visualAssistance": "always", "audioAssistance": "off",
    "activityPace": "regular", "hintStyle": "visual_clue", "celebrationStyle": "gentle_star",
}
SNAP_RESPONSES = [{"itemId": i, "score": 2 if i <= 9 else 1} for i in range(1, 19)]
MATH_ANSWERS = [{"questionId": "g1_num_count_01", "userAnswer": "opt_5", "firstConfirmedResponse": "opt_5",
                 "attempts": 1, "hintUsed": False, "responseTimeSeconds": 12.0}]


@pytest.fixture
def db(monkeypatch):
    now = datetime.now(timezone.utc)
    learner_base = {
        "parentId": str(PARENT_ID), "firstName": "Sanduni", "age": 7, "grade": 1,
        "preferredLanguage": "Sinhala", "avatarId": "avatar_1", "onboardingStatus": "NOT_STARTED",
        "isArchived": False, "createdAt": now, "updatedAt": now,
    }
    cols = {
        "users": FakeCollection([
            {"_id": PARENT_ID, "role": "parent", "fullName": "Parent", "email": "p@example.com"},
            {"_id": OTHER_PARENT_ID, "role": "parent", "fullName": "Other", "email": "o@example.com"},
            {"_id": TEACHER_ID, "role": "teacher", "fullName": "Teacher", "email": "t@example.com"},
        ]),
        "sessions": FakeCollection([
            {"sessionId": sid, "userId": uid, "expiresAt": now + timedelta(days=1)}
            for sid, uid in (("parent", PARENT_ID), ("other_parent", OTHER_PARENT_ID), ("teacher", TEACHER_ID))
        ]),
        "learners": FakeCollection([
            {**learner_base, "learnerId": LEARNER},
            {**learner_base, "learnerId": ARCHIVED_LEARNER, "isArchived": True},
        ]),
        "questionnaires": FakeCollection(),
        "assessments": FakeCollection(),
        "onboarding": FakeCollection(),
        "events": FakeCollection(),
    }

    def _no_real_database():
        raise AssertionError("Onboarding tests must not reach a real database.")

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


async def _call(method, path, json=None, session="parent", learner=LEARNER):
    headers = {"Authorization": f"Bearer {session}"} if session else {}
    url = f"/api/v1/learners/{learner}{path}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        if method == "POST":
            return await client.post(url, json=json, headers=headers)
        return await client.get(url, headers=headers)


def _stored_adhd(db):
    doc = next((d for d in db["questionnaires"].docs if d["learnerId"] == LEARNER), {})
    return doc.get("adhdInformation")


def _learner_status(db):
    return next(d for d in db["learners"].docs if d["learnerId"] == LEARNER)["onboardingStatus"]


# --- 1-3. Diagnosis status and reported presentation -------------------------------------

class TestAdhdInformationRequestValidation:
    @pytest.mark.parametrize("presentation", PRESENTATIONS)
    def test_yes_with_each_presentation_is_valid(self, presentation):
        req = AdhdInformationRequest(diagnosisStatus="yes", reportedPresentation=presentation)
        assert req.reportedPresentation.value == presentation

    def test_yes_requires_a_presentation_choice(self):
        with pytest.raises(ValidationError):
            AdhdInformationRequest(diagnosisStatus="yes")

    @pytest.mark.parametrize("status", ["no", "not_sure", "prefer_not_to_say"])
    def test_presentation_and_month_rejected_without_diagnosis(self, status):
        AdhdInformationRequest(diagnosisStatus=status)
        with pytest.raises(ValidationError):
            AdhdInformationRequest(diagnosisStatus=status, reportedPresentation="combined")
        with pytest.raises(ValidationError):
            AdhdInformationRequest(diagnosisStatus=status, diagnosisReportedMonth="2024-03")

    @pytest.mark.parametrize("month", ["2024-13", "24-03", "2024/03", "1999-12"])
    def test_invalid_report_month_is_rejected(self, month):
        with pytest.raises(ValidationError):
            AdhdInformationRequest(diagnosisStatus="yes", reportedPresentation="combined",
                                   diagnosisReportedMonth=month)

    def test_future_report_month_is_rejected(self):
        future = datetime.now(timezone.utc) + timedelta(days=62)
        with pytest.raises(ValidationError):
            AdhdInformationRequest(diagnosisStatus="yes", reportedPresentation="combined",
                                   diagnosisReportedMonth=future.strftime("%Y-%m"))

    def test_unknown_status_is_rejected(self):
        with pytest.raises(ValidationError):
            AdhdInformationRequest(diagnosisStatus="maybe")


class TestSavingAdhdInformation:
    @pytest.mark.parametrize("presentation", PRESENTATIONS)
    async def test_professional_diagnosis_is_stored_as_unverified_parent_report(self, db, presentation):
        res = await _call("POST", "/onboarding/adhd-information",
                          {"diagnosisStatus": "yes", "reportedPresentation": presentation,
                           "diagnosisReportedMonth": "2023-06"})
        assert res.status_code == 200
        assert res.json()["data"]["nextStep"] == "snap_iv"
        stored = _stored_adhd(db)
        assert stored["diagnosisStatus"] == "yes"
        assert stored["reportedPresentation"] == presentation
        assert stored["diagnosisReportedMonth"] == "2023-06"
        assert stored["informationType"] == "PARENT_REPORTED_PROFESSIONAL_DIAGNOSIS"
        assert stored["source"] == "parent"
        assert stored["verificationStatus"] == "NOT_VERIFIED"

    @pytest.mark.parametrize("status", ["no", "not_sure", "prefer_not_to_say"])
    async def test_non_diagnosis_answers_store_no_presentation(self, db, status):
        res = await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": status})
        assert res.status_code == 200
        stored = _stored_adhd(db)
        assert stored["diagnosisStatus"] == status
        assert stored["reportedPresentation"] is None
        assert stored["diagnosisReportedMonth"] is None
        assert stored["informationType"] == "PARENT_REPORTED_DIAGNOSIS_STATUS"

    async def test_contradictory_payload_is_rejected_and_not_stored(self, db):
        res = await _call("POST", "/onboarding/adhd-information",
                          {"diagnosisStatus": "no", "reportedPresentation": "combined"})
        assert res.status_code == 422
        assert _stored_adhd(db) is None

    async def test_first_save_marks_onboarding_started(self, db):
        await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": "not_sure"})
        assert _learner_status(db) == "IN_PROGRESS"


# --- 4. Clearing obsolete information ------------------------------------------------------

class TestChangingDiagnosisStatus:
    @pytest.mark.parametrize("new_status", ["no", "not_sure", "prefer_not_to_say"])
    async def test_changing_from_yes_clears_presentation_and_month(self, db, new_status):
        await _call("POST", "/onboarding/adhd-information",
                    {"diagnosisStatus": "yes", "reportedPresentation": "combined", "diagnosisReportedMonth": "2022-01"})
        await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": new_status})
        stored = _stored_adhd(db)
        assert stored["diagnosisStatus"] == new_status
        assert stored["reportedPresentation"] is None and stored["diagnosisReportedMonth"] is None
        progress = (await _call("GET", "/onboarding")).json()["data"]
        assert progress["adhdInformation"]["reportedPresentation"] is None

    async def test_changing_presentation_replaces_previous_value(self, db):
        await _call("POST", "/onboarding/adhd-information",
                    {"diagnosisStatus": "yes", "reportedPresentation": "combined", "diagnosisReportedMonth": "2022-01"})
        await _call("POST", "/onboarding/adhd-information",
                    {"diagnosisStatus": "yes", "reportedPresentation": "predominantly_inattentive"})
        stored = _stored_adhd(db)
        assert stored["reportedPresentation"] == "predominantly_inattentive"
        assert stored["diagnosisReportedMonth"] is None


# --- 5-6. Optional SNAP-IV ------------------------------------------------------------------

class TestOptionalSnapIv:
    async def test_snap_iv_can_be_completed_without_prior_steps(self, db):
        res = await _call("POST", "/onboarding/snap-iv", {"responses": SNAP_RESPONSES})
        assert res.status_code == 200
        assert res.json()["data"]["inattentionTotal"] == 18  # existing scoring unchanged
        progress = (await _call("GET", "/onboarding")).json()["data"]
        assert progress["snapIvStatus"] == "COMPLETED" and progress["snapIvCompleted"] is True

    async def test_snap_iv_never_sets_an_adhd_presentation(self, db):
        await _call("POST", "/onboarding/snap-iv", {"responses": [{"itemId": i, "score": 3} for i in range(1, 19)]})
        progress = (await _call("GET", "/onboarding")).json()["data"]
        assert progress["adhdInformation"] is None
        assert progress["adhdInformationCompleted"] is False

    async def test_skip_records_status_and_moves_on(self, db):
        await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": "no"})
        res = await _call("POST", "/onboarding/snap-iv/skip")
        assert res.status_code == 200
        assert res.json()["data"]["snapIvStatus"] == "SKIPPED"
        assert res.json()["data"]["nextStep"] == "preferences"
        progress = (await _call("GET", "/onboarding")).json()["data"]
        assert progress["snapIvStatus"] == "SKIPPED" and progress["snapIvCompleted"] is False

    async def test_skipping_never_erases_completed_responses(self, db):
        await _call("POST", "/onboarding/snap-iv", {"responses": SNAP_RESPONSES})
        before = dict(next(d for d in db["questionnaires"].docs if d["learnerId"] == LEARNER)["snapIv"])
        res = await _call("POST", "/onboarding/snap-iv/skip")
        assert res.json()["data"]["snapIvStatus"] == "COMPLETED"
        after = next(d for d in db["questionnaires"].docs if d["learnerId"] == LEARNER)["snapIv"]
        assert after == before

    async def test_skipped_questionnaire_can_be_completed_later(self, db):
        await _call("POST", "/onboarding/snap-iv/skip")
        await _call("POST", "/onboarding/snap-iv", {"responses": SNAP_RESPONSES})
        progress = (await _call("GET", "/onboarding")).json()["data"]
        assert progress["snapIvStatus"] == "COMPLETED"

    async def test_mathematics_is_accessible_when_snap_iv_is_skipped(self, db):
        await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": "yes", "reportedPresentation": "combined"})
        await _call("POST", "/onboarding/snap-iv/skip")
        await _call("POST", "/onboarding/preferences", PREFERENCES)
        math = await _call("POST", "/onboarding/math-assessment",
                           {"grade": 1, "answers": MATH_ANSWERS, "assessmentProtocolVersion": "onboarding-v2"})
        assert math.status_code == 200
        summary = await _call("GET", "/onboarding/summary")
        assert summary.status_code == 200
        data = summary.json()["data"]
        assert data["progress"]["status"] == "COMPLETED"
        assert data["snapIvStatus"] == "SKIPPED" and data["snapIvSummary"] is None
        assert data["adhdInformation"]["reportedPresentation"] == "combined"
        assert _learner_status(db) == "COMPLETED"

    async def test_mathematics_is_accessible_without_adhd_information(self, db):
        """Legacy API clients that never call the new endpoint keep working."""
        await _call("POST", "/onboarding/preferences", PREFERENCES)
        math = await _call("POST", "/onboarding/math-assessment", {"grade": 1, "answers": MATH_ANSWERS})
        assert math.status_code == 200


# --- 7. Save, refresh and resume --------------------------------------------------------

class TestSaveAndResume:
    async def test_new_learner_starts_at_adhd_information(self, db):
        progress = (await _call("GET", "/onboarding")).json()["data"]
        assert progress["currentStep"] == "adhd_information"
        assert progress["snapIvStatus"] == "NOT_STARTED"

    async def test_progress_restores_answers_and_next_step_after_each_save(self, db):
        await _call("POST", "/onboarding/adhd-information",
                    {"diagnosisStatus": "yes", "reportedPresentation": "predominantly_hyperactive_impulsive"})
        p1 = (await _call("GET", "/onboarding")).json()["data"]
        assert p1["currentStep"] == "snap_iv"
        assert p1["adhdInformation"]["reportedPresentation"] == "predominantly_hyperactive_impulsive"

        await _call("POST", "/onboarding/snap-iv/skip")
        assert (await _call("GET", "/onboarding")).json()["data"]["currentStep"] == "preferences"

        await _call("POST", "/onboarding/preferences", PREFERENCES)
        p3 = (await _call("GET", "/onboarding")).json()["data"]
        assert p3["currentStep"] == "social_context"
        assert p3["learningPreferences"]["hintStyle"] == "visual_clue"

    async def test_finished_steps_are_not_repeated(self, db):
        """A learner who already saved preferences (old order) is not sent back to them."""
        await _call("POST", "/onboarding/preferences", PREFERENCES)
        res = await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": "no"})
        assert res.json()["data"]["nextStep"] == "snap_iv"
        res = await _call("POST", "/onboarding/snap-iv/skip")
        assert res.json()["data"]["nextStep"] == "social_context"

    async def test_editing_after_completion_does_not_downgrade_status(self, db):
        await _call("POST", "/onboarding/preferences", PREFERENCES)
        await _call("POST", "/onboarding/math-assessment", {"grade": 1, "answers": MATH_ANSWERS})
        assert _learner_status(db) == "COMPLETED"
        await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": "not_sure"})
        await _call("POST", "/onboarding/preferences", PREFERENCES)
        assert _learner_status(db) == "COMPLETED"
        assert (await _call("GET", "/onboarding")).json()["data"]["status"] == "COMPLETED"


# --- 8. Ownership and authorization -----------------------------------------------------

class TestAuthorization:
    @pytest.mark.parametrize("path,payload", [
        ("/onboarding/adhd-information", {"diagnosisStatus": "no"}),
        ("/onboarding/snap-iv/skip", None),
    ])
    @pytest.mark.parametrize("session,expected", [("other_parent", 403), ("teacher", 403), (None, 401)])
    async def test_only_the_owning_parent_can_write(self, db, path, payload, session, expected):
        res = await _call("POST", path, payload, session=session)
        assert res.status_code == expected
        assert _stored_adhd(db) is None
        assert db["onboarding"].docs == []

    async def test_archived_learner_cannot_be_updated(self, db):
        res = await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": "no"}, learner=ARCHIVED_LEARNER)
        assert res.status_code == 400

    async def test_adhd_information_is_not_exposed_outside_parent_onboarding(self, db):
        await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": "yes", "reportedPresentation": "combined"})
        learner = (await _call("GET", "")).json()
        sanitized = (await _call("GET", "/profile?sanitized=true")).json()
        full = (await _call("GET", "/profile")).json()
        for payload in (learner, sanitized, full):
            text = str(payload)
            assert "adhdInformation" not in text and "combined" not in text and "diagnosisStatus" not in text


# --- 9-10. Legacy records and protocol compatibility --------------------------------------

class TestLegacyCompatibility:
    async def test_legacy_completed_onboarding_without_new_fields(self, db):
        now = datetime.now(timezone.utc)
        db["questionnaires"].docs.append({
            "learnerId": LEARNER, "parentId": str(PARENT_ID),
            "learningPreferences": {**PREFERENCES, "savedAt": now},
            "snapIv": {"responses": SNAP_RESPONSES, "inattentionTotal": 18, "inattentionAverage": 2.0,
                       "hyperactivityTotal": 9, "hyperactivityAverage": 1.0, "totalScore": 27,
                       "overallAverage": 1.5, "savedAt": now},
        })
        db["onboarding"].docs.append({"learnerId": LEARNER, "parentId": str(PARENT_ID), "status": "COMPLETED",
                                      "currentStep": "summary", "completedSteps": ["preferences", "snap_iv"]})
        db["assessments"].docs.append({"learnerId": LEARNER, "grade": 1, "completedAt": now,
                                       "evaluatedItems": [], "totalQuestions": 1, "correctAnswers": 1})
        progress = (await _call("GET", "/onboarding")).json()["data"]
        assert progress["status"] == "COMPLETED"
        assert progress["adhdInformationCompleted"] is False and progress["adhdInformation"] is None
        assert progress["snapIvStatus"] == "COMPLETED"
        assert progress["currentStep"] == "summary"
        summary = await _call("GET", "/onboarding/summary")
        assert summary.status_code == 200
        assert summary.json()["data"]["snapIvSummary"]["inattentionTotal"] == 18

    async def test_legacy_in_progress_document_keeps_stored_step(self, db):
        db["onboarding"].docs.append({"learnerId": LEARNER, "parentId": str(PARENT_ID), "status": "IN_PROGRESS",
                                      "currentStep": "snap_iv", "completedSteps": ["preferences"]})
        progress = (await _call("GET", "/onboarding")).json()["data"]
        assert progress["currentStep"] == "snap_iv"
        assert progress["snapIvStatus"] == "NOT_STARTED"

    @pytest.mark.parametrize("protocol", ["onboarding-v1", "onboarding-v2"])
    async def test_v1_and_v2_math_submissions_still_accepted(self, db, protocol):
        await _call("POST", "/onboarding/adhd-information", {"diagnosisStatus": "prefer_not_to_say"})
        await _call("POST", "/onboarding/snap-iv/skip")
        await _call("POST", "/onboarding/preferences", PREFERENCES)
        res = await _call("POST", "/onboarding/math-assessment",
                          {"grade": 1, "answers": MATH_ANSWERS, "assessmentProtocolVersion": protocol})
        assert res.status_code == 200
        assert res.json()["data"]["assessmentProtocolVersion"] == protocol
