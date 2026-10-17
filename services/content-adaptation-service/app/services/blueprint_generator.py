"""
Blueprint generator: converts a curriculum question into an ADHD-friendly
GameActivityBlueprint using the CLI score, derived game settings,
deterministic MathVerificationService, and Gaja mascot narrative enrichment.
"""
import uuid
from typing import List, Optional, Tuple

from app.schemas.game_blueprint import (
    ADHDGameSettings,
    GameActivityBlueprint,
    GameChoiceOption,
    GameMicroStep,
    VisualAssetTag,
)
from app.schemas.syllabus import (
    CurriculumProblem,
    CustomADHDGameSettings,
    StoryNarrative,
    StudentBehaviorProfile,
)
from app.services.cognitive_load import (
    build_custom_adhd_game_settings,
    calculate_custom_cli,
    compute_cli,
    derive_adhd_game_settings,
)
from app.services.llm_extractor import MathVerificationService, enrich_gameplay_narrative
from app.services.problem_parser import OPERATION_SYMBOLS, ParsedProblem, _apply, parse_problem

OPERATION_LABELS = {
    "ADD": ("එකතු කිරීම (+)", "Addition (+)"),
    "SUB": ("අඩු කිරීම (−)", "Subtraction (−)"),
    "MUL": ("ගුණ කිරීම (×)", "Multiplication (×)"),
    "DIV": ("බෙදීම (÷)", "Division (÷)"),
    "COUNT": ("ගණන් කිරීම", "Counting"),
    "COMPARE": ("ප්‍රමාණ සැසඳීම", "Comparison"),
    "IDENTIFY": ("හඳුනා ගැනීම", "Identification"),
}

# Which wrong operator an impulsive learner most often picks.
OPERATOR_CONFUSIONS = {
    "ADD": ["SUB", "MUL", "DIV"],
    "SUB": ["ADD", "DIV", "MUL"],
    "MUL": ["ADD", "DIV", "SUB"],
    "DIV": ["SUB", "MUL", "ADD"],
}


def _quantity_asset(is_money: bool) -> VisualAssetTag:
    return VisualAssetTag.COIN_BAG if is_money else VisualAssetTag.FRUIT_BASKET


def _default_theme(is_money: bool, topic: str, op: Optional[str] = None) -> str:
    if is_money or "money" in topic.lower():
        return "VILLAGE_MARKET"
    if op in ("MUL", "DIV") or "multiplication" in topic.lower() or "division" in topic.lower():
        return "SPACE_QUEST"
    return "JUNGLE_ADVENTURE"


def _shuffle(options: List[GameChoiceOption], seed: int) -> List[GameChoiceOption]:
    """Deterministic rotation so the correct answer is not always first."""
    if not options:
        return options
    k = seed % len(options)
    return options[k:] + options[:k]


def _numeric_options(
    correct: int,
    distractor_count: int,
    operands: List[int],
    op: str,
) -> List[GameChoiceOption]:
    """Builds one correct option plus algorithmically generated ADHD-profiled distractors."""
    options = [GameChoiceOption(
        text_si=str(correct), text_en=str(correct), numeric_value=correct,
        is_correct=True, distractor_type="NONE",
    )]

    # Use deterministic cognitive distractor generator
    distractors = MathVerificationService.generate_cognitive_distractors(
        correct_answer=correct,
        operands=operands,
        operation=op,
        distractor_count=distractor_count,
    )

    for val, dtype, rationale in distractors:
        options.append(GameChoiceOption(
            text_si=str(val),
            text_en=str(val),
            numeric_value=val,
            is_correct=False,
            distractor_type=dtype,  # type: ignore
            distractor_rationale=rationale,
        ))

    return _shuffle(options, seed=correct + len(operands))


def _operator_options(correct_op: str, distractor_count: int) -> List[GameChoiceOption]:
    si, en = OPERATION_LABELS.get(correct_op, (f"{correct_op}", f"{correct_op}"))
    options = [GameChoiceOption(text_si=si, text_en=en, is_correct=True, distractor_type="NONE")]
    for op in OPERATOR_CONFUSIONS.get(correct_op, ["ADD", "SUB", "MUL"])[:distractor_count]:
        dsi, den = OPERATION_LABELS.get(op, (f"{op}", f"{op}"))
        options.append(GameChoiceOption(
            text_si=dsi, text_en=den, is_correct=False, distractor_type="IMPULSIVITY",
            distractor_rationale="Selects an operator by surface cue without reading the full problem.",
        ))
    return _shuffle(options, seed=len(correct_op) + 3)


