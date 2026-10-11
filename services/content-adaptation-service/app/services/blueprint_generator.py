"""
Blueprint generator: converts a curriculum question into an ADHD-friendly
GameActivityBlueprint using the CLI score, derived game settings and the
rule-based problem parser.
"""
import uuid
from typing import List, Optional

from app.schemas.game_blueprint import (
    ADHDGameSettings,
    GameActivityBlueprint,
    GameChoiceOption,
    GameMicroStep,
    VisualAssetTag,
)
from app.services.cognitive_load import compute_cli, derive_adhd_game_settings
from app.services.problem_parser import OPERATION_SYMBOLS, ParsedProblem, _apply, parse_problem

OPERATION_LABELS = {
    "ADD": ("එකතු කිරීම (+)", "Addition (+)"),
    "SUB": ("අඩු කිරීම (−)", "Subtraction (−)"),
    "MUL": ("ගුණ කිරීම (×)", "Multiplication (×)"),
    "DIV": ("බෙදීම (÷)", "Division (÷)"),
}

# Which wrong operator an impulsive learner most often picks.
OPERATOR_CONFUSIONS = {
    "ADD": ["SUB", "MUL", "DIV"],
    "SUB": ["ADD", "DIV", "MUL"],
    "MUL": ["ADD", "DIV", "SUB"],
    "DIV": ["SUB", "MUL", "ADD"],
}


def _quantity_asset(parsed: ParsedProblem) -> VisualAssetTag:
    return VisualAssetTag.COIN_BAG if parsed.is_money else VisualAssetTag.FRUIT_BASKET


def _default_theme(parsed: ParsedProblem, topic: str) -> str:
    if parsed.is_money or "money" in topic.lower():
        return "VILLAGE_MARKET"
    if parsed.operations and parsed.operations[0] in ("MUL", "DIV"):
        return "SPACE_QUEST"
    return "JUNGLE_ADVENTURE"


def _numeric_options(
    correct: int,
    distractor_count: int,
    impulsive: List[int],
    memory: List[int],
) -> List[GameChoiceOption]:
    """Builds one correct option plus ADHD-profiled distractors."""
    options = [GameChoiceOption(
        text_si=str(correct), text_en=str(correct), numeric_value=correct,
        is_correct=True, distractor_type="NONE",
    )]
    used = {correct}

    candidates = []
    for v in impulsive:
        candidates.append((v, "IMPULSIVITY",
                           "Picks a number seen in the problem or the wrong operation without checking."))
    for v in memory:
        candidates.append((v, "WORKING_MEMORY_OVERFLOW",
                           "Loses track of an intermediate value in a multi-step problem."))
    for delta in (1, -1, 10, -10, 2, -2):
        candidates.append((correct + delta, "MAGNITUDE_SLIP",
                           "Off-by-one or place-value slip while counting."))

    for value, dtype, rationale in candidates:
        if len(options) > distractor_count:
            break
        if value < 0 or value in used:
            continue
        used.add(value)
        options.append(GameChoiceOption(
            text_si=str(value), text_en=str(value), numeric_value=value,
            is_correct=False, distractor_type=dtype, distractor_rationale=rationale,
        ))
    return _shuffle(options, seed=correct)


def _operator_options(correct_op: str, distractor_count: int) -> List[GameChoiceOption]:
    si, en = OPERATION_LABELS[correct_op]
    options = [GameChoiceOption(text_si=si, text_en=en, is_correct=True, distractor_type="NONE")]
    for op in OPERATOR_CONFUSIONS[correct_op][:distractor_count]:
        dsi, den = OPERATION_LABELS[op]
        options.append(GameChoiceOption(
            text_si=dsi, text_en=den, is_correct=False, distractor_type="IMPULSIVITY",
            distractor_rationale="Selects an operator by surface cue without reading the full problem.",
        ))
    return _shuffle(options, seed=len(correct_op))


def _shuffle(options: List[GameChoiceOption], seed: int) -> List[GameChoiceOption]:
    """Deterministic rotation so the correct answer is not always first."""
    if not options:
        return options
    k = seed % len(options)
    return options[k:] + options[:k]


