"""
Parent-facing ADHD and support information: parent-reported ADHD information and the optional
SNAP-IV questionnaire history with its progress comparison (SNAPIV-PROGRESS, app/services/snap_iv_progress.py).

All of this is unverified parent-reported context. It is kept separate from mathematics evidence,
is never used to select recommendations or activities, and is never interpreted as clinical change.
Parents see their own SNAP-IV subscale scores over time with a fixed non-diagnostic notice; individual
item answers are not returned here. Medication information is not collected (removed as too sensitive).
"""

from datetime import datetime
from typing import Any, Dict, List

from app.db.mongodb import get_onboarding_collection, get_questionnaires_collection
from app.services.learner_service import get_learner_by_id
from app.services.onboarding_service import snap_iv_status
from app.services.snap_iv_progress import build_snap_iv_progress

SNAP_IV_HISTORY_NOTICE = (
    "Each entry records the parent's home observations at that time. Differences between entries are "
    "not a clinical change, not a diagnosis and not evidence that MathQuest caused any change."
)


def _iso(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def _snap_history(progress: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Newest first: date, version and the two subscale averages/totals (None when not computable)."""
    return list(reversed(progress["entries"]))


async def get_support_information(learner_id: str, parent_id: str) -> Dict[str, Any]:
    """Read-only; never creates onboarding records."""
    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent")
    quest_doc = await get_questionnaires_collection().find_one({"learnerId": learner_id}) or {}
    progress_doc = await get_onboarding_collection().find_one({"learnerId": learner_id})

    adhd = quest_doc.get("adhdInformation")
    progress = build_snap_iv_progress(quest_doc)
    return {
        "learnerId": learner_id,
        "onboardingStatus": learner.get("onboardingStatus"),
        "adhdInformation": {k: _iso(v) for k, v in adhd.items()} if isinstance(adhd, dict) else None,
        "snapIv": {
            "status": snap_iv_status(quest_doc, progress_doc),
            "history": _snap_history(progress),
            "progress": {k: v for k, v in progress.items() if k != "entries"},
            "notice": SNAP_IV_HISTORY_NOTICE,
        },
    }
