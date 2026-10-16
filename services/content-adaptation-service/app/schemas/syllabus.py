from datetime import datetime, timezone
from typing import List, Literal, Optional
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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CurriculumProblemExtraction(BaseModel):
    doc_id: Optional[str] = None
    grade: int
    problems: List[CurriculumProblem]


class AdaptProblemRequest(BaseModel):
    adhd_risk_level: Literal["LOW", "MEDIUM", "HIGH"] = Field("MEDIUM", description="Assessed ADHD risk level")
    game_theme: Optional[Literal["VILLAGE_MARKET", "JUNGLE_ADVENTURE", "SPACE_QUEST"]] = Field(
        None, description="Visual theme setting for the activity"
    )
    custom_gaja_notes: Optional[str] = Field(None, description="Optional custom pedagogical notes for Gaja mascot")


class DocumentUploadResponse(BaseModel):
    document: SyllabusDocument
    message: str


class SeedSyllabiResponse(BaseModel):
    imported_documents: int
    extracted_problems: int
    documents: List[SyllabusDocument]
