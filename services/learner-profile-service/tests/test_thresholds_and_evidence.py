"""
Unit and boundary tests for Mathematics Proficiency Thresholds and Evidence Requirements.
Standardized Provisional Thresholds:
- Emerging: 0% - 49%
- Developing: 50% - 79%
- Proficient: 80% - 100%
- Insufficient Evidence: Total evaluated items for skill < 3
"""

import pytest
from app.core.thresholds import (
    determine_proficiency_category,
    generate_pedagogical_recommendations,
    safe_recalculate_skill_scores,
    PROFICIENCY_LEVEL_EMERGING,
    PROFICIENCY_LEVEL_DEVELOPING,
    PROFICIENCY_LEVEL_PROFICIENT,
    PROFICIENCY_LEVEL_INSUFFICIENT,
    THRESHOLD_CONFIG_VERSION,
    MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL,
)


class TestProficiencyThresholdBoundaries:
    """Tests standardized provisional thresholds at exact boundary values with sufficient evidence (>= 3 questions)."""

    @pytest.mark.parametrize(
        "accuracy,expected_category",
        [
            (0.0, PROFICIENCY_LEVEL_EMERGING),
            (25.0, PROFICIENCY_LEVEL_EMERGING),
            (49.0, PROFICIENCY_LEVEL_EMERGING),
            (49.9, PROFICIENCY_LEVEL_EMERGING),
            (50.0, PROFICIENCY_LEVEL_DEVELOPING),
            (65.0, PROFICIENCY_LEVEL_DEVELOPING),
            (79.0, PROFICIENCY_LEVEL_DEVELOPING),
            (79.9, PROFICIENCY_LEVEL_DEVELOPING),
            (80.0, PROFICIENCY_LEVEL_PROFICIENT),
            (90.0, PROFICIENCY_LEVEL_PROFICIENT),
            (100.0, PROFICIENCY_LEVEL_PROFICIENT),
        ],
    )
    def test_threshold_boundaries_with_sufficient_evidence(self, accuracy: float, expected_category: str):
        # Using 3 questions (minimum required evidence)
        result = determine_proficiency_category(accuracy_percentage=accuracy, total_questions=3)
        assert result == expected_category

    @pytest.mark.parametrize(
        "accuracy,expected_category",
        [
            (0.0, PROFICIENCY_LEVEL_EMERGING),
            (49.0, PROFICIENCY_LEVEL_EMERGING),
            (50.0, PROFICIENCY_LEVEL_DEVELOPING),
            (79.0, PROFICIENCY_LEVEL_DEVELOPING),
            (80.0, PROFICIENCY_LEVEL_PROFICIENT),
            (100.0, PROFICIENCY_LEVEL_PROFICIENT),
        ],
    )
    def test_threshold_boundaries_with_large_sample_size(self, accuracy: float, expected_category: str):
        # Using 10 questions (> 3 questions)
        result = determine_proficiency_category(accuracy_percentage=accuracy, total_questions=10)
        assert result == expected_category


