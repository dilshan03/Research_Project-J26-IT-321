# PP1 local demo: Grade 2 onboarding and initial learner profile

An **isolated** local stack for the PP1 demonstration. It uses only synthetic records and never connects to
MongoDB Atlas.

| Part | Where | Notes |
|---|---|---|
| MongoDB 7.0 | Docker container `mathquest-pp1-mongo`, `127.0.0.1:27018` | Loopback only (not exposed to the network); database `mathquest_pp1_demo` |
| Auth service | `http://127.0.0.1:5100` | Unchanged code; local DB through process environment variables |
| Learner-profile service | `http://localhost:5101` | Unchanged code; local DB through process environment variables |
| Web app | `http://localhost:5174` | Auth through its own proxy. Pedagogical, behaviour and content services are pointed at unused ports, so the demo never touches teammates' running services. |

No `.env` file or committed configuration is changed: the settings are process environment variables, which take
precedence over `.env` files in both services and in Vite. The normal stack (ports 5000–5002, 5173) keeps running
untouched.

## Start
```powershell
# from the repository root (Docker Desktop must be running)
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\start-pp1-local.ps1
```
This opens three windows (auth, learner-profile, web). Then open **http://localhost:5174**.

## Demo script (about 10 minutes)
1. **Sign up** a parent with a synthetic e-mail (for example `demo.parent@example.test`), then **sign in**.
2. **My children → add child:** Grade 2, age 7.
3. **Start onboarding:** ADHD information → SNAP-IV (skip or complete; descriptive only) → learning preferences →
   social context → hand the device to the child.
4. **Child journey (Grade 2):**
   - choices: companion, world, sound;
   - instruction check;
   - build 34 with tens sticks and ones cubes (taking a piece back shows self-correction);
   - read 47 from blocks;
   - pick the picture for 52;
   - blocks addition;
   - pre-probe 32 + 15; answering it wrongly shows the guided support;
   - transfer 41 + 26.
5. **Finish:** the onboarding summary shows both skills (place value, addition) with their evidence counts and
   ELP-X-REC recommendations.
6. **Parent dashboard → learner profiles / recommendations:** the same results, read from the local database.

## Automated verification (36 checks)
```powershell
python scripts\pp1-local\verify_pp1_flow.py
```
It drives the real UI and APIs. It creates synthetic parent and teacher accounts and checks:
- authentication;
- child creation and onboarding;
- the Grade 2 journey and submission;
- persistence in `mathquest_pp1_demo`;
- that both skills reach 3 independent items with sufficient evidence;
- that the stored protocol, support events and transfer role are recorded, with evidence for all seven dimensions
  and no dimension scores;
- parent ownership (another parent, a teacher and an unauthenticated user are refused);
- that the browser never reached a non-isolated service.

Screenshots are written to `scripts/pp1-local/output/`.

## Stop / reset
```powershell
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\stop-pp1-local.ps1          # keep data
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\stop-pp1-local.ps1 -Reset   # delete synthetic data
```
Close the three service windows.

## Notes
- **Log messages:** the services' logs and health endpoints say "MongoDB Atlas". That is hard-coded text. The actual
  connection is to the local container; you can confirm this inside it with
  `docker exec mathquest-pp1-mongo mongosh --quiet --eval "db.getMongo().getDBNames()"`.
- **Draft content:** Grade 2 items and Sinhala wording are drafts pending teacher review. The journey takes roughly
  6–9 minutes (not piloted).
