import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_complete_end_to_end_adaptation_pipeline():
    # 1. Bulk seed syllabi from local repository (Grade 1 to 5)
    seed_res = client.post("/api/v1/syllabus/seed-local")
    assert seed_res.status_code == 200
    seed_data = seed_res.json()
    assert seed_data["imported_documents"] >= 4
    assert seed_data["extracted_problems"] >= 10

    # 2. Verify documents are registered in database/fallback
    docs_res = client.get("/api/v1/syllabus/documents")
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert len(docs) >= 4
    grade_1_doc = next(d for d in docs if d["grade"] == 1)
    assert grade_1_doc["status"] == "extracted"
    assert grade_1_doc["extracted_problem_count"] >= 3

    # 3. Query Curriculum Problem Bank for Grade 3 Money problems
    probs_res = client.get("/api/v1/syllabus/problems?grade=3&topic=Money")
    assert probs_res.status_code == 200
    probs = probs_res.json()
    assert len(probs) >= 1
    problem = probs[0]
    assert problem["is_money"] is True
    assert len(problem["operands"]) >= 2

    # 4. Execute the Hybrid Adaptation Pipeline
    prob_id = problem["problem_id"]
    adapt_res = client.post(
        f"/api/v1/syllabus/problems/{prob_id}/adapt",
        json={
            "adhd_risk_level": "HIGH",
            "game_theme": "VILLAGE_MARKET",
            "custom_gaja_notes": "Focus on step-by-step counting of rupee coins",
        },
    )
    assert adapt_res.status_code == 201
    env = adapt_res.json()
    blueprint = env["blueprint"]

    # 5. Verify Cognitive Load & ADHD Settings
    assert env["cli_score"] > 0
    settings = blueprint["adhd_game_settings"]
    assert settings["step_granularity"] == "MAXIMAL_THREE_TIER"
    assert settings["distractor_count"] == 2
    assert settings["timer_enabled"] is False

    # 6. Verify Gaja Mascot Narrative
    narrative = blueprint["story_narrative"]
    assert narrative is not None
    assert "ගජා" in narrative["gaja_dialogue"]["intro"]["si"] or "ගජා" in narrative["backdrop_si"]
    assert "Gaja" in narrative["gaja_dialogue"]["intro"]["en"] or "Gaja" in narrative["backdrop_en"]
    assert len(narrative["quest_goal_si"]) > 0

    # 7. Verify Micro-Steps & Cognitive Distractors
    steps = blueprint["micro_steps"]
    assert len(steps) >= 2
    for step in steps:
        assert step["action_type"] in ["IDENTIFY_ENTITY", "SELECT_OPERATOR", "CALCULATE_MICROSTEP"]
        assert len(step["game_options"]) == 1 + settings["distractor_count"]
        correct_opts = [o for o in step["game_options"] if o["is_correct"]]
        assert len(correct_opts) == 1
        wrong_opts = [o for o in step["game_options"] if not o["is_correct"]]
        for w in wrong_opts:
            assert w["distractor_type"] in ["IMPULSIVITY", "WORKING_MEMORY_OVERFLOW", "MAGNITUDE_SLIP", "INVERSION"]
            assert w["distractor_rationale"] is not None

    # 8. Teacher Approval Workflow
    activity_id = blueprint["activity_id"]
    approve_res = client.patch(
        f"/api/v1/adaptations/blueprints/{activity_id}/status",
        json={"status": "approved"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["blueprint"]["status"] == "approved"

    # 9. Verify that approved blueprint is playable in learner activities
    approved_list = client.get("/api/v1/adaptations/blueprints?status=approved").json()
    assert any(b["blueprint"]["activity_id"] == activity_id for b in approved_list)
