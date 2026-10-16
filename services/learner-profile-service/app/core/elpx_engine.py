"""
ELP-X (Evidence-Aware Learner Profiling with Explainable Recommendations) Engine
Algorithm Version: ELP-X-v1.0
Ruleset Version: ELP-X-REC-v1.0

PROVISIONAL RESEARCH ALGORITHM NOTICE:
ELP-X v1.0 produces evidence-aware mathematical skill estimates and transparent
personalized learning recommendations. These values are experimental statistical
estimates, NOT clinically validated psychometric benchmarks, diagnostic standards,
or official national mathematics mastery certifications.

Mathematical Formulation:
- Prior: Beta(alpha0=1.0, beta0=1.0) [Standard Laplace / Uniform prior]
- Observed evidence for skill s:
    n = distinct valid assessed questions
    c = correct first responses
    raw_accuracy = c / n (if n > 0 else 0.0)
- Posterior:
    alpha = alpha0 + c
    beta  = beta0 + n - c
- Estimated proficiency:
    p = alpha / (alpha + beta) = (1 + c) / (2 + n)
- Bayesian Credible Interval:
    95% equal-tailed credible interval [p_lower, p_upper] via Beta quantile function.
- Evidence Sufficiency:
    If n < 3: INSUFFICIENT_EVIDENCE (Provisional)
    If n >= 3:
        p < 0.50         -> EMERGING (Provisional)
        0.50 <= p < 0.80 -> DEVELOPING (Provisional)
        p >= 0.80        -> PROFICIENT (Provisional)
"""

import math
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

try:
    from scipy.stats import beta as scipy_beta
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

ALGORITHM_VERSION = "ELP-X-v1.0"
RECOMMENDATION_RULESET_VERSION = "ELP-X-REC-v1.0"
PROFILE_SCHEMA_VERSION = "ELP-X-PROFILE-v1.0"

# Default prior hyper-parameters
DEFAULT_ALPHA_0 = 1.0
DEFAULT_BETA_0 = 1.0

# Evidence sufficiency thresholds
MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL = 3
MINIMUM_EVIDENCE_QUESTIONS_OVERALL = 3

# Proficiency level constants
LEVEL_INSUFFICIENT = "INSUFFICIENT_EVIDENCE"
LEVEL_EMERGING = "EMERGING"
LEVEL_DEVELOPING = "DEVELOPING"
LEVEL_PROFICIENT = "PROFICIENT"

# Cut-off boundaries for estimated proficiency (p)
EMERGING_UPPER_BOUND = 0.50
DEVELOPING_UPPER_BOUND = 0.80

RESEARCH_DISCLAIMER = (
    "ELP-X Research Profile Summary: Proficiency estimates and credible intervals "
    "are statistical approximations computed via Beta-Binomial Bayesian inference. "
    "They are formative pedagogical guidance tools and do NOT constitute diagnostic "
    "or clinical classifications."
)


def compute_beta_credible_interval(
    alpha: float,
    beta_param: float,
    confidence_level: float = 0.95,
) -> Tuple[float, float]:
    """
    Computes equal-tailed Bayesian credible interval [lower, upper] for Beta(alpha, beta).
    Uses scipy.stats.beta if available, with a robust Wilson/normal approximation fallback.
    """
    if confidence_level <= 0.0 or confidence_level >= 1.0:
        confidence_level = 0.95

    tail_prob = (1.0 - confidence_level) / 2.0  # e.g., 0.025 for 95%

    if HAS_SCIPY:
        lower = float(scipy_beta.ppf(tail_prob, alpha, beta_param))
        upper = float(scipy_beta.ppf(1.0 - tail_prob, alpha, beta_param))
        return round(max(0.0, lower), 4), round(min(1.0, upper), 4)

    # Fallback normal approximation with continuity adjustment
    mean = alpha / (alpha + beta_param)
    variance = (alpha * beta_param) / (((alpha + beta_param) ** 2) * (alpha + beta_param + 1.0))
    std_dev = math.sqrt(variance)
    # z for 95% is approx 1.96
    z = 1.96 if abs(confidence_level - 0.95) < 0.01 else 1.645
    lower = max(0.0, mean - z * std_dev)
    upper = min(1.0, mean + z * std_dev)
    return round(lower, 4), round(upper, 4)


