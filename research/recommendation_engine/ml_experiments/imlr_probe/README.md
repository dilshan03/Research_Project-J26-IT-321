# IMLR probe: isolated research prototype (`imlr_probe/`)

> **Status: RESEARCH_PROTOTYPE_NOT_FOR_USE_WITH_CHILDREN.**
> - Not connected to MathQuest.
> - Items, numbers and formats are proposals pending educator review.
> - All interaction data are synthetic scripted fixtures.
> - No model is trained.

This prototype implements the approved decisions on `IMLR_PROBE_REDESIGN.md` as standalone, standard-library Python.
The sequence is: pre-probe → universal teaching → boundary → frozen prediction-time snapshot → transfer outcomes.

## Run (from `ml_experiments/`)
```
.venv\Scripts\python.exe -m imlr_probe.demo                                   # seed 7, all_independent
.venv\Scripts\python.exe -m imlr_probe.demo --seed 11 --scenario missing_assistance_record
.venv\Scripts\python.exe -m imlr_probe.demo --list                            # all scenarios
.venv\Scripts\python.exe -m unittest tests.test_imlr_probe -v                 # 47 tests
```
Any Python 3.10+ works. The `.venv` is used so that ELP-X intervals use SciPy, as in production.

## Modules
| File | Purpose |
|---|---|
| `protocol.py` | Versioned protocol (`IMLR-PROBE-G1` `0.1.0-prototype`): phases (2 pre, 2 teaching for every learner, 3 transfer), three-choice format and chance level, help policy, visual variables, non-claims, approvals required |
| `item_bank.py` | Synthetic Grade 1 bank for the "which group has the most" concept. Pre and transfer items share one cell (largest set 7–9, gap 2, same mean); teaching uses smaller numbers and different objects. `validate_bank()` enforces this. |
| `forms.py` | Deterministic form assignment from a recorded seed (formId = content hash). Balanced correct positions: transfer uses each position once and never copies the teaching position. Arrangement (pattern, spacing, extent mode) is drawn independently of the answer. Previously seen items are excluded. `client_view()` strips the answer key. |
| `events.py` | Event types, the teaching (support) window, and per-item assistance status: `NONE_CONFIRMED` / `ASSISTED` / `UNKNOWN` / `NOT_APPLICABLE`. Missing or incomplete records are always `UNKNOWN`. Correctness comes from the answer key only. |
| `snapshot.py` | Prediction-time snapshot at `BOUNDARY_SHOWN`: allowlisted features from earlier events only, a SHA-256 freeze, and leakage guards. Optional ELP-X features are recomputed with the **unmodified** production engine (loaded read-only) from independent pre-probe items only. |
| `outcome.py` | Transfer outcomes (`INDEPENDENT_CORRECT`, `INDEPENDENT_INCORRECT`, `HELPED`, `ASSISTANCE_UNKNOWN`, `UNANSWERED`), a descriptive `k of n` summary beside the chance level, and `build_research_record()`, which keeps inputs and label separate and refuses tampering. |
| `fixtures.py` | Eight synthetic scripted scenarios: independent; pre-correct-still-taught; help before / after the first response; missing or incomplete records; unanswered; break; teaching window not closed. |
| `demo.py` | CLI walkthrough of the whole sequence. |

## Evidence rules in brief
- **Teaching window:** from `TEACHING_WINDOW_STARTED` to `TEACHING_WINDOW_ENDED`. Teaching responses are always
  `ASSISTED` and are never transfer evidence.
- **Prediction time:** `BOUNDARY_SHOWN`. If any transfer event occurs before it, the snapshot is refused.
- **`NONE_CONFIRMED` requires all of:**
  - the item recorder reported `assistanceRecording: "complete"`;
  - no support started at or before the first confirmed response;
  - for transfer items, the teaching window closed before the item was presented.
- **Breaks** are recorded and flagged, but are never support.
- **Help after the first response** does not change the first response's status; it is flagged.

## Not claimed
- This is not a validated educational or clinical instrument.
- A correct transfer response does not prove permanent learning, and the teaching is not claimed to cause improvement.
- Three transfer questions are not a validated learning-readiness measure, and no thresholds are applied.
- No ADHD diagnosis, presentation or symptom change is inferred; ADHD reports and SNAP-IV are never used.

## Approvals still required before any use with children or integration
- [ ] **Primary mathematics educators:**
  - concept and Grade 1 suitability;
  - number range and item-model cell (largest 7–9, gap 2);
  - the 13 synthetic items;
  - three-choice format (and whether to add a constructed "build more" format);
  - visual variables (pattern / spacing / equal-extent vs equal-spacing);
  - Sinhala wording and teaching scripts;
  - session length;
  - pool size for unseen re-assessment.
- [ ] **Clinical supervisor:**
  - universal teaching phase;
  - neutral feedback during pre and transfer;
  - break and help-on-request policy;
  - descriptive reporting wording and audience;
  - data minimisation of the event fields.
- [ ] **Ethics approval and consent** covering the recorded fields and research use.
- [ ] **Component 1 sign-off** for a separate, feature-flagged protocol in the onboarding journey. That would be a new
  protocol version; existing ELP-X, IMPSA/IMLR and onboarding-v2 behaviour stay unchanged.
- [ ] **A pilot plan** (timing, item difficulty, position effects) before any data are used for modelling.
