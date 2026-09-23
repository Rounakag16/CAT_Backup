# Frontend

React + Vite. Consumes every endpoint in `shared/api-contract.md`. No UI kit,
no chart library — bars and the skill tree are plain CSS/SVG-free divs, in
keeping with the rest of the project's minimal-dependency spirit.

This wasn't built or `npm install`ed in the sandbox (no network access there —
see `chat_state.md`). It's untested against a live backend; run it locally.

## Setup

```
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies API calls to :4000
```

Run the other two tiers alongside it, each in its own terminal:

```
cd ml-service && python app.py     # :5001
cd backend && npm start            # :4000
```

## Layout

- `src/api.js` — fetch wrapper for every backend endpoint.
- `src/components/SafetyBanner.jsx` — polls `/safety/status`; turns red on a
  seatbelt or proximity hazard.
- `src/components/TaskDashboard.jsx` + `StartTaskModal.jsx` — today's tasks,
  status badges, the seatbelt/position form that hits `POST /tasks/:id/start`.
- `src/components/TelemetrySimulator.jsx` — there's no in-cab hardware, so
  this panel is the stand-in: it posts telemetry ticks for the selected task,
  which is what actually drives idle detection and the dashboard checkoff.
  "Preset: idling" (high RPM, 0 speed) sent repeatedly for 5+ minutes of
  simulated time is what trips an idle flag.
- `src/components/IdleEventLog.jsx` — polls `/events/idle`.
- `src/components/PredictionCard.jsx` — `POST /predict`, renders the
  predicted duration, confidence interval, and feature-attribution bars.
- `src/components/TrainingHub.jsx` — the 5-module skill tree from
  `shared/schema.md`, plus the progress strip (`GET /training/progress`).

## Notes

- Operator/machine are fixed to `OP1001` / `EXC001` (`src/App.jsx`), matching
  the seed data in `backend/src/store.js` and the demo script in
  `project_context.md` §6 — there's no login flow, by design, for a single-
  operator demo.
- `VITE_API_URL` (see `.env.example`) overrides the API base for a production
  build served from a different origin than the backend. In dev, Vite's proxy
  (`vite.config.js`) handles it, so no `.env` file is needed locally.
