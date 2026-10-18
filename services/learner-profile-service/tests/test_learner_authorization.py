"""
Database-free authorization tests for learner data endpoints (A3).

MongoDB collections are replaced with in-memory fakes, and app.db.mongodb.get_database
is patched to fail loudly, so no test here can reach any database.

Covers: parent ownership, teacher rejection, missing/invalid role rejection,
unauthenticated/expired sessions, and unauthorized gameplay evidence submission.
"""

from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

import app.core.auth as auth_module
import app.db.mongodb as mongodb_module
import app.services.evidence_service as evidence_module
import app.services.learner_service as learner_module
from app.main import app
from app.services.learner_service import get_learner_by_id


# --- In-memory MongoDB fakes -------------------------------------------------

def _matches(doc, query):
    for key, expected in query.items():
        actual = doc.get(key)
        if isinstance(expected, dict) and any(k.startswith("$") for k in expected):
            for op, value in expected.items():
                if op == "$gt" and not (actual is not None and actual > value):
                    return False
                if op == "$in" and actual not in value:
                    return False
        elif actual != expected:
            return False
    return True


class _FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, key, direction=1):
        self._docs = sorted(self._docs, key=lambda d: d.get(key) or 0, reverse=direction == -1)
        return self

    async def to_list(self, length=None):
        return list(self._docs[:length] if length else self._docs)


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]
        self.find_one_calls = 0
        self.inserted = []

    async def find_one(self, query, sort=None, **kwargs):
        self.find_one_calls += 1
        for doc in self.docs:
            if _matches(doc, query):
                return dict(doc)
        return None

    def find(self, query, *args, **kwargs):
        return _FakeCursor([dict(d) for d in self.docs if _matches(d, query)])

    async def insert_one(self, doc):
        stored = dict(doc)
        self.docs.append(stored)
        self.inserted.append(stored)


# --- Test identities ----------------------------------------------------------

PARENT_A_ID = ObjectId()
PARENT_B_ID = ObjectId()
TEACHER_ID = ObjectId()
NO_ROLE_ID = ObjectId()
ADMIN_ROLE_ID = ObjectId()
WRONG_CASE_ROLE_ID = ObjectId()

LEARNER_ID = "lrn_authz_test_a"
MISSING_LEARNER_ID = "lrn_authz_missing"

SESSIONS = {
    "parent_a": PARENT_A_ID,
    "parent_b": PARENT_B_ID,
    "teacher": TEACHER_ID,
    "no_role": NO_ROLE_ID,
    "admin_role": ADMIN_ROLE_ID,
    "wrong_case_role": WRONG_CASE_ROLE_ID,
}
NON_PARENT_SESSIONS = ["teacher", "no_role", "admin_role", "wrong_case_role"]

ENDPOINTS = [
    ("GET", f"/api/v1/learners/{LEARNER_ID}"),
    ("GET", f"/api/v1/learners/{LEARNER_ID}/profile"),
    ("GET", f"/api/v1/learners/{LEARNER_ID}/profile?sanitized=true"),
    ("POST", f"/api/v1/learners/{LEARNER_ID}/evidence"),
]


def _evidence_event(event_id="evt_authz_1"):
    return {
        "eventId": event_id,
        "learnerId": LEARNER_ID,
        "questionId": "q_authz_1",
        "skillId": "addition",
        "correctFirstResponse": True,
        "sourceComponent": "gameplay-engine",
    }


@pytest.fixture
def fake_db(monkeypatch):
    now = datetime.now(timezone.utc)
    users = FakeCollection([
        {"_id": PARENT_A_ID, "role": "parent", "fullName": "Parent A", "email": "a@example.com"},
        {"_id": PARENT_B_ID, "role": "parent", "fullName": "Parent B", "email": "b@example.com"},
        {"_id": TEACHER_ID, "role": "teacher", "fullName": "Teacher", "email": "t@example.com"},
        {"_id": NO_ROLE_ID, "fullName": "No Role", "email": "n@example.com"},
        {"_id": ADMIN_ROLE_ID, "role": "admin", "fullName": "Admin", "email": "x@example.com"},
        {"_id": WRONG_CASE_ROLE_ID, "role": "Parent", "fullName": "Wrong Case", "email": "w@example.com"},
    ])
    sessions = FakeCollection(
        [{"sessionId": sid, "userId": uid, "expiresAt": now + timedelta(days=1)} for sid, uid in SESSIONS.items()]
        + [{"sessionId": "parent_a_expired", "userId": PARENT_A_ID, "expiresAt": now - timedelta(minutes=1)}]
    )
    learners = FakeCollection([{
        "learnerId": LEARNER_ID,
        "parentId": str(PARENT_A_ID),
        "firstName": "Nimal",
        "age": 6,
        "grade": 1,
        "preferredLanguage": "Sinhala",
        "avatarId": "avatar_1",
        "onboardingStatus": "NOT_STARTED",
        "isArchived": False,
        "createdAt": now,
        "updatedAt": now,
    }])
    assessments = FakeCollection()
    events = FakeCollection()
    questionnaires = FakeCollection()

    def _no_real_database():
        raise AssertionError("Authorization tests must not reach a real database.")

    monkeypatch.setattr(mongodb_module, "get_database", _no_real_database)
    monkeypatch.setattr(auth_module, "get_sessions_collection", lambda: sessions)
    monkeypatch.setattr(auth_module, "get_users_collection", lambda: users)
    monkeypatch.setattr(learner_module, "get_learners_collection", lambda: learners)
    monkeypatch.setattr(evidence_module, "get_learners_collection", lambda: learners)
    monkeypatch.setattr(evidence_module, "get_assessments_collection", lambda: assessments)
    monkeypatch.setattr(evidence_module, "get_gameplay_events_collection", lambda: events)
    monkeypatch.setattr(evidence_module, "get_questionnaires_collection", lambda: questionnaires)

    return {"learners": learners, "events": events}


