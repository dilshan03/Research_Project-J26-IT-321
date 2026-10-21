"""
Database-free tests: a companion the child chooses during onboarding is the learner's displayed avatar
everywhere (learner API, onboarding summary) until the child chooses another one. A parent's avatar
selection is stored separately and never overrides it. In-memory collections only.
"""

from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.test_math_assessment_submission import G2_LEARNER, _submit, db  # noqa: F401 (fixture)
from tests.test_onboarding_v2_grade2 import _journey

PARENT = {"Authorization": "Bearer parent"}


def _prefs(avatar_id):
    return {"source": "child", "avatarId": avatar_id, "theme": "toy_room", "soundMode": "quiet",
            "chosenAt": "2026-10-21T08:00:00Z"}


async def _learner():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return (await client.get(f"/api/v1/learners/{G2_LEARNER}", headers=PARENT)).json()["data"]


async def _parent_sets_avatar(avatar_id):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.patch(f"/api/v1/learners/{G2_LEARNER}", json={"avatarId": avatar_id}, headers=PARENT)


async def _child_finishes_onboarding(avatar_id, **journey_args):
    return await _submit(G2_LEARNER, _journey(**journey_args), grade=2, assessmentProtocolVersion="onboarding-v2",
                         childPreferences=_prefs(avatar_id))


class TestChildAvatarChoice:
    async def test_parent_avatar_is_shown_before_the_child_chooses(self, db):
        learner = await _learner()
        assert learner["avatarId"] == "avatar_1" and learner["avatarSource"] == "parent"

    async def test_child_choice_replaces_the_parent_selection_everywhere(self, db):
        assert (await _child_finishes_onboarding("avatar_owl")).status_code == 200
        learner = await _learner()
        assert learner["avatarId"] == "avatar_owl"
        assert learner["avatarSource"] == "child"
        assert learner["parentAvatarId"] == "avatar_1"            # the parent's selection is kept, not overwritten

        doc = next(d for d in db["learners"].docs if d["learnerId"] == G2_LEARNER)
        assert doc["avatarId"] == "avatar_1" and doc["childAvatarId"] == "avatar_owl"

    async def test_parent_change_afterwards_does_not_override_the_child_choice(self, db):
        await _child_finishes_onboarding("avatar_owl")
        res = await _parent_sets_avatar("avatar_fox")
        assert res.status_code == 200
        assert res.json()["data"]["avatarId"] == "avatar_owl"
        learner = await _learner()
        assert learner["avatarId"] == "avatar_owl" and learner["parentAvatarId"] == "avatar_fox"

    async def test_rejected_resubmission_leaves_the_child_choice_unchanged(self, db):
        await _child_finishes_onboarding("avatar_owl")
        res = await _child_finishes_onboarding("avatar_rabbit", pre="46")    # conflicting baseline: rejected
        assert res.status_code == 409
        assert (await _learner())["avatarId"] == "avatar_owl"
        res = await _child_finishes_onboarding("avatar_rabbit")              # identical retry: existing result returned
        assert res.status_code == 200
        assert (await _learner())["avatarId"] == "avatar_owl"

    async def test_unknown_child_avatar_is_ignored(self, db):
        await _child_finishes_onboarding("avatar_unknown")
        learner = await _learner()
        assert learner["avatarId"] == "avatar_1" and learner["avatarSource"] == "parent"

    async def test_no_child_preferences_keeps_the_parent_avatar(self, db):
        await _submit(G2_LEARNER, _journey(), grade=2, assessmentProtocolVersion="onboarding-v2")
        assert (await _learner())["avatarSource"] == "parent"
