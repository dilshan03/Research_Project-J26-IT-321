"""Readable text report and JSON serialisation of engine output."""

from __future__ import annotations

import json
from typing import Any, Dict

SOURCE_TITLES = {
    "REF-BCH-2020": "Boston Children's Hospital, Guided Self-Management Tools for ADHD (Lee & Sinclair-McBride, n.d.)",
    "REF-NICE-NG87": "NICE NG87 (2018)",
    "REF-AAP-2019": "AAP Clinical Practice Guideline (Wolraich et al., 2019)",
    "REF-IES-2021": "IES/WWC Practice Guide: Assisting Students Struggling with Mathematics (Fuchs et al., 2021)",
    "REF-REVIEW-PACK": "MathQuest Expert Review Pack (2026)",
    "EXPERT-LOG-2026": "Expert consultation log, Ms. P. Sivalingam (verbal, preliminary)",
}


def to_json(output: Dict[str, Any]) -> str:
    return json.dumps(output, ensure_ascii=False, indent=2, sort_keys=False)


def to_text(raw_input: Dict[str, Any], output: Dict[str, Any]) -> str:
    lines = []
    bar = "=" * 78
    lines += [bar, f"MQ-REC {output['engine']['rulesetVersion']}  |  learner {output['learnerRef']}  |  grade {output['grade']}",
              "Research prototype — formative educational suggestions only (non-diagnostic)", bar, ""]

    lines.append("ANONYMISED HYPOTHETICAL INPUT")
    lines.append(json.dumps({k: v for k, v in raw_input.items() if k != "notes"}, ensure_ascii=False, indent=2))
    lines.append("")

    recs = output["recommendations"]
    lines.append(f"PERSONALISED RECOMMENDATIONS ({len(recs)})")
    if not recs:
        lines.append("  (none — see notices below; nothing was assumed for missing information)")
    for i, r in enumerate(recs, 1):
        skill = f" [skill: {r['skillId']}]" if r["skillId"] else ""
        lines.append(f"\n {i}. {r['strategyCode']}{skill}  — {r['titleEn']}  (optional, priority {r['priority']})")
        lines.append(f"    Action : {r['action']}")
        lines.append(f"    Why    : {r['why']}")
        lines.append(f"    Rule   : {r['ruleId']}  | reason codes: {', '.join(r['reasonCodes'])}")
        lines.append(f"    Inputs : {json.dumps(r['inputEvidenceSummary'], ensure_ascii=False)}")
        lines.append(f"    Parent : {r['explanationEn']}")
        lines.append(f"    සිංහල  : {r['explanationSi']}")
        if r.get("interactsWithElpx"):
            lines.append(f"    ELP-X  : {r['interactsWithElpx']['code']} — {r['interactsWithElpx']['relation']}")
        for c in r.get("conflicts", []):
            lines.append(f"    Conflict: {c['between']} → {c['resolution']}")
        lines.append("    Evidence:")
        for e in r["evidence"]:
            lines.append(f"      - {SOURCE_TITLES.get(e['sourceId'], e['sourceId'])}: {e['section']}")
        for x in r.get("expertReviewPending", []):
            lines.append(f"    Pending expert review: {x}")

    lines.append("\nMISSING EVIDENCE & UNCERTAINTY NOTICES")
    for n in output["uncertaintyNotices"]:
        lines.append(f"  - [{n['code']}] {n['message']}")

    lines.append("\nRULE TRACE")
    for t in output["ruleTraces"]:
        extra = ""
        if t["status"] == "DISABLED":
            extra = f" — {t['disabledReason']}"
        elif t.get("contributingFeatures"):
            extra = f" — contributing: {', '.join(t['contributingFeatures'])}"
        lines.append(f"  {t['ruleId']:<10} {t['status']:<22}{extra}")
    lines.append("")
    return "\n".join(lines)
