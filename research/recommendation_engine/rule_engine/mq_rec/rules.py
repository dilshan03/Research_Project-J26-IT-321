"""
Deterministic educational rule functions (MQ-REC v0.1).

Only rules that are evidence-supported, implementation-ready and non-duplicating are enabled.
Every other rule in personalization_rules_v0.1.md is registered as DISABLED with its reason, so
the trace shows exactly what was and was not evaluated.

Rules read ELP-X skill levels as given; they never recompute proficiency, posteriors or
credible intervals, and never emit ELP-X-REC baseline strategy codes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

from .context import LearnerContext, SkillEvidence

# Rule trace statuses
TRIGGERED = "TRIGGERED"
NOT_TRIGGERED = "NOT_TRIGGERED"
INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
MISSING_INPUT = "MISSING_INPUT"
SAFEGUARD_APPLIED = "SAFEGUARD_APPLIED"
DISABLED = "DISABLED"


@dataclass
class Condition:
    """One evaluated condition. `result` is None when the input was missing (nothing assumed)."""

    feature: str
    source: Optional[str]
    value: Any
    test: str
    result: Optional[bool]

    def to_dict(self) -> Dict[str, Any]:
        return {"feature": self.feature, "source": self.source, "value": self.value,
                "test": self.test, "result": self.result}


@dataclass
class Outcome:
    status: str
    conditions: List[Condition] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    notices: List[Dict[str, str]] = field(default_factory=list)


@dataclass(frozen=True)
class RuleSpec:
    ruleId: str
    name: str
    category: str
    priority: int
    specStatus: str
    enabled: bool
    fn: Optional[Callable[[LearnerContext], Outcome]] = None
    disabledReason: Optional[str] = None
    expertReviewPending: Tuple[str, ...] = ()


def _notice(code: str, message: str) -> Dict[str, str]:
    return {"code": code, "message": message}


def _rec(rule_id: str, priority: int, strategy: str, skill_id: Optional[str], reason_codes: List[str],
         evidence_summary: Dict[str, Any], title_en: str, title_si: str, action: str,
         explanation_en: str, explanation_si: str, why: str,
         interacts_with_elpx: Optional[Dict[str, str]] = None,
         conflicts: Optional[List[Dict[str, str]]] = None,
         expert_review: Tuple[str, ...] = ()) -> Dict[str, Any]:
    return {
        # Deterministic ID: same input always yields the same identifier.
        "recommendationId": f"{rule_id}:{strategy}:{skill_id or 'learner'}",
        "ruleId": rule_id,
        "strategyCode": strategy,
        "skillId": skill_id,
        "priority": priority,
        "optional": True,  # every recommendation is an offer of support, never a requirement
        "reasonCodes": reason_codes,
        "inputEvidenceSummary": evidence_summary,
        "titleEn": title_en,
        "titleSi": title_si,
        "action": action,
        "why": why,
        "explanationEn": explanation_en,
        "explanationSi": explanation_si,
        "interactsWithElpx": interacts_with_elpx,
        "conflicts": conflicts or [],
        "expertReviewPending": list(expert_review),
    }


# --------------------------------------------------------------------------------------------
# MQ-RS1-01  Child-expressed sensory comfort priority
# --------------------------------------------------------------------------------------------

def rule_rs1_01(ctx: LearnerContext) -> Outcome:
    child, prefs = ctx.childPreferences, ctx.learningPreferences
    if child is None:
        return Outcome(MISSING_INPUT, [Condition("childPreferences", None, None, "present", None)], notices=[
            _notice("CHILD_PREFERENCES_MISSING",
                    "Child preferences were not provided; the parent's audio setting is kept unchanged."),
        ])

    from_child = child.provenance.source == "child"
    quiet = child.soundMode in ("quiet", "off") if child.soundMode is not None else None
    parent_audio = prefs.audioAssistance if prefs else None
    auto_audio = (parent_audio == "read_everything") if parent_audio is not None else None
    conds = [
        Condition("childPreferences.provenance.source", child.provenance.source, child.provenance.source,
                  "== 'child'", from_child),
        Condition("childPreferences.soundMode", child.provenance.source, child.soundMode, "in ['quiet', 'off']", quiet),
        Condition("learningPreferences.audioAssistance", "parent" if prefs else None, parent_audio,
                  "== 'read_everything'", auto_audio),
    ]
    notices = []
    if not from_child:
        notices.append(_notice("CHILD_PREFERENCES_NOT_FROM_CHILD",
                               "Sound preference was not recorded from the child, so child-agency priority does not apply."))
    if not (from_child and quiet and auto_audio):
        return Outcome(NOT_TRIGGERED, conds, notices=notices)

    return Outcome(TRIGGERED, conds, recommendations=[_rec(
        "MQ-RS1-01", 1, "CHILD_SENSORY_PREFERENCE", None,
        ["CHILD_AGENCY_PRIORITY", "TAP_TO_HEAR_AUDIO"],
        {"childPreferences.soundMode": child.soundMode, "childPreferences.source": "child",
         "learningPreferences.audioAssistance": parent_audio},
        "Honour the child's quiet sound choice", "දරුවා තෝරාගත් නිහඬ ශබ්ද මාදිලියට ගරු කිරීම",
        "Mute ambient and background sound; offer spoken prompts as optional tap-to-hear instead of automatic narration.",
        "Your child selected quiet sound mode. Spoken guidance is set to 'tap-to-hear' so audio plays only when "
        "clicked, supporting calm focus.",
        "දරුවා නිහඬ ශබ්ද මාදිලිය තෝරාගෙන ඇත. එමනිසා අවශ්‍ය විටෙක පමණක් ක්ලික් කර ශ්‍රව්‍ය උපදෙස් ලබා ගැනීමට සකසා ඇත.",
        f"The child chose soundMode '{child.soundMode}' while the parent setting is 'read_everything'.",
        interacts_with_elpx={"code": "AUDIO_INSTRUCTION",
                             "relation": "adjusts delivery of the ELP-X audio recommendation from automatic to tap-to-hear"},
        conflicts=[{"between": "childPreferences.soundMode vs learningPreferences.audioAssistance",
                    "resolution": "child sensory choice honoured (catalogue Conflict Rule 2); audio stays available on tap"}],
    )], notices=notices)


# --------------------------------------------------------------------------------------------
# MQ-RS2-01  Concrete-Representational-Abstract scaffolding for EMERGING skills
# --------------------------------------------------------------------------------------------

def _skill_label(s: SkillEvidence) -> str:
    return s.skillName or s.skillId


def rule_rs2_01(ctx: LearnerContext) -> Outcome:
    if ctx.mathEvidence is None or not ctx.mathEvidence.skills:
        return Outcome(MISSING_INPUT, [Condition("mathEvidence.skills", None, None, "present", None)])

    visual = ctx.learningPreferences.visualAssistance if ctx.learningPreferences else None
    conds, recs = [], []
    insufficient = 0
    for s in ctx.mathEvidence.skills:
        emerging = s.provisionalSkillLevel == "EMERGING"
        conds.append(Condition(f"skills[{s.skillId}].provisionalSkillLevel", "assessment",
                               s.provisionalSkillLevel, "== 'EMERGING' (ELP-X level, already evidence-gated)", emerging))
        if s.provisionalSkillLevel == "INSUFFICIENT_EVIDENCE":
            insufficient += 1
            continue
        if not emerging:
            continue
        if s.isEvidenceSufficient is False:
            # Inconsistent input: do not guess which value is right.
            conds.append(Condition(f"skills[{s.skillId}].isEvidenceSufficient", "assessment", False, "is not False", False))
            continue
        conflicts = []
        if visual == "minimal":
            conflicts.append({
                "between": "learningPreferences.visualAssistance='minimal' vs emerging-skill evidence",
                "resolution": "concrete and pictorial supports are offered as optional; the parent preference is "
                              "recorded for parent/teacher review, not overridden",
            })
        recs.append(_rec(
            "MQ-RS2-01", 3, "CRA_SCAFFOLDING", s.skillId,
            ["CONCRETE_MODEL_RECOMMENDED", "REPRESENTATION_SCAFFOLD"],
            {"skillId": s.skillId, "provisionalSkillLevel": s.provisionalSkillLevel,
             "distinctQuestionsAssessed": s.distinctQuestionsAssessed, "levelSource": "ELP-X (not recalculated)",
             "learningPreferences.visualAssistance": visual},
            f"Visual & concrete object support: {_skill_label(s)}", "ප්‍රත්‍යක්ෂ භාණ්ඩ හා දෘශ්‍ය ආදර්ශන",
            "Offer virtual counters or objects first, then pictures, then numerals for this skill.",
            "The learner is developing foundational understanding. We recommend using virtual counters and "
            "pictorial models before practicing abstract numbers.",
            "මූලික සංකල්ප වර්ධනය වෙමින් පවතී. වියුක්ත සමීකරණ වලට පෙර, ගණන් කළ හැකි දෘශ්‍ය රූප ආධාරයෙන් පුහුණු වීම නිර්දේශ කෙරේ.",
            f"ELP-X reports skill '{s.skillId}' as EMERGING with sufficient evidence "
            f"({s.distinctQuestionsAssessed if s.distinctQuestionsAssessed is not None else 'unknown'} items).",
            interacts_with_elpx={"code": "SUPPORTED_PRACTICE",
                                 "relation": "complements the ELP-X recommendation for the same skill with a CRA progression"},
            conflicts=conflicts,
            expert_review=("Item counts for moving from concrete to pictorial to abstract are not defined (IES Rec 3).",),
        ))

    if recs:
        status = TRIGGERED
    elif insufficient:
        status = INSUFFICIENT_EVIDENCE
    else:
        status = NOT_TRIGGERED
    return Outcome(status, conds, recommendations=recs)


# --------------------------------------------------------------------------------------------
# MQ-RS2-02  Micro-task chunking (parent pace-preference branch only)
# --------------------------------------------------------------------------------------------

def rule_rs2_02(ctx: LearnerContext) -> Outcome:
    disabled_branch = Condition(
        "aggregate_hints_used", None, None,
        ">= 2 (branch DISABLED: unvalidated threshold; overlaps ELP-X ADAPTIVE_HINT_PACING)", None,
    )
    prefs = ctx.learningPreferences
    if prefs is None or prefs.activityPace is None:
        return Outcome(MISSING_INPUT, [
            Condition("learningPreferences.activityPace", None, None, "== 'calm_step_by_step'", None),
            disabled_branch,
        ])

    calm = prefs.activityPace == "calm_step_by_step"
    conds = [
        Condition("learningPreferences.activityPace", "parent", prefs.activityPace, "== 'calm_step_by_step'", calm),
        disabled_branch,
        Condition("task_step_count", None, None, "> 1 (applied at delivery time; telemetry not available here)", None),
    ]
    if not calm:
        return Outcome(NOT_TRIGGERED, conds)

    return Outcome(TRIGGERED, conds, recommendations=[_rec(
        "MQ-RS2-02", 4, "TASK_CHUNKING", None,
        ["WORKING_MEMORY_SUPPORT", "MULTI_STEP_DECONSTRUCTION", "PARENT_PACE_PREFERENCE"],
        {"learningPreferences.activityPace": prefs.activityPace, "aggregate_hints_used": None,
         "task_step_count": None},
        "Manageable step-by-step quests", "පියවරෙන් පියවර විසඳන කෙටි අභියෝග",
        "For multi-step tasks only: present one step at a time with a short confirmation before the next step.",
        "The learner engages best when multi-step problems are divided into bite-sized milestones. Breaking goals "
        "down reduces cognitive overload and helps maintain focus.",
        "දිගු ගණිත ගැටළු කුඩා පියවර වලට වෙන් කර ඉදිරිපත් කිරීමෙන් දරුවාගේ මතකයට වන වෙහෙස අවම වන අතර අවධානය රඳවා ගැනීම පහසු වේ.",
        "The parent selected a calm, step-by-step activity pace.",
        interacts_with_elpx={"code": "ADAPTIVE_HINT_PACING",
                             "relation": "preference-based; the hint-count trigger stays with ELP-X and is not duplicated"},
        expert_review=("Step granularity for Grades 1–2 vs 4–5 needs educator calibration (BCH Skill 6).",),
    )])


# --------------------------------------------------------------------------------------------
# MQ-RS2-04  Accessible numbers when a concept is explicitly being introduced
# --------------------------------------------------------------------------------------------

def rule_rs2_04(ctx: LearnerContext) -> Outcome:
    """
    Requires explicit, provenance-backed evidence that a concept is being introduced. A missing or
    insufficient ELP-X estimate only means the learner's knowledge is unknown; on its own it never
    triggers this rule. No grade-specific number limits are applied.
    """
    intro = ctx.conceptIntroduction
    if intro is None or not intro.concepts:
        return Outcome(MISSING_INPUT, [
            Condition("conceptIntroduction.concepts[].stage", None, None,
                      "== 'introduction' (explicit, provenance-backed)", None),
        ], notices=[_notice(
            "CONCEPT_INTRODUCTION_EVIDENCE_MISSING",
            "No explicit, provenance-backed evidence that a concept is being introduced was provided, so the "
            "accessible-numbers rule (MQ-RS2-04) was not applied. A missing ELP-X estimate only means the learner's "
            "knowledge is unknown; it is not treated as a new concept.",
        )])

    levels = {s.skillId: s.provisionalSkillLevel for s in ctx.mathEvidence.skills} if ctx.mathEvidence else {}
    source = f"{intro.provenance.source}:{intro.provenance.instrument}"
    conds, recs, notices = [], [], []
    for c in intro.concepts:
        introducing = c.stage == "introduction"
        level = levels.get(c.skillId)
        no_established_estimate = level in (None, "INSUFFICIENT_EVIDENCE")
        conds.append(Condition(f"conceptIntroduction[{c.skillId}].stage", intro.provenance.source, c.stage,
                               "== 'introduction'", introducing))
        conds.append(Condition(f"skills[{c.skillId}].provisionalSkillLevel", "assessment" if level else None, level,
                               "no established ELP-X estimate (absent or INSUFFICIENT_EVIDENCE)", no_established_estimate))
        if not introducing:
            continue
        if not no_established_estimate:
            notices.append(_notice(
                "CONCEPT_ALREADY_ESTIMATED",
                f"Concept '{c.skillId}' is marked as being introduced, but ELP-X already has a {level} estimate for this "
                "learner; accessible numbers were not recommended. Please check the introduction record.",
            ))
            continue
        recs.append(_rec(
            "MQ-RS2-04", 3, "ACCESSIBLE_NUMBERS", c.skillId,
            ["CONCEPT_INTRODUCTION_PHASE", "CALCULATION_LOAD_REDUCTION"],
            {"skillId": c.skillId, "conceptId": c.conceptId, "stage": c.stage, "stageBasis": c.basis,
             "stageSource": source, "provisionalSkillLevel": level},
            f"Practice with familiar, accessible numbers: {c.conceptId or c.skillId}", "හුරුපුරුදු සරල සංඛ්‍යා භාවිතය",
            "While this concept is being introduced, use small, familiar numbers before larger values.",
            "When introducing this new math concept, small, friendly numbers are used so your child can master the "
            "mathematical idea before tackling larger calculations.",
            "නව ගණිත සංකල්පයක් හඳුන්වා දීමේදී සරල සංඛ්‍යා භාවිත කෙරේ. එමගින් ගණනය කිරීමේ බරකින් තොරව සංකල්පය තේරුම් ගැනීමට හැකි වේ.",
            f"Concept '{c.conceptId or c.skillId}' is recorded as being introduced ({c.basis}; source {source}) and "
            "there is no established ELP-X estimate for it.",
            interacts_with_elpx={"code": "ASSESSMENT_EXPANSION",
                                 "relation": "complements ELP-X while evidence for the concept is gathered"},
            expert_review=("Specific number ranges are not defined here; any limits need reviewed curriculum justification.",),
        ))
    return Outcome(TRIGGERED if recs else NOT_TRIGGERED, conds, recommendations=recs, notices=notices)


# --------------------------------------------------------------------------------------------
# MQ-RS3-02  Response latency is never used against the learner (safeguard)
# --------------------------------------------------------------------------------------------

def rule_rs3_02(ctx: LearnerContext) -> Outcome:
    latency = ctx.interactionObservations.responseLatencySeconds if ctx.interactionObservations else None
    cond = Condition("interactionObservations.responseLatencySeconds", "telemetry" if latency is not None else None,
                     latency, "excluded from all rule inputs", None)
    notices = []
    if latency is not None:
        notices.append(_notice("LATENCY_NOT_USED",
                               f"Response time ({latency}s) was recorded but is not used by any rule; taking time to think "
                               "is never treated as a skill or attention signal."))
    return Outcome(SAFEGUARD_APPLIED, [cond], notices=notices)


# --------------------------------------------------------------------------------------------
# MQ-RS3-03  Sparse evidence: consume the ELP-X sufficiency result (no recalculation)
# --------------------------------------------------------------------------------------------

def rule_rs3_03(ctx: LearnerContext) -> Outcome:
    if ctx.mathEvidence is None or not ctx.mathEvidence.skills:
        return Outcome(MISSING_INPUT, [Condition("mathEvidence.skills", None, None, "present", None)], notices=[
            _notice("NO_MATH_EVIDENCE",
                    "No mathematics evidence was provided; no skill-based recommendations can be made and no level is assumed."),
        ])
    conds, notices = [], []
    for s in ctx.mathEvidence.skills:
        sparse = s.provisionalSkillLevel == "INSUFFICIENT_EVIDENCE"
        conds.append(Condition(f"skills[{s.skillId}].provisionalSkillLevel", "assessment",
                               s.provisionalSkillLevel, "== 'INSUFFICIENT_EVIDENCE'", sparse))
        if sparse:
            n = s.distinctQuestionsAssessed
            notices.append(_notice(
                "SKILL_EVIDENCE_INSUFFICIENT",
                f"Skill '{s.skillId}': ELP-X reports insufficient evidence (n={n if n is not None else 'unknown'}), so the "
                "learner's knowledge of it is unknown (not assumed to be new). Proficiency-based scaffolding is "
                "suppressed; ELP-X ASSESSMENT_EXPANSION already covers gathering more evidence. The n < 3 cut-off is an "
                "ELP-X engineering heuristic, not a validated threshold.",
            ))
    return Outcome(INSUFFICIENT_EVIDENCE if notices else NOT_TRIGGERED, conds, notices=notices)


# --------------------------------------------------------------------------------------------
# Registry: all 18 specified rules, in specification order
# --------------------------------------------------------------------------------------------

REGISTRY: Tuple[RuleSpec, ...] = (
    RuleSpec("MQ-RS1-01", "Child sensory agency over adult default configuration", "RS1", 1,
             "Literature-informed proposal", True, rule_rs1_01),
    RuleSpec("MQ-RS1-02", "Contextual accommodations for high inattention screening indicators", "RS1", 4,
             "Literature-informed proposal; cutoff requires expert review", False,
             disabledReason="Requires a SNAP-IV inattention cutoff (1.78) that is not normed for Sri Lankan children and "
                            "needs expert review. SNAP-IV cutoffs must not drive recommendations.",
             expertReviewPending=("SNAP-IV cutoff for Sri Lankan cohorts",)),
    RuleSpec("MQ-RS1-03", "Collaborative learning & reassurance alignment", "RS1", 4,
             "Supervisor-accepted concept", False,
             disabledReason="Equivalent co-play recommendation is already produced by ELP-X-REC (COLLABORATIVE_LEARNING); "
                            "not duplicated."),
    RuleSpec("MQ-RS2-01", "Concrete-Representational-Abstract visual scaffolding", "RS2", 3,
             "Supervisor-accepted concept", True, rule_rs2_01),
    RuleSpec("MQ-RS2-02", "Working memory offloading via step-by-step task chunking", "RS2", 4,
             "Literature-informed proposal (preference branch only)", True, rule_rs2_02,
             expertReviewPending=("Hint-count trigger (>= 2) is unvalidated and stays disabled",)),
    RuleSpec("MQ-RS2-03", "Optional cognitive fatigue relief pause", "RS2", 4,
             "Supervisor-revision-pending", False,
             disabledReason="Trigger needs a 15-minute session threshold without empirical basis and a pre-session "
                            "check-in that does not exist yet; expert log R6 = revision required. Breaks are never imposed.",
             expertReviewPending=("Non-intrusive fatigue observables", "Break modality")),
    RuleSpec("MQ-RS2-04", "Accessible number magnitude during conceptual introduction", "RS2", 3,
             "Literature-informed proposal (strong WWC evidence); input-gated", True, rule_rs2_04,
             expertReviewPending=("Explicit concept-introduction evidence is not yet produced by any MathQuest source",
                                  "Number ranges for introduction need reviewed curriculum justification")),
    RuleSpec("MQ-RS3-01", "Unassisted mathematical independence isolation", "RS3", 2,
             "Supervisor-accepted concept", False,
             disabledReason="Unassisted first-response isolation and Beta-Binomial scoring already run in the "
                            "learner-profile-service (ASSESS-EVIDENCE-v1.0 / provisional IMPSA); not duplicated."),
    RuleSpec("MQ-RS3-02", "Response time decoupling from mathematical ability", "RS3", 2,
             "Supervisor-accepted concept (safeguard; no latency threshold used)", True, rule_rs3_02),
    RuleSpec("MQ-RS3-03", "Uncertainty reporting for sparse observations", "RS3", 2,
             "Supervisor-accepted in principle (consumes ELP-X result)", True, rule_rs3_03),
    RuleSpec("MQ-RS4-01", "Dynamic scaffolding & unassisted transfer separation", "RS4", 3,
             "Supervisor-accepted concept", False,
             disabledReason="Assisted/unassisted separation is already enforced by the onboarding-v2 evidence rules; "
                            "not duplicated."),
    RuleSpec("MQ-RS4-02", "Flexible transfer interval scheduling", "RS4", 4,
             "Supervisor-revision-pending", False,
             disabledReason="Transfer scheduling window requires expert review (expert log R4 = revision required); "
                            "session-sequence data is not available.",
             expertReviewPending=("Transfer delay interval",)),
    RuleSpec("MQ-RS4-03", "Categorical learning readiness status", "RS4", 3,
             "Literature-informed proposal", False,
             disabledReason="Categorical IMLR status is already produced by the learner-profile-service; not duplicated."),
    RuleSpec("MQ-RS5-01", "Multi-session cumulative skill evidence", "RS5", 3,
             "Literature-informed proposal", False,
             disabledReason="Multi-session Bayesian consolidation belongs to ELP-X and needs longitudinal history; "
                            "not duplicated."),
    RuleSpec("MQ-RS5-02", "Longitudinal questionnaire tracking & non-equivalence safeguard", "RS5", 2,
             "Supervisor-accepted concept; interval requires expert review", False,
             disabledReason="Repeat interval (4–6 months) requires expert review; historical questionnaire timestamps "
                            "are not available.",
             expertReviewPending=("Minimum repeat interval",)),
    RuleSpec("MQ-RS6-01", "Absolute prohibition of in-game clinical diagnosis", "RS6", 0,
             "Supervisor-accepted (mandatory)", True),
    RuleSpec("MQ-RS6-02", "Touchscreen usability disambiguation", "RS6", 2,
             "Supervisor-accepted concept; threshold uncalibrated", False,
             disabledReason="The missed-drop threshold (>= 3) is not empirically calibrated and needs expert review. "
                            "Missed drops are reported as an observation notice only.",
             expertReviewPending=("Missed-drop threshold",)),
    RuleSpec("MQ-RS6-03", "Human-auditable transparent reason codes", "RS6", 1,
             "Supervisor-accepted concept", True),
)
