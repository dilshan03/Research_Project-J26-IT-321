# content-adaptation-service

**Purpose & Details:**
BACKEND [D]: Content Adaptation API (FastAPI / Python). Turns the official NIE Grade 1–5
mathematics teacher's guides into verified, ADHD-friendly game blueprints.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003   # docs at http://localhost:8003/docs
python -m pytest -q                          # offline, ~3 s, never touches Atlas or Gemini
python -m app.scripts.seed_syllabi          # register + extract the bundled guides (needs GEMINI_API_KEY)
```

Frontend (`apps/web`): `npm run dev`, then open `#/adapt` (teacher studio) or `#/play` (learner games).
Override the API URL with `VITE_CONTENT_API_URL`. CORS origins via `CORS_ORIGINS`.

## Syllabus ingestion

The bundled PDFs in `data/syllabi/` are the NIE teacher's guides (ගුරු මාර්ගෝපදේශය). They are typeset
in legacy (non-Unicode) Sinhala fonts, and the Grade 4 guide has no text layer at all, so the PDF text
is never used. `app/services/syllabus_pipeline.py` instead:

1. **Transcribes** every page image to Unicode Sinhala with Gemini (6 pages per request).
2. **Extracts** practice items per 8-page window: printed exercises (`source_kind: exercise`) and
   items written for a quoted competency level (`source_kind: aligned`, e.g.
   "4.1 එකතුව 6 තෙක් වන සංඛ්‍යා දෙකක එකතුව සොයයි" → 2 + 3, 4 + 1, 3 + 3).
3. **Verifies** each item deterministically (`validate_candidate`) before it reaches the problem bank:
   - the quoted text must appear on the cited page;
   - printed exercises: every number must be printed on that page; aligned items: every number,
     including the answer, must stay within the limit the competency prints (an unverified limit is
     ignored, so it can never loosen the bounds);
   - the arithmetic is recomputed (a wrong stated answer is rejected, never silently "fixed");
   - the text must be clean Unicode Sinhala (no legacy-font glyphs or stray foreign-script letters);
   - a game must exist for it: ADD/SUB/MUL/DIV, COUNT, COMPARE, SHAPE, PATTERN (number or colour).

   Rejections are counted per reason on the document (`rejection_summary`), so coverage is visible.

Transcripts and candidates are cached by file fingerprint in `data/syllabi/_cache/` (commit it: it
saves re-reading ~740 pages). Changing validation rules costs no API calls; changing the extraction
prompt needs a cache version bump (`candidates.vN.json`).

Extraction runs in the background, one document at a time; the studio polls
`GET /documents/{id}` for `progress_stage` / `progress_done` / `progress_total`.
A server restart marks unfinished jobs as `error`; running them again resumes from the cache.

## Endpoints

`/api/v1/syllabus`

| Method | Path | Purpose |
|---|---|---|
| POST | `/upload` | Upload a guide PDF (multipart: `file`, `grade` 1–5). Rejects non-PDFs and empty PDFs |
| GET | `/documents` | Registered guides (`include_legacy=true` also lists pre-pipeline records) |
| GET | `/documents/{id}` | One guide, including extraction progress / errors / rejection summary |
| POST | `/documents/{id}/extract` | Start background extraction (202). `?wait=true` blocks until done |
| POST | `/seed-local` | Register the guides in `data/syllabi` and queue them (`?wait=true` to block) |
| GET | `/problems?grade=&topic=&doc_id=` | Verified problem bank (`include_legacy=true` for old unverified items) |
| POST | `/problems/{id}/adapt` | Generate an ADHD-adapted game blueprint for a problem |
| PUT | `/blueprints/{id}/tune` | Re-tune a blueprint with teacher settings |
| POST | `/cognitive-load/preview` | CLI preview for teacher settings |

`/api/v1/adaptations`

| Method | Path | Purpose |
|---|---|---|
| GET | `/sample-questions` | Demo Sinhala questions |
| POST | `/analyze` | CLI score + derived ADHD settings (no save) |
| POST | `/blueprints` | Generate and store a draft blueprint from raw text |
| GET | `/blueprints?status=` | List blueprints |
| GET | `/blueprints/{id}` | Get one |
| PATCH | `/blueprints/{id}/status` | Teacher approve / reject |

## Storage

With `MONGODB_URI` set (root `.env`), documents, problems and blueprints live in the shared Atlas
database `mathquest_db`; otherwise in JSON files under `app/data/db_store/`.
`CONTENT_FORCE_LOCAL_DB=1` and `CONTENT_DATA_DIR` force and relocate the local store (the tests use both).
Bundled guides are referenced in place and never copied into GridFS.
