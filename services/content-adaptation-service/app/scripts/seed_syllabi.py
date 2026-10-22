"""
Register the bundled NIE teacher's guides in data/syllabi and queue them for extraction.

    python -m app.scripts.seed_syllabi          # register + extract, waits until done

The PDFs are referenced in place (never copied into GridFS: the Grade 4 guide alone is
~190 MB). Page transcripts are cached under data/syllabi/_cache, so re-running is cheap.
"""
import asyncio
import re
from pathlib import Path
from typing import List, Optional

from app.schemas.syllabus import SeedSyllabiResponse, SyllabusDocument
from app.services import ingestion_jobs
from app.services.db import db_service
from app.services.syllabus_pipeline import page_count

SYLLABI_DIR = Path(__file__).resolve().parents[2] / "data" / "syllabi"


def infer_grade_from_filename(filename: str) -> Optional[int]:
    m = re.search(r"grade[_\-\s]*0?([1-5])\b", filename, re.IGNORECASE)
    return int(m.group(1)) if m else None


def doc_id_for(path: Path, grade: int) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", path.stem.lower()).strip("_")
    return f"doc_g{grade}_{slug}"


async def register_local_syllabi(syllabi_dir: Optional[Path] = None) -> List[SyllabusDocument]:
    await db_service.initialize()
    syllabi_dir = syllabi_dir or SYLLABI_DIR
    docs_col = db_service.get_syllabus_documents()
    registered: List[SyllabusDocument] = []

    for pdf_path in sorted(syllabi_dir.glob("*.pdf")):
        grade = infer_grade_from_filename(pdf_path.name)
        if grade is None:
            print(f"[SeedSyllabi] Skipping {pdf_path.name}: no grade (1-5) in the filename")
            continue
        try:
            pages = await asyncio.to_thread(page_count, pdf_path)
        except Exception as e:  # noqa: BLE001
            print(f"[SeedSyllabi] Skipping {pdf_path.name}: not a readable PDF ({e})")
            continue

        doc_id = doc_id_for(pdf_path, grade)
        existing = await docs_col.find_one({"doc_id": doc_id}) or {}
        doc = SyllabusDocument(
            doc_id=doc_id,
            filename=pdf_path.name,
            grade=grade,
            page_count=max(pages, 1),
            file_size=pdf_path.stat().st_size,
            status=existing.get("status", "uploaded") if existing.get("pipeline_version") == ingestion_jobs.PIPELINE_VERSION else "uploaded",
            extracted_problem_count=existing.get("extracted_problem_count", 0) if existing.get("pipeline_version") == ingestion_jobs.PIPELINE_VERSION else 0,
            local_path=str(pdf_path),
            pipeline_version=ingestion_jobs.PIPELINE_VERSION,
        )
        await docs_col.update_one({"doc_id": doc_id}, {"$set": doc.model_dump()}, upsert=True)
        registered.append(doc)
    return registered


async def run_seed(syllabi_dir: Optional[Path] = None, wait: bool = False) -> SeedSyllabiResponse:
    docs = await register_local_syllabi(syllabi_dir)
    for d in docs:
        ingestion_jobs.start_extraction(d.doc_id)
    if wait:
        for d in docs:
            await ingestion_jobs.wait_for(d.doc_id)

    docs_col = db_service.get_syllabus_documents()
    fresh = [SyllabusDocument(**(await docs_col.find_one({"doc_id": d.doc_id}))) for d in docs]
    return SeedSyllabiResponse(
        imported_documents=len(fresh),
        extracted_problems=sum(d.extracted_problem_count for d in fresh),
        documents=fresh,
    )


def main():
    async def _go():
        res = await run_seed(wait=True)
        for d in res.documents:
            extra = f" ({d.error_message})" if d.error_message else ""
            print(f"  Grade {d.grade} {d.filename}: {d.status}, {d.extracted_problem_count} problems, "
                  f"{d.rejected_count} rejected{extra}")
        print(f"[SeedSyllabi] {res.imported_documents} documents, {res.extracted_problems} problems.")
    asyncio.run(_go())


if __name__ == "__main__":
    main()
