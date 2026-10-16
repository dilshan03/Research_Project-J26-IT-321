"""
Continuous Learner Profile Updating & Evidence Service
Component: services/learner-profile-service/app/services/evidence_service.py

Implements:
- Continuous ingestion of gameplay activity evidence (Requirement 5)
- Deduplication of repeated event IDs (idempotent)
- Distinct-item evidence accumulation without unlimited repeat bias
- Versioned structured ELP-X profile generation (Requirement 6)
- Sanitized cross-component integration response (Requirement 8)
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db.mongodb import (
    get_learners_collection,
    get_assessments_collection,
    get_gameplay_events_collection,
    get_questionnaires_collection,
)
from app.services.learner_service import get_learner_by_id
from app.core.elpx_engine import (
    compute_elpx_profile_from_evaluated_items,
    compute_skill_estimate,
    generate_structured_recommendations,
    ALGORITHM_VERSION,
    PROFILE_SCHEMA_VERSION,
    RESEARCH_DISCLAIMER,
)
from app.schemas.evidence import (
    GameplayActivityEvidence,
    EvidenceIngestionResponse,
)

logger = logging.getLogger("learner_profile.evidence_service")

# Recognized authorized source components
AUTHORIZED_SOURCES = {
    "gameplay-engine",
    "content-adaptation",
    "pedagogical-engine",
    "learner-onboarding",
    "mathquest-client",
}


async def ingest_gameplay_activity_evidence(
    learner_id: str,
    events: List[GameplayActivityEvidence],
    caller_role: Optional[str] = None,
    caller_parent_id: Optional[str] = None,
) -> EvidenceIngestionResponse:
    """
    Ingests continuous gameplay activity evidence for a learner.

    Guarantees:
    - Deduplicates repeated eventIds (idempotent).
    - Validates source authorization and skill IDs.
    - Persists gameplay events distinctly from baseline assessment.
    - Returns ingestion counts and latest profile summary.
    """
    # Verify learner exists and authorization if parent caller
    learner = await get_learner_by_id(
        learner_id=learner_id,
        parent_id=caller_parent_id if caller_role == "parent" else None,
        user_role=caller_role,
    )

    events_col = get_gameplay_events_collection()
    processed_count = 0
    duplicate_count = 0
    ignored_count = 0

    now = datetime.now(timezone.utc)

    for ev in events:
        # Verify event belongs to target learner
        if ev.learnerId != learner_id:
            logger.warning(
                "Event %s target learner %s does not match route learner %s. Ignored.",
                ev.eventId, ev.learnerId, learner_id
            )
            ignored_count += 1
            continue

        # Validate source component authorization
        if ev.sourceComponent not in AUTHORIZED_SOURCES:
            logger.warning(
                "Event %s sourceComponent '%s' not in authorized list. Ignored.",
                ev.eventId, ev.sourceComponent
            )
            ignored_count += 1
            continue

        item_id = ev.canonical_item_id
        doc = {
            "eventId": ev.eventId,
            "learnerId": ev.learnerId,
            "questionId": item_id,
            "skillId": ev.skillId,
            "correctFirstResponse": bool(ev.correctFirstResponse),
            "attempts": int(ev.attempts),
            "hintsUsed": int(ev.hintsUsed),
            "responseTime": float(ev.responseTime),
            "activityTimestamp": ev.activityTimestamp or now,
            "sourceComponent": ev.sourceComponent,
            "ingestedAt": now,
        }

        try:
            await events_col.insert_one(doc)
            processed_count += 1
        except DuplicateKeyError:
            # Event already processed; idempotent handling
            duplicate_count += 1
            logger.info("Event %s already ingested for learner %s. Skipped duplicate.", ev.eventId, learner_id)
        except Exception as exc:
            logger.error("Failed to insert gameplay event %s: %s", ev.eventId, exc)
            ignored_count += 1

    # Fetch updated ELP-X profile summary
    latest_profile = await get_learner_elpx_profile(
        learner_id=learner_id,
        caller_parent_id=caller_parent_id,
        caller_role=caller_role,
        sanitized=False,
    )

    return EvidenceIngestionResponse(
        success=True,
        message=(
            f"Evidence processed: {processed_count} new event(s), "
            f"{duplicate_count} duplicate(s) deduplicated, {ignored_count} ignored."
        ),
        processedCount=processed_count,
        duplicateCount=duplicate_count,
        ignoredCount=ignored_count,
        latestProfileSummary={
            "evidenceStatus": latest_profile.get("evidenceStatus"),
            "totalDistinctQuestionsEvaluated": latest_profile.get("totalDistinctQuestionsEvaluated"),
            "skillEstimates": latest_profile.get("skillEstimates"),
        },
    )


async def get_learner_elpx_profile(
    learner_id: str,
    caller_parent_id: Optional[str] = None,
    caller_role: Optional[str] = None,
    sanitized: bool = False,
) -> Dict[str, Any]:
    """
    Computes and returns the complete, versioned ELP-X learner profile.
    Aggregates immutable baseline assessment items + continuous gameplay practice events.

    Deduplication semantics:
    - Multiple attempts on the same question or activity ID count only once as an independent Bernoulli trial.
    - Prevents unlimited practice repetitions from falsely certifying mastery.
    - Preserves raw empirical accuracy alongside Beta-Binomial estimated proficiency.
    """
    # 1. Authorization & Learner details
    learner = await get_learner_by_id(
        learner_id=learner_id,
        parent_id=caller_parent_id if caller_role == "parent" else None,
        user_role=caller_role,
    )
    grade = learner.get("grade", 1)

    assessments_col = get_assessments_collection()
    events_col = get_gameplay_events_collection()
    questionnaires_col = get_questionnaires_collection()

    # 2. Gather baseline assessment items
    baseline_doc = await assessments_col.find_one(
        {"learnerId": learner_id},
        sort=[("completedAt", -1)]
    )
    evaluated_items: List[Dict[str, Any]] = []

    if baseline_doc and "evaluatedItems" in baseline_doc:
        for it in baseline_doc["evaluatedItems"]:
            evaluated_items.append({
                "questionId": it.get("questionId"),
                "skillId": it.get("skillId", "general"),
                "skillName": it.get("skillName", "General"),
                "skillNameSi": it.get("skillNameSi", "සාමාන්‍ය"),
                "isCorrect": it.get("isCorrect", False),
                "correctFirstResponse": it.get("isCorrect", False),
                "attempts": it.get("attempts", 1),
                "hintsUsed": 1 if it.get("hintUsed") else 0,
                "responseTime": it.get("responseTimeSeconds", 0.0),
                "source": "BASELINE",
            })

    # 3. Gather continuous gameplay activity events
    gameplay_cursor = events_col.find({"learnerId": learner_id}).sort("activityTimestamp", 1)
    gameplay_events = await gameplay_cursor.to_list(length=1000)

    for ev in gameplay_events:
        evaluated_items.append({
            "questionId": ev.get("questionId"),
            "skillId": ev.get("skillId", "general"),
            "skillName": ev.get("skillId", "general").replace("_", " ").title(),
            "skillNameSi": ev.get("skillId", "general"),
            "isCorrect": ev.get("correctFirstResponse", False),
            "correctFirstResponse": ev.get("correctFirstResponse", False),
            "attempts": ev.get("attempts", 1),
            "hintsUsed": ev.get("hintsUsed", 0),
            "responseTime": ev.get("responseTime", 0.0),
            "source": "GAMEPLAY_PRACTICE",
        })

    # 4. Questionnaire preferences & social context
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})
    learning_pref = quest_doc.get("learningPreferences") if quest_doc else None
    social_ctx = quest_doc.get("socialContext") if quest_doc else None

    # 5. Compute versioned ELP-X profile
    profile = compute_elpx_profile_from_evaluated_items(
        evaluated_items=evaluated_items,
        grade=grade,
        learner_id=learner_id,
        learning_preferences=learning_pref,
        social_context=social_ctx,
    )

    if sanitized:
        # Cross-component sanitized format (Content Adaptation & Pedagogical Engine)
        # Strips any parent questionnaire notes or psychological scales
        learning_adaptations = {}
        if learning_pref:
            learning_adaptations = {
                "visualAssistance": learning_pref.get("visualAssistance", "regular"),
                "audioAssistance": learning_pref.get("audioAssistance", "regular"),
                "activityPace": learning_pref.get("activityPace", "regular"),
                "hintStyle": learning_pref.get("hintStyle", "step_guide"),
                "celebrationStyle": learning_pref.get("celebrationStyle", "gentle_star"),
            }

        return {
            "learnerId": learner_id,
            "grade": grade,
            "preferredLanguage": learner.get("preferredLanguage", "Sinhala"),
            "profileVersion": PROFILE_SCHEMA_VERSION,
            "algorithmVersion": ALGORITHM_VERSION,
            "evidenceStatus": profile["evidenceStatus"],
            "isOverallEvidenceSufficient": profile["isOverallEvidenceSufficient"],
            "totalDistinctQuestionsEvaluated": profile["totalDistinctQuestionsEvaluated"],
            "skills": profile["skillEstimates"],
            "pedagogicalRecommendations": profile["structuredRecommendations"],
            "learningAdaptations": learning_adaptations,
            "lastUpdated": profile["lastUpdated"],
            "disclaimer": RESEARCH_DISCLAIMER,
        }

    return profile
