# Research & Model Analytics: snapshots and access

The admin dashboard section **Research & Model Analytics** (`/admin/research`) shows research outputs from
sanitized, versioned snapshot files and aggregate live counts. It never loads a model, never runs a prediction and
never returns individual learner records.

## 1. Provision access for an authorised administrator

Access requires **both** `role: "admin"` **and** `researchAnalyticsAccess: true` (boolean) on the user document in
the `users` collection. The ordinary admin dashboard (`/admin`) does not need the flag. Nothing grants it
automatically, and the application has no endpoint that can set it.

Run these only with approval from the project lead, as the database owner, in `mongosh` connected to the
MathQuest database:

```js
// 1. Look first: confirm exactly one existing admin account matches
db.users.find({ email: "authorised.admin@example.com", role: "admin" }, { email: 1, role: 1, researchAnalyticsAccess: 1 })

// 2. Grant (only touches that admin's document)
db.users.updateOne(
  { email: "authorised.admin@example.com", role: "admin" },
  { $set: { researchAnalyticsAccess: true } }
)   // expect matchedCount: 1, modifiedCount: 1

// Revoke
db.users.updateOne({ email: "authorised.admin@example.com" }, { $unset: { researchAnalyticsAccess: "" } })
```

The change applies on the next request; no sign-out is needed. Only boolean `true` grants access (the string
`"true"` does not). Record who was granted access and why, outside the database.

## 2. Generate the Learner Profile snapshot

Run from `research/recommendation_engine/`, using the NSCH experiment environment:

```
ml_experiments\.venv\Scripts\python.exe -m research_export.export_snapshot
```

This writes `services/learner-profile-service/app/research_snapshots/learner-profile.json`.

**What it does:**
- reads the saved NSCH metadata, validation metrics and the single saved 2025 evaluation (2025 is not reopened);
- loads the frozen model only after its SHA-256 matches;
- computes SHAP for the hypothetical example, plus aggregate importance on the 2023–2024 validation partition;
- runs the MQ-REC scenarios and the ELP-X simulations;
- runs both test suites (`--skip-tests` to omit them);
- records every source file's hash and refuses to write a snapshot that contains identifiers, absolute paths or
  references to raw or binary files.

**When to run it:** again after any source changes. The dashboard shows *stale* when the recorded hashes no longer
match (when the repository is available to the service).

## 3. Register outputs for another research component

Owners of Behaviour Signal Analysis, Content Adaptation and the Pedagogical Engine can add
`<componentId>.json` (`behaviour-signal`, `content-adaptation`, `pedagogical-engine`) to
`services/learner-profile-service/app/research_snapshots/`, following the `MQ-RESEARCH-SNAPSHOT-v1` envelope in
`services/learner-profile-service/app/schemas/research_snapshot.py`.

The envelope holds:
- `models`, each with a status and provenance;
- `sources`, with repository-relative paths and SHA-256 hashes;
- `sections`, with optional `softwareTests`.

Until a file exists, the page shows an empty state. Files that fail validation or the sensitive-content scan are not
served.
