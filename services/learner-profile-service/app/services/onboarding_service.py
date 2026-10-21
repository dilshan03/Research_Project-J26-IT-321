import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from app.db.mongodb import (
    get_learners_collection,
    get_onboarding_collection,
    get_questionnaires_collection,
    get_assessments_collection,
)
from app.db.onboarding_item_bank import (
    ONBOARDING_ITEM_BANK_VERSION,
    get_onboarding_v2_item,
    get_onboarding_v2_items_for_grade,
)
from app.db.question_bank import (
    get_questions_for_grade,
    get_question_by_id,
    QUESTION_BANK_VERSION,
)
from app.services.learner_service import CHILD_SELECTABLE_AVATAR_IDS, get_learner_by_id
from app.core.thresholds import (
    determine_proficiency_category,
    generate_pedagogical_recommendations,
    safe_recalculate_skill_scores,
    MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL,
    MINIMUM_EVIDENCE_QUESTIONS_OVERALL,
    THRESHOLD_CONFIG_VERSION,
    PROVISIONAL_THRESHOLDS_METADATA,
    PROFICIENCY_LEVEL_PROFICIENT,
    PROFICIENCY_LEVEL_DEVELOPING,
    PROFICIENCY_LEVEL_EMERGING,
    PROFICIENCY_LEVEL_INSUFFICIENT,
)
from app.schemas.onboarding import (
    AdhdDiagnosisStatus,
    AdhdInformationRequest,
    LearningPreferencesRequest,
    SnapIvSubmissionRequest,
    SnapIvScoreSummary,
    SocialContextRequest,
    MathAssessmentSubmissionRequest,
    MathAssessmentSummary,
    SkillScore,
    OnboardingProgressResponse,
)
from app.core.elpx_engine import compute_elpx_profile_from_evaluated_items
from app.services.assessment_evidence import (
    EVIDENCE_RULESET_VERSION,
    evaluate_submission,
    normalize_answer,
    select_proficiency_items,
)

logger = logging.getLogger("learner_profile.onboarding_service")

# Parent onboarding sequence. ADHD information and SNAP-IV are parent reports kept separate from
# learning preferences and social context. SNAP-IV is optional: completed or skipped both continue.
ONBOARDING_SEQUENCE = [
    "adhd_information", "snap_iv", "preferences", "social_context", "handover", "math_assessment", "summary",
]

SNAP_IV_COMPLETED = "COMPLETED"
SNAP_IV_SKIPPED = "SKIPPED"
SNAP_IV_NOT_STARTED = "NOT_STARTED"

ADHD_INFORMATION_DISCLAIMER = (
    "Parent-reported information about a professional diagnosis. Not verified by MathQuest, "
    "not a diagnosis, and never inferred or changed from questionnaires or gameplay."
)


def snap_iv_status(quest_doc: Optional[Dict[str, Any]], progress_doc: Optional[Dict[str, Any]]) -> str:
    """A stored questionnaire always counts as completed, even if a later visit was skipped."""
    if quest_doc and quest_doc.get("snapIv"):
        return SNAP_IV_COMPLETED
    if progress_doc and progress_doc.get("snapIvSkippedAt"):
        return SNAP_IV_SKIPPED
    return SNAP_IV_NOT_STARTED


def adhd_type_reported(adhd_information: Optional[Dict[str, Any]]) -> bool:
    """True when the parent reported a professional diagnosis with a specific ADHD presentation."""
    if not adhd_information or adhd_information.get("diagnosisStatus") != "yes":
        return False
    return adhd_information.get("reportedPresentation") not in (None, "not_specified")


def resolve_next_step(
    quest_doc: Optional[Dict[str, Any]],
    progress_doc: Optional[Dict[str, Any]],
    math_completed: bool = False,
) -> str:
    """Returns the first unfinished onboarding step, so resumed learners never repeat finished steps."""
    quest_doc = quest_doc or {}
    if not quest_doc.get("adhdInformation"):
        return "adhd_information"
    # SNAP-IV is not asked during onboarding when the parent already reported the ADHD type;
    # it stays NOT_STARTED (not skipped) and remains available from the parent dashboard.
    if (
        snap_iv_status(quest_doc, progress_doc) == SNAP_IV_NOT_STARTED
        and not adhd_type_reported(quest_doc.get("adhdInformation"))
    ):
        return "snap_iv"
    if not quest_doc.get("learningPreferences"):
        return "preferences"
    if not quest_doc.get("socialContext"):
        return "social_context"
    return "summary" if math_completed else "handover"


