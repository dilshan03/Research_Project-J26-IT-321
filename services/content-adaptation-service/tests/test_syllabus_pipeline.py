"""Syllabus pipeline: grounding/validation rules, caching and failure handling (offline)."""
import pytest

from app.services import syllabus_pipeline as sp
from tests.fakes import FAKE_CANDIDATES, FAKE_PAGES

PAGES = FAKE_PAGES
ADD_OK = FAKE_CANDIDATES[0]
SUB_EXERCISE = FAKE_CANDIDATES[2]


def check(candidate, grade=1, pages=PAGES):
    return sp.validate_candidate(candidate, grade, pages)


def with_(base, **changes):
    c = dict(base)
    c.update(changes)
    return c


# ----------------------------------------------------------------- accepted items

def test_aligned_item_within_competency_limit_is_accepted():
    fields, reason = check(ADD_OK)
    assert reason is None
    assert fields["operands"] == [2, 3] and fields["expected_answer"] == 5
    assert fields["source"] == "syllabus" and fields["source_kind"] == "aligned"
    assert fields["page_number"] == 1 and "4.1" in fields["source_quote"]


def test_printed_exercise_is_accepted_with_its_numbers():
    fields, reason = check(SUB_EXERCISE, grade=4)
    assert reason is None
    assert fields["operands"] == [85, 53] and fields["expected_answer"] == 32
    assert fields["source_kind"] == "exercise"


def test_number_pattern_and_shape_are_accepted():
    pattern, reason = check(FAKE_CANDIDATES[5], grade=2)
    assert reason is None
    assert pattern["visual_props"] == {"kind": "NUMBER", "sequence": [2, 4, 6], "target": 8}
    assert pattern["expected_answer"] == 8
    shape, reason = check(FAKE_CANDIDATES[4])
    assert reason is None and shape["visual_props"]["target_shape"] == "TRIANGLE"


def test_compare_respects_smaller_target():
    c = {"kind": "exercise", "page_number": 2, "source_quote": SUB_EXERCISE["source_quote"],
         "operation": "COMPARE", "operands": [53, 85], "visual_props": {"target": "SMALLER"},
         "raw_problem_text": "53 සහ 85 අතරින් කුඩා සංඛ්‍යාව කුමක්ද?"}
    fields, reason = check(c, grade=4)
    assert reason is None and fields["expected_answer"] == 53


# ----------------------------------------------------------------- rejected items

@pytest.mark.parametrize("candidate, grade, reason", [
    (FAKE_CANDIDATES[1], 1, "numbers exceed the competency's limit"),
    (FAKE_CANDIDATES[3], 2, "source quote not found on cited page"),
    (FAKE_CANDIDATES[6], 2, "no game for operation FRACTION"),
    (with_(SUB_EXERCISE, expected_answer=30), 4, "stated answer is wrong"),
    (with_(SUB_EXERCISE, operands=[85, 50], expected_answer=35), 4, "numbers not printed on cited page"),
    (with_(SUB_EXERCISE, page_number=99), 4, "cited page not in document"),
    (with_(ADD_OK, raw_problem_text="ÑÂ× ùÚÌµ 2 3"), 1, "problem text is not clean Unicode Sinhala"),
    (with_(ADD_OK, raw_problem_text="පರಿಸරයේ අඹ 2ක් සහ 3ක්"), 1, "problem text is not clean Unicode Sinhala"),
    (with_(ADD_OK, raw_problem_text="අඹ කීයද?"), 1, "problem text drops its numbers"),
    (with_(ADD_OK, operation="MUL"), 1, "outside grade number range or not exact"),
])
def test_invalid_candidates_are_rejected_with_reason(candidate, grade, reason):
    fields, why = check(candidate, grade=grade)
    assert fields is None
    assert why == reason


def test_invented_limit_cannot_loosen_bounds():
    # The quote says "6"; claiming a limit of 50 is ignored, so Grade 1's normal range (20) applies.
    fields, reason = check(with_(ADD_OK, number_limit=50, operands=[15, 10], expected_answer=25,
                                 raw_problem_text="අඹ 15ක් සහ 10ක් කීයද?"))
    assert fields is None and reason == "numbers exceed the competency's limit"


