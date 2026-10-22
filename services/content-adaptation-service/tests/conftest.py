"""
Test isolation: runs entirely offline against a throwaway local store.

These variables are set before `app` is imported, so the suite never writes to the shared
MongoDB Atlas database, never touches app/data/db_store, and never calls Gemini.
"""
import os
import tempfile
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="mathquest-tests-"))
os.environ["CONTENT_FORCE_LOCAL_DB"] = "1"
os.environ["CONTENT_DATA_DIR"] = str(_TMP / "db_store")
os.environ["SYLLABUS_CACHE_DIR"] = str(_TMP / "syllabus_cache")
os.environ["GEMINI_API_KEY"] = ""   # load_dotenv never overrides an existing variable
os.environ["GOOGLE_API_KEY"] = ""

import pytest  # noqa: E402

from app.services import syllabus_pipeline  # noqa: E402

from tests.fakes import FakeBackend, make_pdf  # noqa: E402


@pytest.fixture
def fake_backend(monkeypatch, tmp_path):
    fb = FakeBackend()
    monkeypatch.setattr(syllabus_pipeline, "backend", fb)
    # Fresh cache per test: generated PDFs can share a fingerprint, and cached
    # transcripts from one test must not leak into another.
    monkeypatch.setattr(syllabus_pipeline, "CACHE_DIR", tmp_path / "cache")
    return fb


@pytest.fixture
def sample_pdf(tmp_path):
    return make_pdf(tmp_path / "Grade 1 guide.pdf")


@pytest.fixture
def anyio_backend():
    return "asyncio"
