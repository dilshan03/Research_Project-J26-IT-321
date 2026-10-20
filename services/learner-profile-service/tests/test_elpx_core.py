"""
Comprehensive Unit Tests for ELP-X v1.0 Mathematical Engine & Recommendation Rules
Component: services/learner-profile-service/tests/test_elpx_core.py
"""

import pytest
from app.core.elpx_engine import (
    compute_skill_estimate,
    compute_beta_credible_interval,
    generate_structured_recommendations,
    compute_elpx_profile_from_evaluated_items,
    LEVEL_INSUFFICIENT,
    LEVEL_EMERGING,
    LEVEL_DEVELOPING,
    LEVEL_PROFICIENT,
    ALGORITHM_VERSION,
    RECOMMENDATION_RULESET_VERSION,
    PROFILE_SCHEMA_VERSION,
)


class TestBetaBinomialEstimationAndEvidenceSufficiency:
    """Verifies Bayesian proficiency estimation, evidence safeguards, and credible intervals."""

    def test_zero_questions_boundary(self):
        """Zero questions: n=0, c=0. Must return INSUFFICIENT_EVIDENCE with prior mean p=0.5."""
        est = compute_skill_estimate(distinct_questions=0, correct_first_responses=0)
        assert est["distinctQuestionsAssessed"] == 0
        assert est["correctFirstResponses"] == 0
        assert est["rawAccuracy"] == 0.0
        assert est["estimatedProficiency"] == 0.5
        assert est["provisionalSkillLevel"] == LEVEL_INSUFFICIENT
        assert est["isEvidenceSufficient"] is False
        assert est["isProvisional"] is True
        # Prior width for Beta(1,1) is approx 0.95
        assert est["credibleIntervalWidth"] > 0.90

    def test_one_correct_question_never_proficient(self):
        """
        CRITICAL REQUIREMENT: A single correct answer (n=1, c=1, 100% raw accuracy)
        must NEVER classify a skill as proficient. Must return INSUFFICIENT_EVIDENCE.
        """
        est = compute_skill_estimate(distinct_questions=1, correct_first_responses=1)
        assert est["distinctQuestionsAssessed"] == 1
        assert est["correctFirstResponses"] == 1
        assert est["rawAccuracy"] == 1.0
        # Beta(1+1, 1+0) = Beta(2, 1) -> mean = 2/3 ≈ 0.6667
        assert abs(est["estimatedProficiency"] - 0.6667) < 0.01
        assert est["provisionalSkillLevel"] == LEVEL_INSUFFICIENT
        assert est["isEvidenceSufficient"] is False

    def test_one_incorrect_question(self):
        """Single incorrect answer (n=1, c=0). Must return INSUFFICIENT_EVIDENCE."""
        est = compute_skill_estimate(distinct_questions=1, correct_first_responses=0)
        assert est["distinctQuestionsAssessed"] == 1
        assert est["correctFirstResponses"] == 0
        assert est["rawAccuracy"] == 0.0
        # Beta(1+0, 1+1) = Beta(1, 2) -> mean = 1/3 ≈ 0.3333
        assert abs(est["estimatedProficiency"] - 0.3333) < 0.01
        assert est["provisionalSkillLevel"] == LEVEL_INSUFFICIENT
        assert est["isEvidenceSufficient"] is False

    def test_two_questions_both_correct(self):
        """Two correct answers (n=2, c=2, 100% raw accuracy). Must return INSUFFICIENT_EVIDENCE."""
        est = compute_skill_estimate(distinct_questions=2, correct_first_responses=2)
        assert est["distinctQuestionsAssessed"] == 2
        assert est["rawAccuracy"] == 1.0
        # Beta(3, 1) -> mean = 3/4 = 0.75
        assert est["estimatedProficiency"] == 0.75
        assert est["provisionalSkillLevel"] == LEVEL_INSUFFICIENT
        assert est["isEvidenceSufficient"] is False

    def test_three_questions_all_correct_is_proficient(self):
        """Three questions all correct (n=3, c=3). Sufficient evidence, p=4/5=0.80 -> PROFICIENT."""
        est = compute_skill_estimate(distinct_questions=3, correct_first_responses=3)
        assert est["distinctQuestionsAssessed"] == 3
        assert est["rawAccuracy"] == 1.0
        assert est["estimatedProficiency"] == 0.80
        assert est["provisionalSkillLevel"] == LEVEL_PROFICIENT
        assert est["isEvidenceSufficient"] is True
        assert est["isProvisional"] is True

    def test_three_questions_two_correct_is_developing(self):
        """Three questions, two correct (n=3, c=2). p=3/5=0.60 -> DEVELOPING."""
        est = compute_skill_estimate(distinct_questions=3, correct_first_responses=2)
        assert est["distinctQuestionsAssessed"] == 3
        assert est["correctFirstResponses"] == 2
        assert abs(est["rawAccuracy"] - 0.6667) < 0.01
        assert est["estimatedProficiency"] == 0.60
        assert est["provisionalSkillLevel"] == LEVEL_DEVELOPING
        assert est["isEvidenceSufficient"] is True

    def test_three_questions_one_correct_is_emerging(self):
        """Three questions, one correct (n=3, c=1). p=2/5=0.40 -> EMERGING."""
        est = compute_skill_estimate(distinct_questions=3, correct_first_responses=1)
        assert est["distinctQuestionsAssessed"] == 3
        assert est["estimatedProficiency"] == 0.40
        assert est["provisionalSkillLevel"] == LEVEL_EMERGING
        assert est["isEvidenceSufficient"] is True

    def test_distinguish_missing_evidence_from_zero_performance(self):
        """
        Confirms missing evidence (n=0) is cleanly distinguished from actual low performance (n>=3, c=0).
        """
        missing = compute_skill_estimate(distinct_questions=0, correct_first_responses=0)
        low_perf = compute_skill_estimate(distinct_questions=3, correct_first_responses=0)

        assert missing["provisionalSkillLevel"] == LEVEL_INSUFFICIENT
        assert missing["distinctQuestionsAssessed"] == 0

        assert low_perf["provisionalSkillLevel"] == LEVEL_EMERGING
        assert low_perf["distinctQuestionsAssessed"] == 3
        assert low_perf["estimatedProficiency"] == 0.20  # Beta(1, 4) -> 1/5 = 0.20

    def test_credible_interval_bounds_and_uncertainty_shrinkage(self):
        """
        Credible interval lower must be < upper, both within [0, 1].
        Width must shrink as sample size grows from n=3 to n=20.
        """
        est_3 = compute_skill_estimate(distinct_questions=3, correct_first_responses=2)
        est_20 = compute_skill_estimate(distinct_questions=20, correct_first_responses=14)

        assert 0.0 <= est_3["credibleInterval"]["lower"] < est_3["credibleInterval"]["upper"] <= 1.0
        assert 0.0 <= est_20["credibleInterval"]["lower"] < est_20["credibleInterval"]["upper"] <= 1.0

        # More data = narrower credible interval
        assert est_20["credibleIntervalWidth"] < est_3["credibleIntervalWidth"]


