"""
Evidence references per rule, using the source IDs from evidence_base/references.json plus the
local expert consultation log. Page references are copied from the rule specification.
"""

from __future__ import annotations

from typing import Dict, List

EXPERT_LOG = "EXPERT-LOG-2026"  # evidence_base/expert_feedback_log.md (verbal, preliminary review)

EVIDENCE: Dict[str, List[Dict[str, str]]] = {
    "MQ-RS1-01": [
        {"sourceId": "REF-BCH-2020", "section": "Skill 1 & 9 (PDF pp. 3–6, 38–40)"},
        {"sourceId": "REF-NICE-NG87", "section": "Section 1.4 (printed pp. 13–16)"},
    ],
    "MQ-RS2-01": [
        {"sourceId": "REF-IES-2021", "section": "Recommendation 3 (printed pp. 21–28 / PDF pp. 28–35; 28 studies)"},
        {"sourceId": "REF-BCH-2020", "section": "Skill 6 (PDF pp. 26–30)"},
        {"sourceId": EXPERT_LOG, "section": "Rule R2 — accepted (general strategy; trigger ladder pending review)"},
    ],
    "MQ-RS2-02": [
        {"sourceId": "REF-BCH-2020", "section": "Skill 6 'Mini-tasks' (PDF pp. 26–30)"},
        {"sourceId": "REF-NICE-NG87", "section": "Section 1.5 & Terms 'Environmental Modifications' (printed pp. 17–22, 38–39)"},
        {"sourceId": EXPERT_LOG, "section": "Rule R2 — accepted"},
    ],
    "MQ-RS2-04": [
        {"sourceId": "REF-IES-2021", "section": "Recommendation 1, Step 2 (printed p. 6 / PDF p. 13; 43 studies)"},
    ],
    "MQ-RS3-02": [
        {"sourceId": "REF-AAP-2019", "section": "KAS 2 (printed pp. 5–7)"},
        {"sourceId": EXPERT_LOG, "section": "Rule R5 — accepted with clarification"},
    ],
    "MQ-RS3-03": [
        {"sourceId": "REF-REVIEW-PACK", "section": "Rule R7 (printed p. 2)"},
        {"sourceId": EXPERT_LOG, "section": "Rule R7 — accepted in principle (n < 3 is an ELP-X engineering heuristic)"},
    ],
    "MQ-RS6-01": [
        {"sourceId": "REF-AAP-2019", "section": "KAS 2 (printed pp. 5–7)"},
        {"sourceId": "REF-NICE-NG87", "section": "Sections 1.2 & 1.3 (printed pp. 8–13)"},
        {"sourceId": EXPERT_LOG, "section": "Rule R8 — accepted"},
    ],
    "MQ-RS6-03": [
        {"sourceId": "REF-NICE-NG87", "section": "Section 1.4 (printed p. 13)"},
    ],
}


def evidence_for(rule_id: str) -> List[Dict[str, str]]:
    return [dict(e) for e in EVIDENCE.get(rule_id, [])]
