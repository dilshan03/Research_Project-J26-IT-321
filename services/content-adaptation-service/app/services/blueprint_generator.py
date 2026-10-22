"""
Blueprint generator: converts a curriculum question into an ADHD-friendly
GameActivityBlueprint using the CLI score, derived game settings,
deterministic MathVerificationService, and Gaja mascot narrative enrichment.
"""
import re
import uuid
from typing import Dict, List, Optional, Tuple

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

FALLBACK_QUESTION_TRANSLATIONS: Dict[str, str] = {
    "මාලාට ඇපල් 5 ක් ඇත. නිමල් ඇයට ඇපල් 3 ක් දුන්නේය. දැන් මාලාට ඇපල් කීයක් තිබේද?": "Mala has 5 apples. Nimal gave her 3 apples. How many apples does Mala have now?",
    "මාලාට ඇපල් 5 ක් ඇත. නිමල් ඇයට තවත් ඇපල් 3 ක් දුන්නේය. දැන් මාලා ළඟ ඇපල් කීයක් තිබේද?": "Mala has 5 apples. Nimal gave her 3 more apples. How many apples does Mala have now?",
    "10 න් 4 ක් අඩු කළ විට කීයද?": "10 minus 4 is how much?",
    "ගසේ කුරුල්ලන් 12 ක් සිටියා. 5 ක් පියාඹා ගියා. ඉතිරි කුරුල්ලන් කීයද?": "There were 12 birds on a tree. 5 flew away. How many birds are left?",
    "කමල් රුපියල් 50 කට පොතක් සහ රුපියල් 20 කට පෑනක් මිලදී ගත්තේය. ඔහු කඩකාරයාට රුපියල් 100 ක් දුන්නේය. ඉතිරිය කොපමණද?": "Kamal bought a book for Rs. 50 and a pen for Rs. 20. He gave Rs. 100 to the shopkeeper. What is the balance?",
    "රුපියල් 20 ක ටොෆි පැකට්ටුවක් සහ රුපියල් 15 ක බිස්කට් පැකට්ටුවක් ගැනීමට අවශ්‍ය මුළු මුදල කීයද?": "How much total money is needed to buy a Rs. 20 toffee packet and a Rs. 15 biscuit packet?",
    "1 සිට 9 තෙක් එකිනෙකට අදාළ ද්‍රව්‍ය ප්‍රමාණය, රූප ප්‍රමාණයට අදාළ සංඛ්‍යාව හඳුනා ගැනීම, කියවීම.": "Recognize and count numbers from 1 to 9 matching object and image quantities.",
    "රුපියල, රුපියල් දෙක සහ රුපියල් පහ යන කාසි හඳුනා ගැනීම.": "Recognize coins of one rupee, two rupees, and five rupees.",
}


def resolve_english_question(question_id: Optional[str] = None, raw_text: Optional[str] = None) -> Optional[str]:
    if raw_text:
        cleaned = raw_text.strip()
        if cleaned in FALLBACK_QUESTION_TRANSLATIONS:
            return FALLBACK_QUESTION_TRANSLATIONS[cleaned]
        for k, v in FALLBACK_QUESTION_TRANSLATIONS.items():
            if cleaned.startswith(k[:20]):
                return v
    from app.data.sample_questions import SAMPLE_QUESTIONS
    for sq in SAMPLE_QUESTIONS:
        if question_id and sq.get("source_question_id") == question_id:
            return sq.get("translation_en")
        if raw_text and sq.get("raw_sinhala_question") == raw_text:
            return sq.get("translation_en")
    return None

ARITHMETIC_OPS = ("ADD", "SUB", "MUL", "DIV")
_SINHALA_CHARS = re.compile(r"[඀-෿]")


def has_all_numbers(text: Optional[str], numbers: List[int]) -> bool:
    """True when every number (counting repeats) appears in the text as its own number."""
    # Matches the game's NumberHunt: "1,000" is one number, the ".00" of a time like "8.00" is not.
    found = [n.replace(",", "") for n in re.findall(r"(?<!\d\.)(?:\d{1,3}(?:,\d{3})+|\d+)", text or "")]
    for n in numbers:
        if str(n) not in found:
            return False
        found.remove(str(n))
    return True


