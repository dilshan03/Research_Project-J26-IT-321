from fastapi.testclient import TestClient

from app.main import app
from app.services.blueprint_generator import generate_blueprint
from app.services.problem_parser import parse_problem
from app.services.repository import repository

client = TestClient(app)

ADD_Q = "මාලාට ඇපල් 5 ක් ඇත. නිමල් ඇයට ඇපල් 3 ක් දුන්නේය. දැන් මාලාට ඇපල් කීයක් තිබේද?"
SUB_Q = "10 න් 4 ක් අඩු කළ විට කීයද?"
MONEY_Q = "කමල් රුපියල් 50 කට පොතක් සහ රුපියල් 20 කට පෑනක් මිලදී ගත්තේය. ඔහු කඩකාරයාට රුපියල් 100 ක් දුන්නේය. ඉතිරිය කොපමණද?"


def _correct(step):
    return [o for o in step.game_options if o.is_correct]


def test_parser_detects_operations():
    assert parse_problem(ADD_Q).operations == ["ADD"] and parse_problem(ADD_Q).final_answer == 8
    assert parse_problem(SUB_Q).operations == ["SUB"] and parse_problem(SUB_Q).final_answer == 6
    money = parse_problem(MONEY_Q)
    assert money.operations == ["ADD", "SUB"]
    assert money.partial_results == [70] and money.final_answer == 30 and money.is_money


def test_low_risk_blueprint_is_two_tier():
    bp, _, _ = generate_blueprint("Q1", 2, "Addition", ADD_Q, "LOW")
    assert bp.adhd_game_settings.step_granularity == "TWO_TIER"
    assert [s.action_type for s in bp.micro_steps] == ["SELECT_OPERATOR", "CALCULATE_MICROSTEP"]
    assert bp.micro_steps[-1].correct_target_value == "8"


def test_grade_1_no_operator_selection():
    bp, _, _ = generate_blueprint("G1-1", 1, "Counting", "ගස්වල ඇති අඹ 5 ක් ගණන් කරන්න.", "LOW")
    assert [s.action_type for s in bp.micro_steps] == ["IDENTIFY_ENTITY", "CALCULATE_MICROSTEP"]
    assert "SELECT_OPERATOR" not in [s.action_type for s in bp.micro_steps]


def test_high_risk_blueprint_is_three_tier_with_two_distractors():
    bp, _, _ = generate_blueprint("Q2", 2, "Subtraction", SUB_Q, "HIGH")
    assert len(bp.micro_steps) == 3
    assert bp.micro_steps[0].action_type == "IDENTIFY_ENTITY"
    for step in bp.micro_steps:
        assert len(_correct(step)) == 1
        assert len(step.game_options) == 1 + bp.adhd_game_settings.distractor_count
        assert len({o.text_en for o in step.game_options}) == len(step.game_options)
    assert bp.adhd_game_settings.timer_enabled is False


def test_money_blueprint_multi_step():
    bp, _, _ = generate_blueprint("Q3", 3, "Money", MONEY_Q, "MEDIUM")
    assert bp.game_theme == "VILLAGE_MARKET"
    assert [s.correct_target_value for s in bp.micro_steps] == ["+", "70", "30"]


def test_api_generate_review_flow():
    repository.clear()
    res = client.post("/api/v1/adaptations/blueprints", json={
        "source_question_id": "Q1", "grade": 1, "topic": "Addition",
        "raw_sinhala_question": ADD_Q, "adhd_risk_level": "LOW",
    })
    assert res.status_code == 201
    activity_id = res.json()["blueprint"]["activity_id"]
    assert res.json()["blueprint"]["status"] == "draft"

    res = client.patch(f"/api/v1/adaptations/blueprints/{activity_id}/status", json={"status": "approved"})
    assert res.json()["blueprint"]["status"] == "approved"
    approved = client.get("/api/v1/adaptations/blueprints?status=approved").json()
    assert len(approved) == 1


def test_api_rejects_question_without_numbers():
    res = client.post("/api/v1/adaptations/blueprints", json={
        "source_question_id": "Q9", "grade": 1, "topic": "Addition",
        "raw_sinhala_question": "ඇපල් කීයද?", "adhd_risk_level": "LOW",
    })
    assert res.status_code == 422


def test_syllabus_seed_and_list_flow():
    # Trigger local syllabi seed
    res = client.post("/api/v1/syllabus/seed-local")
    assert res.status_code == 200
    data = res.json()
    assert data["imported_documents"] >= 4
    assert data["extracted_problems"] >= 10

    # Query documents
    docs_res = client.get("/api/v1/syllabus/documents")
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert len(docs) >= 4

    # Query curriculum problems for Grade 1
    probs_res = client.get("/api/v1/syllabus/problems?grade=1")
    assert probs_res.status_code == 200
    probs = probs_res.json()
    assert len(probs) >= 3
    assert all(p["grade"] == 1 for p in probs)


def test_syllabus_adapt_problem_flow():
    # Seed to ensure problems exist
    client.post("/api/v1/syllabus/seed-local")

    # Get a problem
    probs = client.get("/api/v1/syllabus/problems?grade=1").json()
    target = probs[0]
    prob_id = target["problem_id"]

    # Adapt to ADHD-friendly game blueprint
    adapt_res = client.post(
        f"/api/v1/syllabus/problems/{prob_id}/adapt",
        json={"adhd_risk_level": "HIGH", "game_theme": "VILLAGE_MARKET"},
    )
    assert adapt_res.status_code == 201
    env = adapt_res.json()
    assert env["blueprint"]["source_question_id"] == prob_id
    assert env["blueprint"]["game_theme"] == "VILLAGE_MARKET"
    assert env["blueprint"]["adhd_game_settings"]["step_granularity"] == "MAXIMAL_THREE_TIER"
    assert len(env["blueprint"]["micro_steps"]) >= 2
    assert env["blueprint"]["story_narrative"] is not None
    assert "gaja_dialogue" in env["blueprint"]["story_narrative"]


def test_syllabus_pdf_upload_flow():
    # Simulate uploading a mock PDF
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    files = {"file": ("custom_grade2_math.pdf", pdf_content, "application/pdf")}
    data = {"grade": "2", "subject": "Mathematics", "year": "2024", "language": "si"}

    upload_res = client.post("/api/v1/syllabus/upload", files=files, data=data)
    assert upload_res.status_code == 201
    doc = upload_res.json()["document"]
    assert doc["grade"] == 2
    assert doc["filename"] == "custom_grade2_math.pdf"