async def _advance_progress(
    learner_id: str,
    parent_id: str,
    completed_step: Optional[str],
    now: datetime,
    extra_fields: Optional[Dict[str, Any]] = None,
) -> str:
    """Records a finished step (plus any extra progress fields) and stores the resolved next step."""
    onboarding_col = get_onboarding_collection()
    progress_doc = await onboarding_col.find_one({"learnerId": learner_id}) or {}
    quest_doc = await get_questionnaires_collection().find_one({"learnerId": learner_id})
    math_completed = bool(await get_assessments_collection().find_one({"learnerId": learner_id}))

    next_step = resolve_next_step(quest_doc, {**progress_doc, **(extra_fields or {})}, math_completed)

    update: Dict[str, Any] = {
        "$set": {"currentStep": next_step, "updatedAt": now, **(extra_fields or {})},
        "$setOnInsert": {"createdAt": now, "parentId": parent_id, "status": "IN_PROGRESS"},
    }
    if completed_step:
        update["$addToSet"] = {"completedSteps": completed_step}
    await onboarding_col.update_one({"learnerId": learner_id}, update, upsert=True)
    return next_step


async def _mark_learner_onboarding_in_progress(learner_id: str, now: datetime) -> None:
    """Marks onboarding as started without downgrading a learner who already completed it."""
    await get_learners_collection().update_one(
        {"learnerId": learner_id, "onboardingStatus": {"$ne": "COMPLETED"}},
        {"$set": {"onboardingStatus": "IN_PROGRESS", "updatedAt": now}},
    )


