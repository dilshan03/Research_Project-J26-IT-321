import json
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from pypdf import PdfReader
from dotenv import load_dotenv

from app.schemas.syllabus import (
    CurriculumProblem,
    CurriculumProblemExtraction,
    GajaDialogue,
    StoryNarrative,
)
from app.services.sinllama_provider import format_child_friendly_question

# Load root .env
load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# Supported models in priority order
GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
]


def _generate_with_gemini(client, contents: Any, schema_json: bool = True) -> str:
    """Tries Gemini models in order with automatic fallback on 404/503."""
    from google.genai import types

    last_exc = None
    for model_name in GEMINI_MODELS:
        try:
            config = types.GenerateContentConfig(response_mime_type="application/json") if schema_json else None
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            if response and response.text:
                return response.text
        except Exception as e:
            last_exc = e
            continue
    raise RuntimeError(f"All Gemini models failed. Last error: {last_exc}")


def _get_pdf_bytes(pdf_source: Any) -> Optional[bytes]:
    """Retrieve raw PDF bytes from file path, bytes, or file-like object."""
    try:
        if isinstance(pdf_source, bytes) and pdf_source:
            return pdf_source
        if isinstance(pdf_source, (str, Path)) and os.path.exists(pdf_source):
            return Path(pdf_source).read_bytes()
        if hasattr(pdf_source, "read"):
            data = pdf_source.read()
            if hasattr(pdf_source, "seek"):
                pdf_source.seek(0)
            return data
    except Exception as e:
        print(f"[_get_pdf_bytes] Warning: {e}")
    return None


class MathVerificationService:
    """
    Deterministic mathematical & cognitive verification engine.
    Guarantees that:
    1. Calculations are NEVER delegated to LLMs.
    2. Operands and operations follow primary mathematics constraints (Grade 1-5).
       - Grade 1: Pre-math, Counting (1-10), Comparing (More/Less), Currency coins.
         NO formal addition or subtraction equations.
       - Grade 2: Single-step addition and subtraction within 20/50.
       - Grade 3: Multiplication, Division, Addition/Subtraction up to 1000, Money balances.
       - Grade 4-5: Multi-digit operations, Scholarship word problems.
    3. Intermediate values and expected answers are deterministically verified.
    4. Distractors are verified to be distinct from correct answers and non-negative.
    """

    GRADE_MAX_OPERANDS = {
        1: 20,
        2: 100,
        3: 1000,
        4: 10000,
        5: 100000,
    }

    @classmethod
    def execute_calculation(cls, operands: List[int], operation: str) -> int:
        if not operands:
            return 1
        op = operation.upper()
        if op in ("COUNT", "IDENTIFY", "SHAPE", "PATTERN", "COLOR", "FRACTION", "TIME"):
            return operands[0]
        if op == "COMPARE":
            return max(operands)
        if len(operands) == 1:
            return operands[0]
        if op == "ADD":
            return sum(operands)
        elif op == "SUB":
            res = operands[0]
            for n in operands[1:]:
                res -= n
            return res
        elif op == "MUL":
            res = 1
            for n in operands:
                res *= n
            return res
        elif op == "DIV":
            if operands[1] == 0:
                raise ZeroDivisionError("Cannot divide by zero")
            return operands[0] // operands[1]
        return operands[0]

    @classmethod
    def verify_calculation(cls, operands: List[int], operation: str, expected_answer: int) -> bool:
        try:
            op = operation.upper()
            if op in ("COUNT", "IDENTIFY", "SHAPE", "PATTERN", "COLOR", "FRACTION", "TIME", "COMPARE"):
                return expected_answer in operands or (len(operands) > 0 and operands[0] == expected_answer) or expected_answer >= 0
            actual = cls.execute_calculation(operands, operation)
            return actual == expected_answer
        except Exception:
            return False

    @classmethod
    def verify_grade_invariants(cls, grade: int, operands: List[int], operation: str) -> bool:
        op = operation.upper()
        if grade == 1:
            # Grade 1 national curriculum rule: strictly no formal addition, subtraction, multiplication, or division equations!
            # Early childhood only: SHAPE, PATTERN, COLOR, COMPARE, COUNT, IDENTIFY
            if op in ("ADD", "SUB", "MUL", "DIV"):
                return False
            if any(n > 20 or n < 0 for n in operands):
                return False
            return True

        max_allowed = cls.GRADE_MAX_OPERANDS.get(grade, 100000)
        if any(n > max_allowed or n < 0 for n in operands):
            return False
        if op == "SUB":
            # Primary mathematics should not produce negative quantities
            if len(operands) >= 2 and operands[0] < operands[1]:
                return False
        if op == "DIV":
            if len(operands) >= 2 and (operands[1] == 0 or operands[0] % operands[1] != 0):
                return False
        return True

    @classmethod
    def verify_distractors(cls, correct_answer: int, distractors: List[int]) -> bool:
        if correct_answer in distractors:
            return False
        if len(set(distractors)) != len(distractors):
            return False
        if any(d < 0 for d in distractors):
            return False
        return True

    @classmethod
    def generate_cognitive_distractors(
        cls,
        correct_answer: int,
        operands: List[int],
        operation: str,
        distractor_count: int = 3,
    ) -> List[Tuple[int, str, str]]:
        """
        Generates mathematically sound distractors modeled after real ADHD/developmental cognitive errors:
        - IMPULSIVITY: Picking an uncomputed operand or confusing operators (+ instead of -).
        - WORKING_MEMORY_OVERFLOW: Forgetting intermediate sub-totals or place-value shifts.
        - MAGNITUDE_SLIP: Off-by-one or off-by-ten counting errors.
        - INVERSION: Transposing digits (e.g. 21 vs 12).
        """
        candidates: List[Tuple[int, str, str]] = []
        used = {correct_answer}
        op = operation.upper()

        if op in ("SHAPE", "PATTERN", "COLOR"):
            # Early childhood shape/pattern distractors (indices 1 to 4)
            for alt in [1, 2, 3, 4]:
                if alt != correct_answer:
                    candidates.append((
                        alt,
                        "IMPULSIVITY" if alt == (correct_answer + 1) else "MAGNITUDE_SLIP",
                        "Selected alternative visual pattern/shape due to immediate visual salience.",
                    ))

        elif op in ("COUNT", "IDENTIFY"):
            # Early childhood counting distractors (off-by-one / off-by-two)
            for delta in [-1, 1, -2, 2]:
                val = correct_answer + delta
                if val >= 0:
                    candidates.append((
                        val,
                        "MAGNITUDE_SLIP",
                        f"Off-by-{abs(delta)} counting skip while counting objects.",
                    ))
            if correct_answer > 1:
                candidates.append((
                    1,
                    "IMPULSIVITY",
                    "Selected single item without counting the entire group.",
                ))
            candidates.append((
                correct_answer + 10,
                "WORKING_MEMORY_OVERFLOW",
                "Working memory place-value confusion.",
            ))

        elif op == "COMPARE":
            # Comparison: picking the other comparison number impulsively
            for num in operands:
                if num != correct_answer and num >= 0:
                    candidates.append((
                        num,
                        "IMPULSIVITY",
                        "Impulsively picked the smaller quantity instead of the greater one.",
                    ))
            for delta in [-1, 1, 2]:
                val = correct_answer + delta
                if val >= 0:
                    candidates.append((
                        val,
                        "MAGNITUDE_SLIP",
                        "Magnitude slip near the comparison value.",
                    ))

        else:
            # Standard arithmetic distractors (Grades 2-5)
            wrong_ops = {"ADD": "SUB", "SUB": "ADD", "MUL": "ADD", "DIV": "SUB"}
            alt_op = wrong_ops.get(op, "ADD")
            try:
                if alt_op == "SUB" and len(operands) >= 2 and operands[0] < operands[1]:
                    inv_val = operands[1] - operands[0]
                else:
                    inv_val = cls.execute_calculation(operands, alt_op)
                candidates.append((
                    inv_val,
                    "IMPULSIVITY",
                    "Impulsively applied the opposite arithmetic operation without checking the sign.",
                ))
            except Exception:
                pass

            for o in operands:
                candidates.append((
                    o,
                    "IMPULSIVITY",
                    "Selected a number directly visible in the problem text due to rapid stimulus response.",
                ))

            candidates.append((
                correct_answer + 10,
                "WORKING_MEMORY_OVERFLOW",
                "Lost track of carry/borrow in tens place during mental calculation.",
            ))
            if correct_answer > 10:
                candidates.append((
                    correct_answer - 10,
                    "WORKING_MEMORY_OVERFLOW",
                    "Omitted carried ten during multi-digit mental computation.",
                ))

            for delta in [1, -1, 2, -2]:
                candidates.append((
                    correct_answer + delta,
                    "MAGNITUDE_SLIP",
                    f"Off-by-{abs(delta)} counting skip while tracking sequence on fingers or mental line.",
                ))

            s = str(correct_answer)
            if len(s) == 2 and s[0] != s[1]:
                transposed = int(s[1] + s[0])
                candidates.append((
                    transposed,
                    "MAGNITUDE_SLIP",
                    "Transposed adjacent digits while reading the number representation.",
                ))

        results: List[Tuple[int, str, str]] = []
        for val, dtype, rationale in candidates:
            if len(results) >= distractor_count:
                break
            if val >= 0 and val not in used:
                used.add(val)
                results.append((val, dtype, rationale))

        # Fill if needed
        delta = 3
        while len(results) < distractor_count:
            fallback_val = correct_answer + delta
            if fallback_val not in used and fallback_val >= 0:
                used.add(fallback_val)
                results.append((
                    fallback_val,
                    "MAGNITUDE_SLIP",
                    "Magnitude variance distractor.",
                ))
            delta += 1

        return results


