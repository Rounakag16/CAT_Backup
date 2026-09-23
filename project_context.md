# Project Context — Smart Operator Assistant for CAT Machinery

Durable reference. This doesn't change per work session — `chat_state.md` does.
If you're picking this project up in a new chat, read this file fully before
looking at code.

## 1. What this is

A hackathon-originated project: a multi-functional operator interface for CAT
machine operators (excavators, loaders, etc.), covering five required outcomes:

1. Daily task dashboard
2. Safety features (seatbelt compliance, proximity hazards, incident logging)
3. Operator training hub
4. Unusual machine-usage detection (idling, unsafe patterns)
5. Task time estimation (ML-based prediction)

**This is now being built solo, without a time cap.** An earlier version of
this project was scoped for a 3-person, 14-hour hackathon build, and a
follow-up version was cut down to fit a solo 14-hour budget (training hub
reduced to a stub, ML folded into the main backend instead of a separate
service). **Both of those cuts are reversed.** This build restores the full
original scope: all five buckets fully implemented, three-tier architecture
with a genuinely separate ML microservice, full training skill tree. Time is
not a constraint — do not re-introduce shortcuts to save build hours unless
explicitly asked.

## 2. Core idea — "Rules-First, One Deliberate Model" (Direction F)

Everything except task-time estimation is fully rule-based, transparent, and
auditable. The one ML model exists specifically where rules can't do the job —
task duration depends on environment, operator history, and task type in ways
a fixed rule can't capture.

Pitch line: **"We didn't make AI decide safety. We made safety deterministic —
and used ML only where prediction is genuinely uncertain."**

Bucket → mechanism (all rule-based except the last):

| Bucket | Mechanism |
|---|---|
| Dashboard | Telemetry-verified checkoff — task auto-completes from engine-hours delta + telemetry coverage |
| Safety | Seatbelt compliance + static geofenced proximity zones, both gating task start via the task state machine |
| Unusual behavior | Idle-time detector — RPM high + GPS speed ~0, sustained past a duration threshold |
| Training hub | Full milestone-gated skill tree (5 modules), competency derived entirely from the shared log — no separate training DB |
| Task time estimation | Explainable regression, trained offline, served by a **separate** ML microservice, with feature attribution |

## 3. Architecture (full, three-tier)

```
[Synthetic Data Generator] → [Backend — Node, rules engine + task state machine]
                                          |  proxies /predict to  ↓
                                          |
                              [ML microservice — Python/Flask + scikit-learn]
                                          |
                                          v
                              [Frontend — React]
```

- **Backend** (`backend/`): owns the event log, task state machine, and every
  rule — dashboard checkoff, safety gating, idle detection, training
  competency. Zero external npm dependencies (Node built-in `http` only) —
  this was a deliberate choice (see §5), not a scope cut.
- **ML microservice** (`ml-service/`): genuinely separate process (Flask,
  port 5001). Trains a real scikit-learn `LinearRegression` offline from the
  synthetic dataset (`ml-service/train.py`), serves `/predict` with real
  feature attribution derived from the fitted coefficients. The backend
  proxies to it and returns a visible `503` if it's down — no silent
  fake-number fallback. Current trained model: R²≈0.92, MAE≈2.2 min on a
  held-out 20% split (exact numbers vary run to run since the synthetic
  dataset is randomly generated).
- **Frontend** (`frontend/`): React + Vite app consuming all backend
  endpoints — task dashboard, safety banner, training hub UI, prediction card
  with explanation, idle-event log, and a telemetry-simulator panel standing
  in for real in-cab hardware. Two runtime deps only (`react`, `react-dom`);
  no UI kit or chart library. Written but not yet `npm install`ed or run —
  see `chat_state.md`.

## 4. Shared schema & API contract

Full detail lives in `shared/schema.md` and `shared/api-contract.md` — read
those before touching backend or ML code, they're the contract every piece
codes against. Highlights:
- One event log schema (timestamp, machineId, operatorId, taskId, taskType,
  location, engineHours, fuelUsed, loadCycles, idlingTimeMin, seatbeltStatus,
  proximityStatus, safetyAlertTriggered, condition, taskStatus, rpm, gpsSpeed).
- Task state machine: `blocked → ready → in-progress → complete`.
- Static geofenced zones (Zone-A/B/C) with per-zone hazard radius and a
  simulated "nearby personnel" point — proximity hazard = machine position
  within radius of that point.