def choose_question_prompts(problem: CurriculumProblem, op: str) -> Tuple[str, Optional[str]]:
    """
    Picks the Sinhala/English question the learner sees. Child prompts are preferred, but
    older extractions produced generic ones ("let's add them all for Gaja!") with no numbers,
    which leaves the learner nothing to solve. For arithmetic the shown text must carry the
    operands; for shapes it must not name a different shape than the one being asked for.
    """
    operands = problem.operands or []
    si_candidates = [t for t in (problem.child_prompt_si, problem.raw_problem_text) if t and t.strip()]
    en_candidates = [
        t for t in (problem.child_prompt_en, problem.english_translation)
        if t and t.strip() and not _SINHALA_CHARS.search(t)  # some "English" prompts are untranslated Sinhala
    ]

    target_shape = shape_named_in(problem.raw_problem_text) or str(
        (problem.visual_props or {}).get("target_shape") or "").upper()

    def fits(text: str) -> bool:
        if op in ARITHMETIC_OPS:
            return has_all_numbers(text, operands)
        if op == "SHAPE":
            return shape_named_in(text) in (None, target_shape)
        return True

    si = next((t for t in si_candidates if fits(t)), si_candidates[0] if si_candidates else "")
    en = next((t for t in en_candidates if op not in ARITHMETIC_OPS or has_all_numbers(t, operands)), None)
    return si, en or resolve_english_question(problem.problem_id, problem.raw_problem_text)


def verified_problem_answer(problem: CurriculumProblem, op: str, operands: List[int]) -> int:
    """Deterministic answer for the problem, refusing results a primary learner cannot have."""
    if op not in ARITHMETIC_OPS:
        return problem.expected_answer
    if op == "DIV" and len(operands) >= 2 and operands[1] and operands[0] % operands[1]:
        raise ValueError(f"{operands[0]} ÷ {operands[1]} does not divide evenly; primary division must have no remainder.")
    answer = MathVerificationService.execute_calculation(operands, op)
    if answer < 0:
        raise ValueError(
            f"The extracted quantities {operands} with {op} give a negative answer ({answer}). "
            "The problem was probably extracted wrongly; please fix it in the problem bank."
        )
    return answer


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
    # Equal operands (e.g. 5 and 5) make some candidates collide with each other or the answer.
    used = {correct}
    unique_wrong = []
    for text, dtype, rat in wrong:
        if text not in used:
            used.add(text)
            unique_wrong.append((text, dtype, rat))
    for text, dtype, rat in unique_wrong[: settings.distractor_count]:
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


SHAPE_LABELS = {
    "CIRCLE": ("රවුම", "Circle"),
    "TRIANGLE": ("ත්‍රිකෝණය", "Triangle"),
    "SQUARE": ("සමචතුරස්‍රය", "Square"),
    "RECTANGLE": ("සෘජුකෝණාස්‍රය", "Rectangle"),
}
COLOR_LABELS = {
    "RED": ("රතු", "Red"),
    "BLUE": ("නිල්", "Blue"),
    "YELLOW": ("කහ", "Yellow"),
    "GREEN": ("කොළ", "Green"),
}


# Sinhala shape names (without ZWJ). Longer names first so "සමචතුරස්‍ර" wins over "චතුරස්‍ර".
SHAPE_NAME_CUES = [
    ("සෘජුකෝණාස්රා", "RECTANGLE"), ("සෘජුකෝණාස්ර", "RECTANGLE"),
    ("සමචතුරස්ර", "SQUARE"), ("චතුරස්ර", "SQUARE"),
    ("ත්රිකෝණ", "TRIANGLE"), ("රවුම", "CIRCLE"), ("වෘත්ත", "CIRCLE"),
]