async def get_or_create_onboarding_progress(
    learner_id: str,
    parent_id: str
) -> Dict[str, Any]:
    """
    Retrieves or initializes the resumable onboarding state for a learner.
    Strictly verifies that the learner belongs to the requesting parent.
    """
    # 1. Verify parent ownership and active (non-archived) status
    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)

    onboarding_col = get_onboarding_collection()
    questionnaires_col = get_questionnaires_collection()
    assessments_col = get_assessments_collection()

    now = datetime.now(timezone.utc)

    # 2. Check saved questionnaires
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})
    preferences_completed = bool(quest_doc and quest_doc.get("learningPreferences"))
    snap_iv_completed = bool(quest_doc and quest_doc.get("snapIv"))
    social_context_completed = bool(quest_doc and quest_doc.get("socialContext"))
    adhd_information = quest_doc.get("adhdInformation") if quest_doc else None

    # 3. Find or create progress document (new learners start at the first unfinished step)
    progress_doc = await onboarding_col.find_one({"learnerId": learner_id})
    if not progress_doc:
        progress_doc = {
            "learnerId": learner_id,
            "parentId": parent_id,
            "status": "IN_PROGRESS",
            "currentStep": resolve_next_step(quest_doc, None),
            "completedSteps": [],
            "createdAt": now,
            "updatedAt": now,
        }
        await onboarding_col.insert_one(progress_doc)
        logger.info("Initialized onboarding tracking for learner %s", learner_id)

    # 4. Check saved assessment
    assessment_doc = await assessments_col.find_one(
        {"learnerId": learner_id},
        sort=[("completedAt", -1)]
    )
    math_completed = bool(assessment_doc)

    # Extract score summaries if available
    snap_iv_summary = None
    if snap_iv_completed and quest_doc and "snapIv" in quest_doc:
        s = quest_doc["snapIv"]
        snap_iv_summary = {
            "inattentionTotal": s.get("inattentionTotal", 0),
            "inattentionAverage": s.get("inattentionAverage", 0.0),
            "hyperactivityTotal": s.get("hyperactivityTotal", 0),
            "hyperactivityAverage": s.get("hyperactivityAverage", 0.0),
            "totalScore": s.get("totalScore", 0),
            "overallAverage": s.get("overallAverage", 0.0),
            "disclaimer": s.get(
                "disclaimer",
                "Research Profile Summary: Non-diagnostic parental observation scale."
            ),
        }

    math_summary = None
    if math_completed and assessment_doc:
        elpx_prof = assessment_doc.get("elpxProfile")
        if not elpx_prof and assessment_doc.get("evaluatedItems"):
            elpx_prof = compute_elpx_profile_from_evaluated_items(
                evaluated_items=select_proficiency_items(assessment_doc.get("evaluatedItems", [])),
                grade=assessment_doc.get("grade", learner["grade"]),
                learner_id=learner_id,
                learning_preferences=quest_doc.get("learningPreferences") if quest_doc else None,
                social_context=quest_doc.get("socialContext") if quest_doc else None,
            )

        math_summary = {
            "grade": assessment_doc.get("grade", learner["grade"]),
            "assessmentProtocolVersion": assessment_doc.get("assessmentProtocolVersion", "onboarding-v1"),
            "totalQuestions": assessment_doc.get("totalQuestions", 0),
            "correctAnswers": assessment_doc.get("correctAnswers", 0),
            "accuracyPercentage": assessment_doc.get("accuracyPercentage", 0.0),
            "evidenceLevel": assessment_doc.get("evidenceLevel", "SUFFICIENT"),
            "skills": assessment_doc.get("skills", []),
            "strengths": assessment_doc.get("strengths", []),
            "areasForGrowth": assessment_doc.get("areasForGrowth", []),
            "recommendations": assessment_doc.get("recommendations", []),
            "thresholdVersion": assessment_doc.get("thresholdVersion", THRESHOLD_CONFIG_VERSION),
            "disclaimer": assessment_doc.get("disclaimer", PROVISIONAL_THRESHOLDS_METADATA["disclaimer"]),
            "mlPredictionNotice": assessment_doc.get(
                "mlPredictionNotice",
                "Baseline derived via transparent pedagogical rules."
            ),
            "elpxProfile": elpx_prof,
            "childPreferences": assessment_doc.get("childPreferences"),
            "impsa": assessment_doc.get("impsaSummary"),
            "imlr": assessment_doc.get("imlrSummary"),
            "evaluatedItems": assessment_doc.get("evaluatedItems", []),
            "excludedItems": assessment_doc.get("excludedItems", []),
            "sessionStartedAt": assessment_doc.get("sessionStartedAt"),
            "sessionEndedAt": assessment_doc.get("sessionEndedAt"),
            "evidenceRulesetVersion": assessment_doc.get("evidenceRulesetVersion"),
            "evidenceSummary": assessment_doc.get("evidenceSummary"),
        }

    # Determine overall status (SNAP-IV and ADHD information are optional for completion)
    status_str = "COMPLETED" if (preferences_completed and math_completed) else "IN_PROGRESS"
    if status_str != progress_doc.get("status"):
        await onboarding_col.update_one(
            {"learnerId": learner_id},
            {"$set": {"status": status_str, "updatedAt": now}}
        )

    updated_at = progress_doc.get("updatedAt", now)

    return {
        "learnerId": learner_id,
        "parentId": parent_id,
        "status": status_str,
        "currentStep": progress_doc.get("currentStep", "preferences"),
        "completedSteps": progress_doc.get("completedSteps", []),
        "preferencesCompleted": preferences_completed,
        "snapIvCompleted": snap_iv_completed,
        "socialContextCompleted": social_context_completed,
        "mathAssessmentCompleted": math_completed,
        "learningPreferences": quest_doc.get("learningPreferences") if quest_doc else None,
        "snapIvResponses": quest_doc.get("snapIv", {}).get("responses") if quest_doc and quest_doc.get("snapIv") else None,
        "socialContext": quest_doc.get("socialContext") if quest_doc else None,
        "snapIvSummary": snap_iv_summary,
        "mathSummary": math_summary,
        "assessmentProtocolVersion": assessment_doc.get("assessmentProtocolVersion") if assessment_doc else None,
        "childPreferences": assessment_doc.get("childPreferences") if assessment_doc else None,
        "impsaSummary": assessment_doc.get("impsaSummary") if assessment_doc else None,
        "imlrSummary": assessment_doc.get("imlrSummary") if assessment_doc else None,
        "adhdInformationCompleted": bool(adhd_information),
        "adhdInformation": adhd_information,
        "snapIvStatus": snap_iv_status(quest_doc, progress_doc),
        "updatedAt": updated_at.isoformat() if isinstance(updated_at, datetime) else str(updated_at),
    }


