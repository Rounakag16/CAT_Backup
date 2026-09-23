# Chat State — resume point

Last updated: Step 2 (ML microservice).

## Done
- [x] Repo scaffolded: `shared/`, `backend/`, `.gitignore`, `README.md`,
  `project_context.md`, `chat_state.md`.
- [x] `shared/schema.md` and `shared/api-contract.md` written — full scope,
  no cuts (all 5 buckets, static geofenced zones, full training skill tree).
- [x] Backend fully implemented (`backend/src/`), zero npm dependencies:
  dashboard checkoff, safety gating, idle detection, full 5-module training
  skill tree, ML-proxy client. Smoke-tested and working.
- [x] `backend/data/generateData.js` — synthetic dataset generator.
- [x] **`ml-service/` — genuinely separate Flask microservice, done:**
  - `train.py` — trains a real scikit-learn `LinearRegression` on the
    synthetic dataset (one-hot task_type/condition/location + a
    non-leaky per-operator `operator_history` feature computed only from
    the training split), writes `model.json` (plain JSON, not a pickle —
    no sklearn-version coupling at serve time).
  - `app.py` — Flask server, `POST /predict` matching the contract exactly,
    `GET /health`. Fails loudly at boot if `model.json` is missing rather
    than serving fake numbers.
  - **Trained and tested end-to-end**: R²≈0.92, MAE≈2.2 min on held-out
    data. Confirmed the demo narrative works — same operator/task, wet vs.
    dry condition, predicted duration moved 36 min → 27 min.
  - **Confirmed the full three-tier flow**: backend `/predict` → proxies to
    ML service on :5001 → real prediction returned through the backend,
    unchanged contract shape.

## Not started yet
- [ ] **`frontend/`** — React app. Needs:
  - Task dashboard (list, status badges, seatbelt/position inputs to hit
    `/tasks/:id/start`)
  - Safety status banner (polls `/safety/status`)
  - Idle-event log view
  - Training hub UI showing the 5-module skill tree, locked/unlocked with
    requirement text
  - Prediction card with feature-attribution bar chart (this now has real
    data behind it — `featureAttribution` from `ml-service/app.py` is
    genuine, not hand-set)
  - Needs `npm install` for React/Vite tooling — **the build sandbox has no
    network access, so this can't be `npm install`ed or run here.** Write
    the code and `package.json` correctly; `npm install` and run it locally.
- [ ] End-to-end integration test once all three tiers exist together
  (backend + ml-service are confirmed working together now — frontend is
  the remaining piece)
- [ ] Demo rehearsal

## How to run what exists so far
```
# 1. Generate the dataset (once, or whenever you want fresh synthetic data)
cd backend && npm run generate-data

# 2. Train the model
cd ../ml-service && pip install -r requirements.txt && python train.py

# 3. Run both services (separate terminals)
cd ml-service && python app.py     # :5001
cd backend && npm start            # :4000, proxies /predict to :5001
```

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