def _identify_step(parsed: ParsedProblem, order: int, settings: ADHDGameSettings) -> GameMicroStep:
    a, b = parsed.numbers[0], parsed.numbers[1]
    correct = f"{a}, {b}"
    opts = [GameChoiceOption(text_si=correct, text_en=correct, is_correct=True, distractor_type="NONE")]
    wrong = [(f"{a}, {a + b}", "WORKING_MEMORY_OVERFLOW"), (f"{b}", "IMPULSIVITY"),
             (f"{a + 1}, {b}", "MAGNITUDE_SLIP"), (f"{a}", "IMPULSIVITY")]
    for text, dtype in wrong[: settings.distractor_count]:
        opts.append(GameChoiceOption(
            text_si=text, text_en=text, is_correct=False, distractor_type=dtype,
            distractor_rationale="Misses or adds a quantity when scanning the problem.",
        ))
    return GameMicroStep(
        step_order=order, action_type="IDENTIFY_ENTITY",
        instruction_si="ගැටලුවේ ඇති සංඛ්‍යා දෙක සොයන්න",
        instruction_en="Find the two numbers in the problem",
        target_visual_asset=_quantity_asset(parsed),
        correct_target_value=correct,
        game_options=_shuffle(opts, seed=a + b),
    )


def _operator_step(parsed: ParsedProblem, op: str, order: int, settings: ADHDGameSettings) -> GameMicroStep:
    return GameMicroStep(
        step_order=order, action_type="SELECT_OPERATOR",
        instruction_si="නිවැරදි ගණිත ක්‍රියාව තෝරන්න",
        instruction_en="Choose the correct operation",
        target_visual_asset=VisualAssetTag.OPERATOR_CHEST,
        correct_target_value=OPERATION_SYMBOLS[op],
        game_options=_operator_options(op, min(settings.distractor_count, 3)),
    )


def _calc_step(order: int, correct: int, impulsive: List[int], memory: List[int],
               settings: ADHDGameSettings, final: bool) -> GameMicroStep:
    return GameMicroStep(
        step_order=order, action_type="CALCULATE_MICROSTEP",
        instruction_si="දැන් පිළිතුර සොයන්න" if final else "පළමුව මෙය ගණනය කරන්න",
        instruction_en="Now find the answer" if final else "First, work this part out",
        target_visual_asset=VisualAssetTag.NUMBER_BLOCK,
        correct_target_value=str(correct),
        game_options=_numeric_options(correct, settings.distractor_count, impulsive, memory),
    )


def build_micro_steps(parsed: ParsedProblem, settings: ADHDGameSettings) -> List[GameMicroStep]:
    if len(parsed.numbers) < 2 or parsed.final_answer is None:
        raise ValueError("Could not find at least two numeric quantities in the question.")

    ops = parsed.operations
    answer = parsed.final_answer

    # Multi-step problem (e.g. sum items, then compute balance).
    if len(ops) >= 2:
        subtotal = parsed.partial_results[0]
        paid = parsed.numbers[-1]
        return [
            _operator_step(parsed, ops[0], 1, settings),
            _calc_step(2, subtotal, impulsive=parsed.numbers[:2], memory=[paid], settings=settings, final=False),
            _calc_step(3, answer, impulsive=[subtotal, paid + subtotal], memory=[paid - parsed.numbers[0]],
                       settings=settings, final=True),
        ]

    op = ops[0]
    a, b = parsed.numbers[0], parsed.numbers[1]
    wrong_op = OPERATOR_CONFUSIONS[op][0]
    impulsive = [_apply(wrong_op, a, b), a, b]

    steps: List[GameMicroStep] = []
    if settings.step_granularity == "MAXIMAL_THREE_TIER":
        steps.append(_identify_step(parsed, 1, settings))
    steps.append(_operator_step(parsed, op, len(steps) + 1, settings))
    steps.append(_calc_step(len(steps) + 1, answer, impulsive, memory=[], settings=settings, final=True))
    return steps


def generate_blueprint(
    source_question_id: str,
    grade: int,
    topic: str,
    raw_sinhala_question: str,
    adhd_risk_level: str,
    operation_hint: Optional[str] = None,
    game_theme: Optional[str] = None,
) -> tuple[GameActivityBlueprint, float, ParsedProblem]:
    parsed = parse_problem(raw_sinhala_question, operation_hint)
    op_count = max(1, len(parsed.operations))
    cli = compute_cli(raw_sinhala_question, operation_count=op_count)
    settings = derive_adhd_game_settings(cli, adhd_risk_level)

    blueprint = GameActivityBlueprint(
        activity_id=f"act_{uuid.uuid4().hex[:10]}",
        source_question_id=source_question_id,
        grade=grade,
        topic=topic,
        game_theme=game_theme or _default_theme(parsed, topic),
        adhd_game_settings=settings,
        micro_steps=build_micro_steps(parsed, settings),
        status="draft",
    )
    return blueprint, cli, parsed