- Training skill tree: 5 modules, each gated on log-derived competency
  (tasks completed, grading-task count, unresolved safety alerts, average
  idle time, idle-flags in the last 5 tasks).

## 5. Decisions made and why (don't re-litigate without new information)

- **Backend has zero npm dependencies.** The build sandbox used to develop
  this has no network access, so `npm install express` fails. Rather than
  block on that, the backend is written against Node's built-in `http`
  module only. This is fully portable — it'll run identically once cloned
  into an environment with normal internet access. Swapping in Express later
  is optional, not required; the route logic is already isolated into named
  handler functions per rule module, so the swap is small if ever wanted.
- **ML microservice will use Flask, not FastAPI.** Same sandbox constraint:
  `scikit-learn`, `pandas`, `numpy`, and `Flask` are available; `fastapi` and
  `uvicorn` are not installable (no network). Flask + scikit-learn covers
  everything the plan needs (a `/predict` route, offline-trained regression,
  feature attribution) without functional loss.
- **Task starts move to `ready`, not directly to `in-progress`.** A task only
  moves to `in-progress` on its first real telemetry tick, keeping the state
  machine honest — "ready" means cleared to start, "in-progress" means the
  machine is actually reporting telemetry.
- **Idle detection uses a rolling window per machine, not single-sample
  flagging.** A single idling telemetry tick doesn't flag anything; the rule
  tracks how long a machine has been continuously idling and only flags past
  the duration threshold (5 min), matching "excessive idling," not "idling."
- **Model artifact is a plain JSON file (`model.json`), not a pickle.** Saving
  raw coefficients + a feature list + the operator-history lookup as JSON
  means the Flask app has zero scikit-learn-version coupling at serve time,
  and the weights are human-readable/debuggable directly. `train.py` is the
  only place scikit-learn itself is imported.
- **`operator_history` is each operator's mean historical duration, computed
  only from the training split.** This keeps it a real, non-leaky feature
  (not the label in disguise) and gives a principled fallback (global mean)
  for operators the model has never seen.
- **`model.json` is gitignored, like the synthetic datasets.** It's fully
  reproducible via `python train.py` (after `npm run generate-data` in
  `backend/`) — regenerate it rather than expecting it to already exist
  after a fresh clone.
- **Training competency has no separate database.** All five milestone rules
  are pure functions over `completedTaskHistory` / `idleEvents` /
  `safetyAlerts` already in the store — this was true in the original plan
  and is preserved.

## 6. Demo script (unchanged from the original plan, ~90 seconds)

1. **0–15s:** Operator starts a scheduled excavation task; dashboard and
   simulated telemetry come alive.
2. **15–30s:** Seatbelt unfastened → task stays blocked; fasten it → task
   becomes ready. Show a geofenced proximity hazard triggering a safety
   warning.
3. **30–45s:** RPM stays high while GPS speed is zero → system flags
   excessive idling, logs the event.
4. **45–65s:** Task starts; show predicted completion time, then reveal
   contributing factors (task type, operator history, condition).
5. **65–80s:** Change simulated conditions, re-run prediction — show the
   number change and explain why a fixed rule/average would miss this.
6. **80–90s:** Close on one operator view: task completed, safety events,
   idle events logged, next predicted completion. Close with the pitch line
   in §2.

## 7. Repo layout

```
/shared/schema.md          — event log schema, zones, training milestones
/shared/api-contract.md    — full API contract, all endpoints
/backend/src/server.js     — HTTP server, route wiring
/backend/src/store.js      — in-memory event log / task state
/backend/src/rules/        — one file per bucket's rule logic
/backend/src/mlClient.js   — proxy client to the ML microservice
/backend/data/generateData.js — synthetic dataset generator (run standalone)
/ml-service/train.py        — offline training (scikit-learn), writes model.json
/ml-service/app.py          — Flask server, POST /predict, GET /health
/ml-service/model.json      — trained artifact (gitignored, regenerate with train.py)
/frontend/src/api.js        — fetch wrapper for every backend endpoint
/frontend/src/App.jsx       — layout: safety banner, dashboard, prediction,
                               telemetry sim, idle log, training hub
/frontend/src/components/   — one component per bucket (see frontend/README.md)
```
