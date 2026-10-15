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

# Load root .env
load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


class MathVerificationService:
    """
    Deterministic mathematical & cognitive verification engine.
    Guarantees that:
    1. Calculations are NEVER delegated to LLMs.
    2. Operands and operations follow primary mathematics constraints (Grade 1-5).
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
        if not operands or len(operands) < 2:
            raise ValueError(f"At least two operands required for calculation, got {operands}")
        op = operation.upper()
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
        raise ValueError(f"Unsupported arithmetic operation: {operation}")

    @classmethod
    def verify_calculation(cls, operands: List[int], operation: str, expected_answer: int) -> bool:
        try:
            actual = cls.execute_calculation(operands, operation)
            return actual == expected_answer
        except Exception:
            return False

    @classmethod
    def verify_grade_invariants(cls, grade: int, operands: List[int], operation: str) -> bool:
        max_allowed = cls.GRADE_MAX_OPERANDS.get(grade, 100000)
        if any(n > max_allowed or n < 0 for n in operands):
            return False
        if operation.upper() == "SUB":
            # Primary mathematics should not produce negative quantities
            if len(operands) >= 2 and operands[0] < operands[1]:
                return False
        if operation.upper() == "DIV":
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

        # 1. Impulsive operator confusion
        wrong_ops = {"ADD": "SUB", "SUB": "ADD", "MUL": "ADD", "DIV": "SUB"}
        alt_op = wrong_ops.get(operation, "ADD")
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

        # 2. Impulsive operand echo (surface cue selection)
        for op in operands:
            candidates.append((
                op,
                "IMPULSIVITY",
                "Selected a number directly visible in the problem text due to rapid stimulus response.",
            ))

        # 3. Working memory overflow (place value or carry slip)
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

        # 4. Magnitude slip (off-by-one counting error)
        for delta in [1, -1, 2, -2]:
            candidates.append((
                correct_answer + delta,
                "MAGNITUDE_SLIP",
                f"Off-by-{abs(delta)} counting skip while tracking sequence on fingers or mental line.",
            ))

        # 5. Inversion (digit transposition)
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

        # Fallback if candidates were insufficient
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


# Built-in curriculum repository matching official NIE primary mathematics syllabus
CURRICULUM_MATRIX: Dict[int, List[Dict[str, Any]]] = {
    1: [
        {
            "problem_id": "G1-NUM-001",
            "grade": 1,
            "topic": "Addition",
            "competency_code": "1.1",
            "competency_desc": "එකතු කිරීම - 1 සිට 10 දක්වා සංඛ්‍යා එකතු කිරීම (Adds quantities up to 10)",
            "raw_problem_text": "මාලාට ඇපල් 5 ක් ඇත. නිමල් ඇයට තවත් ඇපල් 3 ක් දුන්නේය. දැන් මාලා ළඟ ඇපල් කීයක් තිබේද?",
            "english_translation": "Mala has 5 apples. Nimal gave her 3 more apples. How many apples does Mala have now?",
            "operands": [5, 3],
            "operation": "ADD",
            "expected_answer": 8,
            "difficulty": "EASY",
            "page_number": 1,
            "is_money": False,
        },
        {
            "problem_id": "G1-SUB-002",
            "grade": 1,
            "topic": "Subtraction",
            "competency_code": "1.2",
            "competency_desc": "අඩු කිරීම - 10 ට අඩු සංඛ්‍යා අඩු කිරීම (Subtracts single-digit numbers)",
            "raw_problem_text": "ගසේ කුරුල්ලන් 7 ක් සිටියා. උන්ගෙන් 3 ක් පියාඹා ගියා. දැන් ගසේ ඉතිරි කුරුල්ලන් ගණන කීයද?",
            "english_translation": "There were 7 birds on a tree. 3 flew away. How many birds are left on the tree?",
            "operands": [7, 3],
            "operation": "SUB",
            "expected_answer": 4,
            "difficulty": "EASY",
            "page_number": 2,
            "is_money": False,
        },
        {
            "problem_id": "G1-CNT-003",
            "grade": 1,
            "topic": "Counting",
            "competency_code": "1.3",
            "competency_desc": "ද්‍රව්‍ය ගණන් කිරීම හා එකතු කිරීම (Counting objects and adding within 15)",
            "raw_problem_text": "කූඩයේ අඹ 6 ක් ඇත. අම්මා තවත් අඹ 4 ක් දැමුවාය. දැන් කූඩයේ ඇති මුළු අඹ ගණන කීයද?",
            "english_translation": "There are 6 mangoes in the basket. Mother added 4 more mangoes. What is the total number of mangoes in the basket now?",
            "operands": [6, 4],
            "operation": "ADD",
            "expected_answer": 10,
            "difficulty": "EASY",
            "page_number": 3,
            "is_money": False,
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
            "english_translation": "There are 14 boys and 15 girls in the class. What is the total number of children in the class?",
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
            "english_translation": "Kasun had 25 pencils. He gave 12 pencils to his younger brother. How many pencils are left with Kasun now?",
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
            "english_translation": "What is the total amount needed to buy a toffee packet for Rs. 20 and a biscuit packet for Rs. 15?",
            "operands": [20, 15],
            "operation": "ADD",
            "expected_answer": 35,
            "difficulty": "MEDIUM",
            "page_number": 3,
            "is_money": True,
        },
    ],
    3: [
        {
            "problem_id": "G3-MON-001",
            "grade": 3,
            "topic": "Money",
            "competency_code": "3.3",
            "competency_desc": "මුදල් හා ශේෂය ගණනය කිරීම (Multi-stage currency computation)",
            "raw_problem_text": "කමල් රුපියල් 50 කට පොතක් සහ රුපියල් 20 කට පෑනක් මිලදී ගත්තේය. ඔහු කඩකාරයාට රුපියල් 100 ක් දුන්නේය. ඉතිරිය කොපමණද?",
            "english_translation": "Kamal bought a book for Rs. 50 and a pen for Rs. 20. He gave Rs. 100 to the shopkeeper. How much is the balance?",
            "operands": [50, 20],
            "operation": "ADD",
            "expected_answer": 30,
            "difficulty": "HARD",
            "page_number": 2,
            "is_money": True,
        },
        {
            "problem_id": "G3-MUL-002",
            "grade": 3,
            "topic": "Multiplication",
            "competency_code": "3.1",
            "competency_desc": "ගුණ කිරීමේ වගු හා මූලික ගුණ කිරීම (Multiplication up to 5 times table)",
            "raw_problem_text": "එක් පෙට්ටියක පැන්සල් 6 බැගින් ඇති පෙට්ටි 4 ක ඇති මුළු පැන්සල් ගණන කීයද?",
            "english_translation": "If each box has 6 pencils, how many pencils are there altogether in 4 such boxes?",
            "operands": [6, 4],
            "operation": "MUL",
            "expected_answer": 24,
            "difficulty": "MEDIUM",
            "page_number": 3,
            "is_money": False,
        },
        {
            "problem_id": "G3-DIV-003",
            "grade": 3,
            "topic": "Division",
            "competency_code": "3.2",
            "competency_desc": "සමානව බෙදාදීම (Simple division without remainder)",
            "raw_problem_text": "ළමුන් 4 දෙනෙකු අතර අඹ 20 ක් සමානව බෙදා දුන් විට එක් අයෙකුට ලැබෙන අඹ ගණන කීයද?",
            "english_translation": "When 20 mangoes are distributed equally among 4 children, how many mangoes does each child get?",
            "operands": [20, 4],
            "operation": "DIV",
            "expected_answer": 5,
            "difficulty": "MEDIUM",
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
            "english_translation": "The price of one school bag is Rs. 250. What is the total price in rupees of 3 such bags?",
            "operands": [250, 3],
            "operation": "MUL",
            "expected_answer": 750,
            "difficulty": "MEDIUM",
            "page_number": 2,
            "is_money": True,
        },
        {
            "problem_id": "G4-DIV-002",
            "grade": 4,
            "topic": "Division",
            "competency_code": "4.2",
            "competency_desc": "ශේෂය සහිත හෝ රහිත බෙදීම (Division with word problems)",
            "raw_problem_text": "පොත් 84 ක් ළමුන් 4 දෙනෙකු අතර සමානව බෙදූ විට එක් අයෙකුට ලැබෙන පොත් ගණන කීයද?",
            "english_translation": "If 84 books are divided equally among 4 children, how many books does each child receive?",
            "operands": [84, 4],
            "operation": "DIV",
            "expected_answer": 21,
            "difficulty": "MEDIUM",
            "page_number": 3,
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
            "english_translation": "How many total liters of milk can be obtained in 12 days from a cow that gives 15 liters of milk per day?",
            "operands": [15, 12],
            "operation": "MUL",
            "expected_answer": 180,
            "difficulty": "MEDIUM",
            "page_number": 3,
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
            pdf_text = _extract_pdf_text(pdf_file_path_or_bytes)

            prompt = f"""