def _identify_step(operands: List[int], order: int, settings: ADHDGameSettings, is_money: bool) -> GameMicroStep:
    a = operands[0]
    b = operands[1] if len(operands) > 1 else operands[0]
    correct = f"{a}, {b}" if len(operands) > 1 else f"{a}"
    opts = [GameChoiceOption(text_si=correct, text_en=correct, is_correct=True, distractor_type="NONE")]
    wrong = [
        (f"{a}, {a + b}" if len(operands) > 1 else f"{a + 1}", "WORKING_MEMORY_OVERFLOW", "Confuses intermediate count with quantity."),
        (f"{b}", "IMPULSIVITY", "Quickly picks single salient number without scanning both."),
        (f"{a + 1}, {b}" if len(operands) > 1 else f"{max(0, a - 1)}", "MAGNITUDE_SLIP", "Off-by-one error reading the numbers."),
        (f"{a}", "IMPULSIVITY", "Picks first observed number immediately."),
    ]
    for text, dtype, rat in wrong[: settings.distractor_count]:
        opts.append(GameChoiceOption(
            text_si=text, text_en=text, is_correct=False, distractor_type=dtype,  # type: ignore
            distractor_rationale=rat,
        ))
    return GameMicroStep(
        step_order=order,
        action_type="IDENTIFY_ENTITY",
        instruction_si="ගැටලුවේ ඇති සංඛ්‍යා හඳුනාගන්න",
        instruction_en="Find the quantities in the problem",
        target_visual_asset=_quantity_asset(is_money),
        correct_target_value=correct,
        game_options=_shuffle(opts, seed=a + b),
        operands=operands,
    )


def _operator_step(op: str, order: int, settings: ADHDGameSettings, operands: List[int]) -> GameMicroStep:
    return GameMicroStep(
        step_order=order,
        action_type="SELECT_OPERATOR",
        instruction_si="නිවැරදි ගණිත ක්‍රියාව තෝරන්න",
        instruction_en="Choose the correct operation",
        target_visual_asset=VisualAssetTag.OPERATOR_CHEST,
        correct_target_value=OPERATION_SYMBOLS.get(op, "+"),
        game_options=_operator_options(op, min(settings.distractor_count, 3)),
        operands=operands,
        operation=op,  # type: ignore
    )


def _calc_step(
    order: int,
    correct: int,
    operands: List[int],
    op: str,
    settings: ADHDGameSettings,
    final: bool = True,
) -> GameMicroStep:
    return GameMicroStep(
        step_order=order,
        action_type="CALCULATE_MICROSTEP",
        instruction_si="දැන් අවසන් පිළිතුර සොයන්න" if final else "පළමුව මෙය ගණනය කරන්න",
        instruction_en="Now find the answer" if final else "First, calculate this part",
        target_visual_asset=VisualAssetTag.NUMBER_BLOCK,
        correct_target_value=str(correct),
        game_options=_numeric_options(correct, settings.distractor_count, operands, op),
        operands=operands,
        operation=op,  # type: ignore
    )


