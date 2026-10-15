import pytest
from pathlib import Path

from app.schemas.syllabus import CurriculumProblem, StoryNarrative
from app.services.llm_extractor import (
    CURRICULUM_MATRIX,
    MathVerificationService,
    _extract_pdf_text,
    enrich_gameplay_narrative,
    upload_and_extract_problems,
)

SYLLABI_DIR = Path(__file__).resolve().parents[1] / "data" / "syllabi"


@pytest.fixture
def anyio_backend():
    return "asyncio"


# 1. Deterministic MathVerificationService Unit Tests
def test_math_verification_addition():
    assert MathVerificationService.verify_calculation([5, 3], "ADD", 8) is True
    assert MathVerificationService.verify_calculation([5, 3], "ADD", 9) is False
    assert MathVerificationService.execute_calculation([14, 15], "ADD") == 29


def test_math_verification_subtraction_primary_invariants():
    assert MathVerificationService.verify_calculation([10, 4], "SUB", 6) is True
    assert MathVerificationService.verify_calculation([10, 4], "SUB", 5) is False
    assert MathVerificationService.execute_calculation([25, 12], "SUB") == 13
    # Subtraction yielding negative values must fail grade invariant check
    assert MathVerificationService.verify_grade_invariants(2, [3, 7], "SUB") is False
    assert MathVerificationService.verify_grade_invariants(2, [7, 3], "SUB") is True
    # Grade 1 strictly forbids subtraction equations
    assert MathVerificationService.verify_grade_invariants(1, [7, 3], "SUB") is False


def test_math_verification_multiplication_and_division():
    assert MathVerificationService.execute_calculation([6, 4], "MUL") == 24
    assert MathVerificationService.verify_calculation([6, 4], "MUL", 24) is True
    assert MathVerificationService.execute_calculation([20, 4], "DIV") == 5
    assert MathVerificationService.verify_calculation([20, 4], "DIV", 5) is True

    # Division by zero must raise ZeroDivisionError
    with pytest.raises(ZeroDivisionError):
        MathVerificationService.execute_calculation([10, 0], "DIV")


def test_grade_max_operand_invariants():
    # Grade 1 strictly pre-math/counting max operand is 20, no ADD
    assert MathVerificationService.verify_grade_invariants(1, [15], "COUNT") is True
    assert MathVerificationService.verify_grade_invariants(1, [25], "COUNT") is False
    assert MathVerificationService.verify_grade_invariants(1, [15, 5], "ADD") is False
    # Grade 2 allows ADD and SUB up to 100
    assert MathVerificationService.verify_grade_invariants(2, [15, 5], "ADD") is True
    assert MathVerificationService.verify_grade_invariants(2, [75, 20], "ADD") is True
    assert MathVerificationService.verify_grade_invariants(2, [500, 200], "ADD") is False


def test_cognitive_distractor_generation():
    distractors = MathVerificationService.generate_cognitive_distractors(
        correct_answer=8,
        operands=[5, 3],
        operation="ADD",
        distractor_count=3,
    )
    assert len(distractors) == 3
    values = [d[0] for d in distractors]
    types = [d[1] for d in distractors]

    # Deterministic verification that distractors never contain the correct answer
    assert MathVerificationService.verify_distractors(8, values) is True
    assert 8 not in values
    assert all(v >= 0 for v in values)
    # Ensure cognitive error types are assigned
    assert any(t in ["IMPULSIVITY", "WORKING_MEMORY_OVERFLOW", "MAGNITUDE_SLIP"] for t in types)


# 2. PDF Parsing & Fallback Extractor Tests
def test_pdf_text_extraction():
    g1_pdf = SYLLABI_DIR / "Grade_01.pdf"
    assert g1_pdf.exists()
    text = _extract_pdf_text(g1_pdf)
    assert len(text) > 0


@pytest.mark.anyio
async def test_upload_and_extract_problems_fallback_schema():
    g1_pdf = SYLLABI_DIR / "Grade_01.pdf"
    problems = await upload_and_extract_problems(g1_pdf, grade=1, doc_id="test_doc_01")
    assert len(problems) >= 3
    for p in problems:
        assert isinstance(p, CurriculumProblem)
        assert p.grade == 1
        assert p.doc_id == "test_doc_01"
        assert len(p.operands) >= 1
        # Deterministically verify every single problem's arithmetic
        assert MathVerificationService.verify_calculation(p.operands, p.operation or "COUNT", p.expected_answer) is True


@pytest.mark.anyio
async def test_multi_grade_extraction_coverage():
    for grade in [1, 2, 3, 4, 5]:
        problems = await upload_and_extract_problems(b"", grade=grade)
        assert len(problems) >= 2
        assert all(p.grade == grade for p in problems)


# 3. Mascot Narrative & Gaja Dialogue Tests
@pytest.mark.anyio
async def test_enrich_gameplay_narrative_gaja_dialogue():
    sample = CurriculumProblem(
        problem_id="TEST-G1-001",
        grade=1,
        topic="Addition",
        raw_problem_text="මාලාට ඇපල් 5 ක් ඇත.",
        english_translation="Mala has 5 apples.",
        operands=[5, 3],
        operation="ADD",
        expected_answer=8,
    )
    narrative = await enrich_gameplay_narrative(sample, theme="VILLAGE_MARKET")
    assert isinstance(narrative, StoryNarrative)
    assert "ගජා" in narrative.gaja_dialogue.intro["si"] or "ගජා" in narrative.backdrop_si
    assert "Gaja" in narrative.gaja_dialogue.intro["en"] or "Gaja" in narrative.backdrop_en
    assert len(narrative.quest_goal_si) > 0
    assert len(narrative.quest_goal_en) > 0
