# content-adaptation-service

**Purpose & Details:**
BACKEND [D]: Content Adaptation API (FastAPI / Python).

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003   # docs at http://localhost:8003/docs
python -m pytest -q
```

Frontend (`apps/web`): `npm run dev`, then open `#/adapt` (teacher studio) or `#/play` (learner games).
Override the API URL with `VITE_CONTENT_API_URL`. CORS origins via `CORS_ORIGINS`.

## Endpoints (`/api/v1/adaptations`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/sample-questions` | Demo Sinhala questions |
| POST | `/analyze` | CLI score + derived ADHD settings (no save) |
| POST | `/blueprints` | Generate and store a draft blueprint |
| GET | `/blueprints?status=` | List blueprints |
| GET | `/blueprints/{id}` | Get one |
| PATCH | `/blueprints/{id}/status` | Teacher approve / reject |

Storage is in-memory (`app/services/repository.py`); data resets on restart.