def compute_skill_estimate(
    distinct_questions: int,
    correct_first_responses: int,
    alpha_0: float = DEFAULT_ALPHA_0,
    beta_0: float = DEFAULT_BETA_0,
    min_evidence: int = MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL,
) -> Dict[str, Any]:
    """
    Executes the Beta-Binomial proficiency estimation for a single skill.

    Guarantees:
    - Never classifies a skill as proficient based on only one correct answer (n < 3).
    - Distinguishes missing evidence (n=0) from low performance (n>=3, c=0).
    - Preserves raw accuracy alongside estimated proficiency.
    - All classifications are flagged as provisional.
    """
    n = max(0, int(distinct_questions))
    c = max(0, min(n, int(correct_first_responses)))

    raw_accuracy = round(c / n, 4) if n > 0 else 0.0
    raw_accuracy_pct = round(raw_accuracy * 100.0, 1)

    # Posterior parameters
    alpha = alpha_0 + c
    beta_param = beta_0 + (n - c)

    # Posterior expected value (mean proficiency)
    p = round(alpha / (alpha + beta_param), 4)

    # Posterior variance
    variance = (alpha * beta_param) / (((alpha + beta_param) ** 2) * (alpha + beta_param + 1.0))
    variance = round(variance, 6)

    # 95% Credible interval
    ci_lower, ci_upper = compute_beta_credible_interval(alpha, beta_param, confidence_level=0.95)
    ci_width = round(ci_upper - ci_lower, 4)

    # Evidence sufficiency check
    is_sufficient = n >= min_evidence

    if not is_sufficient:
        provisional_level = LEVEL_INSUFFICIENT
    else:
        if p >= DEVELOPING_UPPER_BOUND:
            provisional_level = LEVEL_PROFICIENT
        elif p >= EMERGING_UPPER_BOUND:
            provisional_level = LEVEL_DEVELOPING
        else:
            provisional_level = LEVEL_EMERGING

    return {
        "distinctQuestionsAssessed": n,
        "correctFirstResponses": c,
        "rawAccuracy": raw_accuracy,
        "rawAccuracyPercentage": raw_accuracy_pct,
        "posteriorAlpha": round(alpha, 2),
        "posteriorBeta": round(beta_param, 2),
        "estimatedProficiency": p,
        "estimatedProficiencyPercentage": round(p * 100.0, 1),
        "credibleInterval": {
            "lower": ci_lower,
            "upper": ci_upper,
            "confidenceLevel": 0.95,
        },
        "credibleIntervalWidth": ci_width,
        "posteriorVariance": variance,
        "evidenceSufficiency": "SUFFICIENT" if is_sufficient else "INSUFFICIENT",
        "isEvidenceSufficient": is_sufficient,
        "provisionalSkillLevel": provisional_level,
        "isProvisional": True,
    }