def test_child_prompt_that_drops_numbers_falls_back_to_problem_text():
    fields, _ = check(with_(ADD_OK, child_prompt_si="ඔක්කොම කීයද?"))
    assert fields["child_prompt_si"] == ADD_OK["raw_problem_text"]


def test_count_prompt_never_reveals_the_answer():
    c = {"kind": "aligned", "page_number": 1, "source_quote": ADD_OK["source_quote"], "number_limit": 6,
         "operation": "COUNT", "operands": [5], "raw_problem_text": "අඹ 5ක් ගණන් කරන්න.",
         "child_prompt_si": "අඹ 5 ගණන් කරන්න.", "child_prompt_en": "Count the 5 mangoes."}
    fields, reason = check(c)
    assert reason is None
    assert "5" not in fields["child_prompt_si"] and "5" not in fields["child_prompt_en"]


def test_problem_bank_dedupes_and_counts_rejections():
    problems, report = sp.build_problem_bank(FAKE_CANDIDATES + [ADD_OK], grade=2, pages=PAGES, doc_id="d1")
    assert report.accepted == len(problems) == 4
    assert report.rejected["duplicate of another problem"] == 1
    assert report.rejected["source quote not found on cited page"] == 1
    ids = [p.problem_id for p in problems]
    assert len(set(ids)) == len(ids) and all(i.startswith("d1-p") for i in ids)


# ------------------------------------------------------------- pipeline behaviour

@pytest.mark.anyio
async def test_ingest_uses_cache_on_second_run(fake_backend, sample_pdf):
    problems, report, pages = await sp.ingest_pdf(sample_pdf, 2, "doc_x")
    assert pages == 3 and report.accepted == len(problems) == 4
    calls = (fake_backend.transcribe_calls, fake_backend.mine_calls)

    again, _, _ = await sp.ingest_pdf(sample_pdf, 2, "doc_x")
    assert (fake_backend.transcribe_calls, fake_backend.mine_calls) == calls  # nothing re-sent
    assert [p.problem_id for p in again] == [p.problem_id for p in problems]


@pytest.mark.anyio
async def test_pages_skipped_by_the_model_are_retried(fake_backend, sample_pdf):
    original = fake_backend.transcribe
    skipped = {"done": False}

    async def flaky(images):
        if len(images) > 1 and not skipped["done"]:
            skipped["done"] = True
            return {n: fake_backend.pages[n] for n, _ in images[:-1]}  # drop the last page
        return await original(images)

    fake_backend.transcribe = flaky
    _, _, pages = await sp.ingest_pdf(sample_pdf, 2, "doc_y")
    assert pages == 3


@pytest.mark.anyio
async def test_missing_api_key_fails_loudly(monkeypatch, fake_backend, sample_pdf):
    fake_backend.available = False
    with pytest.raises(sp.IngestionError, match="GEMINI_API_KEY"):
        await sp.ingest_pdf(sample_pdf, 2, "doc_z")


@pytest.mark.anyio
async def test_unreadable_document_produces_no_problems(fake_backend, sample_pdf):
    fake_backend.pages = {1: "", 2: "", 3: ""}
    with pytest.raises(sp.IngestionError, match="No readable Sinhala"):
        await sp.ingest_pdf(sample_pdf, 2, "doc_empty")


def test_json_with_stray_backslashes_is_repaired():
    assert sp._parse_json_array('[{"image": 1, "text": "අඹ \\ස 5"}]') == [{"image": 1, "text": "අඹ \\ස 5"}]


def test_quote_matching_tolerates_whitespace_and_table_bars():
    page = "4.1 | එකතුව 6 තෙක් වන\nසංඛ්‍යා දෙකක එකතුව සොයයි."
    assert sp.quote_on_page("4.1 එකතුව 6 තෙක් වන සංඛ්‍යා දෙකක එකතුව සොයයි", page)
    assert not sp.quote_on_page("සම්පූර්ණයෙන්ම වෙනස් වාක්‍යයක්", page)