class TestSkillLevelEvidenceRequirements:
    """
    Tests evidence level enforcement for skill classification:
    - 0 questions -> INSUFFICIENT_EVIDENCE
    - 1 question  -> INSUFFICIENT_EVIDENCE (even with 100% accuracy)
    - 2 questions -> INSUFFICIENT_EVIDENCE (even with 100% accuracy)
    - 3 questions -> Proficient / Developing / Emerging based on accuracy
    - > 3 questions -> Proficient / Developing / Emerging based on accuracy
    """

    def test_zero_questions(self):
        result = determine_proficiency_category(accuracy_percentage=0.0, total_questions=0)
        assert result == PROFICIENCY_LEVEL_INSUFFICIENT

    def test_one_question_100_percent_accuracy(self):
        # A single correct answer must NOT classify the learner as proficient
        result = determine_proficiency_category(accuracy_percentage=100.0, total_questions=1)
        assert result == PROFICIENCY_LEVEL_INSUFFICIENT

    def test_one_question_zero_accuracy(self):
        result = determine_proficiency_category(accuracy_percentage=0.0, total_questions=1)
        assert result == PROFICIENCY_LEVEL_INSUFFICIENT

    def test_two_questions_100_percent_accuracy(self):
        result = determine_proficiency_category(accuracy_percentage=100.0, total_questions=2)
        assert result == PROFICIENCY_LEVEL_INSUFFICIENT

    def test_two_questions_50_percent_accuracy(self):
        result = determine_proficiency_category(accuracy_percentage=50.0, total_questions=2)
        assert result == PROFICIENCY_LEVEL_INSUFFICIENT

    def test_three_questions_assigns_proficiency(self):
        # 3 questions with 100% -> Proficient
        assert determine_proficiency_category(100.0, total_questions=3) == PROFICIENCY_LEVEL_PROFICIENT
        # 3 questions with 80% -> Proficient
        assert determine_proficiency_category(80.0, total_questions=3) == PROFICIENCY_LEVEL_PROFICIENT
        # 3 questions with 66.7% -> Developing
        assert determine_proficiency_category(66.7, total_questions=3) == PROFICIENCY_LEVEL_DEVELOPING
        # 3 questions with 50% -> Developing
        assert determine_proficiency_category(50.0, total_questions=3) == PROFICIENCY_LEVEL_DEVELOPING
        # 3 questions with 33.3% -> Emerging
        assert determine_proficiency_category(33.3, total_questions=3) == PROFICIENCY_LEVEL_EMERGING
        # 3 questions with 0% -> Emerging
        assert determine_proficiency_category(0.0, total_questions=3) == PROFICIENCY_LEVEL_EMERGING

    def test_more_than_three_questions_assigns_proficiency(self):
        assert determine_proficiency_category(85.0, total_questions=5) == PROFICIENCY_LEVEL_PROFICIENT
        assert determine_proficiency_category(60.0, total_questions=5) == PROFICIENCY_LEVEL_DEVELOPING
        assert determine_proficiency_category(40.0, total_questions=5) == PROFICIENCY_LEVEL_EMERGING


class TestSafeVersionedRecalculation:
    """Verifies that historical raw evaluatedItems can be safely recalculated with the versioned standard."""

    def test_safe_recalculation_on_historical_items(self):
        raw_items = [
            {"skillId": "addition", "skillName": "Addition", "skillNameSi": "එකතු කිරීම", "isCorrect": True},
            {"skillId": "addition", "skillName": "Addition", "skillNameSi": "එකතු කිරීම", "isCorrect": True},
            {"skillId": "addition", "skillName": "Addition", "skillNameSi": "එකතු කිරීම", "isCorrect": True},
            {"skillId": "subtraction", "skillName": "Subtraction", "skillNameSi": "අඩු කිරීම", "isCorrect": True},
        ]
        recomputed = safe_recalculate_skill_scores(raw_items)

        assert recomputed["thresholdVersion"] == THRESHOLD_CONFIG_VERSION
        assert recomputed["totalQuestions"] == 4
        assert recomputed["correctAnswers"] == 4
        assert recomputed["accuracyPercentage"] == 100.0

        skills = {s["skillId"]: s for s in recomputed["skills"]}
        # Addition had 3 items -> 100% -> Proficient
        assert skills["addition"]["proficiencyCategory"] == PROFICIENCY_LEVEL_PROFICIENT
        assert "Addition (එකතු කිරීම)" in recomputed["strengths"]

        # Subtraction had 1 item (< 3) -> INSUFFICIENT_EVIDENCE
        assert skills["subtraction"]["proficiencyCategory"] == PROFICIENCY_LEVEL_INSUFFICIENT
        assert skills["subtraction"]["totalQuestions"] == 1
        assert skills["subtraction"]["correctQuestions"] == 1
        assert skills["subtraction"]["accuracyPercentage"] == 100.0
        # Subtraction must NOT be claimed as strength due to insufficient evidence
        assert "Subtraction (අඩු කිරීම)" not in recomputed["strengths"]
        assert "Subtraction (අඩු කිරීම)" not in recomputed["areasForGrowth"]