def build_micro_steps(
    operands: List[int],
    operations: List[str],
    final_answer: int,
    settings: ADHDGameSettings,
    is_money: bool = False,
    partial_results: Optional[List[int]] = None,
    grade: int = 2,
) -> List[GameMicroStep]:
    op = operations[0] if operations else ("COUNT" if grade == 1 else "ADD")

    if op == "SHAPE":
        shape_opts = [
            GameChoiceOption(text_si="රවුම (Circle)", text_en="Circle", numeric_value=1, is_correct=True, distractor_type="NONE", icon_or_shape="CIRCLE"),
            GameChoiceOption(text_si="ත්‍රිකෝණය (Triangle)", text_en="Triangle", numeric_value=2, is_correct=False, distractor_type="IMPULSIVITY", icon_or_shape="TRIANGLE"),
            GameChoiceOption(text_si="කොටුව (Square)", text_en="Square", numeric_value=3, is_correct=False, distractor_type="MAGNITUDE_SLIP", icon_or_shape="SQUARE"),
        ]
        return [
            GameMicroStep(
                step_order=1,
                action_type="MATCH_SHAPE",
                instruction_si="ගජා සොයන රවුම් හැඩය හඳුනාගන්න 🟡",
                instruction_en="Identify the circle shape Gaja is looking for 🟡",
                target_visual_asset=VisualAssetTag.SHAPE_CARD,
                correct_target_value="1",
                game_options=shape_opts,
                operands=[1],
                operation="SHAPE",
            )
        ]

    if op == "PATTERN":
        pattern_opts = [
            GameChoiceOption(text_si="නිල් පාට (Blue)", text_en="Blue", numeric_value=2, is_correct=True, distractor_type="NONE", icon_or_shape="BLUE"),
            GameChoiceOption(text_si="රතු පාට (Red)", text_en="Red", numeric_value=1, is_correct=False, distractor_type="IMPULSIVITY", icon_or_shape="RED"),
            GameChoiceOption(text_si="කහ පාට (Yellow)", text_en="Yellow", numeric_value=3, is_correct=False, distractor_type="MAGNITUDE_SLIP", icon_or_shape="YELLOW"),
        ]
        return [
            GameMicroStep(
                step_order=1,
                action_type="COMPLETE_PATTERN",
                instruction_si="රටාවේ හිස් තැනට එන නිවැරදි වර්ණය හෝ හැඩය තෝරන්න 🚂",
                instruction_en="Choose what comes next in the pattern 🚂",
                target_visual_asset=VisualAssetTag.PATTERN_TRAIN,
                correct_target_value="2",
                game_options=pattern_opts,
                operands=[2],
                operation="PATTERN",
            )
        ]

    if op == "COMPARE":
        comp_opts = [
            GameChoiceOption(text_si="විශාල ප්‍රමාණය (Bigger)", text_en="Bigger", numeric_value=final_answer, is_correct=True, distractor_type="NONE"),
            GameChoiceOption(text_si="කුඩා ප්‍රමාණය (Smaller)", text_en="Smaller", numeric_value=min(operands) if len(operands) > 1 else 1, is_correct=False, distractor_type="IMPULSIVITY"),
        ]
        return [
            GameMicroStep(
                step_order=1,
                action_type="COMPARE_QUANTITY",
                instruction_si="වඩා විශාල හෝ වැඩි ප්‍රමාණය තෝරන්න 🐘",
                instruction_en="Select the bigger or greater amount 🐘",
                target_visual_asset=VisualAssetTag.COMPARISON_SCALE,
                correct_target_value=str(final_answer),
                game_options=comp_opts,
                operands=operands,
                operation="COMPARE",
            )
        ]

    # SPECIALIZED GRADE 1 WORKFLOW:
    # In Sri Lanka, Grade 1 does not use formal addition/subtraction signs (+, -).
    # Instead, learners identify items (NumberHunt/BasketCount) and pick the count/item directly.
    if grade == 1 or op in ("COUNT", "IDENTIFY"):
        steps: List[GameMicroStep] = [
            GameMicroStep(
                step_order=1,
                action_type="IDENTIFY_ENTITY",
                instruction_si="ප්‍රශ්නයේ ඇති ද්‍රව්‍ය ගණන සොයා බලන්න",
                instruction_en="Find and count the items in the problem",
                target_visual_asset=_quantity_asset(is_money),
                correct_target_value=str(final_answer),
                game_options=_numeric_options(final_answer, settings.distractor_count, operands, op),
                operands=operands,
                operation=op,  # type: ignore
            ),
            GameMicroStep(
                step_order=2,
                action_type="CALCULATE_MICROSTEP",
                instruction_si="නිවැරදි පිළිතුර තෝරන්න",
                instruction_en="Select the correct count or answer",
                target_visual_asset=VisualAssetTag.NUMBER_BLOCK,
                correct_target_value=str(final_answer),
                game_options=_numeric_options(final_answer, settings.distractor_count, operands, op),
                operands=operands,
                operation=op,  # type: ignore
            ),
        ]
        return steps

    if len(operands) < 2:
        raise ValueError("Could not find at least two numeric quantities in the question.")

    # Multi-step balance pattern (Grade 3-5 e.g., sum items, then subtract from paid note)
    if len(operations) >= 2 and partial_results:
        subtotal = partial_results[0]
        paid = operands[-1]
        items = operands[:-1]
        return [
            _operator_step(operations[0], 1, settings, operands=items),
            _calc_step(2, subtotal, operands=items, op=operations[0], settings=settings, final=False),
            _calc_step(3, final_answer, operands=[paid, subtotal], op=operations[-1], settings=settings, final=True),
        ]

    # Standard Arithmetic Workflow (Grade 2 to 5)
    steps: List[GameMicroStep] = []
    if settings.step_granularity == "MAXIMAL_THREE_TIER":
        steps.append(_identify_step(operands[:2], 1, settings, is_money))
    steps.append(_operator_step(op, len(steps) + 1, settings, operands=operands[:2]))
    steps.append(_calc_step(len(steps) + 1, final_answer, operands=operands[:2], op=op, settings=settings, final=True))
    return steps


