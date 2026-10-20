"""
Database-free tests for the read-only admin API: role enforcement, audit logging (fail closed),
pseudonymised IDs, sensitive-report gating and no credential leakage.
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
from app.main import app
from tests._fake_mongo import FakeCollection

ADMIN_ID, PARENT_ID, TEACHER_ID = ObjectId(), ObjectId(), ObjectId()
LEARNER = "lrn_admin_test"


@pytest.fixture
def db(monkeypatch):
    now = datetime.now(timezone.utc)
    cols = {
        "users": FakeCollection([
            {"_id": ADMIN_ID, "role": "admin", "fullName": "Admin", "email": "a@example.com", "passwordHash": "x"},
            {"_id": PARENT_ID, "role": "parent", "fullName": "Parent", "email": "p@example.com",
             "passwordHash": "secret-hash", "resetToken": "tok"},
            {"_id": TEACHER_ID, "role": "teacher", "fullName": "Teacher", "email": "t@example.com", "passwordHash": "y"},
        ]),
        "sessions": FakeCollection([
            {"sessionId": sid, "userId": uid, "expiresAt": now + timedelta(days=1)}
            for sid, uid in (("admin", ADMIN_ID), ("parent", PARENT_ID), ("teacher", TEACHER_ID))
        ]),
        "learners": FakeCollection([{
            "learnerId": LEARNER, "parentId": str(PARENT_ID), "firstName": "Sanduni", "age": 7, "grade": 1,
            "preferredLanguage": "Sinhala", "avatarId": "avatar_1", "onboardingStatus": "COMPLETED",
            "isArchived": False, "createdAt": now, "updatedAt": now,
        }]),
        "onboarding": FakeCollection([{"learnerId": LEARNER, "status": "COMPLETED", "currentStep": "summary"}]),
        "questionnaires": FakeCollection([{
            "learnerId": LEARNER,
            "learningPreferences": {"visualAssistance": "always"},
            "adhdInformation": {"diagnosisStatus": "yes", "reportedPresentation": "combined"},
            "snapIv": {"responses": [{"itemId": 1, "score": 2}], "totalScore": 2},
        }]),
        "assessments": FakeCollection([{
            "learnerId": LEARNER, "grade": 1, "completedAt": now,
            "evaluatedItems": [{"questionId": "g1_num_count_01", "skillId": "number_sense", "skillName": "Counting",
                                "skillNameSi": "ගණන් කිරීම", "isCorrect": True, "correctFirstResponse": True,
                                "includedInProficiencyEstimate": True, "qualityFlags": []}],
        }]),
        "events": FakeCollection(),
        "deletions": FakeCollection(),
        "audit": FakeCollection(),
    }

    def _no_real_database():
        raise AssertionError("Admin tests must not reach a real database.")

    patches = [
        (mongodb_module, "get_database", _no_real_database),
        (auth_module, "get_sessions_collection", lambda: cols["sessions"]),
        (auth_module, "get_users_collection", lambda: cols["users"]),
        (admin_module, "get_users_collection", lambda: cols["users"]),
        (admin_module, "get_learners_collection", lambda: cols["learners"]),
        (admin_module, "get_onboarding_collection", lambda: cols["onboarding"]),
        (admin_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
        (admin_module, "get_assessments_collection", lambda: cols["assessments"]),
        (admin_module, "get_gameplay_events_collection", lambda: cols["events"]),
        (admin_module, "get_deletion_requests_collection", lambda: cols["deletions"]),
        (admin_module, "get_admin_audit_collection", lambda: cols["audit"]),
        (learner_module, "get_learners_collection", lambda: cols["learners"]),
        (evidence_module, "get_learners_collection", lambda: cols["learners"]),
        (evidence_module, "get_assessments_collection", lambda: cols["assessments"]),
        (evidence_module, "get_gameplay_events_collection", lambda: cols["events"]),
        (evidence_module, "get_questionnaires_collection", lambda: cols["questionnaires"]),
    ]
    for module, name, value in patches:
        monkeypatch.setattr(module, name, value)
    return cols


async def _get(path, session="admin"):
    headers = {"Authorization": f"Bearer {session}"} if session else {}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.get(f"/api/v1/admin{path}", headers=headers)


PATHS = ["/overview", "/users", "/learners", f"/learners/{LEARNER}", "/audit-log"]


class TestRoleEnforcement:
    @pytest.mark.parametrize("path", PATHS)
    @pytest.mark.parametrize("session", ["parent", "teacher"])
    async def test_non_admins_are_forbidden(self, db, path, session):
        res = await _get(path, session)
        assert res.status_code == 403
        assert db["audit"].docs == []

    @pytest.mark.parametrize("path", PATHS)
    async def test_unauthenticated_requests_are_rejected(self, db, path):
        assert (await _get(path, session=None)).status_code == 401

    async def test_parent_endpoints_still_reject_admin(self, db):
        """Admin access is separate; it does not open the parent-only learner API."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/learners", headers={"Authorization": "Bearer admin"})
        assert res.status_code == 403