def generate_structured_recommendations(
    skill_estimates: List[Dict[str, Any]],
    overall_total_questions: int,
    overall_correct_first: int,
    learning_preferences: Optional[Dict[str, Any]] = None,
    social_context: Optional[Dict[str, Any]] = None,
    aggregate_hints_used: int = 0,
    aggregate_attempts: int = 0,
) -> List[Dict[str, Any]]:
    """
    Transparent Personalized Recommendation Engine adhering to ELP-X v1.0 specifications.

    Generates structured, explainable recommendations with:
    - recommendationId
    - skillId (when applicable)
    - strategyCode
    - reasonCodes
    - inputEvidenceSummary
    - recommendationRulesetVersion
    - user-facing descriptive messages in Sinhala and English

    Strict Ethical Boundaries:
    - Does NOT infer ADHD diagnoses or cognitive disabilities from scores.
    - Does NOT automatically penalize learners for longer response times.
    - Does NOT use sensitive SNAP-IV answers to generate clinical categories.
    """
    recs: List[Dict[str, Any]] = []

    # 1. Overall Evidence Notice if overall attempted questions < 3
    if overall_total_questions < MINIMUM_EVIDENCE_QUESTIONS_OVERALL:
        recs.append({
            "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
            "skillId": None,
            "strategyCode": "ASSESSMENT_EXPANSION",
            "reasonCodes": ["OVERALL_EVIDENCE_INSUFFICIENT", "LOW_BASELINE_SAMPLE"],
            "inputEvidenceSummary": {
                "overallTotalQuestions": overall_total_questions,
                "minimumRequired": MINIMUM_EVIDENCE_QUESTIONS_OVERALL,
            },
            "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
            "titleEn": "Complete More Baseline Items",
            "titleSi": "මූලික ප්‍රශ්න තව කිහිපයකට පිළිතුරු සපයන්න",
            "descriptionEn": (
                "Only limited questions have been evaluated so far. Complete 3 or more varied "
                "tasks to establish a reliable baseline before adjusting practice difficulty."
            ),
            "descriptionSi": (
                "තවමත් තක්සේරු කර ඇත්තේ ප්‍රශ්න ස්වල්පයක් පමණි. නිවැරදි මූලික පැතිකඩක් සකස් කර "
                "ගැනීමට විවිධ මට්ටමේ තවත් ප්‍රශ්න 3කට හෝ වැඩි ගණනකට පිළිතුරු දෙන්න."
            ),
        })

    # 2. Skill-Specific Pedagogical Recommendations
    for s in skill_estimates:
        sid = s.get("skillId")
        sname = s.get("skillName", sid)
        sname_si = s.get("skillNameSi", sname)
        level = s.get("provisionalSkillLevel")
        n = s.get("distinctQuestionsAssessed", 0)
        c = s.get("correctFirstResponses", 0)
        p = s.get("estimatedProficiency", 0.0)

        evidence_summary = {
            "skillId": sid,
            "distinctQuestionsAssessed": n,
            "correctFirstResponses": c,
            "estimatedProficiency": p,
            "rawAccuracy": s.get("rawAccuracy", 0.0),
            "credibleIntervalWidth": s.get("credibleIntervalWidth", 0.0),
        }

        if level == LEVEL_INSUFFICIENT:
            recs.append({
                "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
                "skillId": sid,
                "strategyCode": "ASSESSMENT_EXPANSION",
                "reasonCodes": ["SKILL_EVIDENCE_INSUFFICIENT", "SAMPLE_SIZE_UNDER_3"],
                "inputEvidenceSummary": evidence_summary,
                "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
                "titleEn": f"Gather More Practice Evidence: {sname}",
                "titleSi": f"සාක්ෂි එක්රැස් කිරීම: {sname_si}",
                "descriptionEn": (
                    f"Fewer than 3 distinct items attempted for {sname}. Recommend short, varied "
                    "exploration tasks to determine readiness without premature difficulty jumps."
                ),
                "descriptionSi": (
                    f"{sname_si} සඳහා තවමත් ප්‍රශ්න 3කට අඩුවෙන් උත්සාහ කර ඇත. කුසලතා මට්ටම නිවැරදිව "
                    "තහවුරු කර ගැනීමට තවත් කෙටි අභ්‍යාස කිහිපයක් ලබා දීම සුදුසුය."
                ),
            })
        elif level == LEVEL_EMERGING:
            recs.append({
                "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
                "skillId": sid,
                "strategyCode": "SUPPORTED_PRACTICE",
                "reasonCodes": ["PROFICIENCY_EMERGING", "CONCEPT_FOUNDATION_NEEDED"],
                "inputEvidenceSummary": evidence_summary,
                "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
                "titleEn": f"Supported Foundation Practice: {sname}",
                "titleSi": f"පදනම ශක්තිමත් කිරීමේ මඟපෙන්වීම්: {sname_si}",
                "descriptionEn": (
                    f"Foundational understanding is emerging for {sname} (estimated p={p:.2f}). "
                    "Recommend interactive worked examples, visual counters, and step-by-step guidance."
                ),
                "descriptionSi": (
                    f"{sname_si} සඳහා මූලික සංකල්ප වර්ධනය වෙමින් පවතී. පියවරෙන් පියවර විසඳුම් පෙන්වාදීම "
                    "සහ සජීවී දෘශ්‍ය ආදර්ශන මඟින් දරුවාට සහාය වීම යෝජනා කෙරේ."
                ),
            })
        elif level == LEVEL_DEVELOPING:
            recs.append({
                "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
                "skillId": sid,
                "strategyCode": "SCAFFOLDED_PRACTICE",
                "reasonCodes": ["PROFICIENCY_DEVELOPING", "FLUENCY_CONSOLIDATION"],
                "inputEvidenceSummary": evidence_summary,
                "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
                "titleEn": f"Scaffolded Skill Progression: {sname}",
                "titleSi": f"අනුක්‍රමික ප්‍රගති අභ්‍යාස: {sname_si}",
                "descriptionEn": (
                    f"Solid emerging fluency in {sname} (estimated p={p:.2f}). "
                    "Recommend gradual scaffolding with medium-difficulty quests and progressive fading of hints."
                ),
                "descriptionSi": (
                    f"{sname_si} පිළිබඳ හොඳ අවබෝධයක් පෙන්නුම් කරයි. ක්‍රමයෙන් උපකාර අවම කරමින් "
                    "මධ්‍යස්ථ දුෂ්කරතාවයෙන් යුත් අභියෝග හරහා විශ්වාසය වැඩිදියුණු කරන්න."
                ),
            })
        elif level == LEVEL_PROFICIENT:
            recs.append({
                "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
                "skillId": sid,
                "strategyCode": "CHALLENGE_EXTENSION",
                "reasonCodes": ["PROFICIENCY_HIGH", "MASTERY_EXTENSION"],
                "inputEvidenceSummary": evidence_summary,
                "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
                "titleEn": f"Extension Challenges: {sname}",
                "titleSi": f"ඉදිරි අභියෝග හා නිර්මාණාත්මක ගැටළු: {sname_si}",
                "descriptionEn": (
                    f"High foundation proficiency demonstrated in {sname} (estimated p={p:.2f}). "
                    "Introduce multi-step quests, time-independent bonus puzzles, and peer sharing."
                ),
                "descriptionSi": (
                    f"{sname_si} සඳහා ඉහළ නිපුණතාවයක් නිරීක්ෂණය වේ. වැඩි පියවර සහිත ගණිත ගැටළු "
                    "සහ නිර්මාණාත්මක අභියෝග මගින් දරුවාගේ කුසලතාව තවදුරටත් පුළුල් කරන්න."
                ),
            })

    # 3. Learning Preference Adaptations
    if learning_preferences:
        audio = learning_preferences.get("audioAssistance")
        if audio in ("read_everything", "read_on_click", "always"):
            recs.append({
                "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
                "skillId": None,
                "strategyCode": "AUDIO_INSTRUCTION",
                "reasonCodes": ["AUDIO_PREFERENCE_DETECTED", "SPOKEN_GUIDANCE_ACTIVE"],
                "inputEvidenceSummary": {"audioAssistance": audio},
                "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
                "titleEn": "Audio Instructions Enabled",
                "titleSi": "ශ්‍රව්‍ය කියවීම් සහාය සක්‍රියයි",
                "descriptionEn": (
                    "Learner prefers auditory cues. Provide optional spoken Sinhala instruction "
                    "prompts and narrative audio before each mathematics challenge."
                ),
                "descriptionSi": (
                    "දරුවා ශ්‍රව්‍ය ආධාරකවලට වැඩි මනාපයක් දක්වයි. සෑම ගණිත කාර්යයකදීම පැහැදිලි සිංහල හඬ "
                    "උපදෙස් ස්වයංක්‍රීයව හෝ ක්ලික් කළ විට ලබා දෙන්න."
                ),
            })

        visual = learning_preferences.get("visualAssistance")
        hint_style = learning_preferences.get("hintStyle")
        if visual == "always" or hint_style == "visual_clue":
            recs.append({
                "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
                "skillId": None,
                "strategyCode": "VISUAL_DEMONSTRATION",
                "reasonCodes": ["VISUAL_HINT_PREFERENCE", "MULTIMODAL_SCAFFOLDING"],
                "inputEvidenceSummary": {"visualAssistance": visual, "hintStyle": hint_style},
                "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
                "titleEn": "Visual Cues & Concrete Models",
                "titleSi": "දෘශ්‍ය රූප හා ආදර්ශන භාවිතය",
                "descriptionEn": (
                    "Learner benefits from visual support. Offer color-coded diagrams, "
                    "item counters, and visual step demonstrations before textual explanations."
                ),
                "descriptionSi": (
                    "දෘශ්‍ය රූප සටහන් සහ අයිකන ආධාරයෙන් ගණිත සංකල්ප පැහැදිලි කිරීම දරුවාගේ අවබෝධය පහසු කරයි."
                ),
            })

    # 4. Social Learning Context
    if social_context:
        collab = social_context.get("peerCollaboration")
        parent_inv = social_context.get("parentInvolvement")
        if collab in ("with_sibling_peer", "group_friendly") or parent_inv == "guided_together":
            recs.append({
                "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
                "skillId": None,
                "strategyCode": "COLLABORATIVE_LEARNING",
                "reasonCodes": ["SOCIAL_COLLABORATION_PREFERENCE", "CO_PLAY_ENGAGEMENT"],
                "inputEvidenceSummary": {"peerCollaboration": collab, "parentInvolvement": parent_inv},
                "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
                "titleEn": "Co-Play & Collaborative Quests",
                "titleSi": "එකට එකතු වී විසඳන සහයෝගී ක්‍රීඩා",
                "descriptionEn": (
                    "Learner enjoys collaborative exploration. Provide optional turn-taking "
                    "math quests suitable for sibling play or guided parent co-play."
                ),
                "descriptionSi": (
                    "දෙමව්පියන් හෝ සහෝදර සහෝදරියන් සමඟ එක්ව ක්‍රීඩා කිරීමට දරුවා ප්‍රිය කරයි. "
                    "දෙදෙනෙකුට විසඳිය හැකි සහයෝගී ගණිත අභියෝග ලබා දෙන්න."
                ),
            })

    # 5. Behavioral Observation Adaptations (Hint and Attempt patterns)
    if aggregate_hints_used > 2:
        recs.append({
            "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
            "skillId": None,
            "strategyCode": "ADAPTIVE_HINT_PACING",
            "reasonCodes": ["HIGH_HINT_USAGE", "REDUCE_COGNITIVE_LOAD"],
            "inputEvidenceSummary": {"hintsUsed": aggregate_hints_used},
            "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
            "titleEn": "Proactive Scaffolded Hints",
            "titleSi": "පෙර සූදානම් කළ සහනදායී ඉඟි",
            "descriptionEn": (
                "Frequent hint requests observed. Present smaller chunked micro-steps to "
                "prevent frustration before child requests multiple hints."
            ),
            "descriptionSi": (
                "දරුවා නිතර ඉඟි භාවිතයට යොමු වන බැවින්, කාර්යයන් කුඩා කොටස්වලට කඩා "
                "පහසු මඟපෙන්වීම් මුලින්ම ලබා දීම වඩාත් ඵලදායී වේ."
            ),
        })

    if aggregate_attempts > overall_total_questions + 2:
        recs.append({
            "recommendationId": f"rec_{uuid.uuid4().hex[:8]}",
            "skillId": None,
            "strategyCode": "UNTIMED_MASTERY_PRACTICE",
            "reasonCodes": ["MULTIPLE_ATTEMPTS_OBSERVED", "ZERO_TIME_PRESSURE"],
            "inputEvidenceSummary": {"attempts": aggregate_attempts, "questions": overall_total_questions},
            "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
            "titleEn": "Unlimited Retries with Zero Penalty",
            "titleSi": "කාල පීඩනයෙන් තොර නිදහස් උත්සාහයන්",
            "descriptionEn": (
                "Learner engages in multiple trial attempts. Ensure gameplay modes avoid "
                "countdown timers or lives-lost mechanics to nurture resilient trial-and-error."
            ),
            "descriptionSi": (
                "නැවත නැවත උත්සාහ කරමින් ඉගෙනීමට දරුවා උත්සාහ කරයි. කාල සීමා හෝ ලකුණු අඩුකිරීම් "
                "නොමැතිව නිදහසේ උත්සාහ කිරීමට ඉඩ සලසන්න."
            ),
        })

    return recs


