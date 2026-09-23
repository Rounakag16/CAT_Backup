# Smart Operator Assistant for CAT Machinery

Full-scope build (no scope cuts — see `project_context.md` for why that
matters and what the earlier time-boxed version looked like).

Start here:
- **`project_context.md`** — the durable spec: problem statement, architecture,
  schema, decisions made and why. Read this first in any new session.
- **`chat_state.md`** — where the build actually is right now: what's done,
  what's next, open questions. Read this second.

## Run what exists so far
```
cd backend && npm start                     # :4000, zero dependencies
cd ml-service && python app.py              # :5001
cd frontend && npm install && npm run dev   # :5173
```
All three tiers are written. `frontend/` hasn't been `npm install`ed or run
yet (no network access in the build sandbox) — see `chat_state.md` and
`frontend/README.md`.
