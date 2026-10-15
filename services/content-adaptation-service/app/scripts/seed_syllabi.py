import asyncio
import io
import re
from pathlib import Path
from typing import Optional
from pypdf import PdfReader

from app.schemas.syllabus import SeedSyllabiResponse, SyllabusDocument
from app.services.db import db_service
from app.services.llm_extractor import upload_and_extract_problems


def _infer_grade_from_filename(filename: str) -> int:
    m = re.search(r"grade[_\-\s]*0?([1-5])", filename, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return 1


async def run_seed(syllabi_dir: Optional[Path] = None) -> SeedSyllabiResponse:
    await db_service.initialize()
    if syllabi_dir is None:
        syllabi_dir = Path(__file__).resolve().parents[2] / "data" / "syllabi"

    syllabi_dir.mkdir(parents=True, exist_ok=True)
    pdf_files = sorted(list(syllabi_dir.glob("*.pdf")))
    print(f"[SeedSyllabi] Found {len(pdf_files)} PDF files in {syllabi_dir}")

    docs_col = db_service.get_syllabus_documents()
    probs_col = db_service.get_curriculum_problems()
    gridfs = db_service.get_gridfs()

    imported_docs = []
    total_problems = 0

    for pdf_path in pdf_files:
        grade = _infer_grade_from_filename(pdf_path.name)
        file_bytes = pdf_path.read_bytes()

        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            page_count = len(reader.pages)
        except Exception:
            page_count = 1

        doc_id = f"doc_g{grade}_{pdf_path.stem.lower()}"

        # Upload to GridFS or fallback disk store
        gridfs_id = await gridfs.upload_from_stream(
            filename=pdf_path.name,
            source_bytes=file_bytes,
            metadata={"grade": grade, "subject": "Mathematics", "year": 2024, "language": "si"},
        )

        doc = SyllabusDocument(
            doc_id=doc_id,
            filename=pdf_path.name,
            grade=grade,
            subject="Mathematics",
            year=2024,
            language="si",
            page_count=page_count,
            file_size=len(file_bytes),
            status="extracting",
            extracted_problem_count=0,
            gridfs_id=gridfs_id,
            local_path=str(pdf_path),
        )

        await docs_col.update_one({"doc_id": doc_id}, {"$set": doc.model_dump()}, upsert=True)

        # Extract problems
        problems = await upload_and_extract_problems(
            pdf_file_path_or_bytes=file_bytes,
            grade=grade,
            doc_id=doc_id,
        )

        for p in problems:
            await probs_col.update_one(
                {"problem_id": p.problem_id},
                {"$set": p.model_dump()},
                upsert=True,
            )

        doc.status = "extracted"
        doc.extracted_problem_count = len(problems)
        await docs_col.update_one(
            {"doc_id": doc_id},
            {"$set": {"status": "extracted", "extracted_problem_count": len(problems)}},
        )

        imported_docs.append(doc)
        total_problems += len(problems)
        print(f"  [OK] Ingested {pdf_path.name} (Grade {grade}, {page_count} pages) -> {len(problems)} problems")

    print(f"[SeedSyllabi] Complete! {len(imported_docs)} documents registered, {total_problems} problems extracted.")
    return SeedSyllabiResponse(
        imported_documents=len(imported_docs),
        extracted_problems=total_problems,
        documents=imported_docs,
    )


def main():
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