def shape_named_in(text: Optional[str]) -> Optional[str]:
    """The shape a Sinhala sentence names, if any."""
    plain = (text or "").replace("‍", "")
    for cue, shape in SHAPE_NAME_CUES:
        if cue in plain:
            return shape
    return None


def _shape_step(vp: dict, n_wrong: int, question_text: Optional[str] = None) -> GameMicroStep:
    target = str(vp.get("target_shape") or "CIRCLE").upper()
    # Extracted visual_props sometimes default to CIRCLE while the problem asks about another
    # shape ("how many sides does a square have?"). The problem text wins.
    named = shape_named_in(question_text)
    if named:
        target = named
    if target not in SHAPE_LABELS:
        target = "CIRCLE"
    si, en = SHAPE_LABELS[target]
    opts = [GameChoiceOption(text_si=si, text_en=en, is_correct=True, distractor_type="NONE", icon_or_shape=target)]
    for s in [k for k in SHAPE_LABELS if k != target][:n_wrong]:
        opts.append(GameChoiceOption(
            text_si=SHAPE_LABELS[s][0], text_en=SHAPE_LABELS[s][1], is_correct=False,
            distractor_type="IMPULSIVITY", icon_or_shape=s,
            distractor_rationale="Picks a visually salient shape without checking its sides and corners.",
        ))
    return GameMicroStep(
        step_order=1,
        action_type="MATCH_SHAPE",
        instruction_si=f"{si} හැඩය සොයා තෝරන්න",
        instruction_en=f"Find the {en.lower()}",
        target_visual_asset=VisualAssetTag.SHAPE_CARD,
        correct_target_value=target,
        game_options=opts,
        operands=[1],
        operation="SHAPE",
        visual_props={"target_shape": target},
    )


def _number_pattern_step(seq: List[int], target: int, n_wrong: int) -> GameMicroStep:
    d = seq[1] - seq[0]
    candidates = [
        (seq[-1], "IMPULSIVITY", "Repeats the last number shown instead of continuing the pattern."),
        (seq[-1] + 1, "MAGNITUDE_SLIP", "Counts on by one instead of by the pattern's step."),
        (target + d, "WORKING_MEMORY_OVERFLOW", "Loses track of the position and skips a term."),
        (target - 1, "MAGNITUDE_SLIP", "Off-by-one just below the next term."),
        (target + 1, "MAGNITUDE_SLIP", "Off-by-one just above the next term."),
    ]
    opts = [GameChoiceOption(text_si=str(target), text_en=str(target), numeric_value=target, is_correct=True, distractor_type="NONE")]
    used = {target}
    for val, dtype, rat in candidates:
        if len(opts) > n_wrong or val in used or val < 0:
            continue
        used.add(val)
        opts.append(GameChoiceOption(
            text_si=str(val), text_en=str(val), numeric_value=val, is_correct=False,
            distractor_type=dtype, distractor_rationale=rat,  # type: ignore[arg-type]
        ))
    return GameMicroStep(
        step_order=1,
        action_type="COMPLETE_PATTERN",
        instruction_si="රටාවේ ඊළඟට එන සංඛ්‍යාව කුමක්ද?",
        instruction_en="What number comes next in the pattern?",
        target_visual_asset=VisualAssetTag.PATTERN_TRAIN,
        correct_target_value=str(target),
        game_options=opts,
        operands=seq,
        operation="PATTERN",
        visual_props={"kind": "NUMBER", "sequence": seq, "target": target},
    )


