from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class GajaDialogue(BaseModel):
    intro: dict[str, str] = Field(default_factory=lambda: {"si": "ආයුබෝවන්! මම ගජා.", "en": "Hello! I am Gaja."})
    hint: dict[str, str] = Field(default_factory=lambda: {"si": "කලබල නොවී සෙමින් බලන්න.", "en": "Take your time, look closely."})
    praise: dict[str, str] = Field(default_factory=lambda: {"si": "නියමයි! ඔයා හරිම දක්ෂයි!", "en": "Awesome! You are brilliant!"})
    retry: dict[str, str] = Field(default_factory=lambda: {"si": "කමක් නෑ, නැවත උත්සාහ කරමු!", "en": "No worries, let's try again!"})
    celebrate: dict[str, str] = Field(default_factory=lambda: {"si": "ජය වේවා! ඔක්කොම හරි!", "en": "Victory! Quest complete!"})


class StoryNarrative(BaseModel):
    title_si: str = Field(..., description="Sinhala title for quest backdrop")
    title_en: str = Field(..., description="English title for quest backdrop")
    backdrop_si: str = Field(..., description="Sinhala cultural story backdrop")
    backdrop_en: str = Field(..., description="English cultural story backdrop")
    quest_goal_si: str = Field(..., description="Sinhala objective for the quest")
    quest_goal_en: str = Field(..., description="English objective for the quest")
    gaja_dialogue: GajaDialogue = Field(default_factory=GajaDialogue)


class SyllabusDocument(BaseModel):
    doc_id: str = Field(..., description="Unique ID for syllabus document")
    filename: str = Field(..., description="Original filename")
    grade: int = Field(..., ge=1, le=5, description="Primary grade level (1-5)")
    subject: str = Field("Mathematics", description="Subject name")
    year: int = Field(2024, description="Curriculum year")
    language: Literal["si", "en", "ta"] = Field("si", description="Primary document language")
    page_count: int = Field(..., ge=1, description="Total pages in the PDF")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    status: Literal["uploaded", "extracting", "extracted", "error"] = Field("uploaded", description="Extraction status")
    extracted_problem_count: int = Field(0, ge=0, description="Number of extracted problems")
    gridfs_id: Optional[str] = Field(None, description="GridFS file identifier if stored in Mongo")
    local_path: Optional[str] = Field(None, description="Local filesystem path for fallback storage")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    pipeline_version: int = Field(1, description="2 = registered for the page-image ingestion pipeline; older records are legacy")
    # Background extraction progress (polled by the teacher studio)
    progress_stage: Optional[Literal["queued", "transcribing", "extracting", "done"]] = None
    progress_done: int = 0
    progress_total: int = 0
    error_message: Optional[str] = None
    rejected_count: int = 0
    rejection_summary: Dict[str, int] = Field(default_factory=dict, description="Why candidate problems were rejected, with counts")


