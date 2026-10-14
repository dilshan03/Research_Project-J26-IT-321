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

logger = logging.getLogger("learner_profile.onboarding_service")


async def get_or_create_onboarding_progress(
    learner_id: str,
    parent_id: str
) -> Dict[str, Any]:
    """
    Retrieves or initializes the resumable onboarding state for a learner.
    Strictly verifies that the learner belongs to the requesting parent.
    """
    # 1. Verify parent ownership
    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent")

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
            "mlPredictionNotice": assessment_doc.get(
                "mlPredictionNotice",
                "Baseline derived via transparent pedagogical rules."
            ),
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
        "snapIvSummary": snap_iv_summary,
        "mathSummary": math_summary,
        "updatedAt": updated_at.isoformat() if isinstance(updated_at, datetime) else str(updated_at),
    }


async def save_learning_preferences(
    learner_id: str,
    parent_id: str,
    data: LearningPreferencesRequest
) -> Dict[str, Any]:
    """Saves child-friendly learning preferences with question and version metadata."""
    await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent")

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
    await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent")

    now = datetime.now(timezone.utc)
    questionnaires_col = get_questionnaires_collection()
    onboarding_col = get_onboarding_collection()

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
    await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent")

    now = datetime.now(timezone.utc)
    questionnaires_col = get_questionnaires_collection()
    onboarding_col = get_onboarding_collection()

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
    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent")
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
    learner = await get_learner_by_id(learner_id=learner_id, parent_id=parent_id, user_role="parent")
    grade = learner.get("grade", data.grade)

    now = datetime.now(timezone.utc)
    assessments_col = get_assessments_collection()
    onboarding_col = get_onboarding_collection()
    learners_col = get_learners_collection()

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
        if is_correct:
            correct_count += 1
            skill_stats[skill_id]["correct"] += 1

        evaluated_items.append({
            "questionId": ans.questionId,
            "skillId": skill_id,
            "isCorrect": is_correct,
            "userAnswer": ans.userAnswer,
            "correctAnswer": expected,
            "attempts": ans.attempts,
            "responseTimeSeconds": ans.responseTimeSeconds,
            "hintUsed": ans.hintUsed,
        })

    total_questions = len(evaluated_items)
    accuracy_pct = round((correct_count / total_questions * 100.0), 1) if total_questions > 0 else 0.0

    # Skill breakdown
    skills_list: List[Dict[str, Any]] = []
    strengths: List[str] = []
    areas_for_growth: List[str] = []
    recommendations: List[str] = []

    for sid, st in skill_stats.items():
        s_total = st["total"]
        s_correct = st["correct"]
        s_pct = round((s_correct / s_total * 100.0), 1) if s_total > 0 else 0.0

        # Descriptive proficiency categories (configurable thresholds)
        if s_pct >= 80.0:
            category = "Proficient"
            strengths.append(f"{st['skillName']} ({st['skillNameSi']})")
        elif s_pct >= 50.0:
            category = "Developing"
            areas_for_growth.append(f"{st['skillName']} ({st['skillNameSi']})")
        else:
            category = "Emerging"
            areas_for_growth.append(f"{st['skillName']} ({st['skillNameSi']})")

        skills_list.append({
            "skillId": sid,
            "skillName": st["skillName"],
            "skillNameSi": st["skillNameSi"],
            "totalQuestions": s_total,
            "correctQuestions": s_correct,
            "accuracyPercentage": s_pct,
            "proficiencyCategory": category,
        })

    # Transparent rule-based recommendations
    if accuracy_pct >= 80.0:
        recommendations.append(
            "High foundation mastery observed. Recommend introducing step-by-step challenges and multi-step math quests."
        )
        recommendations.append(
            "Keep rewards and interactive celebration active to maintain high intrinsic engagement."
        )
    elif accuracy_pct >= 50.0:
        recommendations.append(
            "Solid core comprehension with developing fluency. Provide visual hints and structured step breakdown for new topics."
        )
        recommendations.append(
            "Encourage 10-15 minute focused gameplay intervals with short breaks."
        )
    else:
        recommendations.append(
            "Foundational skills are emerging. Recommend highly visual, concrete item representations with spoken audio guidance."
        )
        recommendations.append(
            "Prioritize number sense and basic grouping with unlimited attempts and zero time pressure."
        )

    evidence_level = "INSUFFICIENT" if total_questions < 3 else "SUFFICIENT"
    if evidence_level == "INSUFFICIENT":
        recommendations.insert(0, "Notice: Assessment completed with fewer than 3 questions. Provisional baseline only.")

    assessment_doc = {
        "learnerId": learner_id,
        "parentId": parent_id,
        "assessmentType": "BASELINE_MATH",
        "grade": grade,
        "questionBankVersion": QUESTION_BANK_VERSION,
        "totalQuestions": total_questions,
        "correctAnswers": correct_count,
        "accuracyPercentage": accuracy_pct,
        "evidenceLevel": evidence_level,
        "skills": skills_list,
        "strengths": strengths,
        "areasForGrowth": areas_for_growth,
        "recommendations": recommendations,
        "evaluatedItems": evaluated_items,
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
        "totalQuestions": total_questions,
        "correctAnswers": correct_count,
        "accuracyPercentage": accuracy_pct,
        "evidenceLevel": evidence_level,
        "skills": skills_list,
        "strengths": strengths,
        "areasForGrowth": areas_for_growth,
        "recommendations": recommendations,
        "mlPredictionNotice": assessment_doc["mlPredictionNotice"],
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
