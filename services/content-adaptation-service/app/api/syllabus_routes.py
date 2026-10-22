import asyncio
import uuid
from pathlib import Path
from typing import Annotated, List, Optional
from fastapi import APIRouter, Body, File, Form, HTTPException, Query, UploadFile

from app.schemas.api import BlueprintEnvelope, error_responses
from app.schemas.syllabus import (
    AdaptProblemRequest,
    CognitiveLoadPreviewRequest,
    CognitiveLoadPreviewResponse,
    CurriculumProblem,
    DocumentUploadResponse,
    SeedSyllabiResponse,
    SyllabusDocument,
    TuneBlueprintRequest,
)
from app.services import ingestion_jobs
from app.services.blueprint_generator import (
    generate_blueprint_from_curriculum_problem,
    tune_existing_blueprint,
)
from app.services.cognitive_load import compute_cli
from app.services.db import DATA_DIR, db_service
from app.services.repository import repository
from app.services.syllabus_pipeline import page_count_bytes

router = APIRouter(prefix="/api/v1/syllabus", tags=["syllabus-curriculum"])

# Swagger "Try it out" presets. Knob values are what the studio's Bayesian trait tracker
# (apps/web/.../adaptive/traitTracker.ts) produces for each archetype.
ADAPT_EXAMPLES = {
    "impulse_regulation": {
        "summary": "Impulse Regulation archetype",
        "value": {
            "game_theme": "JUNGLE_ADVENTURE",
            "student_name": "Impulse Regulation",
            "behavior_profile": {
                "archetype_id": "IMPULSIVE", "inattention_level": "MODERATE", "impulsivity_level": "HIGH",
                "working_memory_support": True, "activity_pace": "CALM_STEP_BY_STEP",
                "visual_assistance": "SOMETIMES", "audio_assistance": "READ_ON_CLICK",
            },
            "custom_settings": {
                "step_granularity": "MAXIMAL_THREE_TIER", "distractor_count": 3, "stimulus_density": "LOW",
                "visual_clutter_filter": True, "timer_enabled": False,
            },
        },
    },
    "general_classroom": {
        "summary": "General Classroom archetype",
        "value": {
            "game_theme": "VILLAGE_MARKET",
            "student_name": "General Classroom",
            "behavior_profile": {
                "archetype_id": "BALANCED", "inattention_level": "LOW", "impulsivity_level": "LOW",
                "working_memory_support": False, "activity_pace": "REGULAR",
                "visual_assistance": "SOMETIMES", "audio_assistance": "READ_ON_CLICK",
            },
            "custom_settings": {
                "step_granularity": "TWO_TIER", "distractor_count": 4, "stimulus_density": "MEDIUM",
                "visual_clutter_filter": False, "timer_enabled": True,
            },
        },
    },
    "defaults_only": {"summary": "No profile (service defaults)", "value": {"adhd_risk_level": "MEDIUM"}},
}

TUNE_EXAMPLES = {
    "fewer_choices": {
        "summary": "Fewer choices, smaller steps",
        "value": {"custom_settings": {"distractor_count": 2, "step_granularity": "MAXIMAL_THREE_TIER"}},
    },
}

UPLOAD_DIR = DATA_DIR / "uploads"
MAX_UPLOAD_BYTES = 300 * 1024 * 1024


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201, responses=error_responses(400, 413, 422))
async def upload_syllabus_document(
    file: UploadFile = File(...),
    grade: int = Form(..., ge=1, le=5),
    subject: str = Form("Mathematics"),
    year: int = Form(2024),
    language: str = Form("si"),
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="PDF is larger than 300 MB")

    # Reject anything that is not a real, non-empty PDF now, not halfway through extraction.
    # Checked in memory so nothing is written (or left locked on Windows) for a bad file.
    try:
        pages = await asyncio.to_thread(page_count_bytes, content)
    except Exception:  # noqa: BLE001
        pages = 0
    if pages < 1:
        raise HTTPException(status_code=400, detail="This file is not a readable PDF with pages")

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    local_file_path = UPLOAD_DIR / f"{doc_id}_{Path(file.filename).name}"
    local_file_path.write_bytes(content)

    # Shared copy for other machines when Atlas is available; the local copy is enough otherwise.
    gridfs_id: Optional[str] = None
    if db_service.is_connected:
        gridfs_id = str(await db_service.get_gridfs().upload_from_stream(
            filename=file.filename,
            source=content,
            metadata={"grade": grade, "subject": subject, "year": year, "language": language},
        ))

    doc = SyllabusDocument(
        doc_id=doc_id,
        filename=file.filename,
        grade=grade,
        subject=subject,
        year=year,
        language=language,  # type: ignore[arg-type]
        page_count=pages,
        file_size=len(content),
        status="uploaded",
        gridfs_id=gridfs_id,
        local_path=str(local_file_path),
        pipeline_version=ingestion_jobs.PIPELINE_VERSION,
    )
    await db_service.get_syllabus_documents().insert_one(doc.model_dump())

    return DocumentUploadResponse(
        document=doc,
        message=f"Uploaded {file.filename} ({pages} pages) for Grade {grade}. Run extraction to build its problem bank.",
    )


