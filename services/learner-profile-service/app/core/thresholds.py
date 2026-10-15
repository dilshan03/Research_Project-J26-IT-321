"""
MathQuest Mathematics Proficiency Threshold & Evidence Level Configuration

PROVISIONAL DEMONSTRATION STANDARDS NOTICE:
These thresholds and evidence requirements are provisional demonstration standards
designed for prototype pedagogical routing and formative guidance. They do NOT
constitute clinically validated psychometric benchmarks, diagnostic standards, or
official national mathematics mastery standards.

Standardized Provisional Proficiency Thresholds:
- Emerging:              0.0% <= Accuracy < 50.0%
- Developing:           50.0% <= Accuracy < 80.0%
- Proficient:           80.0% <= Accuracy <= 100.0%
- Insufficient Evidence: Total evaluated items for skill < 3 (regardless of accuracy)
"""

from typing import Dict, Any, List, Optional

# Canonical threshold version identifier for auditability and safe versioned recalculation
THRESHOLD_CONFIG_VERSION = "PROV-THRESH-v1.0"

MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL = 3
MINIMUM_EVIDENCE_QUESTIONS_OVERALL = 3

PROFICIENCY_LEVEL_EMERGING = "Emerging"
PROFICIENCY_LEVEL_DEVELOPING = "Developing"
PROFICIENCY_LEVEL_PROFICIENT = "Proficient"
PROFICIENCY_LEVEL_INSUFFICIENT = "INSUFFICIENT_EVIDENCE"

# Centralized threshold boundaries
EMERGING_UPPER_BOUND = 49.999
DEVELOPING_LOWER_BOUND = 50.0
PROFICIENT_LOWER_BOUND = 80.0

PROVISIONAL_THRESHOLDS_METADATA: Dict[str, Any] = {
    "version": THRESHOLD_CONFIG_VERSION,
    "disclaimer": (
        "Provisional demonstration thresholds for prototype formative feedback only. "
        "Not validated mathematics mastery standards."
    ),
    "minimumEvidencePerSkill": MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL,
    "minimumEvidenceOverall": MINIMUM_EVIDENCE_QUESTIONS_OVERALL,
    "ranges": {
        PROFICIENCY_LEVEL_EMERGING: {"min": 0.0, "max": 49.9, "labelSi": "මූලික (Emerging)"},
        PROFICIENCY_LEVEL_DEVELOPING: {"min": 50.0, "max": 79.9, "labelSi": "සංවර්ධනය වන (Developing)"},
        PROFICIENCY_LEVEL_PROFICIENT: {"min": 80.0, "max": 100.0, "labelSi": "ප්‍රවීණ (Proficient)"},
        PROFICIENCY_LEVEL_INSUFFICIENT: {"min": None, "max": None, "labelSi": "ප්‍රමාණවත් සාක්ෂි නොමැත (Insufficient Evidence)"},
    },
}


def determine_proficiency_category(
    accuracy_percentage: float,
    total_questions: int,
    min_evidence: int = MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL,
) -> str:
    """
    Standardized classification based on strictly enforced minimum evidence
    and provisional demonstration thresholds:

    1. Fewer than min_evidence questions (default: 3) -> INSUFFICIENT_EVIDENCE
    2. Accuracy >= 80.0% -> Proficient
    3. Accuracy >= 50.0% and < 80.0% -> Developing
    4. Accuracy < 50.0% -> Emerging

    Boundary behaviors:
    - 0%     -> Emerging
    - 49%    -> Emerging
    - 50%    -> Developing
    - 79%    -> Developing
    - 80%    -> Proficient
    - 100%   -> Proficient
    """
    if total_questions < min_evidence:
        return PROFICIENCY_LEVEL_INSUFFICIENT

    # Clamp accuracy between 0.0 and 100.0 for safety
    clamped_acc = max(0.0, min(100.0, float(accuracy_percentage)))

    if clamped_acc >= PROFICIENT_LOWER_BOUND:
        return PROFICIENCY_LEVEL_PROFICIENT
    if clamped_acc >= DEVELOPING_LOWER_BOUND:
        return PROFICIENCY_LEVEL_DEVELOPING
    return PROFICIENCY_LEVEL_EMERGING


