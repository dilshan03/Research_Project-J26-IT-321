"""
MQ-REC v0.1 — isolated, deterministic personalized-support recommendation prototype.

Research prototype only (research/recommendation_engine). Not integrated into any service.
Strictly non-diagnostic: never infers ADHD, never assigns clinical labels, never uses SNAP-IV
cutoffs, response latency or parent-reported presentation to select recommendations.
"""

from .context import LearnerContext, SCHEMA_VERSION, ContextValidationError, load_context
from .evaluator import RULESET_VERSION, evaluate
from .guardrails import ClinicalLanguageError

__all__ = [
    "LearnerContext",
    "SCHEMA_VERSION",
    "ContextValidationError",
    "load_context",
    "RULESET_VERSION",
    "evaluate",
    "ClinicalLanguageError",
]