@router.get("/documents", response_model=List[SyllabusDocument])
async def list_documents(
    grade: Optional[int] = Query(None, ge=1, le=5),
    include_legacy: bool = Query(False, description="Also list records made by the old text-layer extractor"),
):
    query: dict = {} if include_legacy else {"pipeline_version": ingestion_jobs.PIPELINE_VERSION}
    if grade:
        query["grade"] = grade
    docs = await db_service.get_syllabus_documents().find(query).to_list(length=200)
    return sorted((SyllabusDocument(**d) for d in docs), key=lambda d: (d.grade, d.filename))


@router.get("/documents/{doc_id}", response_model=SyllabusDocument, responses=error_responses(404))
async def get_document(doc_id: str):
    doc = await db_service.get_syllabus_documents().find_one({"doc_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return SyllabusDocument(**doc)


@router.post("/documents/{doc_id}/extract", response_model=SyllabusDocument, status_code=202, responses=error_responses(404, 422))
async def extract_problems_from_document(
    doc_id: str,
    wait: bool = Query(False, description="Block until extraction finishes (scripts/tests)"),
):
    """Starts background extraction; poll GET /documents/{doc_id} for progress."""
    docs_col = db_service.get_syllabus_documents()
    if not await docs_col.find_one({"doc_id": doc_id}):
        raise HTTPException(status_code=404, detail="Document not found")
    ingestion_jobs.start_extraction(doc_id)
    if wait:
        await ingestion_jobs.wait_for(doc_id)
    else:
        await asyncio.sleep(0)  # let the job record its "queued" state before we read it back
    return SyllabusDocument(**(await docs_col.find_one({"doc_id": doc_id})))


@router.get("/problems", response_model=List[CurriculumProblem])
async def list_curriculum_problems(
    grade: Optional[int] = Query(None, ge=1, le=5),
    topic: Optional[str] = Query(None),
    doc_id: Optional[str] = Query(None),
    include_legacy: bool = Query(False, description="Also return problems not verified against a syllabus page"),
):
    query: dict = {} if include_legacy else {"source": "syllabus"}
    if grade:
        query["grade"] = grade
    if doc_id:
        query["doc_id"] = doc_id
    items = await db_service.get_curriculum_problems().find(query).to_list(length=2000)

    problems = [CurriculumProblem(**p) for p in items]
    if topic:
        t = topic.lower()
        problems = [p for p in problems if t in p.topic.lower() or (t == "money" and p.is_money)]
    return sorted(problems, key=lambda p: (p.grade, p.page_number or 0, p.problem_id))


@router.get("/problems/{problem_id}", response_model=CurriculumProblem, responses=error_responses(404))
async def get_curriculum_problem(problem_id: str):
    probs_col = db_service.get_curriculum_problems()
    item = await probs_col.find_one({"problem_id": problem_id})
    if not item:
        raise HTTPException(status_code=404, detail="Problem not found")
    return CurriculumProblem(**item)


@router.post("/problems/{problem_id}/adapt", response_model=BlueprintEnvelope, status_code=201, responses=error_responses(404, 422))
async def adapt_problem_to_game(
    problem_id: str,
    req: Annotated[AdaptProblemRequest, Body(openapi_examples=ADAPT_EXAMPLES)],
):
    probs_col = db_service.get_curriculum_problems()
    prob_dict = await probs_col.find_one({"problem_id": problem_id})
    if not prob_dict:
        raise HTTPException(status_code=404, detail=f"Problem {problem_id} not found in bank")

    problem = CurriculumProblem(**prob_dict)

    try:
        blueprint, cli = await generate_blueprint_from_curriculum_problem(
            problem=problem,
            adhd_risk_level=req.adhd_risk_level,
            game_theme=req.game_theme,
            custom_gaja_notes=req.custom_gaja_notes,
            learner_id=req.learner_id,
            student_name=req.student_name,
            behavior_profile=req.behavior_profile,
            custom_settings=req.custom_settings,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Adaptation failed: {str(exc)}")

    envelope = BlueprintEnvelope(
        cli_score=round(cli, 2),
        raw_sinhala_question=blueprint.raw_sinhala_question or problem.raw_problem_text,
        raw_english_question=blueprint.raw_english_question,
        blueprint=blueprint,
    )

    return await repository.save(envelope)


@router.put("/blueprints/{activity_id}/tune", response_model=BlueprintEnvelope, responses=error_responses(404, 422))
async def tune_game_blueprint(
    activity_id: str,
    req: Annotated[TuneBlueprintRequest, Body(openapi_examples=TUNE_EXAMPLES)],
):
    env = await repository.get(activity_id)
    if not env:
        raise HTTPException(status_code=404, detail=f"Blueprint {activity_id} not found")

    probs_col = db_service.get_curriculum_problems()
    prob_dict = await probs_col.find_one({"problem_id": env.blueprint.source_question_id})
    if not prob_dict:
        problem = CurriculumProblem(
            problem_id=env.blueprint.source_question_id,
            grade=env.blueprint.grade,
            topic=env.blueprint.topic,
            raw_problem_text=env.raw_sinhala_question or "",
            expected_answer=int(env.blueprint.micro_steps[-1].correct_target_value) if env.blueprint.micro_steps[-1].correct_target_value.isdigit() else 1,
        )
    else:
        problem = CurriculumProblem(**prob_dict)

    try:
        tuned_blueprint = tune_existing_blueprint(
            existing=env.blueprint,
            problem=problem,
            custom_settings=req.custom_settings,
            behavior_profile=req.behavior_profile,
            game_theme=req.game_theme,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Tuning failed: {exc}")

    new_envelope = BlueprintEnvelope(
        cli_score=round(tuned_blueprint.effective_cli_score or tuned_blueprint.cli_score or env.cli_score, 2),
        raw_sinhala_question=tuned_blueprint.raw_sinhala_question or env.raw_sinhala_question,
        raw_english_question=tuned_blueprint.raw_english_question or env.raw_english_question,
        blueprint=tuned_blueprint,
    )

    return await repository.save(new_envelope)


@router.post("/cognitive-load/preview", response_model=CognitiveLoadPreviewResponse)
async def preview_cognitive_load(req: CognitiveLoadPreviewRequest):
    """Base and effective Cognitive Load Index for a question under the given settings and profile."""
    base_cli = compute_cli(req.raw_sinhala_text, operation_count=1)
    custom_settings = req.custom_settings
    behavior_profile = req.behavior_profile

    if custom_settings or behavior_profile:
        from app.services.cognitive_load import build_custom_adhd_game_settings, calculate_custom_cli
        final_settings, _ = build_custom_adhd_game_settings(
            cli_score=base_cli,
            adhd_risk_level="MEDIUM",
            custom_settings=custom_settings,
            behavior_profile=behavior_profile,
        )
        effective_cli = calculate_custom_cli(base_cli, final_settings, behavior_profile)
    else:
        effective_cli = base_cli

    return {
        "base_cli": base_cli,
        "effective_cli": effective_cli,
        "difference": round(effective_cli - base_cli, 2),
    }



@router.post("/seed-local", response_model=SeedSyllabiResponse)
async def seed_local_syllabi(
    wait: bool = Query(False, description="Block until every guide is extracted (scripts/tests)"),
):
    """Registers the bundled NIE guides in data/syllabi and queues them for background extraction."""
    from app.scripts.seed_syllabi import run_seed
    return await run_seed(wait=wait)