def generate_blueprint(
    source_question_id: str,
    grade: int,
    topic: str,
    raw_sinhala_question: str,
    adhd_risk_level: str,
    operation_hint: Optional[str] = None,
    game_theme: Optional[str] = None,
    story_narrative: Optional[StoryNarrative] = None,
) -> Tuple[GameActivityBlueprint, float, ParsedProblem]:
    """Generates an ADHD-friendly GameActivityBlueprint from raw Sinhala text."""
    parsed = parse_problem(raw_sinhala_question, operation_hint)
    if not parsed.numbers or parsed.final_answer is None:
        raise ValueError("Could not find numeric quantities in the question.")

    if grade == 1 or "count" in topic.lower() or "compare" in topic.lower():
        if not parsed.operations:
            parsed.operations = ["COUNT"]
    else:
        if len(parsed.numbers) < 2:
            raise ValueError("Could not find at least two numeric quantities in the question.")

    op_count = max(1, len(parsed.operations))
    cli = compute_cli(raw_sinhala_question, operation_count=op_count)
    settings = derive_adhd_game_settings(cli, adhd_risk_level)

    chosen_theme = game_theme or _default_theme(parsed.is_money, topic, parsed.operations[0] if parsed.operations else None)

    micro_steps = build_micro_steps(
        operands=parsed.numbers,
        operations=parsed.operations,
        final_answer=parsed.final_answer,
        settings=settings,
        is_money=parsed.is_money,
        partial_results=parsed.partial_results,
        grade=grade,
    )

    blueprint = GameActivityBlueprint(
        activity_id=f"act_{uuid.uuid4().hex[:10]}",
        source_question_id=source_question_id,
        grade=grade,
        topic=topic,
        game_theme=chosen_theme,  # type: ignore
        adhd_game_settings=settings,
        micro_steps=micro_steps,
        status="draft",
        story_narrative=story_narrative.model_dump() if story_narrative else None,
        cli_score=round(cli, 2),
        raw_sinhala_question=raw_sinhala_question,
    )
    return blueprint, cli, parsed


