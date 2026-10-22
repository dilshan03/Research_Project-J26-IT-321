"""
Games must make sense to the learner: the question shows the numbers being worked on,
every step can be finished, and the answer is one a primary learner can have.
"""
import pytest

from app.schemas.game_blueprint import ADHDGameSettings
from app.schemas.syllabus import CurriculumProblem
from app.services.blueprint_generator import (
    _prepare_problem,
    build_micro_steps,
    choose_question_prompts,
    has_all_numbers,
)
from app.services.problem_parser import parse_problem

THREE_TIER = ADHDGameSettings(step_granularity="MAXIMAL_THREE_TIER", distractor_count=3, stimulus_density="LOW")


def _problem(**kw) -> CurriculumProblem:
    base = dict(problem_id="T-1", grade=2, topic="Addition", raw_problem_text="", expected_answer=0)
    base.update(kw)
    return CurriculumProblem(**base)


def test_generic_child_prompt_without_numbers_falls_back_to_problem_text():
    p = _problem(
        raw_problem_text="පන්තියේ ළමුන් 24 දෙනෙක් සිටිති. තවත් ළමුන් 15 දෙනෙක් පැමිණියහ. දැන් ළමුන් කීයද?",
        child_prompt_si="ඔක්කොම එකතු කළ විට මුළු ගණන කීයද කියා ගජාට පෙන්වමු! 🌟",
        child_prompt_en="Let's count them all together to show Gaja the total! 🌟",
        english_translation="There are 24 children in the class. 15 more came. How many children now?",
        operation="ADD", operands=[24, 15], expected_answer=39,
    )
    si, en = choose_question_prompts(p, "ADD")
    assert si == p.raw_problem_text
    assert en == p.english_translation


def test_child_prompt_with_numbers_is_kept():
    p = _problem(
        raw_problem_text="රතු මල් 5යි, සුදු මල් 4යි. මුළු මල් ගණන කීයද?",
        child_prompt_si="රතු මල් 5යි, සුදු මල් 4යි. මුළු මල් කීයද?",
        child_prompt_en="5 red flowers and 4 white flowers. How many total flowers?",
        operation="ADD", operands=[5, 4], expected_answer=9,
    )
    assert choose_question_prompts(p, "ADD") == (p.child_prompt_si, p.child_prompt_en)


def test_untranslated_sinhala_is_not_used_as_english():
    p = _problem(
        raw_problem_text="පොත් 850ක් තිබුණි. පොත් 320ක් ණයට දී ඇත. ඉතිරි කොපමණද?",
        child_prompt_en="Let's solve with Gaja: පොත් 850ක් තිබුණි. පොත් 320ක් ණයට දී ඇත.",
        operation="SUB", operands=[850, 320], expected_answer=530,
    )
    _, en = choose_question_prompts(p, "SUB")
    assert en is None or "පොත්" not in en


def test_number_hunt_is_skipped_when_question_lacks_the_numbers():
    steps = build_micro_steps([24, 15], ["ADD"], 39, THREE_TIER, grade=2, question_text="ඔක්කොම එකතු කරමු!")
    assert [s.action_type for s in steps] == ["SELECT_OPERATOR", "CALCULATE_MICROSTEP"]

    steps = build_micro_steps([24, 15], ["ADD"], 39, THREE_TIER, grade=2, question_text="ළමුන් 24ක් සහ 15ක්")
    assert steps[0].action_type == "IDENTIFY_ENTITY"


def test_identify_plays_as_a_single_counting_step():
    steps = build_micro_steps([5], ["IDENTIFY"], 5, THREE_TIER, is_money=True, grade=1)
    assert len(steps) == 1
    assert steps[0].operation == "COUNT"
    assert steps[0].correct_target_value == "5"


def test_shape_named_in_problem_overrides_wrong_visual_props():
    p = _problem(
        grade=2, topic="Shapes", operation="SHAPE", operands=[4], expected_answer=4,
        raw_problem_text="චතුරස්‍රයකට කොපමණ පැති ගණනක් තිබේද?",
        child_prompt_si="යාළුවේ! ගජාට ලස්සන රවුම හැඩය හොයලා දෙන්න පුළුවන්ද? 🟡",
        visual_props={"target_shape": "CIRCLE"},
    )
    op, operands, answer, si, _ = _prepare_problem(p)
    assert si == p.raw_problem_text  # the circle prompt contradicts the question
    (step,) = build_micro_steps(operands, [op], answer, THREE_TIER, grade=2, visual_props=p.visual_props, question_text=si)
    assert step.correct_target_value == "SQUARE"


def test_negative_answers_are_rejected():
    p = _problem(grade=5, topic="Money", operation="SUB", operands=[450, 3, 2000], expected_answer=650,
                 raw_problem_text="රුපියල් 450 බැගින් පොත් 3ක් ගෙන රුපියල් 2000ක් දුන්නා.")
    with pytest.raises(ValueError, match="negative"):
        _prepare_problem(p)


def test_reversed_subtraction_operands_are_swapped():
    p = _problem(operation="SUB", operands=[3, 8], expected_answer=5, raw_problem_text="අඹ 8න් 3ක් කෑවා.")
    _, operands, answer, _, _ = _prepare_problem(p)
    assert operands == [8, 3] and answer == 5


def test_uneven_division_is_rejected():
    p = _problem(grade=3, operation="DIV", operands=[13, 4], expected_answer=3, raw_problem_text="ටොෆි 13ක් 4 දෙනාට")
    with pytest.raises(ValueError, match="divide evenly"):
        _prepare_problem(p)


def test_equal_operands_do_not_duplicate_identify_options():
    steps = build_micro_steps([5, 5], ["ADD"], 10, THREE_TIER, grade=2, question_text="අඹ 5ක් සහ දොඩම් 5ක්")
    labels = [o.text_en for o in steps[0].game_options]
    assert len(labels) == len(set(labels))


def test_number_matching_handles_thousands_and_times():
    assert parse_problem("රුපියල් 1,000 න් 250 ක් වියදම් කළා. ඉතිරි කීයද?").numbers == [1000, 250]
    assert has_all_numbers("පාසල උදේ 8.00ට පටන් ගෙන 10.00ට විවේකය", [10, 8])
    assert not has_all_numbers("අඹ 5ක් තිබුණා", [5, 5])
