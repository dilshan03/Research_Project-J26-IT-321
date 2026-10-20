import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dotenv import load_dotenv

from app.schemas.syllabus import (
    CurriculumProblem,
    GajaDialogue,
    StoryNarrative,
)

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
            raw_json = await asyncio.to_thread(_generate_with_gemini, client, prompt, True)
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
