"""Fake Gemini backend and fixture data shared by the offline tests."""
from pathlib import Path


# Unicode transcripts the fake model "reads" from each page of the generated test PDF.
FAKE_PAGES = {
    1: "4 | එකතු කිරීම\nනිපුණතා මට්ටම\n4.1 එකතුව 6 තෙක් වන සංඛ්‍යා දෙකක එකතුව සොයයි.",
    2: "ක්‍රියාකාරකම 2\nපසුගිය වසරේ සිසුන් ගණන 53කි. මේ වසරේ සිසුහු 85 දෙනෙක් සහභාගි වූහ. වැඩි වී ඇත්තේ කීයකින් ද?",
    3: "ජ්‍යාමිතික හැඩතල\nවෘත්තය, ත්‍රිකෝණය සහ සමචතුරස්‍රය හඳුනාගෙන නම් කරයි.\nරටා: 2, 4, 6, 8 ලෙස ගොඩනඟයි.",
}

FAKE_CANDIDATES = [
    {"kind": "aligned", "page_number": 1, "source_quote": "4.1 එකතුව 6 තෙක් වන සංඛ්‍යා දෙකක එකතුව සොයයි.",
     "number_limit": 6, "operation": "ADD", "operands": [2, 3], "expected_answer": 5,
     "raw_problem_text": "අම්මා ළඟ අඹ 2ක් තිබුණා. තාත්තා අඹ 3ක් ගෙනාවා. දැන් අඹ කීයද?",
     "child_prompt_si": "අඹ 2යි, අඹ 3යි. ඔක්කොම කීයද?", "child_prompt_en": "2 mangoes and 3 mangoes. How many?",
     "topic": "Addition", "competency_code": "4.1", "competency_desc": "එකතුව 6 තෙක් එකතු කිරීම"},
    # Breaks the competency's limit (sum 9 > 6): must be rejected.
    {"kind": "aligned", "page_number": 1, "source_quote": "4.1 එකතුව 6 තෙක් වන සංඛ්‍යා දෙකක එකතුව සොයයි.",
     "number_limit": 6, "operation": "ADD", "operands": [4, 5], "expected_answer": 9,
     "raw_problem_text": "කුරුල්ලන් 4ක් සහ 5ක් කීයද?", "topic": "Addition"},
    {"kind": "exercise", "page_number": 2, "source_quote": "පසුගිය වසරේ සිසුන් ගණන 53කි. මේ වසරේ සිසුහු 85 දෙනෙක් සහභාගි වූහ.",
     "operation": "SUB", "operands": [85, 53], "expected_answer": 32,
     "raw_problem_text": "පසුගිය වසරේ සිසුන් 53කි. මේ වසරේ 85කි. වැඩි වී ඇත්තේ කීයකින් ද?",
     "child_prompt_si": "මේ අවුරුද්දේ ළමයි 85යි, ගිය අවුරුද්දේ 53යි. කීයක් වැඩිද?", "topic": "Subtraction"},
    # Quote that is not on the cited page: must be rejected.
    {"kind": "exercise", "page_number": 2, "source_quote": "මෙම වාක්‍යය පිටුවේ නැත.",
     "operation": "ADD", "operands": [1, 1], "raw_problem_text": "1ක් සහ 1ක් කීයද?", "topic": "Addition"},
    {"kind": "aligned", "page_number": 3, "source_quote": "වෘත්තය, ත්‍රිකෝණය සහ සමචතුරස්‍රය හඳුනාගෙන නම් කරයි.",
     "operation": "SHAPE", "visual_props": {"target_shape": "TRIANGLE"},
     "raw_problem_text": "ත්‍රිකෝණය සොයන්න.", "topic": "Shapes"},
    {"kind": "exercise", "page_number": 3, "source_quote": "රටා: 2, 4, 6, 8 ලෙස ගොඩනඟයි.",
     "operation": "PATTERN", "visual_props": {"kind": "NUMBER", "sequence": [2, 4, 6], "target": 8},
     "raw_problem_text": "2, 4, 6 ට පසු එන සංඛ්‍යාව කුමක්ද?", "topic": "Patterns"},
    # No game for fractions: must be rejected with a clear reason.
    {"kind": "aligned", "page_number": 3, "source_quote": "රටා: 2, 4, 6, 8 ලෙස ගොඩනඟයි.",
     "operation": "FRACTION", "operands": [1, 2], "raw_problem_text": "අඩක් කීයද?", "topic": "Fractions"},
]


class FakeBackend:
    """Stands in for Gemini; counts calls so tests can prove the cache is used."""

    def __init__(self, pages=None, candidates=None):
        self.pages = dict(FAKE_PAGES if pages is None else pages)
        self.candidates = list(FAKE_CANDIDATES if candidates is None else candidates)
        self.transcribe_calls = 0
        self.mine_calls = 0
        self.available = True

    async def transcribe(self, images):
        self.transcribe_calls += 1
        return {n: self.pages[n] for n, _ in images if n in self.pages}

    async def mine(self, grade, pages):
        self.mine_calls += 1
        return [c for c in self.candidates if c["page_number"] in pages]


def make_pdf(path: Path, pages: int = 3) -> Path:
    import pymupdf
    doc = pymupdf.open()
    for i in range(pages):
        doc.new_page().insert_text((72, 72), f"page {i + 1}")
    doc.save(path)
    doc.close()
    return path
