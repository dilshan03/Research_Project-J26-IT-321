"""
Syllabus ingestion pipeline: NIE teacher's-guide PDF -> grounded, game-ready CurriculumProblems.

Why it is built this way:
  * The NIE guides are typeset in legacy (non-Unicode) Sinhala fonts, and the Grade 4
    guide has no usable text layer at all, so the PDF text layer is never trusted.
    Every page is rendered to an image and transcribed to Unicode Sinhala by Gemini.
  * Transcripts and mined candidates are cached per file fingerprint (data/syllabi/_cache),
    so a 190-page guide is only sent to the model once and re-validation is free.
  * Nothing reaches the problem bank unless `validate_candidate` accepts it: the quoted
    source text must appear on the cited page, every number must be printed on that page,
    the arithmetic must check out, and a game mechanic must exist for it. Rejections are
    counted per reason so coverage is visible instead of silently papered over.
"""
from __future__ import annotations

import asyncio
import difflib
import hashlib
import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from app.schemas.syllabus import CurriculumProblem
from app.services.llm_extractor import GEMINI_API_KEY, GEMINI_MODELS, MathVerificationService

CACHE_DIR = Path(os.getenv("SYLLABUS_CACHE_DIR", Path(__file__).resolve().parents[2] / "data" / "syllabi" / "_cache"))

RENDER_DPI = 110            # Sinhala strokes stay legible; ~100 KB per JPEG page
TRANSCRIBE_BATCH = 6        # pages per vision request
MINE_BATCH = 8              # transcribed pages per extraction request
MAX_CONCURRENCY = 4
MAX_RETRIES = 5

ProgressFn = Callable[[str, int, int], Awaitable[None]]

SINHALA = re.compile(r"[඀-෿]")
LATIN_WORD = re.compile(r"[A-Za-z]{2,}")
LEGACY_GLYPHS = re.compile(r"[À-ÿ]")   # FM-font mojibake (À-ÿ) never occurs in real Sinhala
DIGITS = re.compile(r"\d+")
# Letters from other scripts (Hebrew..Malayalam, Thai, ...) that vision transcription occasionally
# hallucinates inside Sinhala words, e.g. "පರಿಸරය" with Kannada letters.
FOREIGN_SCRIPT = re.compile("[֐-ࣿऀ-ൿ฀-࿿]")

SHAPES = {
    "CIRCLE": ("රවුම", "Circle", ["රවුම", "වෘත්ත", "කවය"]),
    "TRIANGLE": ("ත්‍රිකෝණය", "Triangle", ["ත්‍රිකෝණ"]),
    "SQUARE": ("සමචතුරස්‍රය", "Square", ["සමචතුරස්‍ර", "හතරැස්", "චතුරස්‍ර"]),
    "RECTANGLE": ("සෘජුකෝණාස්‍රය", "Rectangle", ["සෘජුකෝණාස්‍ර"]),
}
COLORS = {
    "RED": ("රතු", "Red"),
    "BLUE": ("නිල්", "Blue"),
    "YELLOW": ("කහ", "Yellow"),
    "GREEN": ("කොළ", "Green"),
}
ARITHMETIC = ("ADD", "SUB", "MUL", "DIV")
SUPPORTED_OPS = ARITHMETIC + ("COUNT", "COMPARE", "SHAPE", "PATTERN")
MONEY_CUES = ("රුපියල්", "රු.", "රුපියල", "සත")
COUNT_PROMPT = ("අපි එකට ගණන් කරමු! මෙතන කීයක් තියෙනවද?", "Let's count together! How many are there?")


# --------------------------------------------------------------------------- utils

