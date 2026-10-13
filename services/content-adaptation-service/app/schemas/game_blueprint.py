from enum import Enum
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class GameMechanicType(str, Enum):
    COLLECT_ITEMS = "COLLECT_ITEMS"
    DRAG_OPERATOR = "DRAG_OPERATOR"
    SELECT_TARGET = "SELECT_TARGET"
    TAP_TO_COUNT = "TAP_TO_COUNT"


class VisualAssetTag(str, Enum):
    COIN_BAG = "COIN_BAG"
    FRUIT_BASKET = "FRUIT_BASKET"
    OPERATOR_CHEST = "OPERATOR_CHEST"
    NUMBER_BLOCK = "NUMBER_BLOCK"
    CHARACTER_AVATAR = "CHARACTER_AVATAR"


class GameChoiceOption(BaseModel):
    text_si: str = Field(..., description="Sinhala prompt or label for the choice")
    text_en: str = Field(..., description="English prompt or label for the choice")
    numeric_value: Optional[float] = Field(None, description="The underlying numeric value if applicable")
    is_correct: bool = Field(..., description="Indicates if this is the correct choice")
    distractor_type: Optional[Literal['IMPULSIVITY', 'WORKING_MEMORY_OVERFLOW', 'MAGNITUDE_SLIP', 'NONE']] = Field(
        None, description="The cognitive distractor profile this option represents"
    )
    distractor_rationale: Optional[str] = Field(
        None, description="Explanation for why a learner with ADHD might pick this distractor"
    )


class GameMicroStep(BaseModel):
    step_order: int = Field(..., ge=1, le=3, description="Order of the micro-step (1, 2, or 3)")
    action_type: Literal['IDENTIFY_ENTITY', 'SELECT_OPERATOR', 'CALCULATE_MICROSTEP'] = Field(
        ..., description="The type of cognitive action required"
    )
    instruction_si: str = Field(..., description="Short, encouraging Sinhala audio-visual instruction")
    instruction_en: str = Field(..., description="Short, equivalent English instruction")
    target_visual_asset: VisualAssetTag = Field(..., description="The main visual asset type used in this step")
    correct_target_value: str = Field(..., description="The expected string representation of the correct answer")
    game_options: List[GameChoiceOption] = Field(..., description="List of options presented to the learner")
    operands: Optional[List[int]] = Field(
        None, description="Quantities this step works on (used by the game layer for manipulatives)"
    )
    operation: Optional[Literal['ADD', 'SUB', 'MUL', 'DIV']] = Field(
        None, description="Arithmetic operation this step applies to the operands"
    )


class ADHDGameSettings(BaseModel):
    step_granularity: Literal['TWO_TIER', 'MAXIMAL_THREE_TIER'] = Field(
        ..., description="How finely broken down the steps are"
    )
    distractor_count: int = Field(..., ge=2, le=4, description="Number of distractors to show (2 to 4)")
    stimulus_density: Literal['LOW', 'MEDIUM'] = Field(..., description="Level of visual/auditory stimulus density")
    visual_clutter_filter: bool = Field(True, description="Whether to apply the visual clutter filter (default True)")
    timer_enabled: bool = Field(False, description="Whether a countdown timer is enabled (default False)")


class GameActivityBlueprint(BaseModel):
    activity_id: str = Field(..., description="Unique identifier for the generated activity blueprint")
    source_question_id: str = Field(..., description="ID of the original curriculum question")
    grade: int = Field(..., ge=1, le=5, description="Target grade level (1 to 5)")
    topic: str = Field(..., description="Math topic (e.g., 'Addition', 'Subtraction', 'Money')")
    game_theme: Literal['VILLAGE_MARKET', 'JUNGLE_ADVENTURE', 'SPACE_QUEST'] = Field(
        ..., description="The visual and thematic setting for the game"
    )
    adhd_game_settings: ADHDGameSettings = Field(..., description="Settings specifically tailored to ADHD traits")
    micro_steps: List[GameMicroStep] = Field(..., description="The breakdown of the problem into interactive micro-steps")
    status: Literal['draft', 'approved', 'rejected'] = Field(..., description="Approval status of the blueprint")


class CurriculumAdaptationRequest(BaseModel):
    source_question_id: str = Field(..., description="ID of the curriculum question to adapt")
    grade: int = Field(..., ge=1, le=5, description="Grade level (1 to 5)")
    topic: str = Field(..., description="Math topic for the question")
    raw_sinhala_question: str = Field(..., description="The raw textual Sinhala question from the curriculum")
    adhd_risk_level: Literal['LOW', 'MEDIUM', 'HIGH'] = Field(..., description="Assessed ADHD risk level for adaptation")
