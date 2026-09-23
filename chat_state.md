# Chat State — resume point

Last updated: Step 3 (frontend).

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

## Done (step 3, continued)
- [x] **`frontend/` — React + Vite app, written, not yet run:**
  - `TaskDashboard.jsx` + `StartTaskModal.jsx` — task list with status
    badges, seatbelt/position form hitting `POST /tasks/:id/start`.
  - `SafetyBanner.jsx` — polls `/safety/status` every 3s, turns red on a
    seatbelt or proximity hazard.
  - `TelemetrySimulator.jsx` — stands in for absent in-cab hardware; posts
    ticks to `/events/telemetry` to actually drive idle detection and the
    dashboard checkoff (idling/working presets included).
  - `IdleEventLog.jsx` — polls `/events/idle`.
  - `TrainingHub.jsx` — the 5-module skill tree (main chain
    basic-safety → trench-fundamentals → advanced-grading →
    zone-c-certification, plus the parallel heavy-load-handling branch),
    with the progress strip from `/training/progress`.
  - `PredictionCard.jsx` — `POST /predict`, predicted duration + confidence
    interval + feature-attribution bars (real coefficients, not hand-set).
  - No UI kit, no chart library — bars and the skill tree are plain CSS,
    matching the project's minimal-dependency spirit. Two deps only:
    `react` + `react-dom`, `vite` + `@vitejs/plugin-react` as dev deps.
  - Dark, high-contrast industrial theme (CAT-yellow accent, Barlow
    Condensed headings) — legible-at-a-glance is the design brief for an
    in-cab or companion display, not a marketing look.
  - JSX syntax-checked with `tsc --noEmit` (module resolution errors
    ignored, since deps aren't installed) — no syntax errors. **Not run**:
    same no-network sandbox constraint as before, `npm install` couldn't
    happen here. See `frontend/README.md` for how to run it locally.

## Not started yet
- [ ] `npm install` + `npm run dev` locally, then a real click-through —
  nothing in `frontend/` has touched a live backend yet.
- [ ] End-to-end integration test once all three tiers run together and
  have actually been exercised against each other with the frontend in the
  loop (backend + ml-service were confirmed working together via curl in
  step 2; the frontend is untested).
- [ ] Demo rehearsal

## How to run what exists so far
```
# 1. Generate the dataset (once, or whenever you want fresh synthetic data)
cd backend && npm run generate-data

# 2. Train the model
cd ../ml-service && pip install -r requirements.txt && python train.py

# 3. Run all three tiers (separate terminals)
cd ml-service && python app.py     # :5001
cd backend && npm start            # :4000, proxies /predict to :5001
cd frontend && npm install && npm run dev   # :5173, proxies API calls to :4000
```

## Open questions (from the original plan, still unresolved)
- Real-time in-cab vs. pre/post-shift companion app — current build assumes
  real-time in-cab, not confirmed with mentors. The frontend's telemetry
  simulator panel works either way (it's a manual stand-in regardless), but
  which framing to pitch is still open.
- Whether to match the organizer's example dataset image stylistically, or
  the schema in `shared/schema.md` is sufficient as-is.

## How diffs are being delivered
Per your request: each step is a `git diff` (unified patch) against the
previous step's state, not a cumulative diff from empty repo. Apply each
patch in order with `git apply <file>.patch` (or `git apply --3way` if you've
made local edits). This file and `project_context.md` are updated and
included in every step's diff.
