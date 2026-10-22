"""
SNAP-IV history comparison for parents (SNAPIV-PROGRESS-v1.0).

Compares repeated parent-completed SNAP-IV questionnaires over time and describes how the parent's
*reported* inattention and hyperactivity/impulsivity characteristics changed between entries.

Scope and safeguards:
- Descriptive only. Every value comes from what the parent reported at that time; nothing here is a
  diagnosis, a clinical change, an improvement or worsening of ADHD, or an effect of MathQuest.
- No clinical cut-offs are applied. The "about the same" band is a display convention for small
  differences (an average change under one quarter of one answer step), not clinical significance.
- Never used for mathematics estimates, recommendations or activity selection.
- Inputs are the stored `snapIvHistory` entries (or the legacy single `snapIv` record); nothing is written.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

SNAP_IV_PROGRESS_VERSION = "SNAPIV-PROGRESS-v1.0"

# Display convention only (see module docstring): |change in a subscale average| below this is "about the same".
SIMILAR_BAND = 0.25
# Entries closer together than this are flagged: day-to-day variation can dominate short gaps.
SHORT_INTERVAL_DAYS = 30

DIRECTION_LOWER = "LOWER"        # the parent reported these characteristics less often / less strongly
DIRECTION_HIGHER = "HIGHER"      # the parent reported them more often / more strongly
DIRECTION_SIMILAR = "SIMILAR"
DIRECTION_NOT_COMPARABLE = "NOT_COMPARABLE"

FLAG_SHORT_INTERVAL = "SHORT_INTERVAL"
FLAG_DIFFERENT_RESPONDENT = "DIFFERENT_RESPONDENT"
FLAG_DIFFERENT_VERSION = "DIFFERENT_VERSION"
FLAG_SCORES_UNAVAILABLE = "SCORES_UNAVAILABLE"

INTERPRETATION_NOTICE = (
    "These are the parent's own reports at different times. A change between entries describes how the "
    "parent saw things at home; it is not a clinical change, not a diagnosis, not an improvement or "
    "worsening of ADHD, and not evidence that MathQuest caused any change."
)

SUBSCALES = {
    "inattention": range(1, 10),     # items 1-9
    "hyperactivity": range(10, 19),  # items 10-18 (hyperactivity / impulsivity)
}


def _iso(value: Any) -> Optional[str]:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value) if value else None


def _as_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _item_scores(entry: Dict[str, Any]) -> Dict[int, int]:
    scores: Dict[int, int] = {}
    for r in entry.get("responses") or []:
        item, score = r.get("itemId"), r.get("score")
        if isinstance(item, int) and isinstance(score, int) and 0 <= score <= 3:
            scores[item] = score
    return scores


def _subscale(entry: Dict[str, Any], items: Dict[int, int], name: str) -> Optional[Dict[str, Any]]:
    """Stored total/average, or recomputed from the 9 item answers; None if neither is available."""
    total_key, avg_key = f"{name}Total", f"{name}Average"
    if isinstance(entry.get(total_key), (int, float)) and isinstance(entry.get(avg_key), (int, float)):
        return {"total": entry[total_key], "average": round(float(entry[avg_key]), 2)}
    ids = SUBSCALES[name]
    if all(i in items for i in ids):
        total = sum(items[i] for i in ids)
        return {"total": total, "average": round(total / 9.0, 2)}
    return None


def normalize_history(quest_doc: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Oldest-first list of SNAP-IV entries with their subscale scores (None when not computable)."""
    quest_doc = quest_doc or {}
    raw = quest_doc.get("snapIvHistory") or ([quest_doc["snapIv"]] if quest_doc.get("snapIv") else [])
    entries, seen = [], set()
    for e in raw:
        key = (_iso(e.get("savedAt")), e.get("totalScore"))
        if key in seen:   # the same submission stored twice (e.g. legacy copy) is shown once
            continue
        seen.add(key)
        items = _item_scores(e)
        entries.append({
            "completedAt": _iso(e.get("savedAt")),
            "version": e.get("version"),
            "respondentRelation": e.get("respondentRelation"),
            "inattention": _subscale(e, items, "inattention"),
            "hyperactivity": _subscale(e, items, "hyperactivity"),
            "_items": items,
        })
    entries.sort(key=lambda x: x["completedAt"] or "")
    return entries


def _direction(delta: float) -> str:
    if abs(delta) < SIMILAR_BAND:
        return DIRECTION_SIMILAR
    return DIRECTION_LOWER if delta < 0 else DIRECTION_HIGHER


def _compare_subscale(before: Dict[str, Any], after: Dict[str, Any], name: str) -> Dict[str, Any]:
    b, a = before.get(name), after.get(name)
    if not b or not a:
        return {"direction": DIRECTION_NOT_COMPARABLE, "before": b and b["average"], "after": a and a["average"], "change": None,
                "itemsRatedLower": None, "itemsRatedHigher": None, "itemsUnchanged": None}
    change = round(a["average"] - b["average"], 2)
    bi, ai = before["_items"], after["_items"]
    ids = [i for i in SUBSCALES[name] if i in bi and i in ai]
    item_counts = (
        {
            "itemsRatedLower": sum(1 for i in ids if ai[i] < bi[i]),
            "itemsRatedHigher": sum(1 for i in ids if ai[i] > bi[i]),
            "itemsUnchanged": sum(1 for i in ids if ai[i] == bi[i]),
        }
        if len(ids) == 9
        else {"itemsRatedLower": None, "itemsRatedHigher": None, "itemsUnchanged": None}
    )
    return {"direction": _direction(change), "before": b["average"], "after": a["average"], "change": change, **item_counts}


def _comparison(before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, Any]:
    flags: List[str] = []
    t0, t1 = _as_datetime(before["completedAt"]), _as_datetime(after["completedAt"])
    days = (t1 - t0).days if t0 and t1 else None
    if days is not None and days < SHORT_INTERVAL_DAYS:
        flags.append(FLAG_SHORT_INTERVAL)
    if (before.get("respondentRelation") or "parent") != (after.get("respondentRelation") or "parent"):
        flags.append(FLAG_DIFFERENT_RESPONDENT)
    if before.get("version") and after.get("version") and before["version"] != after["version"]:
        flags.append(FLAG_DIFFERENT_VERSION)
    if not all(x.get(s) for x in (before, after) for s in SUBSCALES):
        flags.append(FLAG_SCORES_UNAVAILABLE)
    return {
        "from": before["completedAt"],
        "to": after["completedAt"],
        "daysBetween": days,
        "inattention": _compare_subscale(before, after, "inattention"),
        "hyperactivity": _compare_subscale(before, after, "hyperactivity"),
        "flags": flags,
    }


def build_snap_iv_progress(quest_doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """History with scores, latest-vs-previous and first-vs-latest comparisons, and the fixed notice."""
    entries = normalize_history(quest_doc)
    public = [{k: v for k, v in e.items() if not k.startswith("_")} for e in entries]
    return {
        "version": SNAP_IV_PROGRESS_VERSION,
        "entries": public,
        "entryCount": len(entries),
        "latestChange": _comparison(entries[-2], entries[-1]) if len(entries) >= 2 else None,
        "overallChange": _comparison(entries[0], entries[-1]) if len(entries) >= 3 else None,
        "similarBand": SIMILAR_BAND,
        "scale": {"min": 0, "max": 3, "meaning": "Average answer: 0 = not at all, 1 = just a little, 2 = quite a bit, 3 = very much"},
        "notice": INTERPRETATION_NOTICE,
    }