async def save_learning_preferences(
    learner_id: str,
    parent_id: str,
    data: LearningPreferencesRequest
) -> Dict[str, Any]:
    """Saves child-friendly learning preferences with question and version metadata."""
    await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)

    now = datetime.now(timezone.utc)
    questionnaires_col = get_questionnaires_collection()

    payload = {
        **data.model_dump(),
        "savedAt": now,
    }

    # Upsert questionnaire
    await questionnaires_col.update_one(
        {"learnerId": learner_id},
        {
            "$set": {
                "learnerId": learner_id,
                "parentId": parent_id,
                "learningPreferences": payload,
                "updatedAt": now,
            },
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True
    )

    # Update progress and child status
    next_step = await _advance_progress(learner_id, parent_id, "preferences", now)
    await _mark_learner_onboarding_in_progress(learner_id, now)

    logger.info("Saved learning preferences for learner %s", learner_id)
    return {"success": True, "message": "Learning preferences saved successfully.", "nextStep": next_step}


async def save_adhd_information(
    learner_id: str,
    parent_id: str,
    data: AdhdInformationRequest
) -> Dict[str, Any]:
    """
    Saves the parent's answer about a professional ADHD diagnosis.
    Stored as parent-reported, unverified information, separate from SNAP-IV screening,
    gameplay observations and mathematics evidence. The whole record is replaced on every
    save, so a presentation can never remain stored after the diagnosis status changes.
    """
    await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)

    now = datetime.now(timezone.utc)
    is_professional_diagnosis = data.diagnosisStatus == AdhdDiagnosisStatus.YES

    adhd_record = {
        "version": data.version,
        "diagnosisStatus": data.diagnosisStatus.value,
        "reportedPresentation": data.reportedPresentation.value if is_professional_diagnosis else None,
        "diagnosisReportedMonth": data.diagnosisReportedMonth if is_professional_diagnosis else None,
        "informationType": (
            "PARENT_REPORTED_PROFESSIONAL_DIAGNOSIS" if is_professional_diagnosis
            else "PARENT_REPORTED_DIAGNOSIS_STATUS"
        ),
        "source": "parent",
        "verificationStatus": "NOT_VERIFIED",
        "disclaimer": ADHD_INFORMATION_DISCLAIMER,
        "savedAt": now,
    }

    await get_questionnaires_collection().update_one(
        {"learnerId": learner_id},
        {
            "$set": {
                "learnerId": learner_id,
                "parentId": parent_id,
                "adhdInformation": adhd_record,
                "updatedAt": now,
            },
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True
    )

    next_step = await _advance_progress(learner_id, parent_id, "adhd_information", now)
    await _mark_learner_onboarding_in_progress(learner_id, now)

    logger.info("Saved parent-reported ADHD information for learner %s", learner_id)
    return {
        "success": True,
        "message": "ADHD information saved successfully.",
        "adhdInformation": adhd_record,
        "nextStep": next_step,
    }


async def skip_snap_iv_questionnaire(
    learner_id: str,
    parent_id: str
) -> Dict[str, Any]:
    """
    Records that the parent chose to skip the optional SNAP-IV questionnaire for now.
    Never deletes or alters previously saved questionnaire responses.
    """
    await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)

    now = datetime.now(timezone.utc)
    next_step = await _advance_progress(learner_id, parent_id, None, now, {"snapIvSkippedAt": now})
    await _mark_learner_onboarding_in_progress(learner_id, now)

    quest_doc = await get_questionnaires_collection().find_one({"learnerId": learner_id})
    status_value = snap_iv_status(quest_doc, {"snapIvSkippedAt": now})

    logger.info("SNAP-IV skipped for learner %s (status: %s)", learner_id, status_value)
    return {
        "success": True,
        "message": (
            "Previously saved SNAP-IV responses were kept." if status_value == SNAP_IV_COMPLETED
            else "SNAP-IV questionnaire skipped. It can be completed later."
        ),
        "snapIvStatus": status_value,
        "nextStep": next_step,
    }


