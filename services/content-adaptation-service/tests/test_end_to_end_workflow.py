"""Teacher workflow through the HTTP API: upload -> extract -> problem bank -> adapt -> approve (offline)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.scripts.seed_syllabi import doc_id_for, infer_grade_from_filename
from tests.fakes import make_pdf


@pytest.fixture
def client(fake_backend):
    with TestClient(app) as c:
        yield c


def _upload(client, path, grade=2):
    with open(path, "rb") as f:
        return client.post(
            "/api/v1/syllabus/upload",
            files={"file": (path.name, f, "application/pdf")},
            data={"grade": str(grade)},
        )


def _extracted_doc(client, sample_pdf, grade=2):
    doc = _upload(client, sample_pdf, grade).json()["document"]
    res = client.post(f"/api/v1/syllabus/documents/{doc['doc_id']}/extract?wait=true")
    assert res.status_code == 202
    return res.json()


def _problem(client, doc_id, op):
    probs = client.get(f"/api/v1/syllabus/problems?doc_id={doc_id}").json()
    return next(p for p in probs if p["operation"] == op)


def _adapt(client, problem, risk="HIGH"):
    res = client.post(f"/api/v1/syllabus/problems/{problem['problem_id']}/adapt",
                      json={"adhd_risk_level": risk, "game_theme": "JUNGLE_ADVENTURE"})
    assert res.status_code == 201, res.text
    return res.json()["blueprint"]


def test_upload_rejects_files_that_are_not_real_pdfs(client, tmp_path):
    fake = tmp_path / "notes.pdf"
    fake.write_bytes(b"%PDF-1.4\n%%EOF")
    assert _upload(client, fake).status_code == 400
    assert client.post("/api/v1/syllabus/upload", files={"file": ("a.txt", b"x", "text/plain")},
                       data={"grade": "2"}).status_code == 400


def test_extraction_builds_a_grounded_problem_bank(client, sample_pdf):
    doc = _extracted_doc(client, sample_pdf)
    assert doc["status"] == "extracted" and doc["progress_stage"] == "done"
    assert doc["extracted_problem_count"] == 4
    assert doc["rejected_count"] == 3
    assert doc["rejection_summary"]["source quote not found on cited page"] == 1

    probs = client.get(f"/api/v1/syllabus/problems?doc_id={doc['doc_id']}").json()
    assert {p["operation"] for p in probs} == {"ADD", "SUB", "SHAPE", "PATTERN"}
    for p in probs:
        assert p["source"] == "syllabus" and p["source_quote"] and p["page_number"] in (1, 2, 3)


def test_re_extraction_replaces_only_that_documents_problems(client, sample_pdf, tmp_path):
    first = _extracted_doc(client, sample_pdf)
    other = _extracted_doc(client, make_pdf(tmp_path / "other.pdf"))
    again = client.post(f"/api/v1/syllabus/documents/{first['doc_id']}/extract?wait=true").json()
    assert again["extracted_problem_count"] == 4
    for d in (first, other):
        assert len(client.get(f"/api/v1/syllabus/problems?doc_id={d['doc_id']}").json()) == 4


def test_extraction_error_is_reported_on_the_document(client, fake_backend, sample_pdf):
    fake_backend.available = False
    doc = _extracted_doc(client, sample_pdf)
    assert doc["status"] == "error" and "GEMINI_API_KEY" in doc["error_message"]


def test_arithmetic_problem_becomes_scaffolded_game(client, sample_pdf):
    doc = _extracted_doc(client, sample_pdf)
    bp = _adapt(client, _problem(client, doc["doc_id"], "SUB"))
    assert [s["action_type"] for s in bp["micro_steps"]] == ["IDENTIFY_ENTITY", "SELECT_OPERATOR", "CALCULATE_MICROSTEP"]
    assert bp["micro_steps"][-1]["correct_target_value"] == "32"
    assert "85" in bp["raw_sinhala_question"] and "53" in bp["raw_sinhala_question"]
    for step in bp["micro_steps"]:
        assert sum(o["is_correct"] for o in step["game_options"]) == 1


def test_shape_and_pattern_games_use_the_problems_own_data(client, sample_pdf):
    doc = _extracted_doc(client, sample_pdf)
    shape = _adapt(client, _problem(client, doc["doc_id"], "SHAPE"))["micro_steps"][0]
    assert shape["action_type"] == "MATCH_SHAPE" and shape["correct_target_value"] == "TRIANGLE"
    assert next(o for o in shape["game_options"] if o["is_correct"])["icon_or_shape"] == "TRIANGLE"

    pattern = _adapt(client, _problem(client, doc["doc_id"], "PATTERN"))["micro_steps"][0]
    assert pattern["visual_props"] == {"kind": "NUMBER", "sequence": [2, 4, 6], "target": 8}
    values = [o["numeric_value"] for o in pattern["game_options"]]
    assert 8 in values and len(set(values)) == len(values)


def test_approved_blueprint_is_listed_for_learners(client, sample_pdf):
    doc = _extracted_doc(client, sample_pdf)
    bp = _adapt(client, _problem(client, doc["doc_id"], "ADD"), risk="LOW")
    res = client.patch(f"/api/v1/adaptations/blueprints/{bp['activity_id']}/status", json={"status": "approved"})
    assert res.json()["blueprint"]["status"] == "approved"
    approved = client.get("/api/v1/adaptations/blueprints?status=approved").json()
    assert any(b["blueprint"]["activity_id"] == bp["activity_id"] for b in approved)


def test_bundled_guide_filenames_map_to_grades():
    assert infer_grade_from_filename("Grade 1.pdf") == 1
    assert infer_grade_from_filename("grade 2.pdf") == 2
    assert infer_grade_from_filename("Grade_05.pdf") == 5
    assert infer_grade_from_filename("nsch_2025e_topical.pdf") is None
    from pathlib import Path
    assert doc_id_for(Path("Grade 4.pdf"), 4) == "doc_g4_grade_4"
