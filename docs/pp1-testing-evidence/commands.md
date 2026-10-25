# Commands used (PowerShell, from the repository root)

Tool versions:
- Python 3.13 for the backend. The research ML venv is `research/recommendation_engine/ml_experiments/.venv` (scikit-learn 1.9.1, shap 0.54.1).
- Node 22.

None of these commands installs packages.

## 1. Backend without a database (DB tests skip)
```powershell
cd services\learner-profile-service
$env:PYTHONDONTWRITEBYTECODE = '1'
python -m pytest -p no:cacheprovider -q -rs --junitxml=..\..\docs\pp1-testing-evidence\results\backend-no-db.junit.xml
```

## 2. Backend with the local test database
This uses the local container only. The safety guard forces DB `mathquest_test` and refuses remote URIs.
```powershell
docker start mathquest-pp1-mongo            # 127.0.0.1:27018
cd services\learner-profile-service
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:MATHQUEST_TEST_MONGODB_URI = 'mongodb://127.0.0.1:27018'
python -m pytest -p no:cacheprovider -q -rs --junitxml=..\..\docs\pp1-testing-evidence\results\backend-with-local-db.junit.xml
Remove-Item Env:MATHQUEST_TEST_MONGODB_URI
```

## 3. Frontend unit tests with coverage (Node's built-in runner)
```powershell
cd apps\web
node --experimental-strip-types --import ./tests/ts-resolve.mjs --test --experimental-test-coverage `
  --test-reporter=spec  --test-reporter-destination=stdout `
  --test-reporter=junit --test-reporter-destination=..\..\docs\pp1-testing-evidence\results\frontend-unit.junit.xml `
  --test-reporter=lcov  --test-reporter-destination=..\..\docs\pp1-testing-evidence\results\frontend-unit.lcov.info `
  tests/admin-research/access.test.ts tests/admin-research/imlrModel.test.ts `
  tests/navigation/i18n.test.ts tests/navigation/navConfig.test.ts `
  tests/onboarding/interactionObservations.test.ts tests/onboarding/legacyAnswers.test.ts `
  tests/onboarding/mathResultCounts.test.ts tests/onboarding/snapIvProgress.test.ts
```

## 4. Frontend type check and build
```powershell
cd apps\web
npx tsc -b
npx vite build
```

## 5. Research suites
```powershell
cd research\recommendation_engine
python -m unittest discover -s test_scenarios -t . -v           # MQ-REC (44)

cd ml_experiments
.\.venv\Scripts\python.exe -m unittest tests.test_nsch_baseline -v   # NSCH baseline (21)
.\.venv\Scripts\python.exe -m unittest tests.test_imlr_probe -v      # IMLR probe (47)
```

## 6. Read-only ML metric and SHAP verification
This loads the frozen model, checks its hash and recomputes the metrics and SHAP values. It does not refit anything and writes nothing to the repo.
```powershell
$env:PYTHONDONTWRITEBYTECODE = '1'
research\recommendation_engine\ml_experiments\.venv\Scripts\python.exe docs\pp1-testing-evidence\scripts\verify_ml_readonly.py (Get-Location).Path
```

## 7. PP1 end-to-end (isolated local stack)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\start-pp1-local.ps1
python scripts\pp1-local\verify_pp1_flow.py      # see the note below
python scripts\pp1-local\check_pp1_isolation.py
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\stop-pp1-local.ps1   # data kept; add -Reset to delete synthetic data
```

**Note:** on this commit the repository version of `verify_pp1_flow.py` stops at a stale "Sign In" locator, because the UI now defaults to Sinhala. The recorded 36/36 run used a temporary copy with the two locator changes in `scripts/verify_pp1_flow_locator_changes.diff`. Applying that diff to the repository script is a test-maintenance change for the author to decide on.

Run the start script and the verification in the **same** terminal session. When the start script was launched from a short-lived shell, its service windows closed with that shell.