def _color_pattern_step(seq: List[str], target: str, n_wrong: int) -> GameMicroStep:
    si, en = COLOR_LABELS[target]
    opts = [GameChoiceOption(text_si=si, text_en=en, is_correct=True, distractor_type="NONE", icon_or_shape=target)]
    # The colour just shown is the most tempting wrong answer, so it goes first.
    order = [seq[-1]] + [c for c in COLOR_LABELS if c != seq[-1]]
    for c in [c for c in dict.fromkeys(order) if c != target][:n_wrong]:
        opts.append(GameChoiceOption(
            text_si=COLOR_LABELS[c][0], text_en=COLOR_LABELS[c][1], is_correct=False, icon_or_shape=c,
            distractor_type="IMPULSIVITY" if c == seq[-1] else "WORKING_MEMORY_OVERFLOW",
            distractor_rationale="Repeats the colour just seen." if c == seq[-1] else "Loses the repeating unit of the pattern.",
        ))
    return GameMicroStep(
        step_order=1,
        action_type="COMPLETE_PATTERN",
        instruction_si="රටාවේ ඊළඟට එන පාට තෝරන්න",
        instruction_en="Choose the colour that comes next",
        target_visual_asset=VisualAssetTag.PATTERN_TRAIN,
        correct_target_value=target,
        game_options=opts,
        operands=[list(COLOR_LABELS).index(target) + 1],
        operation="PATTERN",
        visual_props={"kind": "COLOR", "sequence": seq, "target": target},
    )


def _compare_step(operands: List[int], vp: dict) -> GameMicroStep:
    a, b = operands[0], operands[1]
    if a == b:
        raise ValueError("A comparison needs two different quantities.")
    want_smaller = str(vp.get("target") or "BIGGER").upper() == "SMALLER"
    correct = min(a, b) if want_smaller else max(a, b)
    opts = []
    for v in (a, b):
        right = v == correct
        opts.append(GameChoiceOption(
            text_si=str(v), text_en=str(v), numeric_value=v, is_correct=right,
            distractor_type="NONE" if right else "IMPULSIVITY",
            distractor_rationale=None if right else "Picks the first or most eye-catching quantity without comparing.",
        ))
    return GameMicroStep(
        step_order=1,
        action_type="COMPARE_QUANTITY",
        instruction_si="වඩා කුඩා එක තෝරන්න" if want_smaller else "වඩා විශාල එක තෝරන්න",
        instruction_en="Pick the smaller one" if want_smaller else "Pick the bigger one",
        target_visual_asset=VisualAssetTag.COMPARISON_SCALE,
        correct_target_value=str(correct),
        game_options=opts,
        operands=[a, b],
        operation="COMPARE",
        visual_props={"target": "SMALLER" if want_smaller else "BIGGER"},
    )