def compute_elpx_profile_from_evaluated_items(
    evaluated_items: List[Dict[str, Any]],
    grade: int,
    learner_id: str,
    learning_preferences: Optional[Dict[str, Any]] = None,
    social_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Constructs a complete versioned ELP-X learner profile from evaluated items.

    Deduplication rules:
    - Counts distinct questionIds per skill area.
    - If multiple attempts on the same questionId exist, only the FIRST response
      is counted as an independent Bernoulli trial for proficiency estimation.
    """
    now = datetime.now(timezone.utc)

    # Group evaluated items by skill, tracking distinct questionIds
    skill_map: Dict[str, Dict[str, Any]] = {}
    seen_questions: set = set()

    total_distinct_questions = 0
    total_correct_first = 0
    total_hints = 0
    total_attempts = 0

    for item in evaluated_items:
        qid = str(item.get("questionId") or item.get("activityId") or "")
        sid = item.get("skillId", "general")
        sname = item.get("skillName", sid)
        sname_si = item.get("skillNameSi", sname)

        if sid not in skill_map:
            skill_map[sid] = {
                "skillId": sid,
                "skillName": sname,
                "skillNameSi": sname_si,
                "itemsByQid": {},
            }

        # Track hints and attempts regardless of distinctness for engagement context
        hints = int(item.get("hintsUsed") or (1 if item.get("hintUsed") else 0))
        attempts = int(item.get("attempts") or 1)
        total_hints += hints
        total_attempts += attempts

        # First response on distinct item is the evidence unit
        if qid not in skill_map[sid]["itemsByQid"]:
            is_correct_first = bool(item.get("correctFirstResponse", item.get("isCorrect", False)))
            skill_map[sid]["itemsByQid"][qid] = {
                "isCorrectFirst": is_correct_first,
                "attempts": attempts,
                "hintsUsed": hints,
            }
            if qid not in seen_questions:
                seen_questions.add(qid)
                total_distinct_questions += 1
                if is_correct_first:
                    total_correct_first += 1

    # Compute skill estimates
    skill_estimates: List[Dict[str, Any]] = []
    explanation_reason_codes: List[str] = []

    for sid, sdata in skill_map.items():
        distinct_q_count = len(sdata["itemsByQid"])
        correct_first_count = sum(1 for it in sdata["itemsByQid"].values() if it["isCorrectFirst"])

        est = compute_skill_estimate(
            distinct_questions=distinct_q_count,
            correct_first_responses=correct_first_count,
        )

        estimate_record = {
            "skillId": sid,
            "skillName": sdata["skillName"],
            "skillNameSi": sdata["skillNameSi"],
            **est,
        }
        skill_estimates.append(estimate_record)

        if not est["isEvidenceSufficient"]:
            explanation_reason_codes.append(f"INSUFFICIENT_EVIDENCE:{sid}")
        else:
            explanation_reason_codes.append(f"PROVISIONAL_LEVEL:{sid}:{est['provisionalSkillLevel']}")

    # Structured recommendations
    recommendations = generate_structured_recommendations(
        skill_estimates=skill_estimates,
        overall_total_questions=total_distinct_questions,
        overall_correct_first=total_correct_first,
        learning_preferences=learning_preferences,
        social_context=social_context,
        aggregate_hints_used=total_hints,
        aggregate_attempts=total_attempts,
    )

    overall_sufficiency = (
        "SUFFICIENT"
        if total_distinct_questions >= MINIMUM_EVIDENCE_QUESTIONS_OVERALL
        else "INSUFFICIENT"
    )

    return {
        "learnerId": learner_id,
        "grade": grade,
        "profileVersion": PROFILE_SCHEMA_VERSION,
        "algorithmVersion": ALGORITHM_VERSION,
        "recommendationRulesetVersion": RECOMMENDATION_RULESET_VERSION,
        "evidenceStatus": overall_sufficiency,
        "isOverallEvidenceSufficient": overall_sufficiency == "SUFFICIENT",
        "totalDistinctQuestionsEvaluated": total_distinct_questions,
        "totalCorrectFirstResponses": total_correct_first,
        "rawOverallAccuracy": round(total_correct_first / total_distinct_questions, 4) if total_distinct_questions > 0 else 0.0,
        "skillEstimates": skill_estimates,
        "structuredRecommendations": recommendations,
        "explanationReasonCodes": explanation_reason_codes,
        "learningPreferences": learning_preferences,
        "disclaimer": RESEARCH_DISCLAIMER,
        "lastUpdated": now.isoformat(),
        # Optional ML & SHAP placeholders (None per requirements: do not generate fake predictions)
        "mlPrediction": None,
        "shapValues": None,
    }