class TestAdminReads:
    async def test_overview_counts(self, db):
        data = (await _get("/overview")).json()["data"]
        assert data["usersByRole"] == {"admin": 1, "parent": 1, "teacher": 1}
        assert data["learnersTotal"] == 1
        assert data["learnersByOnboardingStatus"] == {"COMPLETED": 1}

    async def test_users_never_include_credentials(self, db):
        res = await _get("/users")
        text = res.text.lower()
        assert "passwordhash" not in text and "secret-hash" not in text and "resettoken" not in text
        parent = next(u for u in res.json()["data"] if u["role"] == "parent")
        assert parent["childCount"] == 1

    async def test_learner_list_uses_pseudonyms(self, db):
        row = (await _get("/learners")).json()["data"][0]
        assert row["pseudonym"] == admin_module.pseudonym(LEARNER)
        assert row["pseudonym"].startswith("C-") and LEARNER not in row["pseudonym"]
        assert row["parentEmail"] == "p@example.com"

    async def test_detail_hides_sensitive_reports_by_default(self, db):
        data = (await _get(f"/learners/{LEARNER}")).json()["data"]
        assert "adhdInformation" not in data["questionnaires"] and "snapIv" not in data["questionnaires"]
        assert data["sensitiveParentReports"] == {
            "available": {"adhdInformation": True, "snapIv": True}, "included": False,
        }
        assert data["questionnaires"]["learningPreferences"] == {"visualAssistance": "always"}
        assert data["assessments"][0]["evaluatedItems"][0]["questionId"] == "g1_num_count_01"
        assert "skillEstimates" in data["elpxProfile"]

    async def test_sensitive_reports_only_on_request_and_logged_separately(self, db):
        data = (await _get(f"/learners/{LEARNER}?include_sensitive=true")).json()["data"]
        assert data["sensitiveParentReports"]["adhdInformation"]["reportedPresentation"] == "combined"
        assert data["sensitiveParentReports"]["snapIv"]["totalScore"] == 2
        assert db["audit"].docs[-1]["action"] == "VIEW_LEARNER_SENSITIVE"
        assert db["audit"].docs[-1]["target"] == LEARNER

    async def test_unknown_learner_is_404(self, db):
        assert (await _get("/learners/lrn_missing")).status_code == 404


class TestAuditLog:
    async def test_every_read_is_logged_with_admin_identity(self, db):
        for path in PATHS[:-1]:
            await _get(path)
        actions = [d["action"] for d in db["audit"].docs]
        assert actions == ["VIEW_OVERVIEW", "LIST_USERS", "LIST_LEARNERS", "VIEW_LEARNER"]
        assert all(d["adminId"] == str(ADMIN_ID) for d in db["audit"].docs)

    async def test_reads_fail_closed_when_audit_cannot_be_written(self, db, monkeypatch):
        class Broken:
            async def insert_one(self, doc):
                raise RuntimeError("audit store down")

        monkeypatch.setattr(admin_module, "get_admin_audit_collection", lambda: Broken())
        res = await _get(f"/learners/{LEARNER}?include_sensitive=true")
        assert res.status_code == 503
        assert "combined" not in res.text