def fingerprint(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _norm(text: str) -> str:
    """Whitespace/punctuation-insensitive form used for quote matching."""
    text = text.replace("‍", "").replace("‌", "")
    return re.sub(r"[\s\.,;:!?\"'“”‘’()\[\]•|/\-–—]+", "", text)


def quote_on_page(quote: str, page_text: str, threshold: float = 0.85) -> bool:
    """True when `quote` appears on the page, tolerating small transcription differences."""
    q, p = _norm(quote), _norm(page_text)
    if len(q) < 6 or not p:
        return False
    if q in p:
        return True
    m = difflib.SequenceMatcher(None, q, p, autojunk=False).find_longest_match(0, len(q), 0, len(p))
    return m.size >= threshold * len(q)


def numbers_in(text: str) -> set:
    return {int(n) for n in DIGITS.findall(text or "")}


def contains_all_numbers(text: str, numbers: List[int]) -> bool:
    found = DIGITS.findall(text or "")
    pool = list(found)
    for n in numbers:
        s = str(n)
        if s in pool:
            pool.remove(s)
        elif s not in found:
            return False
    return True


def clean_sinhala(text: str) -> bool:
    """Real Unicode Sinhala, without leaked legacy-font glyphs, foreign-script letters or stray Latin words."""
    if not text or not SINHALA.search(text) or LEGACY_GLYPHS.search(text) or FOREIGN_SCRIPT.search(text):
        return False
    latin = [w for w in LATIN_WORD.findall(text) if w.lower() not in ("rs", "cm", "kg", "km", "ml", "mm")]
    return not latin


# ---------------------------------------------------------------------- validation

@dataclass
class ValidationReport:
    accepted: int = 0
    rejected: Dict[str, int] = field(default_factory=dict)

    def reject(self, reason: str) -> None:
        self.rejected[reason] = self.rejected.get(reason, 0) + 1


def _as_int_list(value: Any) -> Optional[List[int]]:
    if not isinstance(value, list):
        return None
    out = []
    for v in value:
        if isinstance(v, bool):
            return None
        if isinstance(v, (int, float)) and float(v).is_integer():
            out.append(int(v))
        elif isinstance(v, str) and v.strip().isdigit():
            out.append(int(v.strip()))
        else:
            return None
    return out


def validate_candidate(
    c: Dict[str, Any],
    grade: int,
    pages: Dict[int, str],
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Returns (clean problem fields, None) or (None, rejection reason).
    Deterministic: the same transcripts and candidates always give the same bank.

    Two kinds of item are accepted:
      * "exercise": printed in the guide. Every number must appear on the cited page.
      * "aligned":  written for a competency level quoted from the cited page. Every number
                    must stay within the limit that competency states (e.g. "එකතුව 6 තෙක්"),
                    and that limit must itself be printed in the quote.
    """
    op = str(c.get("operation") or "").upper()
    if op not in SUPPORTED_OPS:
        return None, f"no game for operation {op or 'UNKNOWN'}"

    kind = str(c.get("kind") or "aligned").lower()
    if kind not in ("exercise", "aligned"):
        return None, "unknown item kind"

    try:
        page_no = int(c.get("page_number"))
    except (TypeError, ValueError):
        return None, "missing page number"
    page_text = pages.get(page_no, "")
    if not page_text:
        return None, "cited page not in document"

    quote = str(c.get("source_quote") or "")
    if not quote_on_page(quote, page_text):
        return None, "source quote not found on cited page"

    raw = str(c.get("raw_problem_text") or "").strip()
    if not clean_sinhala(raw):
        return None, "problem text is not clean Unicode Sinhala"

    grade_max = 20 if grade == 1 else MathVerificationService.GRADE_MAX_OPERANDS.get(grade, 100000)
    # A limit only counts when the quoted competency actually prints it; otherwise the normal
    # grade range applies. An invented limit can therefore never loosen the bounds.
    limit = grade_max
    stated = _as_int_list([c.get("number_limit")]) if c.get("number_limit") not in (None, "") else None
    if stated and stated[0] > 0 and stated[0] in numbers_in(quote):
        limit = min(stated[0], grade_max)

    def numbers_ok(nums: List[int]) -> Optional[str]:
        if kind == "exercise":
            return None if contains_all_numbers(page_text, nums) else "numbers not printed on cited page"
        return None if max(nums, default=0) <= limit else "numbers exceed the competency's limit"

    visual: Dict[str, Any] = {}
    operands = _as_int_list(c.get("operands")) or []

    if op in ARITHMETIC:
        if len(operands) != 2:
            return None, "arithmetic needs exactly two numbers"
        if grade == 1 and op not in ("ADD", "SUB"):
            return None, "outside grade number range or not exact"
        if not MathVerificationService.verify_grade_invariants(max(grade, 2), operands, op):
            return None, "outside grade number range or not exact"
        expected = MathVerificationService.execute_calculation(operands, op)
        if c.get("expected_answer") is not None and _as_int_list([c.get("expected_answer")]) != [expected]:
            return None, "stated answer is wrong"
        # Limits like "එකතුව 9 තෙක්" bound the result as well as the parts.
        bounded = operands if op in ("MUL", "DIV") else operands + [expected]
        err = numbers_ok(operands if kind == "exercise" else bounded)
        if err:
            return None, err
        if not contains_all_numbers(raw, operands):
            return None, "problem text drops its numbers"

    elif op == "COUNT":
        if len(operands) != 1 or not (1 <= operands[0] <= 20):
            return None, "counting needs one number from 1 to 20"
        err = numbers_ok(operands)
        if err:
            return None, err
        expected = operands[0]

    elif op == "COMPARE":
        if len(operands) != 2 or operands[0] == operands[1] or min(operands) < 0:
            return None, "comparison needs two different numbers"
        err = numbers_ok(operands)
        if err:
            return None, err
        target = str((c.get("visual_props") or {}).get("target") or "BIGGER").upper()
        if target not in ("BIGGER", "SMALLER"):
            return None, "comparison must ask for the bigger or the smaller"
        expected = max(operands) if target == "BIGGER" else min(operands)
        visual = {"target": target}

    elif op == "SHAPE":
        vp = c.get("visual_props") or {}
        target = str(vp.get("target_shape") or "").upper()
        if target not in SHAPES:
            return None, "shape not one the game can draw"
        if not any(w in page_text for w in SHAPES[target][2]):
            return None, "shape not named on cited page"
        visual = {"target_shape": target, "shape_si": SHAPES[target][0], "shape_en": SHAPES[target][1]}
        operands, expected = [1], 1

    else:  # PATTERN
        vp = c.get("visual_props") or {}
        pkind = str(vp.get("kind") or "").upper()
        if pkind == "NUMBER":
            seq = _as_int_list(vp.get("sequence"))
            target = _as_int_list([vp.get("target")])
            if not seq or len(seq) < 3 or not target:
                return None, "pattern needs at least three terms and an answer"
            diffs = {b - a for a, b in zip(seq, seq[1:])}
            if len(diffs) != 1 or 0 in diffs or target[0] != seq[-1] + diffs.pop() or target[0] < 0:
                return None, "number pattern is not a constant step"
            err = numbers_ok(seq if kind == "exercise" else seq + target)
            if err:
                return None, err
            visual = {"kind": "NUMBER", "sequence": seq, "target": target[0]}
            operands, expected = seq, target[0]
        elif pkind == "COLOR":
            seq = [str(s).upper() for s in (vp.get("sequence") or [])]
            target = str(vp.get("target") or "").upper()
            if len(seq) < 3 or any(s not in COLORS for s in seq + [target]):
                return None, "colour pattern uses colours the game cannot show"
            period = next((p for p in range(1, len(seq)) if all(seq[i] == seq[i % p] for i in range(len(seq)))), None)
            if period is None or seq[len(seq) % period] != target:
                return None, "colour pattern answer does not continue the sequence"
            visual = {"kind": "COLOR", "sequence": seq, "target": target}
            operands, expected = [list(COLORS).index(target) + 1], list(COLORS).index(target) + 1
        else:
            return None, "pattern kind must be NUMBER or COLOR"

    # Child-facing prompts must keep every number the game asks about (NumberHunt taps them).
    keep = operands if op in ARITHMETIC or op == "COMPARE" else []
    child_si = str(c.get("child_prompt_si") or "").strip()
    if not clean_sinhala(child_si) or not contains_all_numbers(child_si, keep):
        child_si = raw
    child_en = str(c.get("child_prompt_en") or "").strip() or None
    if child_en and (SINHALA.search(child_en) or not contains_all_numbers(child_en, keep)):
        child_en = None
    english = str(c.get("english_translation") or "").strip() or None
    if english and (SINHALA.search(english) or not contains_all_numbers(english, keep)):
        english = None
    if op == "COUNT":
        # The game draws the objects and asks "how many?", so the prompt must not say the answer.
        if str(expected) in DIGITS.findall(child_si):
            child_si = COUNT_PROMPT[0]
        if child_en and str(expected) in DIGITS.findall(child_en):
            child_en = COUNT_PROMPT[1]
        child_en = child_en or COUNT_PROMPT[1]

    competency_desc = str(c.get("competency_desc") or "").strip() or None
    if competency_desc and not clean_sinhala(competency_desc):
        competency_desc = None

    return {
        "grade": grade,
        "topic": str(c.get("topic") or op.title()).strip()[:60],
        "competency_code": (str(c.get("competency_code")).strip()[:12] or None) if c.get("competency_code") else None,
        "competency_desc": competency_desc,
        "raw_problem_text": raw,
        "child_prompt_si": child_si,
        "child_prompt_en": child_en,
        "english_translation": english,
        "operation": op,
        "operands": operands,
        "expected_answer": expected,
        "visual_props": visual,
        "difficulty": c.get("difficulty") if c.get("difficulty") in ("EASY", "MEDIUM", "HARD") else "MEDIUM",
        "page_number": page_no,
        "is_money": any(m in raw for m in MONEY_CUES),
        "source": "syllabus",
        "source_kind": kind,
        "source_quote": quote.strip(),
    }, None


def build_problem_bank(
    candidates: List[Dict[str, Any]],
    grade: int,
    pages: Dict[int, str],
    doc_id: str,
) -> Tuple[List[CurriculumProblem], ValidationReport]:
    report = ValidationReport()
    seen = set()
    per_page: Dict[int, int] = {}
    problems: List[CurriculumProblem] = []
    for c in candidates:
        fields, reason = validate_candidate(c, grade, pages)
        if reason or fields is None:
            report.reject(reason or "invalid")
            continue
        key =(fields["operation"], tuple(fields["operands"]), json.dumps(fields["visual_props"], sort_keys=True))
        if key in seen:
            report.reject("duplicate of another problem")
            continue
        seen.add(key)
        n = per_page[fields["page_number"]] = per_page.get(fields["page_number"], 0) + 1
        problems.append(CurriculumProblem(
            problem_id=f"{doc_id}-p{fields['page_number']:03d}-{n}",
            doc_id=doc_id,
            **fields,
        ))
        report.accepted += 1
    return problems, report


# ------------------------------------------------------------------------- backend

TRANSCRIBE_PROMPT = """You are transcribing pages of an official Sri Lankan NIE primary mathematics teacher's guide.
For EACH page image, transcribe all of its text exactly, in reading order, into Unicode.
- Sinhala must be proper Unicode Sinhala. Keep every number as printed (digits stay digits).
- Keep line breaks. Write table rows as lines with cells separated by " | ".
- Describe pictures only when they carry numbers or quantities, in square brackets, e.g. [පින්තූරය: ඇපල් 5ක්].
- Do not summarise, translate, correct or add anything.
The images are labelled IMAGE 1, IMAGE 2, ... Ignore any page numbers printed on the pages themselves.
Return JSON only, one entry per image: [{"image": <label number>, "text": "<transcription>"}]"""

MINE_PROMPT = """You are building a problem bank for an ADHD-friendly maths game from the official Sri Lankan
NIE Grade {grade} mathematics teacher's guide. Below are Unicode transcriptions of some of its pages.
A teacher's guide mostly states competency levels (නිපුණතා මට්ටම) and learning outcomes (ඉගෙනුම් ඵල),
often with a number range, e.g. "4.1 එකතුව 6 තෙක් වන සංඛ්‍යා දෙකක එකතුව සොයයි".

Produce practice items a Grade {grade} child can do in ONE of these game types:
  ADD / SUB / MUL / DIV : one-step word problem with exactly two numbers.             operands: [a, b]
  COUNT   : count a set of objects (1-20).                                            operands: [n]
  COMPARE : pick the bigger or the smaller of two numbers.  operands: [a, b]  visual_props: {{"target": "BIGGER|SMALLER"}}
  SHAPE   : recognise a circle, triangle, square or rectangle.  visual_props: {{"target_shape": "CIRCLE|TRIANGLE|SQUARE|RECTANGLE"}}
  PATTERN : continue a pattern.  visual_props: {{"kind": "NUMBER", "sequence": [2,4,6], "target": 8}}
                                 or {{"kind": "COLOR", "sequence": ["RED","BLUE","RED"], "target": "BLUE"}} (RED, BLUE, YELLOW, GREEN only)

Two kinds of item:
  "kind": "exercise" - an exercise, example or question printed on the page. Use its numbers exactly.
  "kind": "aligned"  - for each competency level / learning outcome on these pages that fits a game type,
                       write 3 varied items that practise exactly that outcome. If the outcome states a number
                       range, set "number_limit" to that number and keep every number (including the answer)
                       within it. Otherwise stay well inside normal Grade {grade} ranges.

Strict rules:
- "page_number": the PAGE number shown in the header above the text you used.
- "source_quote": copy, character for character, the line from that page: the exercise itself (exercise),
  or the competency level / learning outcome statement (aligned). It must include number_limit if you set one.
- "raw_problem_text": a complete, natural Sinhala question using everyday Sri Lankan contexts.
- "child_prompt_si": the same question for a 6-10 year old with ADHD: warm, short (max 18 words), simple words,
  ALL numbers as digits, one clear question. "child_prompt_en": the same in English, numbers as digits.
- For ADD / SUB / MUL / DIV write a tiny everyday story with real objects (mangoes, marbles, buses, stamps,
  rupees), never a bare equation like "17 - 9 කීය ද?".
- Use natural spoken Sinhala word order, e.g. "අඹ 25න් 4ක් කෑවා. ඉතුරු අඹ කීයද?" (not "25 අඩු කරන්න 4න්"),
  "බෝල 4ක් බැගින් පෙට්ටි 5ක ඇති බෝල කීයද?", "පෑන් 12ක් ළමයි 2 දෙනාට සමසමව බෙදුවොත් එක්කෙනෙකුට කීයද?".
- For SUB and DIV put the larger number first (operands [85, 53] for "85 is how many more than 53").
- Skip outcomes no game type above can practise (measurement, time, money notes, fractions, writing numerals, ...).
- Use the competency code (e.g. "4.1") and statement for "competency_code" / "competency_desc".

Return JSON only, [] if nothing fits:
[{{"kind": "aligned", "page_number": 14, "source_quote": "4.1 එකතුව 6 තෙක් වන සංඛ්‍යා දෙකක එකතුව සොයයි.",
   "number_limit": 6, "operation": "ADD", "operands": [2, 3], "expected_answer": 5,
   "raw_problem_text": "...", "child_prompt_si": "...", "child_prompt_en": "...", "english_translation": "...",
   "topic": "Addition", "competency_code": "4.1", "competency_desc": "...", "difficulty": "EASY|MEDIUM|HARD",
   "visual_props": {{}}}}]

PAGES:
{pages}"""


def _is_retryable(exc: Exception) -> bool:
    s = str(exc)
    return any(k in s for k in ("429", "RESOURCE_EXHAUSTED", "500", "502", "503", "504", "UNAVAILABLE", "DEADLINE", "timed out"))


def _parse_json_array(text: str) -> List[Any]:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Models occasionally emit stray backslashes inside transcribed text ("\ " , "\ස").
        data = json.loads(re.sub(r'\\(?!["\\/bfnrtu])', r"\\\\", text))
    if isinstance(data, dict):
        data = next((v for v in data.values() if isinstance(v, list)), [])
    return data if isinstance(data, list) else []


class GeminiBackend:
    """All model calls go through here, so tests can swap in a fake."""

    def __init__(self) -> None:
        self._client = None

    @property
    def available(self) -> bool:
        return bool(GEMINI_API_KEY)

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=GEMINI_API_KEY)
        return self._client

    async def _generate(self, contents: Any) -> str:
        from google.genai import types
        client = self._get_client()
        config = types.GenerateContentConfig(response_mime_type="application/json", temperature=0.1)
        last: Optional[Exception] = None
        for model in GEMINI_MODELS:
            for attempt in range(MAX_RETRIES):
                try:
                    res = await client.aio.models.generate_content(model=model, contents=contents, config=config)
                    if res and res.text:
                        return res.text
                    break  # empty answer: try the next model
                except Exception as exc:  # noqa: BLE001 - classify and retry below
                    last = exc
                    if not _is_retryable(exc):
                        break
                    await asyncio.sleep(min(60, 5 * 2 ** attempt))
        raise RuntimeError(f"Gemini request failed on all models: {last}")

    async def _generate_json(self, contents: Any, attempts: int = 3) -> List[Any]:
        """Generate and parse a JSON array, regenerating when the model returns malformed JSON."""
        last: Optional[Exception] = None
        for _ in range(attempts):
            try:
                return _parse_json_array(await self._generate(contents))
            except json.JSONDecodeError as exc:
                last = exc
        raise RuntimeError(f"Model returned malformed JSON {attempts} times: {last}")

    async def transcribe(self, images: List[Tuple[int, bytes]]) -> Dict[int, str]:
        from google.genai import types
        # Images get batch-local labels (IMAGE 1..n) so the model cannot confuse them with the
        # page numbers printed in the guide; labels are mapped back to PDF page numbers here.
        contents: List[Any] = []
        for i, (_, jpeg) in enumerate(images, start=1):
            contents += [f"IMAGE {i}", types.Part.from_bytes(data=jpeg, mime_type="image/jpeg")]
        contents.append(TRANSCRIBE_PROMPT)
        out: Dict[int, str] = {}
        for item in await self._generate_json(contents):
            try:
                idx = int(item.get("image", item.get("page")))
            except (AttributeError, TypeError, ValueError):
                continue
            if 1 <= idx <= len(images):
                out[images[idx - 1][0]] = str(item.get("text") or "")
        return out

    async def mine(self, grade: int, pages: Dict[int, str]) -> List[Dict[str, Any]]:
        block = "\n\n".join(f"=== PAGE {n} ===\n{t}" for n, t in sorted(pages.items()))
        items = await self._generate_json(MINE_PROMPT.format(grade=grade, pages=block))
        return [i for i in items if isinstance(i, dict)]


backend = GeminiBackend()


# ------------------------------------------------------------------------ pipeline

class IngestionError(RuntimeError):
    pass


def _render_pages(pdf_path: Path, page_numbers: List[int]) -> List[Tuple[int, bytes]]:
    import pymupdf
    out = []
    with pymupdf.open(pdf_path) as doc:
        for n in page_numbers:
            pix = doc[n - 1].get_pixmap(dpi=RENDER_DPI)
            out.append((n, pix.tobytes("jpeg", jpg_quality=80)))
    return out


def page_count(pdf_path: Path) -> int:
    import pymupdf
    with pymupdf.open(pdf_path) as doc:
        return doc.page_count


def page_count_bytes(data: bytes) -> int:
    import pymupdf
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        return doc.page_count


def _load(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _save(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(path)


def _page_is_usable(text: str) -> bool:
    return bool(SINHALA.search(text)) and not LEGACY_GLYPHS.search(text)


def _worth_mining(text: str) -> bool:
    return bool(DIGITS.search(text)) or any(w in text for _, _, ws in SHAPES.values() for w in ws) \
        or any(si in text for si, _ in COLORS.values())


async def _noop_progress(stage: str, done: int, total: int) -> None:
    return None


async def transcribe_document(pdf_path: Path, fp: str, progress: ProgressFn = _noop_progress) -> Dict[int, str]:
    """Unicode transcript per page, resumable: only pages missing from the cache are sent."""
    cache = CACHE_DIR / fp / "pages.v2.json"
    pages: Dict[int, str] = {int(k): v for k, v in _load(cache, {}).get("pages", {}).items()}
    total = page_count(pdf_path)
    todo = [n for n in range(1, total + 1) if n not in pages]
    await progress("transcribing", total - len(todo), total)
    if todo and not backend.available:
        raise IngestionError("GEMINI_API_KEY is not set, so the syllabus pages cannot be read.")

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    lock = asyncio.Lock()

    async def run(batch: List[int]) -> None:
        async with sem:
            images = await asyncio.to_thread(_render_pages, pdf_path, batch)
            result = await backend.transcribe(images)
        async with lock:
            # Only pages the model actually returned are cached (a blank page comes back as "");
            # pages it skipped stay missing and are retried on the next run.
            for n in batch:
                if n in result:
                    pages[n] = result[n]
            _save(cache, {"page_count": total, "pages": {str(k): pages[k] for k in sorted(pages)}})
            await progress("transcribing", sum(1 for n in range(1, total + 1) if n in pages), total)

    batches = [todo[i:i + TRANSCRIBE_BATCH] for i in range(0, len(todo), TRANSCRIBE_BATCH)]
    results = await asyncio.gather(*(run(b) for b in batches), return_exceptions=True)
    # Pages from failed batches, or that the model skipped, get one more try on their own.
    missing = [n for n in range(1, total + 1) if n not in pages]
    if missing:
        results += await asyncio.gather(*(run([n]) for n in missing), return_exceptions=True)
    missing = [n for n in range(1, total + 1) if n not in pages]
    if len(missing) > total * 0.05:
        cause = next((r for r in results if isinstance(r, Exception)), None)
        raise IngestionError(
            f"{len(missing)} of {total} pages could not be transcribed ({cause}); "
            "run extraction again to retry just those pages."
        )
    return pages


async def mine_document(grade: int, pages: Dict[int, str], fp: str, progress: ProgressFn = _noop_progress) -> List[Dict[str, Any]]:
    """Candidate problems per page window, cached so validation rules can change without new API calls."""
    cache = CACHE_DIR / fp / "candidates.v4.json"
    stored: Dict[str, List[Dict[str, Any]]] = _load(cache, {}).get("windows", {})
    useful = [n for n in sorted(pages) if _worth_mining(pages[n])]
    windows = [useful[i:i + MINE_BATCH] for i in range(0, len(useful), MINE_BATCH)]
    keys = [f"{w[0]}-{w[-1]}" for w in windows]
    todo = [(k, w) for k, w in zip(keys, windows) if k not in stored]
    await progress("extracting", len(windows) - len(todo), len(windows))
    if todo and not backend.available:
        raise IngestionError("GEMINI_API_KEY is not set, so problems cannot be extracted.")

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    lock = asyncio.Lock()

    async def run(key: str, window: List[int]) -> None:
        async with sem:
            items = await backend.mine(grade, {n: pages[n] for n in window})
        async with lock:
            stored[key] = items
            _save(cache, {"grade": grade, "windows": stored})
            await progress("extracting", sum(1 for k in keys if k in stored), len(windows))

    results = await asyncio.gather(*(run(k, w) for k, w in todo), return_exceptions=True)
    retry = [(k, w) for k, w in todo if k not in stored]
    if retry:
        results += await asyncio.gather(*(run(k, w) for k, w in retry), return_exceptions=True)
    failed = [k for k, _ in todo if k not in stored]
    if failed:
        cause = next((r for r in results if isinstance(r, Exception)), None)
        raise IngestionError(f"{len(failed)} of {len(windows)} page windows could not be processed ({cause}); run extraction again.")
    return [c for k in keys for c in stored.get(k, [])]


async def ingest_pdf(
    pdf_path: Path,
    grade: int,
    doc_id: str,
    progress: ProgressFn = _noop_progress,
) -> Tuple[List[CurriculumProblem], ValidationReport, int]:
    """Full pipeline. Returns (accepted problems, rejection report, page count)."""
    fp = await asyncio.to_thread(fingerprint, pdf_path)
    pages = await transcribe_document(pdf_path, fp, progress)
    readable = {n: t for n, t in pages.items() if _page_is_usable(t)}
    if not readable:
        raise IngestionError("No readable Sinhala text was found in this PDF.")
    candidates = await mine_document(grade, readable, fp, progress)
    problems, report = build_problem_bank(candidates, grade, readable, doc_id)
    await progress("done", len(problems), len(problems))
    return problems, report, len(pages)
