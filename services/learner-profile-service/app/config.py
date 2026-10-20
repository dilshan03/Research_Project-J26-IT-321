import os
from pathlib import Path
from dotenv import load_dotenv

# Search for root .env (three levels up: app -> learner-profile-service -> services -> root)
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_ENV = BASE_DIR.parent.parent / ".env"

if ROOT_ENV.exists():
    load_dotenv(dotenv_path=ROOT_ENV)
else:
    load_dotenv()

# No fallback: the URI must come from the environment / root .env.
# When missing, connect_to_database() refuses to connect and health checks report it.
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "mathquest_db")
PORT = int(os.getenv("LEARNER_PROFILE_PORT", os.getenv("PORT", "5001")))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    ).split(",")
    if origin.strip()
]
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "mathquest_session")