async def _request(method, url, session=None):
    headers = {"Authorization": f"Bearer {session}"} if session else {}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        if method == "POST":
            return await client.post(url, json=_evidence_event(), headers=headers)
        return await client.get(url, headers=headers)


# --- Parent ownership -----------------------------------------------------------

class TestParentOwnership:
    async def test_owner_can_read_learner_with_unchanged_response_shape(self, fake_db):
        res = await _request("GET", f"/api/v1/learners/{LEARNER_ID}", "parent_a")
        assert res.status_code == 200
        body = res.json()
        assert set(body) == {"success", "message", "data"}
        assert body["data"]["learnerId"] == LEARNER_ID
        assert body["data"]["parentId"] == str(PARENT_A_ID)

    async def test_owner_can_read_full_and_sanitized_profile(self, fake_db):
        full = await _request("GET", f"/api/v1/learners/{LEARNER_ID}/profile", "parent_a")
        sanitized = await _request("GET", f"/api/v1/learners/{LEARNER_ID}/profile?sanitized=true", "parent_a")
        assert full.status_code == 200 and full.json()["learnerId"] == LEARNER_ID
        assert sanitized.status_code == 200 and "learningAdaptations" in sanitized.json()

    async def test_owner_can_submit_evidence(self, fake_db):
        res = await _request("POST", f"/api/v1/learners/{LEARNER_ID}/evidence", "parent_a")
        assert res.status_code == 200
        assert res.json()["processedCount"] == 1
        assert len(fake_db["events"].inserted) == 1

    @pytest.mark.parametrize("method,url", ENDPOINTS)
    async def test_other_parent_is_forbidden(self, fake_db, method, url):
        res = await _request(method, url, "parent_b")
        assert res.status_code == 403
        assert fake_db["events"].inserted == []


# --- Teachers, missing and invalid roles ----------------------------------------------

class TestNonParentRolesDenied:
    @pytest.mark.parametrize("session", NON_PARENT_SESSIONS)
    @pytest.mark.parametrize("method,url", ENDPOINTS)
    async def test_non_parent_roles_are_forbidden_without_learner_lookup(self, fake_db, session, method, url):
        res = await _request(method, url, session)
        assert res.status_code == 403
        assert fake_db["learners"].find_one_calls == 0
        assert fake_db["events"].inserted == []

    @pytest.mark.parametrize("session", NON_PARENT_SESSIONS)
    async def test_learner_existence_is_not_disclosed_to_non_parents(self, fake_db, session):
        res = await _request("GET", f"/api/v1/learners/{MISSING_LEARNER_ID}", session)
        assert res.status_code == 403

    @pytest.mark.parametrize(
        "url",
        [
            "/api/v1/learners",
            "/api/v1/learners/deletion-requests",
            f"/api/v1/learners/{LEARNER_ID}/onboarding",
            f"/api/v1/learners/{LEARNER_ID}/onboarding/summary",
        ],
    )
    async def test_existing_parent_only_endpoints_still_reject_teachers(self, fake_db, url):
        res = await _request("GET", url, "teacher")
        assert res.status_code == 403


# --- Unauthenticated access ---------------------------------------------------------

class TestUnauthenticatedAccess:
    @pytest.mark.parametrize("method,url", ENDPOINTS)
    async def test_missing_session_is_unauthorized(self, fake_db, method, url):
        res = await _request(method, url)
        assert res.status_code == 401
        assert fake_db["events"].inserted == []

    @pytest.mark.parametrize("method,url", ENDPOINTS)
    async def test_expired_or_unknown_session_is_unauthorized(self, fake_db, method, url):
        for session in ("parent_a_expired", "not_a_real_session"):
            res = await _request(method, url, session)
            assert res.status_code == 401
        assert fake_db["events"].inserted == []

    async def test_session_cookie_is_still_accepted(self, fake_db):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            client.cookies.set("mathquest_session", "parent_a")
            res = await client.get(f"/api/v1/learners/{LEARNER_ID}")
        assert res.status_code == 200


# --- Service-layer deny by default ------------------------------------------------------

class TestServiceLayerDenyByDefault:
    @pytest.mark.parametrize(
        "user_role,parent_id",
        [
            (None, str(PARENT_A_ID)),
            ("teacher", str(PARENT_A_ID)),
            ("admin", str(PARENT_A_ID)),
            ("parent", None),
            ("parent", ""),
        ],
    )
    async def test_non_parent_or_missing_owner_is_refused_before_lookup(self, fake_db, user_role, parent_id):
        with pytest.raises(HTTPException) as exc_info:
            await get_learner_by_id(learner_id=LEARNER_ID, parent_id=parent_id, user_role=user_role)
        assert exc_info.value.status_code == 403
        assert fake_db["learners"].find_one_calls == 0

    async def test_wrong_parent_is_refused(self, fake_db):
        with pytest.raises(HTTPException) as exc_info:
            await get_learner_by_id(learner_id=LEARNER_ID, parent_id=str(PARENT_B_ID), user_role="parent")
        assert exc_info.value.status_code == 403

    async def test_owning_parent_is_allowed(self, fake_db):
        learner = await get_learner_by_id(learner_id=LEARNER_ID, parent_id=str(PARENT_A_ID), user_role="parent")
        assert learner["learnerId"] == LEARNER_ID