async def save_snap_iv_questionnaire(
    learner_id: str,
    parent_id: str,
    data: SnapIvSubmissionRequest
) -> Dict[str, Any]:
    """
    Saves parent-reported 18-item SNAP-IV questionnaire.
    Accurately computes Inattention (items 1-9) and Hyperactivity/Impulsivity (items 10-18)
    subscale totals and averages. Strictly attaches non-diagnostic research disclaimer.
    """
    await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)

    now = datetime.now(timezone.utc)
    questionnaires_col = get_questionnaires_collection()

    # SNAP-IV is optional and has no prerequisite steps.

    # Calculate subscale scores
    # Items 1-9: Inattention subscale
    inattention_scores = [r.score for r in data.responses if 1 <= r.itemId <= 9]
    # Items 10-18: Hyperactivity / Impulsivity subscale
    hyperactivity_scores = [r.score for r in data.responses if 10 <= r.itemId <= 18]

    inattention_total = sum(inattention_scores)
    inattention_avg = round(inattention_total / 9.0, 2)

    hyperactivity_total = sum(hyperactivity_scores)
    hyperactivity_avg = round(hyperactivity_total / 9.0, 2)

    total_score = inattention_total + hyperactivity_total
    overall_avg = round(total_score / 18.0, 2)

    score_summary = {
        "inattentionTotal": inattention_total,
        "inattentionAverage": inattention_avg,
        "hyperactivityTotal": hyperactivity_total,
        "hyperactivityAverage": hyperactivity_avg,
        "totalScore": total_score,
        "overallAverage": overall_avg,
        "disclaimer": (
            "Research Profile Summary: This score summarizes parental observations for personalized learning support. "
            "It does NOT constitute an ADHD diagnosis, medical classification, or clinical assessment."
        ),
    }

    payload = {
        "version": data.version,
        "respondentRelation": data.respondentRelation,
        "responses": [r.model_dump() for r in data.responses],
        **score_summary,
        "savedAt": now,
    }

    # `snapIv` keeps the latest submission (unchanged contract); `snapIvHistory` keeps every
    # submission so repeated questionnaires are never overwritten. A record saved before history
    # existed is copied into the history first, so nothing is lost.
    existing = await questionnaires_col.find_one({"learnerId": learner_id}) or {}
    history_entries = []
    if existing.get("snapIv") and not existing.get("snapIvHistory"):
        history_entries.append(existing["snapIv"])
    history_entries.append(payload)

    await questionnaires_col.update_one(
        {"learnerId": learner_id},
        {
            "$set": {
                "learnerId": learner_id,
                "parentId": parent_id,
                "snapIv": payload,
                "updatedAt": now,
            },
            "$push": {"snapIvHistory": {"$each": history_entries}},
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True
    )

    # Advance step
    next_step = await _advance_progress(learner_id, parent_id, "snap_iv", now)
    await _mark_learner_onboarding_in_progress(learner_id, now)

    logger.info("Saved SNAP-IV questionnaire for learner %s. Inatt: %s, Hyper: %s",
                learner_id, inattention_total, hyperactivity_total)

    return {
        "success": True,
        "message": "SNAP-IV responses recorded successfully.",
        "summary": score_summary,
        "nextStep": next_step,
    }


async def save_social_context(
    learner_id: str,
    parent_id: str,
    data: SocialContextRequest
) -> Dict[str, Any]:
    """Saves optional parent-reported social learning context without assigning negative labels."""
    await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)

    now = datetime.now(timezone.utc)
    questionnaires_col = get_questionnaires_collection()

    # Validate that the mandatory preceding stage is completed (SNAP-IV is optional)
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})
    if not (quest_doc and quest_doc.get("learningPreferences")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot save social context: Mandatory stage 'Learning Preferences' must be completed first.",
        )

    payload = {
        **data.model_dump(),
        "disclaimer": "Optional parent observation of learning environment and collaboration preference. Not a psychometric assessment.",
        "savedAt": now,
    }

    await questionnaires_col.update_one(
        {"learnerId": learner_id},
        {
            "$set": {
                "learnerId": learner_id,
                "parentId": parent_id,
                "socialContext": payload,
                "updatedAt": now,
            },
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True
    )

    next_step = await _advance_progress(learner_id, parent_id, "social_context", now)

    logger.info("Saved social learning context for learner %s", learner_id)
    return {"success": True, "message": "Social context recorded successfully.", "nextStep": next_step}


async def get_math_questions_for_learner(
    learner_id: str,
    parent_id: str
) -> List[Dict[str, Any]]:
    """Retrieves grade-specific mathematics question bank items without revealing answers."""
    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)
    grade = learner.get("grade", 1)

    questions = get_questions_for_grade(grade=grade, include_answers=False)
    return questions


