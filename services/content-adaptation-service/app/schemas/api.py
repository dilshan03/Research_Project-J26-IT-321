"""API request/response models for the Content Adaptation endpoints."""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.game_blueprint import (
    ADHDGameSettings,
    CurriculumAdaptationRequest,
    GameActivityBlueprint,
)


class GenerateBlueprintRequest(CurriculumAdaptationRequest):
    operation_hint: Optional[Literal["ADD", "SUB", "MUL", "DIV"]] = Field(
        None, description="Override the auto-detected operation (single-step problems only)"
    )
    game_theme: Optional[Literal["VILLAGE_MARKET", "JUNGLE_ADVENTURE", "SPACE_QUEST"]] = None


class AnalysisResponse(BaseModel):
    cli_score: float
    numbers: List[int]
    operations: List[str]
    final_answer: Optional[int]
    is_money: bool
    adhd_game_settings: ADHDGameSettings


class BlueprintEnvelope(BaseModel):
    cli_score: float
    raw_sinhala_question: str
    raw_english_question: Optional[str] = None
    blueprint: GameActivityBlueprint


class StatusUpdate(BaseModel):
    status: Literal["draft", "approved", "rejected"]
    reviewer_note: Optional[str] = None