def generate_pedagogical_recommendations(
    overall_accuracy: float,
    overall_total_questions: int,
    skills: List[Dict[str, Any]],
) -> List[str]:
    """
    Generates transparent, pedagogical recommendations adhering to evidence validity.
    Ensures that recommendations do not falsely claim a skill is mastered or deficient
    when evidence is insufficient.
    """
    recommendations: List[str] = []

    # Overall evidence level notice
    if overall_total_questions < MINIMUM_EVIDENCE_QUESTIONS_OVERALL:
        recommendations.append(
            "Notice: Assessment completed with fewer than 3 total questions. Provisional baseline only."
        )

    # Check for skills with insufficient evidence
    skills_with_insufficient_evidence = [
        s for s in skills if s.get("totalQuestions", 0) < MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL
    ]
    if skills_with_insufficient_evidence:
        recommendations.append(
            f"Observation notice: {len(skills_with_insufficient_evidence)} individual skill area(s) "
            "have fewer than 3 attempted items in the current question bank. Skill classifications are provisional."
        )

    # Overall performance recommendations
    if overall_accuracy >= PROFICIENT_LOWER_BOUND:
        recommendations.append(
            "High foundation mastery observed across attempted items. Recommend introducing step-by-step challenges and multi-step math quests."
        )
        recommendations.append(
            "Keep rewards and interactive celebration active to maintain high intrinsic engagement."
        )
    elif overall_accuracy >= DEVELOPING_LOWER_BOUND:
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

    return recommendations


def safe_recalculate_skill_scores(
    evaluated_items: List[Dict[str, Any]],
    threshold_version: str = THRESHOLD_CONFIG_VERSION,
) -> Dict[str, Any]:
    """
    Safe, versioned recalculation function for assessment evaluations.
    Takes existing immutable evaluatedItems and recomputes skills, overall accuracy,
    and provisional categories using the standardized threshold config without
    mutating historical assessment records.
    """
    skill_stats: Dict[str, Dict[str, Any]] = {}
    correct_count = 0
    total_items = len(evaluated_items)

    for item in evaluated_items:
        sid = item.get("skillId", "general")
        sname = item.get("skillName", sid)
        sname_si = item.get("skillNameSi", sname)

        if sid not in skill_stats:
            skill_stats[sid] = {
                "skillId": sid,
                "skillName": sname,
                "skillNameSi": sname_si,
                "total": 0,
                "correct": 0,
            }

        skill_stats[sid]["total"] += 1
        if item.get("isCorrect", False):
            correct_count += 1
            skill_stats[sid]["correct"] += 1

    overall_accuracy = round((correct_count / total_items * 100.0), 1) if total_items > 0 else 0.0

    skills_list: List[Dict[str, Any]] = []
    strengths: List[str] = []
    areas_for_growth: List[str] = []

    for sid, st in skill_stats.items():
        s_total = st["total"]
        s_correct = st["correct"]
        s_pct = round((s_correct / s_total * 100.0), 1) if s_total > 0 else 0.0

        category = determine_proficiency_category(s_pct, s_total)

        if category == PROFICIENCY_LEVEL_PROFICIENT:
            strengths.append(f"{st['skillName']} ({st['skillNameSi']})")
        elif category in (PROFICIENCY_LEVEL_DEVELOPING, PROFICIENCY_LEVEL_EMERGING):
            areas_for_growth.append(f"{st['skillName']} ({st['skillNameSi']})")
        # INSUFFICIENT_EVIDENCE is neither claimed as strength nor deficient growth area

        skills_list.append({
            "skillId": sid,
            "skillName": st["skillName"],
            "skillNameSi": st["skillNameSi"],
            "totalQuestions": s_total,
            "correctQuestions": s_correct,
            "accuracyPercentage": s_pct,
            "proficiencyCategory": category,
        })

    recommendations = generate_pedagogical_recommendations(
        overall_accuracy=overall_accuracy,
        overall_total_questions=total_items,
        skills=skills_list,
    )

    evidence_level = "INSUFFICIENT" if total_items < MINIMUM_EVIDENCE_QUESTIONS_OVERALL else "SUFFICIENT"

    return {
        "thresholdVersion": threshold_version,
        "disclaimer": PROVISIONAL_THRESHOLDS_METADATA["disclaimer"],
        "totalQuestions": total_items,
        "correctAnswers": correct_count,
        "accuracyPercentage": overall_accuracy,
        "evidenceLevel": evidence_level,
        "skills": skills_list,
        "strengths": strengths,
        "areasForGrowth": areas_for_growth,
        "recommendations": recommendations,
    }