async def submit_math_assessment(
    learner_id: str,
    parent_id: str,
    data: MathAssessmentSubmissionRequest
) -> Dict[str, Any]:
    """
    Evaluates child's mathematics assessment answers against the question bank.
    Calculates overall accuracy, skill-level performance, and provisional proficiency categories.
    Generates transparent rule-based recommendations.
    Marks onboarding as COMPLETED.
    """
    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)
    grade = learner.get("grade", data.grade)

    now = datetime.now(timezone.utc)
    assessments_col = get_assessments_collection()
    onboarding_col = get_onboarding_collection()
    learners_col = get_learners_collection()
    questionnaires_col = get_questionnaires_collection()

    # 1. Enforce the mandatory stage: Learning Preferences must be stored.
    #    SNAP-IV and ADHD information are optional and never block the mathematics activities.
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})
    if not (quest_doc and quest_doc.get("learningPreferences")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit mathematics assessment: Mandatory stage 'Learning Preferences' must be completed first.",
        )

    # 2. Check for duplicate or conflicting assessment submissions
    existing_assessment = await assessments_col.find_one(
        {"learnerId": learner_id},
        sort=[("completedAt", -1)]
    )
    if existing_assessment:
        # Excluded (unanswered/invalid) items are part of what was originally submitted.
        existing_items = existing_assessment.get("evaluatedItems", []) + existing_assessment.get("excludedItems", [])
        existing_map = {item["questionId"]: item.get("userAnswer") for item in existing_items}
        incoming_map = {ans.questionId: ans.userAnswer for ans in data.answers}

        is_identical = (
            len(existing_map) == len(incoming_map) and
            all(
                qid in existing_map and normalize_answer(existing_map[qid]) == normalize_answer(ans_val)
                for qid, ans_val in incoming_map.items()
            )
        )

        if is_identical:
            logger.info(
                "Duplicate identical math assessment submission detected for learner %s. Returning existing assessment result.",
                learner_id
            )
            return {
                "success": True,
                "message": "Mathematics assessment was already submitted. Returning existing baseline result.",
                "summary": {
                    "grade": existing_assessment.get("grade", grade),
                    "assessmentProtocolVersion": existing_assessment.get("assessmentProtocolVersion", "onboarding-v1"),
                    "totalQuestions": existing_assessment.get("totalQuestions", 0),
                    "correctAnswers": existing_assessment.get("correctAnswers", 0),
                    "accuracyPercentage": existing_assessment.get("accuracyPercentage", 0.0),
                    "evidenceLevel": existing_assessment.get("evidenceLevel", "SUFFICIENT"),
                    "skills": existing_assessment.get("skills", []),
                    "strengths": existing_assessment.get("strengths", []),
                    "areasForGrowth": existing_assessment.get("areasForGrowth", []),
                    "recommendations": existing_assessment.get("recommendations", []),
                    "thresholdVersion": existing_assessment.get("thresholdVersion", THRESHOLD_CONFIG_VERSION),
                    "disclaimer": existing_assessment.get("disclaimer", PROVISIONAL_THRESHOLDS_METADATA["disclaimer"]),
                    "mlPredictionNotice": existing_assessment.get(
                        "mlPredictionNotice",
                        "Baseline derived via transparent pedagogical rules."
                    ),
                    "elpxProfile": existing_assessment.get("elpxProfile"),
                    "childPreferences": existing_assessment.get("childPreferences"),
                    "impsa": existing_assessment.get("impsaSummary"),
                    "imlr": existing_assessment.get("imlrSummary"),
                    "evidenceRulesetVersion": existing_assessment.get("evidenceRulesetVersion"),
                    "evidenceSummary": existing_assessment.get("evidenceSummary"),
                },
            }
        else:
            logger.warning(
                "Conflicting math assessment submission rejected for learner %s.",
                learner_id
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A mathematics baseline assessment has already been completed for this learner. Conflicting submissions cannot overwrite historical baseline results.",
            )

    protocol_version = getattr(data, "assessmentProtocolVersion", None) or "onboarding-v1"

    # Server-side evidence classification (ASSESS-EVIDENCE-v1.0): only answered mathematical items
    # approved for the learner's grade are scored; all other submitted items are kept as excluded evidence.
    # Approved items: MATH-QB-v1.0 bank plus the onboarding-v2 activity bank for this grade.
    approved_question_ids = {q["questionId"] for q in get_questions_for_grade(grade=grade, include_answers=True)}
    approved_question_ids |= {q["questionId"] for q in get_onboarding_v2_items_for_grade(grade)}
    evidence = evaluate_submission(
        answers=data.answers,
        learner_grade=grade,
        approved_question_ids=approved_question_ids,
        question_lookup=lambda qid: get_question_by_id(qid) or get_onboarding_v2_item(qid),
        request_grade=data.grade,
        protocol_version=protocol_version,
    )
    if evidence["approvedItemsSubmitted"] == 0:
        raise HTTPException(
            status_code=422,
            detail=f"No submitted items belong to the approved Grade {grade} mathematics item bank. Nothing was saved.",
        )

    evaluated_items = evidence["evaluatedItems"]
    excluded_items = evidence["excludedItems"]
    evidence_summary = evidence["evidenceSummary"]

    # Final-answer accuracy (v1 semantics) over answered items only; empty answers are never correct.
    skill_stats: Dict[str, Dict[str, Any]] = {}
    correct_count = 0
    for item in evaluated_items:
        st = skill_stats.setdefault(item["skillId"], {
            "skillId": item["skillId"],
            "skillName": item["skillName"],
            "skillNameSi": item["skillNameSi"],
            "total": 0,
            "correct": 0,
        })
        st["total"] += 1
        if item["isCorrect"]:
            correct_count += 1
            st["correct"] += 1

    total_questions = len(evaluated_items)
    accuracy_pct = round((correct_count / total_questions * 100.0), 1) if total_questions > 0 else 0.0

    # Skill breakdown using centralized thresholds & minimum evidence requirement
    skills_list: List[Dict[str, Any]] = []
    strengths: List[str] = []
    areas_for_growth: List[str] = []

    for sid, st in skill_stats.items():
        s_total = st["total"]
        s_correct = st["correct"]
        s_pct = round((s_correct / s_total * 100.0), 1) if s_total > 0 else 0.0

        # Centralized classification: requires >= 3 items to assign proficiency, otherwise INSUFFICIENT_EVIDENCE
        category = determine_proficiency_category(s_pct, s_total)

        if category == PROFICIENCY_LEVEL_PROFICIENT:
            strengths.append(f"{st['skillName']} ({st['skillNameSi']})")
        elif category in (PROFICIENCY_LEVEL_DEVELOPING, PROFICIENCY_LEVEL_EMERGING):
            areas_for_growth.append(f"{st['skillName']} ({st['skillNameSi']})")
        # INSUFFICIENT_EVIDENCE skills are NOT claimed as mastered or deficient

        skills_list.append({
            "skillId": sid,
            "skillName": st["skillName"],
            "skillNameSi": st["skillNameSi"],
            "totalQuestions": s_total,
            "correctQuestions": s_correct,
            "accuracyPercentage": s_pct,
            "proficiencyCategory": category,
        })

    # Transparent rule-based recommendations adhering to evidence validity
    recommendations = generate_pedagogical_recommendations(
        overall_accuracy=accuracy_pct,
        overall_total_questions=total_questions,
        skills=skills_list,
    )

    evidence_level = "INSUFFICIENT" if total_questions < MINIMUM_EVIDENCE_QUESTIONS_OVERALL else "SUFFICIENT"

    # Generate ELP-X v1.0 versioned profile from independent (known, unassisted) first responses only
    elpx_profile = compute_elpx_profile_from_evaluated_items(
        evaluated_items=select_proficiency_items(evaluated_items),
        grade=grade,
        learner_id=learner_id,
        learning_preferences=quest_doc.get("learningPreferences"),
        social_context=quest_doc.get("socialContext"),
    )

    child_prefs = data.childPreferences.model_dump() if getattr(data, "childPreferences", None) else None

    impsa_summary = None
    imlr_summary = None
    if protocol_version == "onboarding-v2":
        prof_items = select_proficiency_items(evaluated_items)
        unassisted_count = len(prof_items)
        impsa_status = "PROVISIONAL" if unassisted_count >= 3 else "INSUFFICIENT_EVIDENCE"
        impsa_summary = {
            "status": impsa_status,
            "eligibleUnassistedItems": unassisted_count,
            "skillEvidence": [
                {
                    "questionId": it.get("questionId"),
                    "conceptId": it.get("conceptId"),
                    "skillId": it.get("skillId"),
                    "correctFirstResponse": bool(it.get("correctFirstResponse")),
                }
                for it in prof_items
            ],
            "evidenceSufficiency": "SUFFICIENT" if unassisted_count >= 3 else "INSUFFICIENT",
            "uncertaintyNote": (
                "Provisional estimate based on brief intake. Revise after continuous gameplay observations."
            ),
        }

        pre_item = next((it for it in evaluated_items if it.get("probeRole") == "pre"), None)
        support_item = next((it for it in evaluated_items if it.get("probeRole") == "support"), None)
        transfer_item = next((it for it in evaluated_items if it.get("probeRole") == "transfer"), None)

        if pre_item and transfer_item:
            pre_correct = bool(pre_item.get("correctFirstResponse") and not pre_item.get("supportBeforeFirstResponse"))
            support_delivered = [e.get("type", "support") for e in (support_item.get("supportEvents", []) if support_item else [])]
            transfer_correct = bool(transfer_item.get("correctFirstResponse") and not transfer_item.get("supportBeforeFirstResponse"))
            if pre_correct:
                imlr_status = "ALREADY_DEMONSTRATED"
            elif transfer_correct:
                imlr_status = "TRANSFER_OBSERVED"
            else:
                imlr_status = "TRANSFER_NOT_YET_OBSERVED"

            imlr_summary = {
                "status": imlr_status,
                "conceptId": pre_item.get("conceptId") or "compare_more",
                "preProbeCorrect": pre_correct,
                "supportDelivered": support_delivered,
                "unassistedTransferCorrect": transfer_correct,
                "evidenceLevel": "PROVISIONAL",
                "uncertaintyNote": (
                    "Initial transfer indicator from a single probe; does not certify durable learning gain."
                ),
            }

    assessment_doc = {
        "learnerId": learner_id,
        "parentId": parent_id,
        "assessmentType": "BASELINE_MATH",
        "assessmentProtocolVersion": protocol_version,
        "grade": grade,
        "questionBankVersion": QUESTION_BANK_VERSION,
        "onboardingItemBankVersion": ONBOARDING_ITEM_BANK_VERSION,
        "thresholdVersion": THRESHOLD_CONFIG_VERSION,
        "disclaimer": PROVISIONAL_THRESHOLDS_METADATA["disclaimer"],
        "totalQuestions": total_questions,
        "correctAnswers": correct_count,
        "accuracyPercentage": accuracy_pct,
        "evidenceLevel": evidence_level,
        "skills": skills_list,
        "strengths": strengths,
        "areasForGrowth": areas_for_growth,
        "recommendations": recommendations,
        "evaluatedItems": evaluated_items,
        "excludedItems": excluded_items,
        "evidenceRulesetVersion": EVIDENCE_RULESET_VERSION,
        "evidenceSummary": evidence_summary,
        "elpxProfile": elpx_profile,
        "childPreferences": child_prefs,
        "impsaSummary": impsa_summary,
        "imlrSummary": imlr_summary,
        "sessionStartedAt": data.sessionStartedAt,
        "sessionEndedAt": data.sessionEndedAt,
        "mlPredictionNotice": (
            "Baseline derived via transparent pedagogical rules. "
            "Machine Learning / SHAP predictions will integrate when model service is attached."
        ),
        "completedAt": now,
    }

    # Save assessment
    await assessments_col.insert_one(assessment_doc)

    # Mark onboarding as completed
    await onboarding_col.update_one(
        {"learnerId": learner_id},
        {
            "$addToSet": {"completedSteps": "math_assessment"},
            "$set": {
                "currentStep": "summary",
                "status": "COMPLETED",
                "completedAt": now,
                "updatedAt": now,
            },
            "$setOnInsert": {"createdAt": now, "parentId": parent_id},
        },
        upsert=True
    )

    # Update child profile onboardingStatus in learners collection. A companion the child chose is kept
    # separately from the parent's avatarId and takes precedence everywhere until the child chooses again.
    learner_update: Dict[str, Any] = {"onboardingStatus": "COMPLETED", "updatedAt": now}
    child_avatar = (child_prefs or {}).get("avatarId")
    if child_avatar in CHILD_SELECTABLE_AVATAR_IDS:
        learner_update["childAvatarId"] = child_avatar
        learner_update["childAvatarChosenAt"] = (child_prefs or {}).get("chosenAt") or now
    await learners_col.update_one(
        {"learnerId": learner_id},
        {"$set": learner_update}
    )

    logger.info("Completed math baseline assessment for learner %s with accuracy %s%%",
                learner_id, accuracy_pct)

    summary_response = {
        "grade": grade,
        "assessmentProtocolVersion": protocol_version,
        "totalQuestions": total_questions,
        "correctAnswers": correct_count,
        "accuracyPercentage": accuracy_pct,
        "evidenceLevel": evidence_level,
        "skills": skills_list,
        "strengths": strengths,
        "areasForGrowth": areas_for_growth,
        "recommendations": recommendations,
        "thresholdVersion": assessment_doc["thresholdVersion"],
        "disclaimer": assessment_doc["disclaimer"],
        "mlPredictionNotice": assessment_doc["mlPredictionNotice"],
        "elpxProfile": elpx_profile,
        "childPreferences": child_prefs,
        "impsa": impsa_summary,
        "imlr": imlr_summary,
        "evaluatedItems": evaluated_items,
        "excludedItems": excluded_items,
        "sessionStartedAt": data.sessionStartedAt,
        "sessionEndedAt": data.sessionEndedAt,
        "evidenceRulesetVersion": EVIDENCE_RULESET_VERSION,
        "evidenceSummary": evidence_summary,
    }

    return {
        "success": True,
        "message": "Mathematics baseline assessment submitted and evaluated successfully.",
        "summary": summary_response,
    }


async def get_onboarding_summary(
    learner_id: str,
    parent_id: str
) -> Dict[str, Any]:
    """
    Consolidates the onboarding summary. Parent-reported ADHD information, SNAP-IV screening
    observations and mathematics evidence are returned as separate sections, never combined.
    """
    progress = await get_or_create_onboarding_progress(learner_id=learner_id, parent_id=parent_id)

    # Validate that mandatory onboarding stages have completed records (SNAP-IV is optional)
    if not (progress.get("preferencesCompleted") and progress.get("mathAssessmentCompleted")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consolidated onboarding summary cannot be generated: Required assessment stages have not been completed.",
        )

    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent")

    questionnaires_col = get_questionnaires_collection()
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})

    learning_pref = quest_doc.get("learningPreferences") if quest_doc else None
    social_context = quest_doc.get("socialContext") if quest_doc else None

    return {
        "learner": learner,
        "progress": progress,
        "learningPreferences": learning_pref,
        "snapIvSummary": progress.get("snapIvSummary"),
        "snapIvStatus": progress.get("snapIvStatus"),
        "adhdInformation": progress.get("adhdInformation"),
        "socialContext": social_context,
        "mathSummary": progress.get("mathSummary"),
    }
