# PP1 local demo: Grade 2 onboarding and initial learner profile

This is an **isolated** local stack. It uses synthetic records only and never connects to MongoDB Atlas.

| Part | Where | Notes |
|---|---|---|
| MongoDB 7.0 | Docker container `mathquest-pp1-mongo`, `127.0.0.1:27018` | Loopback only; database `mathquest_pp1_demo` |
| Auth service | `http://127.0.0.1:5100` | Unchanged code; local DB through process environment variables |
| Learner-profile service | `http://localhost:5101` | Unchanged code; local DB through process environment variables |
| Web app | **`http://localhost:5174`** | Auth goes through its own proxy. Pedagogical, behaviour and content services are pointed at unused "decoy" ports (5199/5198/5197). |

- **No configuration changes:** no `.env` file or committed configuration is changed. Process environment variables take
  precedence over `.env` files in both services and in Vite.
- **Normal stack untouched:** the normal development stack (5000–5002 and **5173**) is never stopped or reconfigured.
- **Use the right URL:** only open **:5174** for PP1. **:5173 is the normal stack on the shared database.**

## Start, check, stop
```powershell
# repository root; Docker Desktop must be running
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\start-pp1-local.ps1   # pre-flight, then waits until healthy
python scripts\pp1-local\verify_pp1_flow.py            # 36 end-to-end checks (add --record for a backup video)
python scripts\pp1-local\check_pp1_isolation.py         # manual-browsing pages only reach 5174/5101
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\stop-pp1-local.ps1    # stops 5100/5101/5174 + container (data kept)
powershell -ExecutionPolicy Bypass -File scripts\pp1-local\stop-pp1-local.ps1 -Reset   # also deletes the synthetic data
```

**What the start script refuses to do:**
- start without Docker (it never falls back to Atlas);
- start if 5100/5101/5174 are already in use;
- start if a decoy port has a listener;
- start if the container isn't bound to 127.0.0.1 only.

**What the stop script stops:** only the node/python processes on 5100/5101/5174, and the PP1 container.

Screenshots and the optional video go to `scripts/pp1-local/output/` (git-ignored).

## Before the presentation (about 15 minutes)
1. Start Docker Desktop, then run the start script.
2. Run `verify_pp1_flow.py --record` (36/36). This also warms up the services and produces the backup screenshots and
   video.
3. Sign up the presenter account: `demo.parent@example.test` / `Pp1Demo2026`.
4. Open `http://localhost:5174` in a fresh browser window, sign in, and zoom to 110–125 %.
5. Keep `scripts/pp1-local/output/` open in a second window as the backup.

## Timed demo script (10 minutes)
| Time | Show | Say |
|---|---|---|
| 0:00–1:00 | Architecture slide or this README | Isolated local stack with synthetic data; Learner Profile & Prediction Engine (Component 1) |
| 1:00–2:00 | Sign in → My children → add **Grade 2**, age 7 | Parent-only ownership; the child's data belongs to this parent |
| 2:00–3:00 | ADHD info (No) → SNAP-IV **skip** → preferences → social context | SNAP-IV is optional and descriptive only, never a diagnosis and never used to score maths |
| 3:00–3:30 | Handover → child choices (companion, world, sound) | Child-expressed preferences (CP) |
| 3:30–4:00 | Instruction check (move the red object) | Not scored; instruction following and interaction (IC, IA) |
| 4:00–5:00 | Build **34**: add 4 tens, take one back, add 4 ones | Concrete place value; taking a piece back is recorded as self-correction (SC) |
| 5:00–5:45 | Read **47** (tap 74, then change to 47); pick the picture for **52** | Same idea in pictorial and symbolic form (RU); the answer change is recorded |
| 5:45–7:00 | Blocks addition; **32 + 15**, answer 46 on purpose → guided support (pairing hint, then blocks) → **41 + 26** | Pre → guided support → new transfer (SR); guided answers never count as independent |
| 7:00–8:30 | Summary: "Of 6 questions done alone, 5 correct on the first try" + "1 guided activity not included"; two skill cards; recommendations | Both skills reach the 3-item evidence minimum; results are provisional, not a diagnosis |
| 8:30–9:30 | Parent dashboard → learner profiles / recommendations | Same results read from the database |
| 9:30–10:00 | Optional: the stored evidence (command below) | Server-scored; support events and transfer role kept for future IMPSA/IMLR |

**Optional evidence view:**
```powershell
docker exec mathquest-pp1-mongo mongosh mathquest_pp1_demo --quiet --eval "db.learner_assessments.find({}, {assessmentProtocolVersion:1, 'evaluatedItems.questionId':1, 'evaluatedItems.probeRole':1, 'evaluatedItems.includedInProficiencyEstimate':1}).sort({completedAt:-1}).limit(1).toArray()"
```

## Backup plan if the live demo fails
| Problem | Do this |
|---|---|
| A service window shows an error | Run the stop script, then the start script (about 30 s); continue from the parent dashboard (the data is kept). |
| Docker or MongoDB won't start | Don't switch to :5173 or Atlas. Play the rehearsal video `output/video/*.webm` and the screenshots `output/1_onboarding_summary.png`, `2_parent_learner_profiles.png` and `3_parent_recommendations.png`. |
| The child journey gets stuck mid-way | "Pause & Exit" returns to the children list; the child activities restart (nothing partial is saved). Or narrate over the video. |
| The laptop or display fails | Show the video or screenshots from a USB copy. As a last resort, the in-memory end-to-end test (`python -m pytest tests/test_grade2_pp1_flow.py -v` in `services/learner-profile-service`) proves the same flow without any database. |

## Known limitations to state if asked
- Items, distractors and Sinhala wording are drafts pending teacher review. Duration is roughly 6–9 minutes (not
  piloted).
- The addition skill reaches 3 independent items because the transfer item counts, as in Grade 1.
- The services' logs say "MongoDB Atlas"; that is hard-coded text. The database is the local container.
