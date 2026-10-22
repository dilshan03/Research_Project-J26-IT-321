"""
Rule-based parser for Sinhala primary-mathematics word problems.

Extracts numeric quantities and infers the arithmetic operation sequence
from Sinhala keyword cues. Deterministic by design so results are
reproducible for research evaluation.
"""
import re
from dataclasses import dataclass, field
from typing import List, Optional

# Keyword cues (substring match against the raw Sinhala text).
ADD_CUES = ["එකතු", "තවත්", "ලැබුණ", "දුන්නේය", "සියල්ල", "මුළු", "ගත්තේය"]
SUB_CUES = ["අඩු", "ඉතිරි", "කෑව", "නැති", "වියදම්", "ශේෂ", "වැඩිද"]
MUL_CUES = ["ගුණ", "වතාවක්", "බැගින් ඇති", "පෙට්ටි"]
DIV_CUES = ["බෙද", "සමානව", "බැගින් දුන්"]
MONEY_CUES = ["රුපියල්", "රු.", "සත"]

OPERATION_SYMBOLS = {"ADD": "+", "SUB": "−", "MUL": "×", "DIV": "÷"}


@dataclass
class ParsedProblem:
    numbers: List[int]
    operations: List[str] = field(default_factory=list)  # ordered, e.g. ["ADD", "SUB"]
    is_money: bool = False
    partial_results: List[int] = field(default_factory=list)
    final_answer: Optional[int] = None


def _has(text: str, cues: List[str]) -> bool:
    return any(c in text for c in cues)


def _apply(op: str, a: int, b: int) -> int:
    if op == "ADD":
        return a + b
    if op == "SUB":
        return a - b
    if op == "MUL":
        return a * b
    if op == "DIV":
        return a // b if b else 0
    raise ValueError(f"Unknown operation {op}")


def parse_problem(raw_sinhala_text: str, operation_hint: Optional[str] = None) -> ParsedProblem:
    numbers = [int(n) for n in re.findall(r"\d+", raw_sinhala_text)]
    is_money = _has(raw_sinhala_text, MONEY_CUES)
    parsed = ParsedProblem(numbers=numbers, is_money=is_money)

    if len(numbers) < 2:
        if len(numbers) == 1:
            parsed.final_answer = numbers[0]
            parsed.operations = ["COUNT"]
        return parsed

    # Multi-step "balance" pattern: buy items, pay with a larger note -> sum then subtract.
    if len(numbers) >= 3 and _has(raw_sinhala_text, ["ඉතිරි", "ශේෂ"]):
        paid = max(numbers)
        items = [n for n in numbers if n != paid] or numbers[:-1]
        subtotal = items[0]
        ops = []
        for n in items[1:]:
            subtotal += n
            ops.append("ADD")
        parsed.operations = ops + ["SUB"]
        parsed.partial_results = [subtotal]
        parsed.final_answer = paid - subtotal
        parsed.numbers = items + [paid]
        return parsed

    a, b = numbers[0], numbers[1]
    if operation_hint in OPERATION_SYMBOLS:
        op = operation_hint
    elif _has(raw_sinhala_text, SUB_CUES):
        op = "SUB"
    elif _has(raw_sinhala_text, DIV_CUES):
        op = "DIV"
    elif _has(raw_sinhala_text, MUL_CUES):
        op = "MUL"
    elif _has(raw_sinhala_text, ADD_CUES):
        op = "ADD"
    else:
        op = "ADD"

    # Keep subtraction results non-negative for primary learners.
    if op == "SUB" and b > a:
        a, b = b, a
        parsed.numbers = [a, b] + numbers[2:]

    parsed.operations = [op]
    parsed.final_answer = _apply(op, a, b)
    return parsed