def build_micro_steps(
    operands: List[int],
    operations: List[str],
    final_answer: int,
    settings: ADHDGameSettings,
    is_money: bool = False,
    partial_results: Optional[List[int]] = None,
    grade: int = 2,
    visual_props: Optional[dict] = None,
    question_text: Optional[str] = None,
) -> List[GameMicroStep]:
    """`question_text` is what the learner sees; the "find the numbers" step is only
    offered when the numbers are actually in it (otherwise it cannot be solved)."""
    op = operations[0] if operations else ("COUNT" if grade == 1 else "ADD")
    vp = visual_props or {}
    n_wrong = max(1, min(settings.distractor_count, 3))
    can_hunt = question_text is None or has_all_numbers(question_text, operands[:2])

    # Legacy IDENTIFY items (e.g. "what is this coin worth?") play as counting: the game
    # draws the items and the learner picks how many. The old two-step version asked the
    # learner to find numbers that were not in the prompt, then showed a nonsense "5 = 5" scale.
    if op == "IDENTIFY":
        op = "COUNT"

    if op == "SHAPE":
        return [_shape_step(vp, n_wrong, question_text)]

    if op == "PATTERN":
        if str(vp.get("kind") or "").upper() == "NUMBER" and len(vp.get("sequence") or []) >= 3:
            return [_number_pattern_step([int(x) for x in vp["sequence"]], int(vp["target"]), n_wrong)]
        seq = [str(c).upper() for c in (vp.get("sequence") or ["RED", "BLUE", "RED"])]
        target = str(vp.get("target") or "BLUE").upper()
        if target not in COLOR_LABELS or any(c not in COLOR_LABELS for c in seq):
            seq, target = ["RED", "BLUE", "RED"], "BLUE"
        return [_color_pattern_step(seq, target, n_wrong)]

    if op == "COMPARE":
        if len(operands) < 2:
            raise ValueError("A comparison needs two quantities.")
        return [_compare_step(operands, vp)]

    if op == "COUNT":
        # One concrete step: the game draws the objects and the learner picks how many.
        n = operands[0] if operands else final_answer
        return [GameMicroStep(
            step_order=1,
            action_type="CALCULATE_MICROSTEP",
            instruction_si="ගණන් කරලා නිවැරදි සංඛ්‍යාව තෝරන්න",
            instruction_en="Count them, then pick the number",
            target_visual_asset=_quantity_asset(is_money),
            correct_target_value=str(n),
            game_options=_numeric_options(n, settings.distractor_count, [n], "COUNT"),
            operands=[n],
            operation="COUNT",
        )]

    if len(operands) < 2:
        raise ValueError("Could not find at least two numeric quantities in the question.")

    # Grade 1 adds and takes away with concrete objects (NIE guide), not operator symbols:
    # skip the operator step and go straight to the hands-on basket.
    if grade == 1 and op in ("ADD", "SUB"):
        steps: List[GameMicroStep] = []
        if settings.step_granularity == "MAXIMAL_THREE_TIER" and can_hunt:
            steps.append(_identify_step(operands[:2], 1, settings, is_money))
        steps.append(_calc_step(len(steps) + 1, final_answer, operands=operands[:2], op=op, settings=settings, final=True))
        return steps

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
    if settings.step_granularity == "MAXIMAL_THREE_TIER" and can_hunt:
        steps.append(_identify_step(operands[:2], 1, settings, is_money))
    steps.append(_operator_step(op, len(steps) + 1, settings, operands=operands[:2]))
    steps.append(_calc_step(len(steps) + 1, final_answer, operands=operands[:2], op=op, settings=settings, final=True))
    return steps


def _prepare_problem(problem: CurriculumProblem) -> Tuple[str, List[int], int, str, Optional[str]]:
    """Operation, operands, verified answer and the question texts shown to the learner."""
    op = problem.operation or ("COUNT" if problem.grade == 1 else "ADD")
    operands = list(problem.operands) if problem.operands else [problem.expected_answer]
    # "8 take away 3" is sometimes extracted as [3, 8]; primary subtraction never goes negative.
    if op == "SUB" and len(operands) == 2 and operands[0] < operands[1]:
        operands.reverse()
    answer = verified_problem_answer(problem, op, operands)
    question_si, question_en = choose_question_prompts(problem, op)
    return op, operands, answer, question_si, question_en


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
        raw_english_question=resolve_english_question(source_question_id, raw_sinhala_question) or (story_narrative.quest_goal_en if story_narrative else None),
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
    op, operands, verified_answer, question_si, question_en = _prepare_problem(problem)

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
        visual_props=problem.visual_props,
        question_text=question_si,
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
        raw_sinhala_question=question_si,
        raw_english_question=question_en or (narrative.quest_goal_en if narrative else None),
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
    op, operands, verified_answer, question_si, question_en = _prepare_problem(problem)

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
        visual_props=problem.visual_props,
        question_text=question_si,
    )

    updated_blueprint = existing.model_copy(
        update={
            "game_theme": chosen_theme,
            "adhd_game_settings": settings,
            "micro_steps": micro_steps,
            "effective_cli_score": effective_cli,
            # Re-chosen so a blueprint made from an old, number-less prompt is repaired on tune.
            "raw_sinhala_question": question_si,
            "raw_english_question": question_en or existing.raw_english_question,
            "customized_by_teacher": True,
            "behavior_profile": behavior_profile.model_dump() if behavior_profile else existing.behavior_profile,
            "target_learner_id": behavior_profile.learner_id if behavior_profile and behavior_profile.learner_id else existing.target_learner_id,
            "student_name": behavior_profile.student_name if behavior_profile and behavior_profile.student_name else existing.student_name,
        }
    )
    return updated_blueprint