async def generate_blueprint_from_curriculum_problem(
    problem: CurriculumProblem,
    adhd_risk_level: str = "MEDIUM",
    game_theme: Optional[str] = None,
    custom_gaja_notes: Optional[str] = None,
    learner_id: Optional[str] = None,
    student_name: Optional[str] = None,
    behavior_profile: Optional[StudentBehaviorProfile] = None,
    custom_settings: Optional[CustomADHDGameSettings] = None,
) -> Tuple[GameActivityBlueprint, float]:
    """
    Asynchronous, end-to-end generator from a structured CurriculumProblem:
    1. Verifies math deterministically.
    2. Computes CLI score and applies teacher customization & student behavioral profile.
    3. Enriches cultural narrative and Gaja dialogue.
    4. Deconstructs into tailored ADHD micro-steps with cognitive distractors.
    """
    op = problem.operation or ("COUNT" if problem.grade == 1 else "ADD")
    operands = problem.operands if problem.operands else [problem.expected_answer]

    # Deterministic verification
    MathVerificationService.verify_grade_invariants(problem.grade, operands, op)
    if op in ("COUNT", "COMPARE", "IDENTIFY", "SHAPE", "PATTERN", "COLOR", "FRACTION", "TIME"):
        verified_answer = problem.expected_answer
    else:
        verified_answer = MathVerificationService.execute_calculation(operands, op)

    # CLI Score computation & custom settings build
    cli = compute_cli(problem.raw_problem_text, operation_count=1)
    settings, is_customized = build_custom_adhd_game_settings(
        cli_score=cli,
        adhd_risk_level=adhd_risk_level,
        custom_settings=custom_settings,
        behavior_profile=behavior_profile,
    )
    effective_cli = calculate_custom_cli(cli, settings, behavior_profile)

    # Theme selection
    chosen_theme = game_theme or _default_theme(problem.is_money, problem.topic, op)

    # Narrative enrichment
    narrative = await enrich_gameplay_narrative(problem, theme=chosen_theme, adhd_settings=settings.model_dump())

    # Build micro-steps
    micro_steps = build_micro_steps(
        operands=operands,
        operations=[op],
        final_answer=verified_answer,
        settings=settings,
        is_money=problem.is_money,
        grade=problem.grade,
    )

    blueprint = GameActivityBlueprint(
        activity_id=f"act_{uuid.uuid4().hex[:10]}",
        source_question_id=problem.problem_id,
        grade=problem.grade,
        topic=problem.topic,
        game_theme=chosen_theme,  # type: ignore
        adhd_game_settings=settings,
        micro_steps=micro_steps,
        status="draft",
        story_narrative=narrative.model_dump(),
        cli_score=round(cli, 2),
        effective_cli_score=effective_cli,
        raw_sinhala_question=problem.child_prompt_si or problem.raw_problem_text,
        target_learner_id=learner_id,
        student_name=student_name,
        customized_by_teacher=is_customized,
        behavior_profile=behavior_profile.model_dump() if behavior_profile else None,
    )
    return blueprint, effective_cli


def tune_existing_blueprint(
    existing: GameActivityBlueprint,
    problem: CurriculumProblem,
    custom_settings: CustomADHDGameSettings,
    behavior_profile: Optional[StudentBehaviorProfile] = None,
    game_theme: Optional[str] = None,
) -> GameActivityBlueprint:
    """
    Synchronously re-tunes an existing GameActivityBlueprint with updated
    cognitive load settings, micro-steps, and distractor profiles,
    preserving the existing story narrative and mascot dialogue.
    """
    op = problem.operation or ("COUNT" if problem.grade == 1 else "ADD")
    operands = problem.operands if problem.operands else [problem.expected_answer]

    if op in ("COUNT", "COMPARE", "IDENTIFY", "SHAPE", "PATTERN", "COLOR", "FRACTION", "TIME"):
        verified_answer = problem.expected_answer
    else:
        verified_answer = MathVerificationService.execute_calculation(operands, op)

    base_cli = existing.cli_score or compute_cli(problem.raw_problem_text, operation_count=1)

    settings, _ = build_custom_adhd_game_settings(
        cli_score=base_cli,
        adhd_risk_level="MEDIUM",
        custom_settings=custom_settings,
        behavior_profile=behavior_profile,
    )
    effective_cli = calculate_custom_cli(base_cli, settings, behavior_profile)

    chosen_theme = game_theme or existing.game_theme

    # Re-build micro-steps with new scaffolding/distractors
    micro_steps = build_micro_steps(
        operands=operands,
        operations=[op],
        final_answer=verified_answer,
        settings=settings,
        is_money=problem.is_money,
        grade=problem.grade,
    )

    updated_blueprint = existing.model_copy(
        update={
            "game_theme": chosen_theme,
            "adhd_game_settings": settings,
            "micro_steps": micro_steps,
            "effective_cli_score": effective_cli,
            "customized_by_teacher": True,
            "behavior_profile": behavior_profile.model_dump() if behavior_profile else existing.behavior_profile,
            "target_learner_id": behavior_profile.learner_id if behavior_profile and behavior_profile.learner_id else existing.target_learner_id,
            "student_name": behavior_profile.student_name if behavior_profile and behavior_profile.student_name else existing.student_name,
        }
    )
    return updated_blueprint

