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
    # Counting is one concrete step: the game draws the objects and the learner picks how many.
    bp, _, _ = generate_blueprint("G1-1", 1, "Counting", "ගස්වල ඇති අඹ 5 ක් ගණන් කරන්න.", "LOW")
    assert [s.action_type for s in bp.micro_steps] == ["CALCULATE_MICROSTEP"]
    assert bp.micro_steps[0].operation == "COUNT" and bp.micro_steps[0].correct_target_value == "5"
    # Grade 1 adding (NIE: with objects, no operator symbols) also skips operator selection.
    bp, _, _ = generate_blueprint("G1-2", 1, "Addition", ADD_Q, "LOW")
    assert "SELECT_OPERATOR" not in [s.action_type for s in bp.micro_steps]
    assert bp.micro_steps[-1].correct_target_value == "8"


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
