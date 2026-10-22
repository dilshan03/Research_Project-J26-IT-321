"""
SNAP-IV repeated assessment history and progress comparison (SNAPIV-PROGRESS-v1.0).
Unit tests for the pure comparison logic, plus API integration and regression tests through the existing
support-information and SNAP-IV endpoints. In-memory collections only; no database.
"""

from datetime import datetime, timedelta, timezone

from app.services import snap_iv_progress as sp
from tests.test_support_information import LEARNER, SNAP_URL, SUPPORT, _call, _quest, db  # noqa: F401 (fixture)


def _entry(days, inatt, hyper, relation="parent", version="SNAP-IV-18-v1.0", with_scores=True):
    """A stored history entry whose 9+9 item answers produce the given per-item values."""
    responses = [{"itemId": i, "score": inatt[i - 1] if i <= 9 else hyper[i - 10]} for i in range(1, 19)]
    e = {"version": version, "respondentRelation": relation, "responses": responses,
         "savedAt": datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(days=days)}
    if with_scores:
        e.update({"inattentionTotal": sum(inatt), "inattentionAverage": round(sum(inatt) / 9, 2),
                  "hyperactivityTotal": sum(hyper), "hyperactivityAverage": round(sum(hyper) / 9, 2),
                  "totalScore": sum(inatt) + sum(hyper)})
    return e


TWO = [2] * 9
ONE = [1] * 9


class TestComparisonLogic:
    def test_single_entry_has_history_but_no_comparison(self):
        p = sp.build_snap_iv_progress({"snapIvHistory": [_entry(0, TWO, ONE)]})
        assert p["entryCount"] == 1 and p["latestChange"] is None and p["overallChange"] is None
        assert p["entries"][0]["inattention"] == {"total": 18, "average": 2.0}
        assert p["version"] == sp.SNAP_IV_PROGRESS_VERSION

    def test_lower_higher_and_similar_directions_with_item_counts(self):
        later_inatt = [1] * 9                       # 2.0 -> 1.0 : reported less
        later_hyper = [1] * 8 + [2]                 # 1.0 -> 1.11: within the "about the same" band
        p = sp.build_snap_iv_progress({"snapIvHistory": [_entry(0, TWO, ONE), _entry(90, later_inatt, later_hyper)]})
        c = p["latestChange"]
        assert c["inattention"] == {"direction": "LOWER", "before": 2.0, "after": 1.0, "change": -1.0,
                                    "itemsRatedLower": 9, "itemsRatedHigher": 0, "itemsUnchanged": 0}
        assert c["hyperactivity"]["direction"] == "SIMILAR" and c["hyperactivity"]["itemsRatedHigher"] == 1
        assert c["daysBetween"] == 90 and c["flags"] == []

        p2 = sp.build_snap_iv_progress({"snapIvHistory": [_entry(0, ONE, ONE), _entry(60, TWO, ONE)]})
        assert p2["latestChange"]["inattention"]["direction"] == "HIGHER"

    def test_band_edge_is_exactly_one_quarter(self):
        # +0.22 (2 items up one step) stays SIMILAR; +0.33 (3 items) is HIGHER
        assert sp._direction(0.22) == "SIMILAR" and sp._direction(0.25) == "HIGHER" and sp._direction(-0.25) == "LOWER"

    def test_history_is_ordered_oldest_first_and_overall_change_needs_three_entries(self):
        hist = [_entry(120, ONE, ONE), _entry(0, TWO, TWO), _entry(60, [1] * 4 + [2] * 5, TWO)]
        p = sp.build_snap_iv_progress({"snapIvHistory": hist})
        assert [e["inattention"]["average"] for e in p["entries"]] == [2.0, 1.56, 1.0]
        assert p["overallChange"]["inattention"]["direction"] == "LOWER"
        assert p["overallChange"]["daysBetween"] == 120

    def test_context_flags(self):
        p = sp.build_snap_iv_progress({"snapIvHistory": [
            _entry(0, TWO, ONE), _entry(10, TWO, ONE, relation="guardian", version="SNAP-IV-18-v2.0")]})
        assert set(p["latestChange"]["flags"]) == {"SHORT_INTERVAL", "DIFFERENT_RESPONDENT", "DIFFERENT_VERSION"}

    def test_legacy_record_without_answers_is_kept_but_not_compared(self):
        legacy = {"version": "SNAP-IV-v1.0", "totalScore": 30, "savedAt": datetime(2025, 1, 5, tzinfo=timezone.utc)}
        p = sp.build_snap_iv_progress({"snapIvHistory": [legacy, _entry(400, TWO, ONE)]})
        c = p["latestChange"]
        assert p["entries"][0]["inattention"] is None
        assert c["inattention"]["direction"] == "NOT_COMPARABLE" and "SCORES_UNAVAILABLE" in c["flags"]

    def test_scores_are_recomputed_from_answers_when_not_stored(self):
        p = sp.build_snap_iv_progress({"snapIvHistory": [_entry(0, TWO, ONE, with_scores=False)]})
        assert p["entries"][0]["hyperactivity"] == {"total": 9, "average": 1.0}

    def test_duplicate_copies_are_shown_once_and_legacy_single_record_is_read(self):
        e = _entry(0, TWO, ONE)
        assert sp.build_snap_iv_progress({"snapIvHistory": [e, dict(e)]})["entryCount"] == 1
        assert sp.build_snap_iv_progress({"snapIv": e})["entryCount"] == 1
        assert sp.build_snap_iv_progress(None)["entryCount"] == 0

    def test_output_never_uses_clinical_wording(self):
        p = sp.build_snap_iv_progress({"snapIvHistory": [_entry(0, TWO, ONE), _entry(90, ONE, TWO), _entry(200, ONE, ONE)]})
        codes = str({k: v for k, v in p.items() if k not in ("notice", "scale")}).lower()
        for word in ("improv", "worse", "diagnos", "clinical", "severe", "normal", "risk"):
            assert word not in codes, word
        assert "not a diagnosis" in p["notice"] and "not evidence that MathQuest caused" in p["notice"]


