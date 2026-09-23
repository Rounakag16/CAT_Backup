# API Contract

Backend base URL: `http://localhost:4000`
ML service base URL: `http://localhost:5001` (backend proxies `/predict` to it)

## `GET /tasks?operatorId={id}`
Returns today's scheduled tasks for the operator.

## `POST /tasks/{taskId}/start`
Request: `{ "operatorId": "OP1001", "seatbeltStatus": "fastened", "position": { "x": 10, "y": 4 } }`
Response (success): `{ "taskId": "T-101", "status": "ready", "startedAt": "..." }`
Response (blocked): `{ "taskId": "T-101", "status": "blocked", "reason": "seatbelt_not_fastened" | "proximity_hazard" }`

## `GET /safety/status?machineId={id}`
`{ "machineId": "EXC001", "zone": "Zone-B", "seatbeltStatus": "fastened", "proximityAlert": false, "activeAlerts": [] }`

## `POST /events/telemetry`
Backend ingests a raw telemetry tick (rpm, gpsSpeed, engineHours, fuelUsed, loadCycles,
position). This drives the dashboard checkoff rule and feeds the idle-detection rule.
Request: `{ "machineId": "EXC001", "taskId": "T-101", "rpm": 1450, "gpsSpeed": 0, "engineHours": 812.4, "fuelUsed": 3.2, "loadCycles": 12 }`
Response: `{ "accepted": true, "idleFlagged": false }`

## `GET /events/idle?machineId={id}`
Returns idle events for a machine (or all, if omitted).

## `GET /training/progress?operatorId={id}`
Full milestone state, derived from the log (see `shared/schema.md`).
`{ "operatorId": "OP1001", "unlockedModules": [...], "lockedModules": [...], "progress": { "tasksCompleted": 3, "avgIdleMin": 6.2, "safetyAlertsUnresolved": 0 } }`

## `POST /predict`
Backend proxies this to the ML microservice's `/predict` and returns its response
unchanged. If the ML service is unreachable, backend returns `503` with
`{ "error": "ml_service_unavailable" }` — no silent fallback to a fake number,
so the failure is visible during dev/demo rather than hidden.

Request/response shape unchanged from the original plan:
```json
// Request
{ "taskType": "excavation", "operatorId": "OP1001", "condition": "wet", "location": "Zone-B" }
// Response
{
  "predictedDurationMin": 32,
  "confidenceIntervalMin": [28, 37],
  "featureAttribution": [
    { "feature": "task_type", "contribution": 0.35 },
    { "feature": "condition_wet", "contribution": 0.30 },
    { "feature": "operator_history", "contribution": 0.20 },
    { "feature": "location", "contribution": 0.15 }
  ]
}
```
