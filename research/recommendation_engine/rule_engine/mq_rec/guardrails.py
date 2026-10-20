"""
MQ-RS6-01 non-diagnostic guardrail (priority 0) and the optional-support safeguard.

Checks are applied to the generated output. Violations raise instead of being silently rewritten,
so a faulty rule is caught by tests rather than shipped.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, Iterable

# Phrases listed in the MQ-RS6-01 specification (checked across the whole output).
SPEC_FORBIDDEN_PHRASES = (
    "diagnosed with adhd",
    "adhd confirmed",
    "clinical presentation changed",
    "deficit disorder cured",
    "neuropsychological deficiency confirmed",
)

# Recommendations must describe educational support only, so clinical vocabulary is not allowed
# anywhere in a recommendation (notices may name the ADHD *input* in order to say it was not used).
RECOMMENDATION_FORBIDDEN_TERMS = (
    "adhd", "diagnos", "disorder", "deficit", "symptom", "inattentive", "hyperactiv", "impulsiv",
    "clinical", "presentation", "severity",
)

# Breaks and time limits may never be imposed.
MANDATORY_TERMS = ("mandatory", "must take a break", "forced break", "time limit", "countdown")


class ClinicalLanguageError(RuntimeError):
    """Raised when engine output would contain diagnostic or clinical claims."""


class MandatorySupportError(RuntimeError):
    """Raised when a recommendation is not optional or imposes breaks/time limits."""


def _text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False).lower()


def check_output(recommendations: Iterable[Dict[str, Any]], full_output: Dict[str, Any]) -> None:
    whole = _text(full_output)
    for phrase in SPEC_FORBIDDEN_PHRASES:
        if phrase in whole:
            raise ClinicalLanguageError(f"Clinical diagnosis language is forbidden: {phrase!r}")

    for rec in recommendations:
        text = _text({k: v for k, v in rec.items() if k != "evidence"})
        for term in RECOMMENDATION_FORBIDDEN_TERMS:
            # Word-start match, so e.g. "representation" does not match "presentation".
            if re.search(rf"(?<![a-z]){term}", text):
                raise ClinicalLanguageError(
                    f"Recommendation {rec.get('recommendationId')} contains clinical term {term!r}"
                )
        if rec.get("optional") is not True:
            raise MandatorySupportError(f"Recommendation {rec.get('recommendationId')} must be optional")
        for term in MANDATORY_TERMS:
            if term in text:
                raise MandatorySupportError(
                    f"Recommendation {rec.get('recommendationId')} imposes support: {term!r}"
                )
