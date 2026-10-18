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
from app.db.question_bank import (
    get_questions_for_grade,
    get_question_by_id,
    QUESTION_BANK_VERSION,
)
from app.services.learner_service import get_learner_by_id
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

logger = logging.getLogger("learner_profile.onboarding_service")


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

    # 2. Find or create progress document
    progress_doc = await onboarding_col.find_one({"learnerId": learner_id})
    if not progress_doc:
        progress_doc = {
            "learnerId": learner_id,
            "parentId": parent_id,
            "status": "IN_PROGRESS",
            "currentStep": "preferences",
            "completedSteps": [],
            "createdAt": now,
            "updatedAt": now,
        }
        await onboarding_col.insert_one(progress_doc)
        logger.info("Initialized onboarding tracking for learner %s", learner_id)

    # 3. Check saved questionnaires
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})
    preferences_completed = bool(quest_doc and quest_doc.get("learningPreferences"))
    snap_iv_completed = bool(quest_doc and quest_doc.get("snapIv"))
    social_context_completed = bool(quest_doc and quest_doc.get("socialContext"))

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
                evaluated_items=assessment_doc.get("evaluatedItems", []),
                grade=assessment_doc.get("grade", learner["grade"]),
                learner_id=learner_id,
                learning_preferences=quest_doc.get("learningPreferences") if quest_doc else None,
                social_context=quest_doc.get("socialContext") if quest_doc else None,
            )

        math_summary = {
            "grade": assessment_doc.get("grade", learner["grade"]),
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
        }

    # Determine overall status
    status_str = "COMPLETED" if (preferences_completed and snap_iv_completed and math_completed) else "IN_PROGRESS"
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
    onboarding_col = get_onboarding_collection()
    learners_col = get_learners_collection()

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
    await onboarding_col.update_one(
        {"learnerId": learner_id},
        {
            "$addToSet": {"completedSteps": "preferences"},
            "$set": {"currentStep": "snap_iv", "status": "IN_PROGRESS", "updatedAt": now},
            "$setOnInsert": {"createdAt": now, "parentId": parent_id},
        },
        upsert=True
    )
    await learners_col.update_one(
        {"learnerId": learner_id},
        {"$set": {"onboardingStatus": "IN_PROGRESS", "updatedAt": now}}
    )

    logger.info("Saved learning preferences for learner %s", learner_id)
    return {"success": True, "message": "Learning preferences saved successfully.", "nextStep": "snap_iv"}


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
    onboarding_col = get_onboarding_collection()

    # Validate that mandatory preceding stage (Learning Preferences) is completed
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})
    if not (quest_doc and quest_doc.get("learningPreferences")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit SNAP-IV questionnaire: Mandatory stage 'Learning Preferences' must be completed first.",
        )

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

    # Store in questionnaires collection separately from main profile
    await questionnaires_col.update_one(
        {"learnerId": learner_id},
        {
            "$set": {
                "learnerId": learner_id,
                "parentId": parent_id,
                "snapIv": payload,
                "updatedAt": now,
            },
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True
    )

    # Advance step
    await onboarding_col.update_one(
        {"learnerId": learner_id},
        {
            "$addToSet": {"completedSteps": "snap_iv"},
            "$set": {"currentStep": "social_context", "updatedAt": now},
            "$setOnInsert": {"createdAt": now, "parentId": parent_id},
        },
        upsert=True
    )

    logger.info("Saved SNAP-IV questionnaire for learner %s. Inatt: %s, Hyper: %s",
                learner_id, inattention_total, hyperactivity_total)

    return {
        "success": True,
        "message": "SNAP-IV responses recorded successfully.",
        "summary": score_summary,
        "nextStep": "social_context",
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
    onboarding_col = get_onboarding_collection()

    # Validate that mandatory preceding stages are completed
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})
    if not (quest_doc and quest_doc.get("learningPreferences")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot save social context: Mandatory stage 'Learning Preferences' must be completed first.",
        )
    if not (quest_doc and quest_doc.get("snapIv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot save social context: Mandatory stage 'SNAP-IV Questionnaire' must be completed first.",
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

    await onboarding_col.update_one(
        {"learnerId": learner_id},
        {
            "$addToSet": {"completedSteps": "social_context"},
            "$set": {"currentStep": "handover", "updatedAt": now},
            "$setOnInsert": {"createdAt": now, "parentId": parent_id},
        },
        upsert=True
    )

    logger.info("Saved social learning context for learner %s", learner_id)
    return {"success": True, "message": "Social context recorded successfully.", "nextStep": "handover"}


async def get_math_questions_for_learner(
    learner_id: str,
    parent_id: str
) -> List[Dict[str, Any]]:
    """Retrieves grade-specific mathematics question bank items without revealing answers."""
    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent", allow_archived=False)
    grade = learner.get("grade", 1)

    questions = get_questions_for_grade(grade=grade, include_answers=False)
    return questions


def normalize_answer(val: Any) -> str:
    """Normalizes string or numeric user answers for reliable comparison."""
    if val is None:
        return ""
    if isinstance(val, (int, float)):
        # Normalize float integers (e.g., 5.0 -> 5)
        if isinstance(val, float) and val.is_integer():
            return str(int(val)).strip().lower()
        return str(val).strip().lower()
    return str(val).strip().lower()


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

    # 1. Enforce mandatory sequential stages: Learning Preferences & SNAP-IV must be stored
    quest_doc = await questionnaires_col.find_one({"learnerId": learner_id})
    if not (quest_doc and quest_doc.get("learningPreferences")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit mathematics assessment: Mandatory stage 'Learning Preferences' must be completed first.",
        )
    if not (quest_doc and quest_doc.get("snapIv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit mathematics assessment: Mandatory stage 'SNAP-IV Questionnaire' must be completed first.",
        )

    # 2. Check for duplicate or conflicting assessment submissions
    existing_assessment = await assessments_col.find_one(
        {"learnerId": learner_id},
        sort=[("completedAt", -1)]
    )
    if existing_assessment:
        existing_items = existing_assessment.get("evaluatedItems", [])
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

    evaluated_items = []
    skill_stats: Dict[str, Dict[str, Any]] = {}
    correct_count = 0

    for ans in data.answers:
        q_item = get_question_by_id(ans.questionId)
        if not q_item:
            continue

        skill_id = q_item["skillId"]
        skill_name = q_item["skillName"]
        skill_name_si = q_item["skillNameSi"]

        if skill_id not in skill_stats:
            skill_stats[skill_id] = {
                "skillId": skill_id,
                "skillName": skill_name,
                "skillNameSi": skill_name_si,
                "total": 0,
                "correct": 0,
            }

        skill_stats[skill_id]["total"] += 1

        # Check correctness
        expected = q_item.get("correctAnswer")
        is_correct = normalize_answer(ans.userAnswer) == normalize_answer(expected)
        
        # Valid assessment evidence: First confirmed response correctness is preserved separately
        if ans.isFirstResponseCorrect is not None:
            first_correct = bool(ans.isFirstResponseCorrect)
        else:
            first_correct = is_correct

        first_confirmed = ans.firstConfirmedResponse if ans.firstConfirmedResponse is not None else ans.userAnswer

        if is_correct:
            correct_count += 1
            skill_stats[skill_id]["correct"] += 1

        item_record = {
            "questionId": ans.questionId,
            "skillId": skill_id,
            "skillName": skill_name,
            "skillNameSi": skill_name_si,
            "isCorrect": is_correct,
            "correctFirstResponse": first_correct,
            "firstConfirmedResponse": first_confirmed,
            "userAnswer": ans.userAnswer,
            "correctAnswer": expected,
            "attempts": ans.attempts,
            "responseTimeSeconds": ans.responseTimeSeconds,
            "hintUsed": ans.hintUsed,
            "demonstrationUsed": bool(getattr(ans, "demonstrationUsed", False)),
            "selfCorrectionsCount": int(getattr(ans, "selfCorrectionsCount", 0)),
        }
        # Additive protocol-v2 fields (optional, safely preserved if provided)
        if getattr(ans, "probeRole", None) is not None:
            item_record["probeRole"] = ans.probeRole.value if hasattr(ans.probeRole, "value") else str(ans.probeRole)
        if getattr(ans, "itemFamilyId", None) is not None:
            item_record["itemFamilyId"] = ans.itemFamilyId
        if getattr(ans, "representation", None) is not None:
            item_record["representation"] = ans.representation.value if hasattr(ans.representation, "value") else str(ans.representation)
        if getattr(ans, "supportBeforeFirstResponse", None) is not None:
            item_record["supportBeforeFirstResponse"] = bool(ans.supportBeforeFirstResponse)
        if getattr(ans, "supportEvents", None):
            item_record["supportEvents"] = [e.model_dump() if hasattr(e, "model_dump") else e for e in ans.supportEvents]
        if getattr(ans, "instructionEvents", None):
            item_record["instructionEvents"] = [e.model_dump() if hasattr(e, "model_dump") else e for e in ans.instructionEvents]
        if getattr(ans, "revisionEvents", None):
            item_record["revisionEvents"] = [e.model_dump() if hasattr(e, "model_dump") else e for e in ans.revisionEvents]
        if getattr(ans, "interactionMode", None) is not None:
            item_record["interactionMode"] = ans.interactionMode.value if hasattr(ans.interactionMode, "value") else str(ans.interactionMode)
        if getattr(ans, "dimensionTags", None):
            item_record["dimensionTags"] = ans.dimensionTags

        evaluated_items.append(item_record)

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

    # Generate ELP-X v1.0 versioned profile for this assessment
    elpx_profile = compute_elpx_profile_from_evaluated_items(
        evaluated_items=evaluated_items,
        grade=grade,
        learner_id=learner_id,
        learning_preferences=quest_doc.get("learningPreferences"),
        social_context=quest_doc.get("socialContext"),
    )

    protocol_version = getattr(data, "assessmentProtocolVersion", None) or "onboarding-v1"
    child_prefs = data.childPreferences.model_dump() if getattr(data, "childPreferences", None) else None

    assessment_doc = {
        "learnerId": learner_id,
        "parentId": parent_id,
        "assessmentType": "BASELINE_MATH",
        "assessmentProtocolVersion": protocol_version,
        "grade": grade,
        "questionBankVersion": QUESTION_BANK_VERSION,
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
        "elpxProfile": elpx_profile,
        "childPreferences": child_prefs,
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

    # Update child profile onboardingStatus in learners collection
    await learners_col.update_one(
        {"learnerId": learner_id},
        {"$set": {"onboardingStatus": "COMPLETED", "updatedAt": now}}
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
        "impsa": None,
        "imlr": None,
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
    """Consolidates complete onboarding summary including preferences, SNAP-IV, and Math baseline."""
    progress = await get_or_create_onboarding_progress(learner_id=learner_id, parent_id=parent_id)

    # Validate that mandatory onboarding stages have completed records before returning final summary
    if not (progress.get("preferencesCompleted") and progress.get("snapIvCompleted") and progress.get("mathAssessmentCompleted")):
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
        "socialContext": social_context,
        "mathSummary": progress.get("mathSummary"),
    }