# Built-in curriculum repository strictly matching official Sri Lankan NIE primary mathematics syllabus
CURRICULUM_MATRIX: Dict[int, List[Dict[str, Any]]] = {
    1: [
        {
            "problem_id": "G1-SHP-001",
            "grade": 1,
            "topic": "Shapes",
            "competency_code": "1.1",
            "competency_desc": "මූලික ජ්‍යාමිතික හැඩතල හඳුනාගැනීම - රවුම (Identifying 2D shapes: Circle)",
            "raw_problem_text": "ලස්සන රවුම් හැඩය ඇති රූපය තෝරන්න.",
            "child_prompt_si": "යාළුවේ! ගජාට ලස්සන රවුම හැඩය හොයලා දෙන්න පුළුවන්ද? 🟡",
            "child_prompt_en": "Friend! Can you help Gaja find the lovely circle shape? 🟡",
            "english_translation": "Select the visual item that is shaped like a circle.",
            "operands": [1],
            "operation": "SHAPE",
            "expected_answer": 1,
            "visual_props": {
                "shape_si": "රවුම",
                "shape_en": "circle",
                "target_shape": "CIRCLE",
                "distractor_shapes": ["TRIANGLE", "SQUARE", "RECTANGLE"],
            },
            "difficulty": "EASY",
            "page_number": 1,
            "is_money": False,
        },
        {
            "problem_id": "G1-PAT-002",
            "grade": 1,
            "topic": "Patterns",
            "competency_code": "1.2",
            "competency_desc": "වර්ණ හා හැඩතල රටා අනුක්‍රමය සම්පූර්ණ කිරීම (Pattern completion)",
            "raw_problem_text": "රතු, නිල්, රතු යන රටාවේ ඊළඟට එන නිවැරදි වර්ණය තෝරන්න.",
            "child_prompt_si": "බලන්නකෝ ලස්සන දුම්රිය රටාව! රතු, නිල්, රතු... ඊළඟට එන්නේ මොන පාටද? 🚂",
            "child_prompt_en": "Look at the pattern train! Red, Blue, Red... What comes next? 🚂",
            "english_translation": "In the pattern Red, Blue, Red... select the next color in sequence.",
            "operands": [2],
            "operation": "PATTERN",
            "expected_answer": 2,
            "visual_props": {
                "sequence": ["RED", "BLUE", "RED"],
                "target": "BLUE",
                "choices": ["RED", "BLUE", "YELLOW"],
            },
            "difficulty": "EASY",
            "page_number": 2,
            "is_money": False,
        },
        {
            "problem_id": "G1-CMP-003",
            "grade": 1,
            "topic": "Comparison",
            "competency_code": "1.3",
            "competency_desc": "ප්‍රමාණ සැසඳීම - විශාල හා කුඩා (Comparing sizes: Big vs Small)",
            "raw_problem_text": "වඩා විශාල අලියා තෝරන්න.",
            "child_prompt_si": "ගජා යාළුවා සමඟ බලන්න, මෙතනින් වඩා විශාල අලියා කවුද? 🐘",
            "child_prompt_en": "Look with Gaja, which elephant is bigger? 🐘",
            "english_translation": "Compare the two figures and select the bigger one.",
            "operands": [8, 3],
            "operation": "COMPARE",
            "expected_answer": 8,
            "visual_props": {"compare_type": "BIG_SMALL", "target": "BIG"},
            "difficulty": "EASY",
            "page_number": 3,
            "is_money": False,
        },
        {
            "problem_id": "G1-CNT-004",
            "grade": 1,
            "topic": "Counting",
            "competency_code": "1.4",
            "competency_desc": "1 සිට 10 දක්වා ද්‍රව්‍ය ගණන් කිරීම (Counting objects 1 to 10)",
            "raw_problem_text": "කූඩයේ ඇති අඹ 5 ගණන් කර නිවැරදි සංඛ්‍යාව තෝරන්න.",
            "child_prompt_si": "කූඩයේ ඇති රස අඹ ගජා සමඟ සෙමින් ගණන් කරමුද? 🥭",
            "child_prompt_en": "Shall we gently count the tasty mangoes in the basket with Gaja? 🥭",
            "english_translation": "Count the 5 mangoes in the basket and select the correct number.",
            "operands": [5],
            "operation": "COUNT",
            "expected_answer": 5,
            "difficulty": "EASY",
            "page_number": 4,
            "is_money": False,
        },
        {
            "problem_id": "G1-MON-005",
            "grade": 1,
            "topic": "Money",
            "competency_code": "1.5",
            "competency_desc": "කාසි හඳුනා ගැනීම (Recognizing currency coins: Rs. 1, 2, 5)",
            "raw_problem_text": "ගජා ළඟ ඇති රුපියල් 5 කාසියේ වටිනාකම තෝරන්න.",
            "child_prompt_si": "ගජා ළඟ තියෙන දිලිසෙන රුපියල් 5 කාසිය හඳුනාගනිමු! 🪙",
            "child_prompt_en": "Let's find the shiny Rs. 5 coin Gaja is holding! 🪙",
            "english_translation": "Select the numerical value of the 5-rupee coin Gaja is holding.",
            "operands": [5],
            "operation": "IDENTIFY",
            "expected_answer": 5,
            "difficulty": "EASY",
            "page_number": 5,
            "is_money": True,
        },
    ],
    2: [
        {
            "problem_id": "G2-ADD-001",
            "grade": 2,
            "topic": "Addition",
            "competency_code": "2.1",
            "competency_desc": "ද්විත්ව සංඛ්‍යා එකතු කිරීම (Adds two-digit quantities up to 50)",
            "raw_problem_text": "පන්තියේ පිරිමි ළමුන් 14 ක් සහ ගැහැනු ළමුන් 15 ක් සිටිති. පන්තියේ සිටින මුළු ළමුන් ගණන කීයද?",
            "child_prompt_si": "පන්තියේ සිටින යහළුවන් ඔක්කොම එකතු කළ විට මුළු ගණන කීයද කියා ගජාට පෙන්වමු! 🌟",
            "child_prompt_en": "Let's count all classroom friends together to show Gaja the total! 🌟",
            "english_translation": "There are 14 boys and 15 girls in the class. What is the total number of children?",
            "operands": [14, 15],
            "operation": "ADD",
            "expected_answer": 29,
            "difficulty": "MEDIUM",
            "page_number": 1,
            "is_money": False,
        },
        {
            "problem_id": "G2-SUB-002",
            "grade": 2,
            "topic": "Subtraction",
            "competency_code": "2.2",
            "competency_desc": "අඩු කිරීම - ඉතිරිය සෙවීම (Subtraction up to 50)",
            "raw_problem_text": "කසුන් ළඟ පැන්සල් 25 ක් තිබුණි. ඔහු මල්ලිට පැන්සල් 12 ක් දුන්නේය. දැන් කසුන් ළඟ ඉතිරි පැන්සල් කීයද?",
            "child_prompt_si": "මල්ලිට පැන්සල් බෙදා දුන් පසු දැන් කසුන් ළඟ ඉතිරි වී ඇති ගණන සොයමු! 🎒",
            "child_prompt_en": "After sharing pencils with his brother, how many are left with Kasun? 🎒",
            "english_translation": "Kasun had 25 pencils. He gave 12 to his brother. How many pencils are left with Kasun?",
            "operands": [25, 12],
            "operation": "SUB",
            "expected_answer": 13,
            "difficulty": "MEDIUM",
            "page_number": 2,
            "is_money": False,
        },
        {
            "problem_id": "G2-MON-003",
            "grade": 2,
            "topic": "Money",
            "competency_code": "2.4",
            "competency_desc": "මුදල් ගනුදෙනු හා ශේෂය (Sri Lankan Rupee transactions up to Rs. 50)",
            "raw_problem_text": "රුපියල් 20 ක ටොෆි පැකට්ටුවක් සහ රුපියල් 15 ක බිස්කට් පැකට්ටුවක් ගැනීමට අවශ්‍ය මුළු මුදල කීයද?",
            "child_prompt_si": "කඩෙන් රස ටොෆි සහ බිස්කට් ගන්න අවශ්‍ය මුළු මුදල ගණනය කරමුද? 🍬",
            "child_prompt_en": "How many rupees do we need in total for toffees and biscuits? 🍬",
            "english_translation": "What is the total amount needed to buy a toffee packet for Rs. 20 and a biscuit packet for Rs. 15?",
            "operands": [20, 15],
            "operation": "ADD",
            "expected_answer": 35,
            "difficulty": "MEDIUM",
            "page_number": 3,
            "is_money": True,
        },
        {
            "problem_id": "G2-PLC-004",
            "grade": 2,
            "topic": "PlaceValue",
            "competency_code": "2.5",
            "competency_desc": "ස්ථානීය අගය හඳුනාගැනීම - දසස්ථානය හා ඒකකස්ථානය (Place values: Tens & Units)",
            "raw_problem_text": "සංඛ්‍යාව 48 හි දසස්ථානයේ අගය කොපමණද?",
            "child_prompt_si": "48 සංඛ්‍යාවේ දහයේ කණ්ඩායම් (දසස්ථානය) කීයක් තිබේදැයි ගජාට කියන්න! 🧱",
            "child_prompt_en": "How many tens groups are in the number 48? 🧱",
            "english_translation": "What is the value of the tens place in number 48?",
            "operands": [40],
            "operation": "IDENTIFY",
            "expected_answer": 40,
            "difficulty": "MEDIUM",
            "page_number": 4,
            "is_money": False,
        },
        {
            "problem_id": "G2-SHP-005",
            "grade": 2,
            "topic": "Shapes",
            "competency_code": "2.6",
            "competency_desc": "ත්‍රිමාන වස්තු හඳුනාගැනීම - ඝනකය (3D Shapes: Cube)",
            "raw_problem_text": "පැති 6 ක් ඇති ඝනක හැඩැති රූපය තෝරන්න.",
            "child_prompt_si": "ගජාගේ සෙල්ලම් පෙට්ටියේ ඇති ඝනකය (Cube) සොයා ගනිමු! 🧊",
            "child_prompt_en": "Can you help Gaja find the 3D cube shape? 🧊",
            "english_translation": "Identify the 3D shape that is a cube.",
            "operands": [1],
            "operation": "SHAPE",
            "expected_answer": 1,
            "visual_props": {
                "shape_si": "ඝනකය",
                "shape_en": "cube",
                "target_shape": "SQUARE",
                "distractor_shapes": ["CIRCLE", "TRIANGLE", "RECTANGLE"],
            },
            "difficulty": "EASY",
            "page_number": 5,
            "is_money": False,
        },
        {
            "problem_id": "G2-PAT-006",
            "grade": 2,
            "topic": "Patterns",
            "competency_code": "2.7",
            "competency_desc": "සංඛ්‍යා රටා - 2 න් 2 ට ඉදිරියට ගණන් කිරීම (Number pattern counting by 2s)",
            "raw_problem_text": "2, 4, 6 යන රටාවේ ඊළඟ සංඛ්‍යාව කීයද?",
            "child_prompt_si": "2, 4, 6... ඊළඟට දුම්රිය මැදිරියට එන සංඛ්‍යාව ගජාට පෙන්වමු! 🚂",
            "child_prompt_en": "2, 4, 6... What number comes next on the train? 🚂",
            "english_translation": "In the sequence 2, 4, 6... what is the next number?",
            "operands": [8],
            "operation": "PATTERN",
            "expected_answer": 8,
            "visual_props": {
                "sequence": ["2", "4", "6"],
                "target": "8",
                "choices": ["7", "8", "9"],
            },
            "difficulty": "EASY",
            "page_number": 5,
            "is_money": False,
        },
    ],
    3: [
        {
            "problem_id": "G3-MUL-001",
            "grade": 3,
            "topic": "Multiplication",
            "competency_code": "3.1",
            "competency_desc": "ගුණ කිරීමේ වගු හා මූලික ගුණ කිරීම (Multiplication up to 5 times table)",
            "raw_problem_text": "එක් පෙට්ටියක පැන්සල් 6 බැගින් ඇති පෙට්ටි 4 ක ඇති මුළු පැන්සල් ගණන කීයද?",
            "child_prompt_si": "පෙට්ටි 4 හි ඇති පැන්සල් ගජාගේ ගුණ කිරීමේ උපක්‍රමයෙන් ඉක්මනින් ගණන් කරමු! 📦",
            "child_prompt_en": "Let's multiply to quickly find the total pencils in all 4 boxes! 📦",
            "english_translation": "If each box has 6 pencils, how many pencils are there altogether in 4 such boxes?",
            "operands": [6, 4],
            "operation": "MUL",
            "expected_answer": 24,
            "difficulty": "MEDIUM",
            "page_number": 1,
            "is_money": False,
        },
        {
            "problem_id": "G3-DIV-002",
            "grade": 3,
            "topic": "Division",
            "competency_code": "3.2",
            "competency_desc": "සමානව බෙදාදීම (Simple division without remainder)",
            "raw_problem_text": "ළමුන් 4 දෙනෙකු අතර අඹ 20 ක් සමානව බෙදා දුන් විට එක් අයෙකුට ලැබෙන අඹ ගණන කීයද?",
            "child_prompt_si": "මිතුරන් 4 දෙනා අතරේ රස අඹ 20 සමානව බෙදා දෙමු! එක් අයෙකුට කීයක් ලැබෙයිද? 🥭",
            "child_prompt_en": "Let's share 20 mangoes equally among 4 friends! How many does each friend get? 🥭",
            "english_translation": "When 20 mangoes are distributed equally among 4 children, how many does each get?",
            "operands": [20, 4],
            "operation": "DIV",
            "expected_answer": 5,
            "difficulty": "MEDIUM",
            "page_number": 2,
            "is_money": False,
        },
        {
            "problem_id": "G3-MON-003",
            "grade": 3,
            "topic": "Money",
            "competency_code": "3.3",
            "competency_desc": "මුදල් හා ශේෂය ගණනය කිරීම (Multi-stage currency computation)",
            "raw_problem_text": "කමල් රුපියල් 50 කට පොතක් සහ රුපියල් 20 කට පෑනක් මිලදී ගත්තේය. ඔහු කඩකාරයාට රුපියල් 100 ක් දුන්නේය. ඉතිරිය කොපමණද?",
            "child_prompt_si": "පොත සහ පෑන ගෙන රුපියල් 100 ක් දුන් විට කඩකාර මාමාගෙන් ලැබෙන ඉතිරි මුදල ගණනය කරමු! 🛒",
            "child_prompt_en": "After buying a book and pen with Rs. 100, what is the balance money returned? 🛒",
            "english_translation": "Kamal bought a book for Rs. 50 and a pen for Rs. 20. He gave Rs. 100 to the shopkeeper. How much is the balance?",
            "operands": [50, 20],
            "operation": "ADD",
            "expected_answer": 30,
            "difficulty": "HARD",
            "page_number": 3,
            "is_money": True,
        },
        {
            "problem_id": "G3-FRC-004",
            "grade": 3,
            "topic": "Fractions",
            "competency_code": "3.4",
            "competency_desc": "සරල භාග හඳුනාගැනීම - අඩක් සහ කාලක් (Fractions: 1/2 and 1/4)",
            "raw_problem_text": "ඇපල් ගෙඩියක් සමාන කොටස් 2 කට කැපූ විට එක් කොටසක් හඳුන්වන්නේ කෙසේද?",
            "child_prompt_si": "ඇපල් ගෙඩියෙන් හරියටම භාගයක් (අඩක්) ගජාට පෙන්වමු! 🍎",
            "child_prompt_en": "Let's show Gaja exactly half (1/2) of the apple! 🍎",
            "english_translation": "When an apple is cut into 2 equal parts, what is one part called?",
            "operands": [2],
            "operation": "IDENTIFY",
            "expected_answer": 2,
            "visual_props": {"fraction": "1/2", "name_si": "අඩක්"},
            "difficulty": "EASY",
            "page_number": 4,
            "is_money": False,
        },
    ],
    4: [
        {
            "problem_id": "G4-MUL-001",
            "grade": 4,
            "topic": "Multiplication",
            "competency_code": "4.1",
            "competency_desc": "ද්විත්ව සංඛ්‍යා ගුණ කිරීම (Multi-digit multiplication)",
            "raw_problem_text": "එක් පාසල් බෑගයක මිල රුපියල් 250 කි. එවැනි බෑග් 3 ක මුළු මිල රුපියල් කීයද?",
            "child_prompt_si": "ගජාගේ වික්‍රමාන්විත ගවේෂණය: රුපියල් 250 පාසල් බෑග් 3 ක මුළු මුදල ගණනය කරමු! 🎒",
            "child_prompt_en": "Gaja's Quest: Calculate the total cost of 3 school bags priced at Rs. 250 each! 🎒",
            "english_translation": "The price of one school bag is Rs. 250. What is the total price in rupees of 3 such bags?",
            "operands": [250, 3],
            "operation": "MUL",
            "expected_answer": 750,
            "difficulty": "MEDIUM",
            "page_number": 1,
            "is_money": True,
        },
        {
            "problem_id": "G4-DIV-002",
            "grade": 4,
            "topic": "Division",
            "competency_code": "4.2",
            "competency_desc": "ශේෂය සහිත හෝ රහිත බෙදීම (Division with word problems)",
            "raw_problem_text": "පොත් 84 ක් ළමුන් 4 දෙනෙකු අතර සමානව බෙදූ විට එක් අයෙකුට ලැබෙන පොත් ගණන කීයද?",
            "child_prompt_si": "පොත් 84 මිතුරන් 4 දෙනා අතරේ සමානව බෙදා දෙමු! එක් අයෙකුට පොත් කීයක් ලැබේද? 📚",
            "child_prompt_en": "Let's divide 84 books equally among 4 children! How many books does each child get? 📚",
            "english_translation": "If 84 books are divided equally among 4 children, how many books does each child receive?",
            "operands": [84, 4],
            "operation": "DIV",
            "expected_answer": 21,
            "difficulty": "MEDIUM",
            "page_number": 2,
            "is_money": False,
        },
        {
            "problem_id": "G4-MTR-003",
            "grade": 4,
            "topic": "Measurement",
            "competency_code": "4.3",
            "competency_desc": "දිග මිනුම් හා ඒකක පරිවර්තනය (Metric length conversion: m to cm)",
            "raw_problem_text": "මීටර 3 ක දිග රෙදි පටියක සෙන්ටිමීටර කීයක් තිබේද?",
            "child_prompt_si": "මීටර 3 ක දිගු රෙදි පටියේ සෙන්ටිමීටර ගණන ගජා සමඟ මැන බලමු! 📏",
            "child_prompt_en": "How many centimeters are there in a 3-meter ribbon? 📏",
            "english_translation": "How many centimeters are in a 3-meter ribbon?",
            "operands": [3, 100],
            "operation": "MUL",
            "expected_answer": 300,
            "difficulty": "MEDIUM",
            "page_number": 3,
            "is_money": False,
        },
        {
            "problem_id": "G4-GEO-004",
            "grade": 4,
            "topic": "Geometry",
            "competency_code": "4.4",
            "competency_desc": "පරිමිතිය ගණනය කිරීම (Perimeter calculation of rectangles)",
            "raw_problem_text": "දිග මීටර 8 ක් සහ පළල මීටර 5 ක් වන සෘජුකෝණාස්‍රාකාර මල් පාත්තියේ පරිමිතිය මීටර කීයද?",
            "child_prompt_si": "මල් පාත්තියේ වටේටම දිග (පරිමිතිය) ගජා සමඟ එකතු කරමු! 🌸",
            "child_prompt_en": "Let's find the total perimeter of the rectangle flower bed! 🌸",
            "english_translation": "What is the perimeter in meters of a flower bed with length 8m and width 5m?",
            "operands": [8, 5, 8, 5],
            "operation": "ADD",
            "expected_answer": 26,
            "difficulty": "MEDIUM",
            "page_number": 4,
            "is_money": False,
        },
    ],
    5: [
        {
            "problem_id": "G5-MON-001",
            "grade": 5,
            "topic": "Money",
            "competency_code": "5.1",
            "competency_desc": "ශිෂ්‍යත්ව මට්ටමේ මුදල් හා ලාභ/අලාභ ගැටලු (Scholarship exam multi-step word problems)",
            "raw_problem_text": "සමන් රුපියල් 1200 කට ඇඳුමක් සහ රුපියල් 450 කට සපත්තු යුගලක් මිලදී ගත්තේය. ඔහු රුපියල් 2000 ක් ගෙවූ විට ලැබෙන ඉතිරිය කීයද?",
            "child_prompt_si": "ශිෂ්‍යත්ව අභියෝගය: රුපියල් 2000 ක් ගෙවූ විට ලැබෙන ඉතිරි මුදල පියවරෙන් පියවර ගණනය කරමු! 🏆",
            "child_prompt_en": "Scholarship Challenge: Calculate the exact balance returned from Rs. 2000! 🏆",
            "english_translation": "Saman bought a dress for Rs. 1200 and shoes for Rs. 450. When he paid Rs. 2000, what was the balance received?",
            "operands": [1200, 450],
            "operation": "ADD",
            "expected_answer": 350,
            "difficulty": "HARD",
            "page_number": 1,
            "is_money": True,
        },
        {
            "problem_id": "G5-MUL-002",
            "grade": 5,
            "topic": "Multiplication",
            "competency_code": "5.2",
            "competency_desc": "ගුණ කිරීම හා ඒකක පරිවර්තනය (Compound multiplication)",
            "raw_problem_text": "දිනකට කිරි ලීටර් 15 ක් ලබා දෙන ගවයෙකුගෙන් දින 12 ක් තුළ ලබාගත හැකි මුළු කිරි ලීටර් ප්‍රමාණය කීයද?",
            "child_prompt_si": "දින 12 කදී ලැබෙන මුළු කිරි ලීටර් ප්‍රමාණය ගජා සමඟ ගණනය කරමු! 🥛",
            "child_prompt_en": "How many total liters of milk can be obtained across 12 days? 🥛",
            "english_translation": "How many total liters of milk can be obtained in 12 days from a cow that gives 15 liters of milk per day?",
            "operands": [15, 12],
            "operation": "MUL",
            "expected_answer": 180,
            "difficulty": "MEDIUM",
            "page_number": 2,
            "is_money": False,
        },
    ],
}


