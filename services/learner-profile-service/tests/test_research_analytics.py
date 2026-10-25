"""
Database-free tests for the admin Research & Model Analytics API: admin role + researchAnalyticsAccess
enforcement, unchanged ordinary admin access, audit logging (fail closed), snapshot schema / sensitive-content
validation, small-cell suppression of live aggregates and absence of any prediction endpoint.
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
import app.services.admin_service as admin_module
import app.services.research_analytics_service as research_module
from app.main import app
from tests._fake_mongo import FakeCollection

RESEARCHER, PLAIN_ADMIN, STRING_FLAG_ADMIN, PARENT, TEACHER = (ObjectId() for _ in range(5))
SNAPSHOT_FILE = research_module.SNAPSHOT_DIR / "learner-profile.json"


def _assessment(i, grade=1, impsa="PROVISIONAL", level="EMERGING", code="SUPPORTED_PRACTICE", at=None):
    return {
        "learnerId": f"lrn_{i}", "grade": grade, "assessmentProtocolVersion": "onboarding-v2",
        "completedAt": at or datetime(2026, 10, 1, tzinfo=timezone.utc),
        "elpxProfile": {
            "algorithmVersion": "ELP-X-v1.0", "recommendationRulesetVersion": "ELP-X-REC-v1.0",
            "evidenceStatus": "SUFFICIENT",
            "skillEstimates": [{"skillId": "number_sense", "provisionalSkillLevel": level}],
            "structuredRecommendations": [{"strategyCode": code, "reasonCodes": ["X"]}],
        },
        "impsaSummary": {"status": impsa, "evidenceSufficiency": "SUFFICIENT"},
        "imlrSummary": {"status": "TRANSFER_OBSERVED", "evidenceLevel": "PROVISIONAL"},
        "evaluatedItems": [{"questionId": "q1", "userAnswer": "4"}],
    }


@pytest.fixture
def db(monkeypatch):
    now = datetime.now(timezone.utc)
    sessions = {"researcher": RESEARCHER, "admin": PLAIN_ADMIN, "stringflag": STRING_FLAG_ADMIN,
                "parent": PARENT, "teacher": TEACHER}
    cols = {
        "users": FakeCollection([
            {"_id": RESEARCHER, "role": "admin", "email": "r@example.com", "researchAnalyticsAccess": True},
            {"_id": PLAIN_ADMIN, "role": "admin", "email": "a@example.com"},
            {"_id": STRING_FLAG_ADMIN, "role": "admin", "email": "s@example.com", "researchAnalyticsAccess": "true"},
            {"_id": PARENT, "role": "parent", "email": "p@example.com", "researchAnalyticsAccess": True},
            {"_id": TEACHER, "role": "teacher", "email": "t@example.com", "researchAnalyticsAccess": True},
        ]),
        "sessions": FakeCollection([{"sessionId": s, "userId": u, "expiresAt": now + timedelta(days=1)}
                                    for s, u in sessions.items()]),
        "learners": FakeCollection([{"learnerId": f"lrn_{i}", "firstName": f"Child{i}"} for i in range(7)]),
        "assessments": FakeCollection([_assessment(i) for i in range(6)] + [_assessment(6, grade=2, impsa="X")]),
        "events": FakeCollection(), "deletions": FakeCollection(), "audit": FakeCollection(),
    }

    def _no_real_database():
        raise AssertionError("Research analytics tests must not reach a real database.")

    for module, name, value in [
        (mongodb_module, "get_database", _no_real_database),
        (auth_module, "get_sessions_collection", lambda: cols["sessions"]),
        (auth_module, "get_users_collection", lambda: cols["users"]),
        (admin_module, "get_users_collection", lambda: cols["users"]),
        (admin_module, "get_learners_collection", lambda: cols["learners"]),
        (admin_module, "get_assessments_collection", lambda: cols["assessments"]),
        (admin_module, "get_gameplay_events_collection", lambda: cols["events"]),
        (admin_module, "get_deletion_requests_collection", lambda: cols["deletions"]),
        (admin_module, "get_admin_audit_collection", lambda: cols["audit"]),
        (research_module, "get_learners_collection", lambda: cols["learners"]),
        (research_module, "get_assessments_collection", lambda: cols["assessments"]),
    ]:
        monkeypatch.setattr(module, name, value)
    return cols


async def _get(path, session="researcher", prefix="/api/v1/admin/research"):
    headers = {"Authorization": f"Bearer {session}"} if session else {}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.get(f"{prefix}{path}", headers=headers)


PATHS = ["/access", "/components", "/components/learner-profile", "/learner-profile/live-summary"]


class TestAuthorization:
    @pytest.mark.parametrize("path", PATHS)
    async def test_unauthenticated_is_rejected(self, db, path):
        assert (await _get(path, session=None)).status_code == 401

    @pytest.mark.parametrize("path", PATHS)
    @pytest.mark.parametrize("session", ["parent", "teacher"])
    async def test_non_admins_are_forbidden_even_with_the_flag(self, db, path, session):
        assert (await _get(path, session)).status_code == 403
        assert db["audit"].docs == []

    @pytest.mark.parametrize("path", PATHS)
    @pytest.mark.parametrize("session", ["admin", "stringflag"])
    async def test_admin_without_boolean_flag_is_forbidden(self, db, path, session):
        res = await _get(path, session)
        assert res.status_code == 403
        assert "research analytics access" in res.json()["detail"]
        assert db["audit"].docs == []

    @pytest.mark.parametrize("path", PATHS)
    async def test_admin_with_flag_is_allowed(self, db, path):
        assert (await _get(path)).status_code == 200

    async def test_ordinary_admin_pages_do_not_require_the_flag(self, db):
        res = await _get("/overview", session="admin", prefix="/api/v1/admin")
        assert res.status_code == 200

    async def test_access_check_does_not_modify_user_records(self, db):
        before = copy.deepcopy(db["users"].docs)
        await _get("/access", session="admin")
        await _get("/access")
        assert db["users"].docs == before


class TestAuditLog:
    async def test_data_reads_are_logged_with_admin_identity(self, db):
        for path in PATHS[1:]:
            await _get(path)
        assert [d["action"] for d in db["audit"].docs] == [
            "RESEARCH_LIST_COMPONENTS", "RESEARCH_VIEW_COMPONENT", "RESEARCH_VIEW_LIVE_SUMMARY"]
        assert all(d["adminId"] == str(RESEARCHER) for d in db["audit"].docs)

    @pytest.mark.parametrize("path", PATHS[1:])
    async def test_reads_fail_closed_when_audit_cannot_be_written(self, db, monkeypatch, path):
        class Broken:
            async def insert_one(self, doc):
                raise RuntimeError("audit store down")

        monkeypatch.setattr(admin_module, "get_admin_audit_collection", lambda: Broken())
        res = await _get(path)
        assert res.status_code == 503
        assert "ELP-X" not in res.text and "roc_auc" not in res.text


class TestSnapshot:
    def test_committed_snapshot_validates(self):
        raw = json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))
        assert research_module.validate_snapshot(raw, "learner-profile") is raw

    async def test_component_page_serves_saved_metrics_unchanged(self, db):
        data = (await _get("/components/learner-profile")).json()["data"]
        snap = data["snapshot"]
        saved = json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))
        assert snap["sections"]["nsch"]["test"] == saved["sections"]["nsch"]["test"]
        assert snap["sections"]["nsch"]["testYearUsedForTrainingOrSelection"] is False
        assert data["freshness"]["status"] in {"CURRENT", "STALE", "UNVERIFIABLE"}

    async def test_imlr_demo_is_served_unchanged_with_inputs_and_outcomes_separate(self, db):
        data = (await _get("/components/learner-profile")).json()["data"]
        demo = data["snapshot"]["sections"]["imlrDemo"]
        saved = json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))["sections"]["imlrDemo"]
        assert demo == saved
        assert demo["provenance"] == "synthetic" and len(demo["scenarios"]) == 8
        for sc in demo["scenarios"]:
            assert sc["synthetic"] is True
            transfer_ids = {i["itemId"] for i in sc["outcomes"]["items"]}
            assert not any(t in json.dumps(sc["inputs"]) for t in transfer_ids)
            cutoff = sc["inputs"]["snapshot"]["meta"]["predictionTime"]["seq"]
            assert all(i["evidenceFromSeq"] > cutoff for i in sc["outcomes"]["items"])

    async def test_imlr_demo_requires_research_access(self, db):
        res = await _get("/components/learner-profile", session="admin")
        assert res.status_code == 403 and "imlrDemo" not in res.text

    @pytest.mark.parametrize("component", ["behaviour-signal", "content-adaptation", "pedagogical-engine"])
    async def test_other_components_show_empty_state_not_invented_data(self, db, component):
        data = (await _get(f"/components/{component}")).json()["data"]
        assert data["snapshot"] is None and data["emptyReason"]

    async def test_unknown_component_is_404(self, db):
        assert (await _get("/components/not-a-component")).status_code == 404

    @pytest.mark.parametrize("tamper", [
        lambda s: s["sections"]["nsch"]["hypotheticalExample"]["features"].append({"learnerId": "lrn_1"}),
        lambda s: s["sources"][0].__setitem__("path", "C:/Users/someone/data.csv"),
        lambda s: s["sections"]["nsch"].__setitem__("note", "raw file at data/raw/nsch_2025.csv"),
        lambda s: s["sections"]["nsch"].__setitem__("note", "HHID column"),
        lambda s: s["sections"]["nsch"].__setitem__("testYearUsedForTrainingOrSelection", True),
        lambda s: s["sections"]["nsch"]["shapHypothetical"].__setitem__("provenance", "live"),
        lambda s: s["sections"]["mqRec"]["scenarios"][0].__setitem__("provenance", "live"),
        lambda s: s["models"][0].__setitem__("status", "VALIDATED"),
        lambda s: s.__setitem__("schemaVersion", "MQ-RESEARCH-SNAPSHOT-v0"),
        lambda s: s.__setitem__("componentId", "behaviour-signal"),
        # IMLR prototype demonstration
        lambda s: s["sections"]["imlrDemo"].__setitem__("provenance", "live"),
        lambda s: s["sections"]["imlrDemo"]["scenarios"][0].__setitem__("synthetic", False),
        lambda s: s["sections"]["imlrDemo"]["protocol"].__setitem__("status", "VALIDATED"),
        lambda s: s["sections"]["imlrDemo"]["scenarios"][0]["inputs"]["snapshot"]["features"].__setitem__(
            "transfer_correct", 2),
        lambda s: s["sections"]["imlrDemo"]["scenarios"][0]["inputs"]["preProbe"].append(
            {"itemId": s["sections"]["imlrDemo"]["scenarios"][0]["outcomes"]["items"][0]["itemId"]}),
        lambda s: s["sections"]["imlrDemo"]["scenarios"][0]["outcomes"].__setitem__("items", []),
    ])
    def test_tampered_snapshots_are_rejected(self, tamper):
        snap = json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))
        tamper(snap)
        with pytest.raises(research_module.SnapshotRejected):
            research_module.validate_snapshot(snap, "learner-profile")

    async def test_invalid_snapshot_is_not_served(self, db, monkeypatch, tmp_path):
        snap = json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))
        snap["sections"]["nsch"]["email"] = "x@example.com"
        (tmp_path / "learner-profile.json").write_text(json.dumps(snap), encoding="utf-8")
        monkeypatch.setattr(research_module, "SNAPSHOT_DIR", tmp_path)
        res = await _get("/components/learner-profile")
        assert res.status_code == 500 and "x@example.com" not in res.text
        listing = (await _get("/components")).json()["data"]
        assert next(c for c in listing if c["id"] == "learner-profile")["snapshotValid"] is False

    def test_snapshot_contains_no_identifiers_paths_or_binaries(self):
        text = SNAPSHOT_FILE.read_text(encoding="utf-8")
        assert research_module.find_sensitive_content(json.loads(text)) is None
        for token in ("model.joblib", "shap_background", "data/raw", ".csv\"", "\"learnerId\"", "\"email\""):
            assert token not in text


class TestLiveSummary:
    async def test_counts_are_aggregate_and_small_cells_suppressed(self, db):
        res = await _get("/learner-profile/live-summary")
        data = res.json()["data"]
        assert data["provenance"] == "live" and data["suppressed"] is False
        assert data["learnersAssessed"] == {"count": 7}
        # 6 x grade 1, 1 x grade 2 -> the single grade-2 learner is suppressed, and so is grade 1 (complementary)
        assert data["grades"] == {"1": {"count": None, "suppressed": True}, "2": {"count": None, "suppressed": True}}
        assert data["elpx"]["skillLevels"]["number_sense"] == {"EMERGING": {"count": 7}}
        for secret in ("lrn_", "Child", "userAnswer", "questionId"):
            assert secret not in res.text

    async def test_fewer_than_five_learners_withholds_distributions(self, db):
        db["assessments"].docs = [_assessment(i) for i in range(3)]
        data = (await _get("/learner-profile/live-summary")).json()["data"]
        assert data["suppressed"] is True
        assert data["learnersAssessed"] == {"count": None, "suppressed": True}
        assert "grades" not in data and "elpx" not in data

    async def test_only_latest_assessment_per_learner_is_counted(self, db):
        old = datetime(2026, 1, 1, tzinfo=timezone.utc)
        db["assessments"].docs += [_assessment(i, level="PROFICIENT", at=old) for i in range(7)]
        data = (await _get("/learner-profile/live-summary")).json()["data"]
        assert data["learnersAssessed"] == {"count": 7}
        assert "PROFICIENT" not in data["elpx"]["skillLevels"]["number_sense"]


class TestNoInference:
    def test_no_prediction_route_exists(self):
        paths = [getattr(r, "path", "") for r in app.routes]
        assert not [p for p in paths if "predict" in p.lower() or "infer" in p.lower()]

    def test_research_module_never_imports_ml_libraries(self):
        source = Path(research_module.__file__).read_text(encoding="utf-8")
        for lib in ("sklearn", "joblib", "shap", "numpy", "pandas"):
            assert f"import {lib}" not in source and f"from {lib}" not in source
