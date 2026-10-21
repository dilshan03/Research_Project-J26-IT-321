import os
from pathlib import Path
from dotenv import load_dotenv
_HERE = Path(__file__).resolve()
# The repo-root .env only exists in the monorepo; in Docker (/app/app) there is no
# third parent and compose injects the env vars instead.
if len(_HERE.parents) > 3:
    load_dotenv(_HERE.parents[3] / '.env')
load_dotenv(_HERE.parents[1] / '.env', override=False)
MONGODB_URI = os.getenv('MONGODB_URI', '')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'mathquest_db')
CORS_ORIGINS = [x.strip() for x in os.getenv('CORS_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(',') if x.strip()]
VERY_FAST_RESPONSE_MS = int(os.getenv('VERY_FAST_RESPONSE_MS','800'))
LONG_PAUSE_THRESHOLD_MS = int(os.getenv('LONG_PAUSE_THRESHOLD_MS','5000'))
AUTH_COOKIE_NAME = os.getenv('AUTH_COOKIE_NAME','mathquest_session')
# Development only. Production must validate existing auth-service sessions.
DEV_ALLOW_UNAUTHENTICATED = os.getenv('DEV_ALLOW_UNAUTHENTICATED','false').lower() == 'true'
