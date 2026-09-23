# Chat State — resume point

Last updated: Step 1 (initial backend scaffold).

## Done
- [x] Repo scaffolded: `shared/`, `backend/`, `.gitignore`, `README.md`,
  `project_context.md`, `chat_state.md`.
- [x] `shared/schema.md` and `shared/api-contract.md` written — full scope,
  no cuts (all 5 buckets, static geofenced zones, full training skill tree).
- [x] Backend fully implemented (`backend/src/`), zero npm dependencies
  (Node built-ins only — no network access in the build sandbox, see
  `project_context.md` §5 for why):
  - `store.js` — in-memory event log, tasks, zones, hazard points
  - `rules/dashboard.js` — telemetry-verified checkoff
  - `rules/safety.js` — seatbelt + geofenced proximity gating
  - `rules/idleDetection.js` — rolling-window idle detector
  - `rules/trainingHub.js` — full 5-module milestone skill tree
  - `mlClient.js` — proxy to ML microservice, returns 503 if it's down (no
    silent fallback)
  - `server.js` — wires all of the above into the full API contract
- [x] `backend/data/generateData.js` — synthetic dataset generator, produces
  CSV + JSON (gitignored — regenerate with `npm run generate-data`)
- [x] Smoke-tested the full flow: task blocking on seatbelt, proximity-hazard
  blocking, telemetry ingestion → idle detection + dashboard checkoff →
  training competency updating. All confirmed working.

## Not started yet
- [ ] **`ml-service/`** — Flask + scikit-learn microservice. Needs:
  - Offline training script using `backend/data/generateData.js`'s output
    (the `durationMin` column is the label)
  - Real feature attribution (coefficients from a linear model, or
    permutation importance if a tree-based model is used instead)
  - `POST /predict` route matching the contract in `shared/api-contract.md`
  - Decide: linear regression (simplest, attribution is just coefficients)
    vs. gradient boosting (better fit, attribution needs SHAP or permutation
    importance — heavier but still doable with scikit-learn alone)
- [ ] **`frontend/`** — React app. Needs:
  - Task dashboard (list, status badges, seatbelt/position inputs to hit
    `/tasks/:id/start`)
  - Safety status banner (polls `/safety/status`)
  - Idle-event log view
  - Training hub UI showing the 5-module skill tree, locked/unlocked with
    requirement text
  - Prediction card with feature-attribution bar chart
  - Needs `npm install` for React/Vite tooling — **the build sandbox has no
    network access, so this can't be `npm install`ed or run here.** Write the
    code and `package.json` correctly; you'll `npm install` and run it
    locally where you do have network.
- [ ] End-to-end integration test once all three tiers exist together
- [ ] Demo rehearsal

## Open questions (from the original plan, still unresolved)
- Real-time in-cab vs. pre/post-shift companion app — current build assumes
  real-time in-cab, not confirmed with mentors.
- Whether to match the organizer's example dataset image stylistically, or
  the schema in `shared/schema.md` is sufficient as-is.

## How diffs are being delivered
Per your request: each step is a `git diff` (unified patch) against the
previous step's state, not a cumulative diff from empty repo. Apply each
patch in order with `git apply <file>.patch` (or `git apply --3way` if you've
made local edits). This file and `project_context.md` are updated and
included in every step's diff.