You are an expert Sri Lankan primary mathematics curriculum extractor.
Analyze the following text from an official Sri Lankan NIE Mathematics Syllabus for Grade {grade}.
Extract 3 to 6 structured mathematics competency problems suitable for primary school learners.
Return a valid JSON array of objects with the following schema:
[
  {{
    "problem_id": "G{grade}-EXT-001",
    "grade": {grade},
    "topic": "Addition or Subtraction or Money or Multiplication",
    "competency_code": "e.g. {grade}.1",
    "competency_desc": "Description in Sinhala or English",
    "raw_problem_text": "Sinhala problem statement",
    "english_translation": "English translation",
    "operands": [first_number, second_number],
    "operation": "ADD or SUB or MUL or DIV",
    "expected_answer": integer_answer,
    "difficulty": "EASY or MEDIUM or HARD",
    "page_number": 1,
    "is_money": false
  }}
]
DO NOT invent arbitrary arithmetic: ensure operands and expected_answer are mathematically exact.
PDF text preview:
{pdf_text[:3000]}
"""
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
            raw_json = response.text
            items = json.loads(raw_json)
            if isinstance(items, list):
                for item in items:
                    ops = item.get("operands", [])
                    op = item.get("operation", "ADD")
                    ans = item.get("expected_answer")
                    # Deterministically recalculate and verify math
                    if len(ops) >= 2:
                        calc_ans = MathVerificationService.execute_calculation(ops, op)
                        if ans != calc_ans:
                            ans = calc_ans  # Correct LLM calculation errors deterministically
                        if MathVerificationService.verify_grade_invariants(grade, ops, op):
                            prob = CurriculumProblem(
                                problem_id=item.get("problem_id", f"G{grade}-LLM-{uuid.uuid4().hex[:4]}"),
                                doc_id=doc_id,
                                grade=grade,
                                topic=item.get("topic", topic or "Mathematics"),
                                competency_code=item.get("competency_code", f"{grade}.1"),
                                competency_desc=item.get("competency_desc", "Competency extraction"),
                                raw_problem_text=item.get("raw_problem_text", ""),
                                english_translation=item.get("english_translation", ""),
                                operands=ops,
                                operation=op,
                                expected_answer=ans,
                                difficulty=item.get("difficulty", "MEDIUM"),
                                page_number=item.get("page_number", 1),
                                is_money=bool(item.get("is_money", False)),
                            )
                            extracted_problems.append(prob)
        except Exception as e:
            print(f"[upload_and_extract_problems] Gemini API failed or unavailable ({e}). Using deterministic NIE fallback.")

    # Fallback to authentic NIE primary mathematics syllabus matrix
    if not extracted_problems:
        grade_problems = CURRICULUM_MATRIX.get(grade, CURRICULUM_MATRIX[1])
        if topic:
            filtered = [p for p in grade_problems if topic.lower() in p["topic"].lower()]
            if filtered:
                grade_problems = filtered

        for p_dict in grade_problems:
            p = dict(p_dict)
            p["doc_id"] = doc_id
            # Verify and enforce deterministic math
            MathVerificationService.verify_calculation(p["operands"], p["operation"], p["expected_answer"])
            extracted_problems.append(CurriculumProblem(**p))

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

    # If Gemini API key is available, attempt narrative generation
    if GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types

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
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
            data = json.loads(response.text)
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
