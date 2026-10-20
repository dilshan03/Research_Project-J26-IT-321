"""
Database-free tests for parent-reported ADHD & support information:
SNAP-IV history (dates only for parents), access control, and the removed medication feature
(no endpoint, and any record stored earlier is never returned).
"""

from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient

import app.core.auth as auth_module
import app.db.mongodb as mongodb_module
import app.services.admin_service as admin_module
import app.services.evidence_service as evidence_module
import app.services.learner_service as learner_module
import app.services.onboarding_service as onboarding_module
import app.services.support_information_service as support_module
from app.main import app
from tests._fake_mongo import FakeCollection

PARENT_ID, OTHER_PARENT_ID, TEACHER_ID, ADMIN_ID = ObjectId(), ObjectId(), ObjectId(), ObjectId()
LEARNER = "lrn_support"
SNAP = [{"itemId": i, "score": 2 if i <= 9 else 1} for i in range(1, 19)]


@pytest.fixture
def db(monkeypatch):
    now = datetime.now(timezone.utc)
    cols = {
        "users": FakeCollection([
            {"_id": PARENT_ID, "role": "parent", "fullName": "P", "email": "p@example.com"},
            {"_id": OTHER_PARENT_ID, "role": "parent", "fullName": "O", "email": "o@example.com"},
            {"_id": TEACHER_ID, "role": "teacher", "fullName": "T", "email": "t@example.com"},
            {"_id": ADMIN_ID, "role": "admin", "fullName": "A", "email": "a@example.com"},
        ]),
        "sessions": FakeCollection([
            {"sessionId": sid, "userId": uid, "expiresAt": now + timedelta(days=1)}
            for sid, uid in (("parent", PARENT_ID), ("other", OTHER_PARENT_ID), ("teacher", TEACHER_ID), ("admin", ADMIN_ID))
        ]),
        "learners": FakeCollection([{
            "learnerId": LEARNER, "parentId": str(PARENT_ID), "firstName": "S", "age": 7, "grade": 1,
            "preferredLanguage": "Sinhala", "avatarId": "avatar_1", "onboardingStatus": "IN_PROGRESS",
            "isArchived": False, "createdAt": now, "updatedAt": now,
        }]),
        "questionnaires": FakeCollection(),
        "assessments": FakeCollection(),
        "onboarding": FakeCollection([{"learnerId": LEARNER, "status": "IN_PROGRESS", "currentStep": "preferences",
                                       "completedSteps": ["adhd_information"]}]),
        "events": FakeCollection(),
        "deletions": FakeCollection(),
        "audit": FakeCollection(),
    }

    def _no_real_database():
        raise AssertionError("Tests must not reach a real database.")

    patches = [
        (mongodb_module, "get_database", _no_real_database),
        (auth_module, "get_sessions_collection", lambda: cols["sessions"]),
        (auth_module, "get_users_collection", lambda: cols["users"]),
        (learner_module, "get_learners_collection", lambda: cols["learners"]),
        (onboarding_module, "get_learners_collection", lambda: cols["learners"]),
        (onboarding_module, "get_onboarding_collection", lambda: cols["onboarding"]),
        (onboarding_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
        (onboarding_module, "get_assessments_collection", lambda: cols["assessments"]),
        (support_module, "get_onboarding_collection", lambda: cols["onboarding"]),
        (support_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
        (admin_module, "get_users_collection", lambda: cols["users"]),
        (admin_module, "get_learners_collection", lambda: cols["learners"]),
        (admin_module, "get_onboarding_collection", lambda: cols["onboarding"]),
        (admin_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
        (admin_module, "get_assessments_collection", lambda: cols["assessments"]),
        (admin_module, "get_gameplay_events_collection", lambda: cols["events"]),
        (admin_module, "get_deletion_requests_collection", lambda: cols["deletions"]),
        (admin_module, "get_admin_audit_collection", lambda: cols["audit"]),
        (evidence_module, "get_learners_collection", lambda: cols["learners"]),
        (evidence_module, "get_assessments_collection", lambda: cols["assessments"]),
        (evidence_module, "get_gameplay_events_collection", lambda: cols["events"]),
        (evidence_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
    ]
    for module, name, value in patches:
        monkeypatch.setattr(module, name, value)
    return cols


async def _call(method, path, json=None, session="parent"):
    headers = {"Authorization": f"Bearer {session}"} if session else {}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        if method == "POST":
            return await client.post(path, json=json, headers=headers)
        return await client.get(path, headers=headers)


SUPPORT = f"/api/v1/learners/{LEARNER}/support-information"
SNAP_URL = f"/api/v1/learners/{LEARNER}/onboarding/snap-iv"


def _quest(db):
    return next((d for d in db["questionnaires"].docs if d["learnerId"] == LEARNER), {})


class TestSupportInformationView:
    async def test_view_combines_adhd_information_and_snap_status(self, db):
        await _call("POST", f"/api/v1/learners/{LEARNER}/onboarding/adhd-information",
                    {"diagnosisStatus": "yes", "reportedPresentation": "combined"})
        data = (await _call("GET", SUPPORT)).json()["data"]
        assert data["adhdInformation"]["reportedPresentation"] == "combined"
        assert data["snapIv"]["status"] == "NOT_STARTED" and data["snapIv"]["history"] == []
        assert "medicationInformation" not in data

    async def test_view_is_read_only_and_creates_no_records(self, db):
        db["onboarding"].docs.clear()
        res = await _call("GET", SUPPORT)
        assert res.status_code == 200
        assert db["onboarding"].docs == [] and db["questionnaires"].docs == []


class TestSnapIvHistory:
    async def test_every_submission_is_kept_and_latest_stays_in_snapIv(self, db):
        await _call("POST", SNAP_URL, {"responses": SNAP})
        second = [{"itemId": i, "score": 0} for i in range(1, 19)]
        await _call("POST", SNAP_URL, {"responses": second})
        quest = _quest(db)
        assert len(quest["snapIvHistory"]) == 2
        assert quest["snapIv"]["totalScore"] == 0  # latest submission, unchanged contract

    async def test_parents_see_dates_only_never_scores(self, db):
        await _call("POST", SNAP_URL, {"responses": SNAP})
        res = await _call("GET", SUPPORT)
        history = res.json()["data"]["snapIv"]["history"]
        assert len(history) == 1 and history[0]["completedAt"]
        for field in ("totalScore", "inattentionTotal", "hyperactivityTotal", "responses", "Average"):
            assert field not in res.text
        assert "not a clinical change" in res.json()["data"]["snapIv"]["notice"]

    async def test_legacy_single_record_is_kept_when_a_new_one_is_added(self, db):
        db["questionnaires"].docs.append({"learnerId": LEARNER, "snapIv": {
            "version": "SNAP-IV-v1.0", "totalScore": 30, "savedAt": datetime(2025, 1, 5, tzinfo=timezone.utc)}})
        assert len((await _call("GET", SUPPORT)).json()["data"]["snapIv"]["history"]) == 1
        await _call("POST", SNAP_URL, {"responses": SNAP})
        quest = _quest(db)
        assert [h.get("totalScore") for h in quest["snapIvHistory"]] == [30, 18 + 9]


class TestAccessControl:
    @pytest.mark.parametrize("session,expected", [("other", 403), ("teacher", 403), ("admin", 403), (None, 401)])
    async def test_only_the_owning_parent_can_read(self, db, session, expected):
        assert (await _call("GET", SUPPORT, session=session)).status_code == expected

    async def test_admin_sees_snap_history_only_when_sensitive_details_requested(self, db):
        await _call("POST", SNAP_URL, {"responses": SNAP})
        plain = (await _call("GET", f"/api/v1/admin/learners/{LEARNER}", session="admin")).json()["data"]
        assert "snapIvHistory" not in plain["questionnaires"]
        full = (await _call("GET", f"/api/v1/admin/learners/{LEARNER}?include_sensitive=true", session="admin")).json()["data"]
        assert len(full["sensitiveParentReports"]["snapIvHistory"]) == 1


class TestMedicationRemoved:
    async def test_medication_endpoint_no_longer_exists(self, db):
        res = await _call("POST", f"{SUPPORT}/medication", {"medicationStatus": "yes"})
        assert res.status_code in (404, 405)
        assert "medicationInformation" not in _quest(db)

    async def test_previously_stored_medication_is_never_returned(self, db):
        db["questionnaires"].docs.append({"learnerId": LEARNER, "parentId": str(PARENT_ID),
                                          "medicationInformation": {"medicationStatus": "yes", "sinceMonth": "2025-01"}})
        parent_view = await _call("GET", SUPPORT)
        assert "medication" not in parent_view.text.lower()
        for query in ("", "?include_sensitive=true"):
            admin_view = await _call("GET", f"/api/v1/admin/learners/{LEARNER}{query}", session="admin")
            assert admin_view.status_code == 200
            assert "medication" not in admin_view.text.lower()
