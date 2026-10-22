"""API request/response models for the Content Adaptation endpoints."""
from typing import Any, Dict, List, Literal, Optional, Union
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


class ApiError(BaseModel):
    """Error body. `detail` is a message, or FastAPI's list of field errors when the input is invalid."""
    detail: Union[str, List[Dict[str, Any]]]


_ERROR_DESCRIPTIONS = {
    400: "The upload is not a readable, non-empty PDF",
    404: "No record with this id",
    413: "The PDF is larger than 300 MB",
    422: "Invalid input, or a problem that cannot become a sensible game (e.g. a negative answer)",
}


def error_responses(*codes: int) -> Dict[Union[int, str], Dict[str, Any]]:
    """Swagger `responses=` entries for the error codes a route can return."""
    return {code: {"model": ApiError, "description": _ERROR_DESCRIPTIONS[code]} for code in codes}