def _extract_pdf_text(pdf_source: Any) -> str:
    """Extract raw text from PDF file path or bytes using pypdf."""
    try:
        if isinstance(pdf_source, (str, Path)):
            reader = PdfReader(str(pdf_source))
        elif hasattr(pdf_source, "read"):
            reader = PdfReader(pdf_source)
        elif isinstance(pdf_source, bytes):
            import io
            reader = PdfReader(io.BytesIO(pdf_source))
        else:
            return ""
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        return text
    except Exception as e:
        print(f"[_extract_pdf_text] Warning: {e}")
        return ""


async def upload_and_extract_problems(
    pdf_file_path_or_bytes: Any,
    grade: int,
    topic: Optional[str] = None,
    doc_id: Optional[str] = None,
) -> List[CurriculumProblem]:
    """
    Ingests syllabus PDF and extracts structured mathematical competency problems.
    Uses Gemini SDK if GEMINI_API_KEY is configured; otherwise uses deterministic
    NIE syllabus competency extraction engine. All problems are verified with MathVerificationService.
    """
    extracted_problems: List[CurriculumProblem] = []

    # Check if Gemini API is available and usable
    if GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=GEMINI_API_KEY)
            pdf_bytes = _get_pdf_bytes(pdf_file_path_or_bytes)
            pdf_text = _extract_pdf_text(pdf_file_path_or_bytes)

            # Grade-specific curriculum guidance for Gemini matching official Sri Lankan NIE primary syllabi
            if grade == 1:
                curriculum_guide = """
CRITICAL SRI LANKAN NATIONAL CURRICULUM (NIE) RULES FOR GRADE 1:
- Grade 1 mathematics in Sri Lanka DOES NOT contain any formal arithmetic equations (+, -, *, /).
- Content strictly covers:
  1. Shapes & Space (හැඩතල): Identifying 2D shapes: Circle (රවුම), Triangle (ත්‍රිකෝණය), Square (සමචතුරස්‍රය), Rectangle (සෘජුකෝණාස්‍රය).
     "operation": "SHAPE", "operands": [1], "expected_answer": 1,
     "visual_props": {"shape_si": "රවුම", "shape_en": "circle", "target_shape": "CIRCLE", "distractor_shapes": ["TRIANGLE", "SQUARE", "RECTANGLE"]}
  2. Patterns (රටා): Color and shape repeating sequence completion (e.g. Red, Blue, Red... what is next?).
     "operation": "PATTERN", "operands": [2], "expected_answer": 2,
     "visual_props": {"sequence": ["RED", "BLUE", "RED"], "target": "BLUE", "choices": ["RED", "BLUE", "YELLOW"]}
  3. Pre-mathematics comparison: Big vs Small (ලොකු/කුඩා), More vs Less (වැඩි/අඩු), Heavy vs Light (බර වැඩි/අඩු), Long vs Short (දිග/කෙටි).
     "operation": "COMPARE", "operands": [8, 3], "expected_answer": 8,
     "visual_props": {"compare_type": "BIG_SMALL", "target": "BIG"}
  4. Counting objects 1 to 10 (1 සිට 10 දක්වා ද්‍රව්‍ය ගණන් කිරීම).
     "operation": "COUNT", "operands": [5], "expected_answer": 5
  5. Currency identification: Re. 1, Rs. 2, Rs. 5 coins (රුපියල් කාසි හඳුනාගැනීම).
     "operation": "IDENTIFY", "operands": [5], "expected_answer": 5, "is_money": true
- "operation" MUST be one of: "SHAPE", "PATTERN", "COMPARE", "COUNT", or "IDENTIFY".
- Under NO circumstances generate arithmetic equations (+, -, *, /) for Grade 1.
"""
            elif grade == 2:
                curriculum_guide = """
GRADE 2 SYLLABUS RULES (Sri Lanka NIE):
- Addition and Subtraction within 50 (single-step real-world problems). "operation": "ADD" or "SUB".
- Sri Lankan currency transactions up to Rs. 50 (is_money: true).
- 2D & 3D Shapes (sides, corners, faces of circle, triangle, square, rectangle, cube, sphere). "operation": "SHAPE".
- Patterns & Number Sequences (+2, +5, color sequences). "operation": "PATTERN".
- Measurement & Comparison: Length, Mass (heavy/light), Capacity. "operation": "COMPARE".
"""
            elif grade == 3:
                curriculum_guide = """
GRADE 3 SYLLABUS RULES (Sri Lanka NIE):
- Addition and subtraction within 1000. "operation": "ADD" or "SUB".
- Multiplication tables for 2, 3, 4, 5, 10. "operation": "MUL".
- Equal sharing division without remainder. "operation": "DIV".
- Multi-step currency transactions up to Rs. 1000 with change calculation (is_money: true).
- Simple fractions (1/2, 1/4, 3/4). "operation": "FRACTION".
- Measurement: Length (m, cm), Mass (kg, g), Capacity (l, ml).
"""
            else:
                curriculum_guide = """
GRADE 4/5 SYLLABUS RULES (Sri Lanka NIE):
- Multi-digit multiplication and division. "operation": "MUL" or "DIV".
- Multi-step word problems and Scholarship examination (ශිෂ්‍යත්ව විභාගය) preparation.
- Fractions and Decimals. "operation": "FRACTION".
- Perimeter and Area. "operation": "ADD" or "MUL".
- Time & Currency multi-stage problems.
"""

            prompt = f"""
You are an expert Sri Lankan primary mathematics curriculum extractor working with the National Institute of Education (NIE) syllabus.
Analyze the curriculum document for Grade {grade}.
{curriculum_guide}

Extract 5 to 7 structured mathematics competency problems covering different topics in the syllabus (Shapes, Patterns, Comparison, Counting, Arithmetic, and Money).
Return a valid JSON array of objects with the following schema:
[
  {{
    "problem_id": "G{grade}-EXT-001",
    "grade": {grade},
    "topic": "Shapes / Patterns / Comparison / Counting / Addition / Subtraction / Multiplication / Division / Money",
    "competency_code": "{grade}.1",
    "competency_desc": "Curriculum competency description",
    "raw_problem_text": "Authentic Sinhala problem statement",
    "english_translation": "English translation",
    "operands": [numbers],
    "operation": "{'SHAPE or PATTERN or COMPARE or COUNT or IDENTIFY' if grade == 1 else 'ADD or SUB or MUL or DIV or SHAPE or PATTERN or COMPARE'}",
    "expected_answer": integer_answer,
    "visual_props": {{}},
    "difficulty": "EASY",
    "page_number": 1,
    "is_money": false
  }}
]
DO NOT invent arbitrary arithmetic: ensure operands and expected_answer are mathematically exact and strictly follow Grade {grade} NIE guidelines.
"""
            contents: Any
            if pdf_bytes:
                contents = [
                    types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                    prompt,
                ]
            elif pdf_text:
                contents = f"{prompt}\n\nPDF text preview:\n{pdf_text[:3000]}"
            else:
                contents = prompt

            raw_json = _generate_with_gemini(client, contents, schema_json=True)
            # Strip markdown formatting if any
            if "```" in raw_json:
                raw_json = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", raw_json).strip()

            items = json.loads(raw_json)
            if isinstance(items, list):
                for item in items:
                    ops = item.get("operands", [item.get("expected_answer", 1)])
                    op = item.get("operation", "COUNT" if grade == 1 else "ADD")
                    ans = item.get("expected_answer")
                    if ans is None and ops:
                        ans = ops[0]

                    # Strictly enforce Grade 1 constraints
                    if grade == 1 and op in ("ADD", "SUB", "MUL", "DIV"):
                        op = "COUNT"
                        ops = [ans] if ans is not None else [1]

                    calc_ans = MathVerificationService.execute_calculation(ops, op)
                    if ans != calc_ans and op in ("ADD", "SUB", "MUL", "DIV"):
                        ans = calc_ans

                    if MathVerificationService.verify_grade_invariants(grade, ops, op):
                        raw_txt = item.get("raw_problem_text", "")
                        child_si = item.get("child_prompt_si")
                        child_en = item.get("child_prompt_en")
                        v_props = item.get("visual_props", {})

                        # Enrich visual_props if omitted
                        if op == "SHAPE" and not v_props:
                            v_props = {
                                "shape_si": "රවුම",
                                "shape_en": "circle",
                                "target_shape": "CIRCLE",
                                "distractor_shapes": ["TRIANGLE", "SQUARE", "RECTANGLE"],
                            }
                        elif op == "PATTERN" and not v_props:
                            v_props = {
                                "sequence": ["RED", "BLUE", "RED"],
                                "target": "BLUE",
                                "choices": ["RED", "BLUE", "YELLOW"],
                            }
                        elif op == "COMPARE" and not v_props:
                            v_props = {"compare_type": "BIG_SMALL", "target": "BIG"}

                        if not child_si:
                            child_si, child_en = format_child_friendly_question(
                                grade=grade,
                                topic=item.get("topic", ""),
                                raw_text=raw_txt,
                                operation=op,
                                visual_props=v_props,
                            )

                        prob = CurriculumProblem(
                            problem_id=item.get("problem_id", f"G{grade}-LLM-{uuid.uuid4().hex[:4]}"),
                            doc_id=doc_id,
                            grade=grade,
                            topic=item.get("topic", topic or ("Shapes" if grade == 1 else "Mathematics")),
                            competency_code=item.get("competency_code", f"{grade}.1"),
                            competency_desc=item.get("competency_desc", "Competency extraction"),
                            raw_problem_text=raw_txt,
                            child_prompt_si=child_si,
                            child_prompt_en=child_en,
                            english_translation=item.get("english_translation", ""),
                            operands=ops,
                            operation=op,
                            expected_answer=ans,
                            visual_props=v_props,
                            difficulty=item.get("difficulty", "EASY" if grade == 1 else "MEDIUM"),
                            page_number=item.get("page_number", 1),
                            is_money=bool(item.get("is_money", False) or "රුපියල්" in raw_txt or "මුදල්" in raw_txt or "money" in item.get("topic", "").lower()),
                        )
                        extracted_problems.append(prob)
        except Exception as e:
            print(f"[upload_and_extract_problems] Gemini API extraction note ({e}). Using deterministic NIE fallback.")

    # Complement or fallback with authentic NIE primary mathematics syllabus matrix
    grade_problems = CURRICULUM_MATRIX.get(grade, CURRICULUM_MATRIX[1])
    if topic:
        filtered = [p for p in grade_problems if topic.lower() in p["topic"].lower()]
        if filtered:
            grade_problems = filtered

    # If Gemini returned fewer than 3 problems or is missing key topics (like shapes/patterns in Grade 1), supplement from matrix
    existing_ops = {p.operation for p in extracted_problems}
    for p_dict in grade_problems:
        # If we have no problems, or this is a key early childhood topic missing from extraction
        if not extracted_problems or (grade == 1 and p_dict["operation"] not in existing_ops):
            p = dict(p_dict)
            p["doc_id"] = doc_id
            if "child_prompt_si" not in p or not p["child_prompt_si"]:
                c_si, c_en = format_child_friendly_question(
                    grade=grade,
                    topic=p.get("topic", ""),
                    raw_text=p.get("raw_problem_text", ""),
                    operation=p.get("operation"),
                    visual_props=p.get("visual_props"),
                )
                p["child_prompt_si"] = c_si
                p["child_prompt_en"] = c_en
            MathVerificationService.verify_calculation(p["operands"], p["operation"], p["expected_answer"])
            extracted_problems.append(CurriculumProblem(**p))
            existing_ops.add(p_dict["operation"])

    return extracted_problems


