"""
Background extraction jobs for syllabus documents.

A 190-page guide takes minutes to read, far longer than an HTTP request should wait, so
extraction runs as an asyncio task and reports progress on the document record, which the
teacher studio polls. Documents are processed one at a time to stay inside API rate limits.
"""
import asyncio
import tempfile
import time
from pathlib import Path
from typing import Dict, Optional

from app.services.db import db_service
from app.services.syllabus_pipeline import IngestionError, ingest_pdf

PIPELINE_VERSION = 2
PROGRESS_WRITE_INTERVAL_S = 2.0

_queue = asyncio.Lock()
_tasks: Dict[str, asyncio.Task] = {}


def is_running(doc_id: str) -> bool:
    task = _tasks.get(doc_id)
    return bool(task and not task.done())


async def _set(doc_id: str, **fields) -> None:
    await db_service.get_syllabus_documents().update_one({"doc_id": doc_id}, {"$set": fields})


async def _resolve_pdf(doc: dict) -> Path:
    """Local copy if it exists, otherwise pull the PDF out of GridFS into a temp file."""
    local = doc.get("local_path")
    if local and Path(local).exists():
        return Path(local)
    if doc.get("gridfs_id"):
        file_id = doc["gridfs_id"]
        if db_service.is_connected:
            from bson import ObjectId
            try:
                file_id = ObjectId(file_id)
            except Exception:  # noqa: BLE001 - non-ObjectId ids come from the local fallback
                pass
        stream = await db_service.get_gridfs().open_download_stream(file_id)
        data = stream.read()
        if asyncio.iscoroutine(data):
            data = await data
        tmp = Path(tempfile.gettempdir()) / f"mathquest_{doc['doc_id']}.pdf"
        tmp.write_bytes(data)
        return tmp
    raise IngestionError("The PDF for this document is no longer available; upload it again.")


async def run_extraction(doc_id: str) -> None:
    docs = db_service.get_syllabus_documents()
    await _set(doc_id, status="extracting", progress_stage="queued", progress_done=0, progress_total=0, error_message=None)

    async with _queue:
        doc = await docs.find_one({"doc_id": doc_id})
        if not doc:
            return
        last_write = [0.0, ""]

        async def progress(stage: str, done: int, total: int) -> None:
            now = time.monotonic()
            # Throttle writes (Atlas round-trips), but always record stage changes and completion.
            if stage != last_write[1] or done >= total or now - last_write[0] >= PROGRESS_WRITE_INTERVAL_S:
                last_write[0], last_write[1] = now, stage
                await _set(doc_id, progress_stage=stage, progress_done=done, progress_total=total)

        try:
            pdf = await _resolve_pdf(doc)
            problems, report, pages = await ingest_pdf(pdf, doc["grade"], doc_id, progress)
        except Exception as exc:  # noqa: BLE001 - every failure is surfaced on the document
            await _set(doc_id, status="error", progress_stage=None, error_message=str(exc)[:500])
            return

        # Re-extraction replaces this document's problems (and only this document's).
        probs = db_service.get_curriculum_problems()
        await probs.delete_many({"doc_id": doc_id})
        for p in problems:
            await probs.update_one({"problem_id": p.problem_id}, {"$set": p.model_dump()}, upsert=True)

        await _set(
            doc_id,
            status="extracted",
            progress_stage="done",
            page_count=pages,
            extracted_problem_count=len(problems),
            rejected_count=sum(report.rejected.values()),
            rejection_summary=report.rejected,
            error_message=None,
        )


def start_extraction(doc_id: str) -> bool:
    """Queue extraction for a document. Returns False if it is already queued or running."""
    if is_running(doc_id):
        return False
    _tasks[doc_id] = asyncio.create_task(run_extraction(doc_id))
    return True


async def wait_for(doc_id: str) -> None:
    task: Optional[asyncio.Task] = _tasks.get(doc_id)
    if task:
        await task


async def recover_interrupted() -> int:
    """Jobs die with the process; mark documents left mid-extraction so the studio can re-run them."""
    docs = db_service.get_syllabus_documents()
    stuck = await docs.find({"status": "extracting"}).to_list(length=500)
    for d in stuck:
        await _set(d["doc_id"], status="error", progress_stage=None,
                   error_message="Extraction was interrupted by a server restart. Run it again; finished pages are cached.")
    return len(stuck)