class TestProfileDeduplicationAndEdgeCases:
    """Verifies item-level deduplication, conflicting items, and missing data."""

    def test_repeated_attempts_on_same_question_deduplicated(self):
        """
        REQUIREMENT: Do not count duplicate events or repeated attempts on the same
        assessment item as new independent evidence.
        """
        evaluated_items = [
            {"questionId": "q1", "skillId": "addition", "skillName": "Addition", "isCorrect": False, "attempts": 1},
            {"questionId": "q1", "skillId": "addition", "skillName": "Addition", "isCorrect": True, "attempts": 2},
            {"questionId": "q1", "skillId": "addition", "skillName": "Addition", "isCorrect": True, "attempts": 3},
        ]
        profile = compute_elpx_profile_from_evaluated_items(
            evaluated_items=evaluated_items,
            grade=1,
            learner_id="lrn_test",
        )
        skill = profile["skillEstimates"][0]
        # Must count exactly 1 distinct question, and first attempt was False
        assert skill["distinctQuestionsAssessed"] == 1
        assert skill["correctFirstResponses"] == 0
        assert skill["provisionalSkillLevel"] == LEVEL_INSUFFICIENT

    def test_conflicting_performance_observations(self):
        """
        When a learner has conflicting observations across items (e.g. 50% correct across 4 distinct items),
        estimates and intervals reflect intermediate proficiency with appropriate variance.
        """
        evaluated_items = [
            {"questionId": "q1", "skillId": "subtraction", "skillName": "Subtraction", "isCorrect": True},
            {"questionId": "q2", "skillId": "subtraction", "skillName": "Subtraction", "isCorrect": False},
            {"questionId": "q3", "skillId": "subtraction", "skillName": "Subtraction", "isCorrect": True},
            {"questionId": "q4", "skillId": "subtraction", "skillName": "Subtraction", "isCorrect": False},
        ]
        profile = compute_elpx_profile_from_evaluated_items(
            evaluated_items=evaluated_items,
            grade=1,
            learner_id="lrn_conflicting",
        )
        skill = profile["skillEstimates"][0]
        assert skill["distinctQuestionsAssessed"] == 4
        assert skill["correctFirstResponses"] == 2
        assert skill["rawAccuracy"] == 0.50
        # Beta(1+2, 1+2) = Beta(3, 3) -> p = 0.50
        assert skill["estimatedProficiency"] == 0.50
        assert skill["provisionalSkillLevel"] == LEVEL_DEVELOPING

    def test_missing_data_empty_items(self):
        """Empty items list produces valid profile without exceptions."""
        profile = compute_elpx_profile_from_evaluated_items(
            evaluated_items=[],
            grade=2,
            learner_id="lrn_empty",
        )
        assert profile["totalDistinctQuestionsEvaluated"] == 0
        assert profile["totalCorrectFirstResponses"] == 0
        assert profile["evidenceStatus"] == "INSUFFICIENT"
        assert len(profile["skillEstimates"]) == 0


