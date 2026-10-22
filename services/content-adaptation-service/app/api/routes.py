from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.data.sample_questions import SAMPLE_QUESTIONS
from app.schemas.api import (
    AnalysisResponse,
    BlueprintEnvelope,
    GenerateBlueprintRequest,
    StatusUpdate,
    error_responses,
)
from app.services.blueprint_generator import generate_blueprint
from app.services.cognitive_load import compute_cli, derive_adhd_game_settings
from app.services.problem_parser import parse_problem
from app.services.repository import repository

router = APIRouter(prefix="/api/v1/adaptations", tags=["content-adaptation"])


@router.get("/sample-questions")
def sample_questions():
    return SAMPLE_QUESTIONS


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(req: GenerateBlueprintRequest):
    parsed = parse_problem(req.raw_sinhala_question, req.operation_hint)
    cli = compute_cli(req.raw_sinhala_question, operation_count=max(1, len(parsed.operations)))
    return AnalysisResponse(
        cli_score=round(cli, 2),
        numbers=parsed.numbers,
        operations=parsed.operations,
        final_answer=parsed.final_answer,
        is_money=parsed.is_money,
        adhd_game_settings=derive_adhd_game_settings(cli, req.adhd_risk_level),
    )


@router.post("/blueprints", response_model=BlueprintEnvelope, status_code=201, responses=error_responses(422))
async def create_blueprint(req: GenerateBlueprintRequest):
    try:
        blueprint, cli, _ = generate_blueprint(
            source_question_id=req.source_question_id,
            grade=req.grade,
            topic=req.topic,
            raw_sinhala_question=req.raw_sinhala_question,
            adhd_risk_level=req.adhd_risk_level,
            operation_hint=req.operation_hint,
            game_theme=req.game_theme,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    env = BlueprintEnvelope(
        cli_score=round(cli, 2),
        raw_sinhala_question=req.raw_sinhala_question,
        raw_english_question=blueprint.raw_english_question,
        blueprint=blueprint,
    )
    return await repository.save(env)


@router.get("/blueprints", response_model=List[BlueprintEnvelope])
async def list_blueprints(status: Optional[str] = Query(None, pattern="^(draft|approved|rejected)$")):
    return await repository.list(status)


@router.get("/blueprints/{activity_id}", response_model=BlueprintEnvelope, responses=error_responses(404))
async def get_blueprint(activity_id: str):
    env = await repository.get(activity_id)
    if env is None:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return env


@router.patch("/blueprints/{activity_id}/status", response_model=BlueprintEnvelope, responses=error_responses(404, 422))
async def update_status(activity_id: str, body: StatusUpdate):
    env = await repository.set_status(activity_id, body.status)
    if env is None:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return env
