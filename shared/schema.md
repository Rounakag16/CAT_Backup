# Shared Event Log Schema

One log every module reads from and writes to. This is the contract between the
data generator, the backend rules engine, the ML service, and the frontend — it
does not change without updating this file first.

| Field | Type | Notes |
|---|---|---|
| timestamp | ISO 8601 string | Event time |
| machineId | string | e.g. `EXC001` |
| operatorId | string | e.g. `OP1001` |
| taskId | string | e.g. `T-101` |
| taskType | enum | `excavation` \| `grading` \| `loading` \| `trenching` |
| location | string | Zone id, e.g. `Zone-B` |
| engineHours | number | Cumulative engine hours at event time |
| fuelUsed | number | Liters, cumulative for the task |
| loadCycles | number | Count |
| idlingTimeMin | number | Minutes idle since task start |
| seatbeltStatus | enum | `fastened` \| `unfastened` |
| proximityStatus | enum | `clear` \| `hazard` |
| safetyAlertTriggered | boolean | |
| condition | enum | `dry` \| `wet` \| `muddy` \| `dusty` |
| taskStatus | enum | `blocked` \| `ready` \| `in-progress` \| `complete` |
| rpm | number | Engine RPM — feeds idle-detection rule |
| gpsSpeed | number | km/h — feeds idle-detection rule (RPM high + speed ~0 = idling) |

## Geofenced zones (safety feature)

Static zones, each with a hazard polygon and a machine-position check. No live
GPS hardware — positions are simulated coordinates written into the log.

```json
{
  "zones": [
    { "id": "Zone-A", "hazardRadius": 0, "label": "Low-risk staging area" },
    { "id": "Zone-B", "hazardRadius": 15, "label": "Active excavation, personnel nearby" },
    { "id": "Zone-C", "hazardRadius": 25, "label": "Shared corridor with other machines" }
  ]
}
```

A proximity hazard is simulated as a machine position falling inside a zone's
`hazardRadius` of a (simulated) nearby-personnel point. See
`backend/src/rules/safety.js`.

## Training milestones (full skill tree, not a stub)

| Module | Unlock condition |
|---|---|
| `basic-safety` | Always unlocked |
| `trench-fundamentals` | 5 tasks completed, 0 unresolved safety alerts |
| `advanced-grading` | `trench-fundamentals` unlocked + 3 grading tasks completed |
| `heavy-load-handling` | 10 tasks completed + average idle time under 8 min/task |
| `zone-c-certification` | `advanced-grading` unlocked + 0 idle-flags in last 5 tasks |

Competency is derived entirely from the shared log — no separate "training
database" to keep in sync.