class CurriculumProblem(BaseModel):
    problem_id: str = Field(..., description="Unique problem identifier, e.g. G1-ADD-001")
    doc_id: Optional[str] = Field(None, description="Associated syllabus document ID")
    grade: int = Field(..., ge=1, le=5, description="Curriculum grade level (1 to 5)")
    topic: str = Field(..., description="Mathematics topic (Shapes, Patterns, Counting, Addition, Subtraction, Money, etc.)")
    competency_code: Optional[str] = Field(None, description="NIE competency code (e.g. '1.1', '2.3')")
    competency_desc: Optional[str] = Field(None, description="Curriculum competency statement")
    raw_problem_text: str = Field(..., description="Authentic Sinhala/English problem statement")
    child_prompt_si: Optional[str] = Field(None, description="Child-friendly spoken Sinhala prompt voiced by Gaja")
    child_prompt_en: Optional[str] = Field(None, description="Child-friendly spoken English prompt voiced by Gaja")
    english_translation: Optional[str] = Field(None, description="English translation")
    operation: Optional[Literal["ADD", "SUB", "MUL", "DIV", "COUNT", "COMPARE", "IDENTIFY", "SHAPE", "PATTERN", "COLOR", "FRACTION", "TIME"]] = Field(None, description="Inferred or declared operation")
    operands: List[int] = Field(default_factory=list, description="Extracted numerical operands")
    expected_answer: int = Field(..., description="Deterministically verified correct answer (or target choice index/numeric id)")
    visual_props: Optional[dict] = Field(default_factory=dict, description="Metadata for shapes, colors, or visual patterns")
    difficulty: Literal["EASY", "MEDIUM", "HARD"] = Field("MEDIUM", description="Cognitive difficulty tier")
    page_number: Optional[int] = Field(None, description="PDF page reference")
    is_money: bool = Field(False, description="Whether problem involves currency/money")
    source: Literal["syllabus", "manual", "legacy"] = Field("legacy", description="'syllabus' = extracted and verified against the cited PDF page")
    source_kind: Optional[Literal["exercise", "aligned"]] = Field(
        None, description="'exercise' = printed in the guide; 'aligned' = written for the quoted competency level within its number limit"
    )
    source_quote: Optional[str] = Field(None, description="Verbatim text from the cited page this problem comes from")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CurriculumProblemExtraction(BaseModel):
    doc_id: Optional[str] = None
    grade: int
    problems: List[CurriculumProblem]


class StudentBehaviorProfile(BaseModel):
    learner_id: Optional[str] = None
    student_name: Optional[str] = None
    archetype_id: Optional[str] = None
    inattention_level: Literal["LOW", "MODERATE", "HIGH"] = "MODERATE"
    impulsivity_level: Literal["LOW", "MODERATE", "HIGH"] = "MODERATE"
    working_memory_support: bool = True
    activity_pace: Literal["CALM_STEP_BY_STEP", "REGULAR", "FLEXIBLE"] = "CALM_STEP_BY_STEP"
    visual_assistance: Literal["ALWAYS", "SOMETIMES", "MINIMAL"] = "ALWAYS"
    audio_assistance: Literal["READ_EVERYTHING", "READ_ON_CLICK", "OFF"] = "READ_ON_CLICK"


class CustomADHDGameSettings(BaseModel):
    step_granularity: Optional[Literal["TWO_TIER", "MAXIMAL_THREE_TIER"]] = None
    distractor_count: Optional[int] = Field(None, ge=2, le=4)
    stimulus_density: Optional[Literal["LOW", "MEDIUM"]] = None
    visual_clutter_filter: Optional[bool] = None
    timer_enabled: Optional[bool] = None
    preferred_distractor_types: Optional[List[str]] = None


class AdaptProblemRequest(BaseModel):
    adhd_risk_level: Literal["LOW", "MEDIUM", "HIGH"] = Field("MEDIUM", description="Assessed ADHD risk level")
    game_theme: Optional[Literal["VILLAGE_MARKET", "JUNGLE_ADVENTURE", "SPACE_QUEST"]] = Field(
        None, description="Visual theme setting for the activity"
    )
    custom_gaja_notes: Optional[str] = Field(None, description="Optional custom pedagogical notes for Gaja mascot")
    learner_id: Optional[str] = Field(None, description="Assigned learner identifier if personalized")
    student_name: Optional[str] = Field(None, description="Assigned learner name or archetype label")
    behavior_profile: Optional[StudentBehaviorProfile] = Field(None, description="Student behavioral and cognitive traits")
    custom_settings: Optional[CustomADHDGameSettings] = Field(None, description="Teacher overrides for cognitive load and game settings")


class TuneBlueprintRequest(BaseModel):
    custom_settings: CustomADHDGameSettings
    behavior_profile: Optional[StudentBehaviorProfile] = None
    custom_gaja_notes: Optional[str] = None
    game_theme: Optional[Literal["VILLAGE_MARKET", "JUNGLE_ADVENTURE", "SPACE_QUEST"]] = None


class DocumentUploadResponse(BaseModel):
    document: SyllabusDocument
    message: str


class SeedSyllabiResponse(BaseModel):
    imported_documents: int
    extracted_problems: int
    documents: List[SyllabusDocument]
