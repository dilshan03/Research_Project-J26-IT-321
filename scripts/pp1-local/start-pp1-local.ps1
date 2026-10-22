# Starts the ISOLATED local PP1 demo stack (synthetic data only; never Atlas).
#   MongoDB  : Docker container 'mathquest-pp1-mongo', bound to 127.0.0.1:27018 only, database mathquest_pp1_demo
#   Auth     : services/auth-service             on http://127.0.0.1:5100
#   Profile  : services/learner-profile-service  on http://localhost:5101
#   Web      : apps/web (Vite)                   on http://localhost:5174
# Settings are process environment variables (they take precedence over .env files); no .env or committed
# configuration is changed. The normal development stack (5000-5002, 5173) is never stopped or reconfigured.
#
# Usage (repo root):  powershell -ExecutionPolicy Bypass -File scripts\pp1-local\start-pp1-local.ps1

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot\..\..").Path
$MongoUri = 'mongodb://127.0.0.1:27018'
$DbName = 'mathquest_pp1_demo'
$Decoys = @(5199, 5198, 5197)   # other components are pointed here; nothing may listen on them

function Test-Port([int]$Port) {
    $c = New-Object Net.Sockets.TcpClient
    try { return $c.ConnectAsync('127.0.0.1', $Port).Wait(400) } catch { return $false } finally { $c.Dispose() }
}

# ---- Pre-flight -------------------------------------------------------------------------------------------
if ($MongoUri -notmatch '^mongodb://(127\.0\.0\.1|localhost):\d+$') { throw 'Refusing: not a loopback MongoDB URI' }
docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is not running. Start it, then run this script again. (Atlas is never used as a fallback.)' }
foreach ($p in 5100, 5101, 5174) {
    if (Test-Port $p) { throw "Port $p is already in use. If the PP1 stack is already running, run stop-pp1-local.ps1 first." }
}
foreach ($p in $Decoys) {
    if (Test-Port $p) { throw "Decoy port $p has a listener; refusing so that no real service is reached." }
}

# ---- 1. MongoDB container (loopback only, pinned image) -----------------------------------------------------
$status = docker ps -a --filter 'name=^mathquest-pp1-mongo$' --format '{{.Status}}'
if (-not $status) {
    docker run -d --name mathquest-pp1-mongo --label purpose=mathquest-pp1-synthetic -p 127.0.0.1:27018:27017 mongo:7.0 | Out-Null
} elseif ($status -notmatch '^Up') {
    docker start mathquest-pp1-mongo | Out-Null
}
$binding = docker port mathquest-pp1-mongo 27017
if ($binding -notmatch '^127\.0\.0\.1:27018$') { throw "MongoDB container is bound to '$binding', expected 127.0.0.1:27018 only." }

$common = "`$env:MONGODB_URI='$MongoUri'; `$env:MONGODB_DB_NAME='$DbName';"

# ---- 2-4. Services in their own windows -----------------------------------------------------------------------
Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='PP1 auth 5100'; $common `$env:AUTH_SERVICE_PORT='5100'; Set-Location '$Root\services\auth-service'; node src/server.js"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='PP1 learner-profile 5101'; $common `$env:LEARNER_PROFILE_PORT='5101'; `$env:CORS_ORIGINS='http://localhost:5174,http://127.0.0.1:5174'; `$env:PYTHONDONTWRITEBYTECODE='1'; Set-Location '$Root\services\learner-profile-service'; python -m uvicorn app.main:app --host 127.0.0.1 --port 5101"
# Auth goes through this server's own proxy (VITE_API_BASE_URL overrides apps/web/.env); other teams' services -> decoys.
Start-Process powershell -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='PP1 web 5174'; `$env:VITE_API_BASE_URL='http://localhost:5174'; `$env:AUTH_API_URL='http://127.0.0.1:5100'; `$env:VITE_LEARNER_PROFILE_API_URL='http://localhost:5101'; `$env:DECISION_API_URL='http://127.0.0.1:5199'; `$env:VITE_BEHAVIOUR_API_URL='http://127.0.0.1:5198'; `$env:VITE_CONTENT_API_URL='http://127.0.0.1:5197'; Set-Location '$Root\apps\web'; npx vite --port 5174 --strictPort"

# ---- Wait for health (max ~60 s) --------------------------------------------------------------------------------
$checks = @{ 'auth' = 'http://127.0.0.1:5100/api/health/database'; 'learner-profile' = 'http://127.0.0.1:5101/api/health/database'; 'web' = 'http://localhost:5174/' }
$deadline = (Get-Date).AddSeconds(60)
foreach ($name in $checks.Keys) {
    $ok = $false
    while (-not $ok -and (Get-Date) -lt $deadline) {
        try { $ok = (Invoke-WebRequest -UseBasicParsing $checks[$name] -TimeoutSec 5).StatusCode -eq 200 } catch { Start-Sleep -Milliseconds 800 }
    }
    if (-not $ok) { throw "$name did not become healthy; check its window." }
    Write-Host "OK  $name"
}
Write-Host ''
Write-Host 'PP1 stack ready: open http://localhost:5174   (NOT :5173 - that is the normal shared-database stack)'
