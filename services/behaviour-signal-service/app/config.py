"""
Configuration for the MathQuest Behaviour Signal Service (Component 4).

Mirrors the pattern in services/learner-profile-service/app/config.py:
  – loads the shared root .env three directory levels up
  – falls back to local .env / environment variables
  – exposes typed constants consumed throughout the service
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Resolve root .env  ──────────────────────────────────────────────────────
# File layout:
#   services/behaviour-signal-service/app/config.py   ← this file
#   services/behaviour-signal-service/             ← service root
#   services/                                      ← services root
#   <project root>/.env                            ← shared config
BASE_DIR = Path(__file__).resolve().parent.parent          # behaviour-signal-service/
ROOT_ENV = BASE_DIR.parent.parent / ".env"                 # project root .env

if ROOT_ENV.exists():
    load_dotenv(dotenv_path=ROOT_ENV)
else:
    load_dotenv()

# ── MongoDB (shared Atlas cluster) ─────────────────────────────────────────
MONGODB_URI: str = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://mathquest_app:Test123456@mathquest-cluster.kaofydq.mongodb.net/?appName=mathquest-cluster",
)
MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "mathquest_db")

# ── Service networking ──────────────────────────────────────────────────────
PORT: int = int(os.getenv("BEHAVIOUR_SERVICE_PORT", os.getenv("PORT", "8004")))

# ── CORS (matches auth-service and learner-profile-service allow-list) ──────
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

# ── Session cookie (must match auth-service cookie name exactly) ────────────
AUTH_COOKIE_NAME: str = os.getenv("AUTH_COOKIE_NAME", "mathquest_session")

# ── Behaviour-detection thresholds ─────────────────────────────────────────
# Very-fast response: anything below this (ms) is flagged as impulsive clicking
VERY_FAST_RESPONSE_MS: int = int(os.getenv("VERY_FAST_RESPONSE_MS", "800"))

# Pause / inactivity: a gap longer than this (ms) within a question is a "long pause"
LONG_PAUSE_THRESHOLD_MS: int = int(os.getenv("LONG_PAUSE_THRESHOLD_MS", "5000"))

# Maximum events stored per session in MongoDB before the oldest are dropped
MAX_EVENTS_PER_SESSION: int = int(os.getenv("MAX_EVENTS_PER_SESSION", "2000"))
