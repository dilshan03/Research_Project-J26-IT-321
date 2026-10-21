# Starts the ISOLATED local PP1 demo stack (synthetic data only; never Atlas).
#   MongoDB  : Docker container 'mathquest-pp1-mongo', bound to 127.0.0.1:27018 only, database mathquest_pp1_demo
#   Auth     : services/auth-service        on http://127.0.0.1:5100
#   Profile  : services/learner-profile-service on http://localhost:5101
#   Web      : apps/web (Vite)              on http://localhost:5174
# Settings are passed as process environment variables (they take precedence over .env files);
# no .env or committed configuration is changed. Ports 5000-5002 / 5173 (the normal stack) are not used.
#
# Usage (repo root):  powershell -ExecutionPolicy Bypass -File scripts\pp1-local\start-pp1-local.ps1

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot\..\..").Path
$MongoUri = 'mongodb://127.0.0.1:27018'
$DbName = 'mathquest_pp1_demo'
if ($MongoUri -notmatch '^mongodb://(127\.0\.0\.1|localhost):\d+$') { throw 'Refusing: not a loopback MongoDB URI' }

# 1. MongoDB container (loopback only, pinned image)
$existing = docker ps -a --filter "name=^mathquest-pp1-mongo$" --format '{{.Status}}'
if (-not $existing) {
    docker run -d --name mathquest-pp1-mongo --label purpose=mathquest-pp1-synthetic -p 127.0.0.1:27018:27017 mongo:7.0 | Out-Null
} elseif ($existing -notmatch '^Up') {
    docker start mathquest-pp1-mongo | Out-Null
}
Write-Host "MongoDB: $(docker ps --filter name=mathquest-pp1-mongo --format '{{.Names}} {{.Status}} {{.Ports}}')"

$common = "`$env:MONGODB_URI='$MongoUri'; `$env:MONGODB_DB_NAME='$DbName';"

# 2. Auth service (5100)
Start-Process powershell -ArgumentList '-NoExit', '-Command', "$common `$env:AUTH_SERVICE_PORT='5100'; Set-Location '$Root\services\auth-service'; node src/server.js"

# 3. Learner-profile service (5101)
Start-Process powershell -ArgumentList '-NoExit', '-Command', "$common `$env:LEARNER_PROFILE_PORT='5101'; `$env:CORS_ORIGINS='http://localhost:5174,http://127.0.0.1:5174'; `$env:PYTHONDONTWRITEBYTECODE='1'; Set-Location '$Root\services\learner-profile-service'; python -m uvicorn app.main:app --host 127.0.0.1 --port 5101"

# 4. Web (5174). Auth goes through this server's own proxy; other teams' services are pointed at unused ports.
Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$env:VITE_API_BASE_URL='http://localhost:5174'; `$env:AUTH_API_URL='http://127.0.0.1:5100'; `$env:VITE_LEARNER_PROFILE_API_URL='http://localhost:5101'; `$env:DECISION_API_URL='http://127.0.0.1:5199'; `$env:VITE_BEHAVIOUR_API_URL='http://127.0.0.1:5198'; `$env:VITE_CONTENT_API_URL='http://127.0.0.1:5197'; Set-Location '$Root\apps\web'; npx vite --port 5174 --strictPort"

Write-Host 'Started. Open http://localhost:5174 (allow ~10 s for the services to connect).'
Write-Host 'Health: http://127.0.0.1:5100/api/health/database  and  http://localhost:5101/api/health/database'
