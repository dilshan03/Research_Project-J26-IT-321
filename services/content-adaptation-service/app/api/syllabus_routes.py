import asyncio
import io
import os
import uuid
from pathlib import Path
from typing import Any, List, Optional
from fastapi import APIRouter, Body, File, Form, HTTPException, Query, UploadFile
from pypdf import PdfReader

from app.schemas.api import BlueprintEnvelope
from app.schemas.syllabus import (
    AdaptProblemRequest,
    CurriculumProblem,
    CustomADHDGameSettings,
    DocumentUploadResponse,
    SeedSyllabiResponse,
    StudentBehaviorProfile,
    SyllabusDocument,
    TuneBlueprintRequest,
)
from app.services.blueprint_generator import (
    generate_blueprint_from_curriculum_problem,
    tune_existing_blueprint,
)
from app.services.cognitive_load import compute_cli
from app.services.db import db_service
from app.services.llm_extractor import upload_and_extract_problems

router = APIRouter(prefix="/api/v1/syllabus", tags=["syllabus-curriculum"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_syllabus_document(
    file: UploadFile = File(...),
    grade: int = Form(1),
    subject: str = Form("Mathematics"),
    year: int = Form(2024),
    language: str = Form("si"),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Read page count via pypdf
    try:
        reader = PdfReader(io.BytesIO(content))
        page_count = len(reader.pages)
    except Exception as e:
        page_count = 1

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    # Save to local uploads dir as reliable backup
    local_upload_dir = Path(__file__).resolve().parents[1] / "data" / "db_store" / "uploads"
    local_upload_dir.mkdir(parents=True, exist_ok=True)
    local_file_path = local_upload_dir / f"{doc_id}_{file.filename}"
    saved_local_path: Optional[str] = None
    try:
        local_file_path.write_bytes(content)
        saved_local_path = str(local_file_path)
    except Exception as e:
        print(f"[upload_syllabus_document] Local backup save note: {e}")

    # Save to GridFS / disk fallback
    gridfs = db_service.get_gridfs()
    gridfs_id = await gridfs.upload_from_stream(
        filename=file.filename,
        source=content,
        metadata={"grade": grade, "subject": subject, "year": year, "language": language},
    )

    doc = SyllabusDocument(
        doc_id=doc_id,
        filename=file.filename,
        grade=grade,
        subject=subject,
        year=year,
        language=language,  # type: ignore
        page_count=page_count,
        file_size=len(content),
        status="uploaded",
        extracted_problem_count=0,
        gridfs_id=str(gridfs_id),
        local_path=saved_local_path,
    )

    docs_col = db_service.get_syllabus_documents()
    await docs_col.insert_one(doc.model_dump())

    return DocumentUploadResponse(
        document=doc,
        message=f"Successfully ingested {file.filename} ({page_count} pages) for Grade {grade}",
    )


@router.get("/documents", response_model=List[SyllabusDocument])
async def list_documents(grade: Optional[int] = Query(None, ge=1, le=5)):
    docs_col = db_service.get_syllabus_documents()
    query = {}
    if grade:
        query["grade"] = grade
    cursor = docs_col.find(query)
    docs = await cursor.to_list(length=100)
    return [SyllabusDocument(**d) for d in docs]


@router.get("/documents/{doc_id}", response_model=SyllabusDocument)
async def get_document(doc_id: str):
    docs_col = db_service.get_syllabus_documents()
    doc = await docs_col.find_one({"doc_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return SyllabusDocument(**doc)


@router.post("/documents/{doc_id}/extract", response_model=List[CurriculumProblem])
async def extract_problems_from_document(doc_id: str):
    docs_col = db_service.get_syllabus_documents()
    doc_dict = await docs_col.find_one({"doc_id": doc_id})
    if not doc_dict:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = SyllabusDocument(**doc_dict)
    await docs_col.update_one({"doc_id": doc_id}, {"$set": {"status": "extracting"}})

    # Fetch file content from local path or GridFS
    pdf_bytes = b""
    if doc.local_path and os.path.exists(doc.local_path):
        try:
            pdf_bytes = Path(doc.local_path).read_bytes()
        except Exception as e:
            print(f"[extract_problems_from_document] Local read error: {e}")

    if not pdf_bytes and doc.gridfs_id:
        try:
            gridfs = db_service.get_gridfs()
            # If MongoDB is connected, GridFS expects an ObjectId
            file_id: Any = doc.gridfs_id
            if db_service.is_connected:
                from bson import ObjectId
                try:
                    file_id = ObjectId(doc.gridfs_id)
                except Exception:
                    file_id = doc.gridfs_id
            stream = await gridfs.open_download_stream(file_id)
            if hasattr(stream, "read"):
                read_res = stream.read()
                if asyncio.iscoroutine(read_res):
                    pdf_bytes = await read_res
                else:
                    pdf_bytes = read_res
        except Exception as e:
            print(f"[extract_problems_from_document] GridFS read error: {e}")

    # Fallback to local syllabus dataset if matches Grade
    if not pdf_bytes:
        default_local = Path(__file__).resolve().parents[2] / "data" / "syllabi" / f"Grade_0{doc.grade}.pdf"
        if default_local.exists():
            try:
                pdf_bytes = default_local.read_bytes()
            except Exception:
                pass

    try:
        problems = await upload_and_extract_problems(
            pdf_file_path_or_bytes=pdf_bytes,
            grade=doc.grade,
            doc_id=doc.doc_id,
        )

        probs_col = db_service.get_curriculum_problems()
        for p in problems:
            await probs_col.update_one(
                {"problem_id": p.problem_id},
                {"$set": p.model_dump()},
                upsert=True,
            )

        await docs_col.update_one(
            {"doc_id": doc_id},
            {"$set": {"status": "extracted", "extracted_problem_count": len(problems)}},
        )
        return problems
    except Exception as e:
        await docs_col.update_one({"doc_id": doc_id}, {"$set": {"status": "error"}})
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.get("/problems", response_model=List[CurriculumProblem])
async def list_curriculum_problems(
    grade: Optional[int] = Query(None, ge=1, le=5),
    topic: Optional[str] = Query(None),
    doc_id: Optional[str] = Query(None),
):
    probs_col = db_service.get_curriculum_problems()
    query = {}
    if grade:
        query["grade"] = grade
    if doc_id:
        query["doc_id"] = doc_id
    cursor = probs_col.find(query)
    items = await cursor.to_list(length=200)

    # In-memory filter for topic if provided
    problems = [CurriculumProblem(**p) for p in items]
    if topic:
        t = topic.lower()
        problems = [p for p in problems if t in p.topic.lower() or (t == "money" and p.is_money)]
    return problems


@router.get("/problems/{problem_id}", response_model=CurriculumProblem)
async def get_curriculum_problem(problem_id: str):
    probs_col = db_service.get_curriculum_problems()
    item = await probs_col.find_one({"problem_id": problem_id})
    if not item:
        raise HTTPException(status_code=404, detail="Problem not found")
    return CurriculumProblem(**item)


@router.post("/problems/{problem_id}/adapt", response_model=BlueprintEnvelope, status_code=201)
async def adapt_problem_to_game(problem_id: str, req: AdaptProblemRequest):
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
        raw_sinhala_question=problem.child_prompt_si or problem.raw_problem_text,
        raw_english_question=blueprint.raw_english_question,
        blueprint=blueprint,
    )

    blueprints_col = db_service.get_game_blueprints()
    await blueprints_col.update_one(
        {"activity_id": blueprint.activity_id},
        {"$set": envelope.model_dump()},
        upsert=True,
    )

    from app.services.repository import repository
    repository.save(envelope)

    return envelope


@router.put("/blueprints/{activity_id}/tune", response_model=BlueprintEnvelope)
async def tune_game_blueprint(activity_id: str, req: TuneBlueprintRequest):
    blueprints_col = db_service.get_game_blueprints()
    bp_dict = await blueprints_col.find_one({"activity_id": activity_id})
    if not bp_dict:
        from app.services.repository import repository
        env = repository.get(activity_id)
        if not env:
            raise HTTPException(status_code=404, detail=f"Blueprint {activity_id} not found")
    else:
        env = BlueprintEnvelope(**bp_dict)

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

    tuned_blueprint = tune_existing_blueprint(
        existing=env.blueprint,
        problem=problem,
        custom_settings=req.custom_settings,
        behavior_profile=req.behavior_profile,
        game_theme=req.game_theme,
    )

    new_envelope = BlueprintEnvelope(
        cli_score=round(tuned_blueprint.effective_cli_score or tuned_blueprint.cli_score or env.cli_score, 2),
        raw_sinhala_question=env.raw_sinhala_question,
        raw_english_question=tuned_blueprint.raw_english_question or env.raw_english_question,
        blueprint=tuned_blueprint,
    )

    await blueprints_col.update_one(
        {"activity_id": activity_id},
        {"$set": new_envelope.model_dump()},
        upsert=True,
    )
    from app.services.repository import repository
    repository.save(new_envelope)

    return new_envelope


@router.post("/cognitive-load/preview")
async def preview_cognitive_load(payload: dict = Body(...)):
    raw_sinhala_text = payload.get("raw_sinhala_text", "")
    custom_settings_dict = payload.get("custom_settings")
    behavior_profile_dict = payload.get("behavior_profile")

    base_cli = compute_cli(raw_sinhala_text, operation_count=1)

    custom_settings = CustomADHDGameSettings(**custom_settings_dict) if custom_settings_dict else None
    behavior_profile = StudentBehaviorProfile(**behavior_profile_dict) if behavior_profile_dict else None

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
async def seed_local_syllabi(directory: Optional[str] = Query(None)):
    """Scans local data/syllabi folder, imports Grade 1-5 PDFs and extracts problems."""
    from app.scripts.seed_syllabi import run_seed
    syllabi_dir = Path(directory) if directory else Path(__file__).resolve().parents[2] / "data" / "syllabi"
    result = await run_seed(syllabi_dir)
    return result