class TestExplainableRecommendationEngine:
    """Verifies transparent recommendation generation and strict ethical boundaries."""

    def test_recommendation_strategy_codes(self):
        """Verify pedagogical strategy codes map properly to proficiency states."""
        skill_estimates = [
            {
                "skillId": "num_sense",
                "skillName": "Number Sense",
                "skillNameSi": "සංඛ්‍යා සංකල්ප",
                "provisionalSkillLevel": LEVEL_INSUFFICIENT,
                "distinctQuestionsAssessed": 1,
                "correctFirstResponses": 1,
                "estimatedProficiency": 0.67,
            },
            {
                "skillId": "addition",
                "skillName": "Addition",
                "skillNameSi": "එකතු කිරීම",
                "provisionalSkillLevel": LEVEL_EMERGING,
                "distinctQuestionsAssessed": 3,
                "correctFirstResponses": 1,
                "estimatedProficiency": 0.40,
            },
            {
                "skillId": "subtraction",
                "skillName": "Subtraction",
                "skillNameSi": "අඩු කිරීම",
                "provisionalSkillLevel": LEVEL_DEVELOPING,
                "distinctQuestionsAssessed": 3,
                "correctFirstResponses": 2,
                "estimatedProficiency": 0.60,
            },
            {
                "skillId": "geometry",
                "skillName": "Geometry",
                "skillNameSi": "ජ්‍යාමිතිය",
                "provisionalSkillLevel": LEVEL_PROFICIENT,
                "distinctQuestionsAssessed": 4,
                "correctFirstResponses": 4,
                "estimatedProficiency": 0.83,
            },
        ]

        recs = generate_structured_recommendations(
            skill_estimates=skill_estimates,
            overall_total_questions=11,
            overall_correct_first=8,
            learning_preferences={"audioAssistance": "read_everything", "visualAssistance": "always"},
            social_context={"peerCollaboration": "group_friendly"},
            aggregate_hints_used=4,
            aggregate_attempts=15,
        )

        strategies = {r["strategyCode"] for r in recs}
        assert "ASSESSMENT_EXPANSION" in strategies
        assert "SUPPORTED_PRACTICE" in strategies
        assert "SCAFFOLDED_PRACTICE" in strategies
        assert "CHALLENGE_EXTENSION" in strategies
        assert "AUDIO_INSTRUCTION" in strategies
        assert "VISUAL_DEMONSTRATION" in strategies
        assert "COLLABORATIVE_LEARNING" in strategies
        assert "ADAPTIVE_HINT_PACING" in strategies
        assert "UNTIMED_MASTERY_PRACTICE" in strategies

        # Each recommendation must have required metadata fields
        for r in recs:
            assert r["recommendationId"].startswith("rec_")
            assert len(r["reasonCodes"]) >= 1
            assert r["recommendationRulesetVersion"] == RECOMMENDATION_RULESET_VERSION
            assert r["titleEn"]
            assert r["titleSi"]

    def test_ethical_boundary_no_adhd_or_clinical_diagnosis(self):
        """
        REQUIREMENT: Do not infer ADHD diagnoses or cognitive disabilities from assessment scores.
        Do not use sensitive SNAP-IV answers to generate clinical categories.
        """
        recs = generate_structured_recommendations(
            skill_estimates=[],
            overall_total_questions=10,
            overall_correct_first=2,
            learning_preferences={"audioAssistance": "read_everything"},
            social_context={"learningEnvironment": "quiet_room"},
        )
        for r in recs:
            combined_text = f"{r['titleEn']} {r['descriptionEn']} {' '.join(r['reasonCodes'])}".lower()
            assert "adhd" not in combined_text
            assert "disability" not in combined_text
            assert "disorder" not in combined_text
            assert "deficit" not in combined_text
            assert "clinical" not in combined_text