class TestRepeatedSubmissionsThroughTheApi:
    async def test_repeated_submissions_are_all_kept_and_compared(self, db):
        first = [{"itemId": i, "score": 2} for i in range(1, 19)]
        later = [{"itemId": i, "score": 1 if i <= 9 else 2} for i in range(1, 19)]
        assert (await _call("POST", SNAP_URL, {"responses": first})).status_code == 200
        assert (await _call("POST", SNAP_URL, {"responses": later})).status_code == 200

        quest = _quest(db)
        assert len(quest["snapIvHistory"]) == 2                       # nothing overwritten
        assert quest["snapIv"]["inattentionTotal"] == 9                # latest stays in `snapIv` (unchanged contract)
        assert [h["inattentionTotal"] for h in quest["snapIvHistory"]] == [18, 9]

        snap = (await _call("GET", SUPPORT)).json()["data"]["snapIv"]
        assert [h["inattention"]["average"] for h in snap["history"]] == [1.0, 2.0]   # newest first
        change = snap["progress"]["latestChange"]
        assert change["inattention"]["direction"] == "LOWER" and change["hyperactivity"]["direction"] == "SIMILAR"
        assert "SHORT_INTERVAL" in change["flags"]                     # both saved today

    async def test_dates_are_stored_per_submission(self, db):
        await _call("POST", SNAP_URL, {"responses": [{"itemId": i, "score": 0} for i in range(1, 19)]})
        saved = _quest(db)["snapIvHistory"][0]["savedAt"]
        assert isinstance(saved, datetime) and saved.tzinfo is not None

    async def test_incomplete_questionnaire_is_rejected_and_adds_no_history(self, db):
        res = await _call("POST", SNAP_URL, {"responses": [{"itemId": i, "score": 1} for i in range(1, 18)]})
        assert res.status_code == 422
        assert "snapIvHistory" not in _quest(db)

    async def test_resubmitting_after_onboarding_completed_keeps_it_completed(self, db):
        db["learners"].docs[0]["onboardingStatus"] = "COMPLETED"
        await _call("POST", SNAP_URL, {"responses": [{"itemId": i, "score": 1} for i in range(1, 19)]})
        assert db["learners"].docs[0]["onboardingStatus"] == "COMPLETED"


class TestRegression:
    async def test_snap_iv_never_changes_the_maths_profile(self, db):
        res_before = await _call("GET", f"/api/v1/learners/{LEARNER}/profile")
        assert res_before.status_code == 200, res_before.text           # a real profile, not an error page
        before = res_before.json()
        assert "skillEstimates" in str(before)
        await _call("POST", SNAP_URL, {"responses": [{"itemId": i, "score": 3} for i in range(1, 19)]})
        await _call("POST", SNAP_URL, {"responses": [{"itemId": i, "score": 0} for i in range(1, 19)]})
        res_after = await _call("GET", f"/api/v1/learners/{LEARNER}/profile")
        assert res_after.status_code == 200
        after = res_after.json()
        strip = lambda d: {k: v for k, v in (d.get("data") or {}).items() if k not in ("lastUpdated", "generatedAt")}  # noqa: E731
        assert strip(before) == strip(after)
        assert "snap" not in str(after).lower()

    async def test_other_parents_cannot_read_progress(self, db):
        await _call("POST", SNAP_URL, {"responses": [{"itemId": i, "score": 1} for i in range(1, 19)]})
        assert (await _call("GET", SUPPORT, session="other")).status_code == 403
        assert (await _call("POST", SNAP_URL, {"responses": [{"itemId": i, "score": 1} for i in range(1, 19)]}, session="other")).status_code == 403