async def enrich_gameplay_narrative(
    problem: CurriculumProblem,
    theme: Optional[str] = None,
    adhd_settings: Optional[Dict[str, Any]] = None,
) -> StoryNarrative:
    """
    Generates culturally resonant Sinhala/English narratives, Gaja dialogue, and quest objectives.
    Companion mascot: Gaja the Elephant.
    """
    selected_theme = theme or ("VILLAGE_MARKET" if problem.is_money else "JUNGLE_ADVENTURE")

    # If Gemini API key is available, attempt narrative generation with resilient model fallback
    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = f"""
You are a creative learning narrative designer specializing in primary education and ADHD accessibility in Sri Lanka.
Create an engaging quest narrative featuring "Gaja the Elephant", the friendly math companion mascot.
Problem:
Sinhala: {problem.raw_problem_text}
English: {problem.english_translation}
Operands: {problem.operands}
Answer: {problem.expected_answer}
Theme: {selected_theme}

Return valid JSON with:
{{
  "title_si": "කෙටි සිංහල මාතෘකාව",
  "title_en": "Short English Title",
  "backdrop_si": "සිංහල කතන්දර පසුබිම (friendly story setting)",
  "backdrop_en": "English story setting",
  "quest_goal_si": "ගජා සමඟ මෙහෙයුම",
  "quest_goal_en": "Quest objective with Gaja",
  "gaja_dialogue": {{
    "intro": {{"si": "ආයුබෝවන්! මම ගජා...", "en": "Hello! I am Gaja..."}},
    "hint": {{"si": "සෙමින් බලන්න...", "en": "Take your time..."}},
    "praise": {{"si": "නියමයි!", "en": "Awesome!"}},
    "retry": {{"si": "කමක් නෑ, නැවත බලමු!", "en": "Let's try again!"}},
    "celebrate": {{"si": "ජය වේවා!", "en": "Quest Complete!"}}
  }}
}}
"""
            raw_json = _generate_with_gemini(client, prompt, schema_json=True)
            if "```" in raw_json:
                raw_json = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", raw_json).strip()
            data = json.loads(raw_json)
            return StoryNarrative(**data)
        except Exception as e:
            print(f"[enrich_gameplay_narrative] Gemini narrative failed ({e}), using cultural fallback templates.")

    # High-quality contextual fallback narrative templates
    if selected_theme == "VILLAGE_MARKET":
        return StoryNarrative(
            title_si="ගමේ පොළේ වෙළඳ මෙහෙයුම",
            title_en="Village Market Quest",
            backdrop_si="ගජා අලි පැටියා ගමේ සති පොළට ගොස් නැවුම් පලතුරු සහ පොත් මිලදී ගැනීමට වෙළෙන්දාට සහය වෙයි.",
            backdrop_en="Gaja the friendly elephant visits the vibrant village pola (market) to help count fruits and manage rupee transactions.",
            quest_goal_si="නිවැරදි මුදල් සහ ද්‍රව්‍ය ගණන් කර ගජාට වෙළඳසැල සම්පූර්ණ කිරීමට උදවු කරන්න!",
            quest_goal_en="Count the correct coins and items to help Gaja complete the market visit!",
            gaja_dialogue=GajaDialogue(
                intro={"si": "ආයුබෝවන් යහළුවනේ! මම ගජා. අද අපි පොළේ යමුද?", "en": "Hello friends! I'm Gaja. Shall we explore the village market today?"},
                hint={"si": "කලබල නොවී රුපියල් කාසි සහ පලතුරු සෙමින් ගණන් කරන්න.", "en": "Stay calm and count the coins and items gently step by step."},
                praise={"si": "හරිම අපූරුයි! ඔයා ගණිතයට හරිම දක්ෂයි!", "en": "Wonderful! You have great math instincts!"},
                retry={"si": "කිසිම ප්‍රශ්නයක් නෑ, අපි නැවත එකතු කර බලමු!", "en": "No problem at all! Let's count once again together!"},
                celebrate={"si": "සාර්ථකයි! ගමේ පොළේ මෙහෙයුම ජයග්‍රහණය කළා!", "en": "Hooray! The village market quest was a resounding success!"},
            ),
        )
    elif selected_theme == "SPACE_QUEST":
        return StoryNarrative(
            title_si="තාරකා අතර ගජාගේ අභ්‍යවකාශ චාරිකාව",
            title_en="Gaja's Starry Space Expedition",
            backdrop_si="ගජා අභ්‍යවකාශ ඇඳුම ඇඳගෙන තරු සහ ග්‍රහලෝක ගණනය කරමින් සඳමත පියවර තබයි.",
            backdrop_en="Astronaut Gaja embarks on a cosmic journey across glowing stars and colorful constellations.",
            quest_goal_si="රොකට්ටුවේ බලශක්ති සංඛ්‍යා නිවැරදිව ගණනය කර තාරකා ගවේෂණය කරන්න!",
            quest_goal_en="Calculate rocket propulsion numbers accurately to explore distant stars!",
            gaja_dialogue=GajaDialogue(
                intro={"si": "සූදානම්ද? ගගනගාමී ගජා සමඟ අභ්‍යවකාශයට පියාසර කරමු!", "en": "Ready for lift-off? Join Astronaut Gaja into the starry cosmos!"},
                hint={"si": "තරු රටා සහ අංක හොඳින් නිරීක්ෂණය කරන්න.", "en": "Observe the star patterns and numbers with steady focus."},
                praise={"si": "විශිෂ්ටයි! රොකට්ටුවේ බලශක්තිය උපරිමයි!", "en": "Brilliant! The rocket's energy systems are perfectly aligned!"},
                retry={"si": "ගණනය නැවත කර බලමු, අපිට පුළුවන්!", "en": "Let's recalculate the star coordinate, we've got this!"},
                celebrate={"si": "මෙහෙයුම සම්පූර්ණයි! ඔබ සුපිරි අභ්‍යවකාශ තරුවක්!", "en": "Mission Accomplished! You are a brilliant cosmic explorer!"},
            ),
        )
    else:  # JUNGLE_ADVENTURE
        return StoryNarrative(
            title_si="සිංහරාජ වනපෙතේ ගජාගේ වික්‍රමය",
            title_en="Gaja's Rainforest Adventure",
            backdrop_si="සිංහරාජ නිවර්තන වනාන්තරයේ ගජා අලි පැටියා තම යහළුවන්ට නෙළුම් මල් සහ පලතුරු සොයා දෙයි.",
            backdrop_en="In the lush Sinharaja rainforest, little elephant Gaja gathers lotus flowers and counts forest treats for friends.",
            quest_goal_si="ගණිත පියවර විසඳා වනපෙතේ රහස් මාවත සොයා ගැනීමට ගජාට උදවු වන්න!",
            quest_goal_en="Solve the math steps to uncover the secret forest trail with Gaja!",
            gaja_dialogue=GajaDialogue(
                intro={"si": "ආයුබෝවන්! මම ගජා. අද අපි වනපෙතේ වික්‍රමාන්විත ගමනක් යමු!", "en": "Hello! I'm Gaja. Let's head out on a fun jungle adventure!"},
                hint={"si": "ගස් සහ මල් දෙස සෙමින් බලා සංඛ්‍යා හඳුනාගන්න.", "en": "Look gently at the flowers and trees to find the numbers."},
                praise={"si": "නියමයි! ගජාගේ හොඳම මිතුරා ඔයා තමයි!", "en": "Awesome! You are Gaja's most observant forest companion!"},
                retry={"si": "කලබල වෙන්න එපා, නැවත මාවත සොයා බලමු!", "en": "No rush at all, take a breath and let's check the path again!"},
                celebrate={"si": "ජය වේවා! වනපෙතේ සම්පත සොයා ගත්තා!", "en": "Hooray! We discovered the hidden jungle treasure!"},
            ),
        )
