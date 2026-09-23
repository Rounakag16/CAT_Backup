import { api } from "../api.js";
import { usePolling } from "../hooks/usePolling.js";

const MODULE_NAMES = {
  "basic-safety": "Basic safety",
  "trench-fundamentals": "Trench fundamentals",
  "advanced-grading": "Advanced grading",
  "heavy-load-handling": "Heavy-load handling",
  "zone-c-certification": "Zone-C certification",
};

const REQUIREMENTS = {
  "basic-safety": "Always available",
  "trench-fundamentals": "5 tasks completed, 0 unresolved safety alerts",
  "advanced-grading": "Trench fundamentals unlocked + 3 grading tasks completed",
  "heavy-load-handling": "10 tasks completed + average idle time under 8 min/task",
  "zone-c-certification": "Advanced grading unlocked + 0 idle flags in last 5 tasks",
};

// Row order mirrors the dependency structure in shared/schema.md: a main
// chain (basic-safety -> trench-fundamentals -> advanced-grading ->
// zone-c-certification) and a parallel branch (heavy-load-handling) that
// only depends on raw task/idle counts, not on the chain above it.
const MAIN_CHAIN = ["basic-safety", "trench-fundamentals", "advanced-grading", "zone-c-certification"];
const BRANCH = ["heavy-load-handling"];

function Node({ id, unlocked }) {
  return (
    <div className={`skill-node${unlocked ? " unlocked" : ""}`}>
      <div className="name">
        <span className="dot" />
        {MODULE_NAMES[id]}
      </div>
      <div className="req">{REQUIREMENTS[id]}</div>
    </div>
  );
}

function Branch({ ids, unlockedSet }) {
  return (
    <div className="skill-branch-row">
      {ids.map((id, i) => (
        <div className="skill-node-wrap" key={id}>
          {i > 0 && <div className={`skill-connector${unlockedSet.has(ids[i - 1]) ? " active" : ""}`} />}
          <Node id={id} unlocked={unlockedSet.has(id)} />
        </div>
      ))}
    </div>
  );
}

export default function TrainingHub({ operatorId }) {
  const { data, error } = usePolling(
    () => api.getTrainingProgress(operatorId),
    [operatorId],
    8000
  );

  const unlockedSet = new Set(data?.unlockedModules || ["basic-safety"]);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Training hub</h2>
        <span className="sub">{operatorId}</span>
      </div>

      {error && <div className="empty-state">Couldn't load training progress.</div>}

      <div className="panel-body">
        <div className="skill-tree">
          <Branch ids={MAIN_CHAIN} unlockedSet={unlockedSet} />
          <div style={{ height: 10 }} />
          <div className="skill-branch-row" style={{ paddingLeft: 168 + 26 }}>
            <div className="skill-node-wrap">
              <div className={`skill-connector${unlockedSet.has("basic-safety") ? " active" : ""}`} />
              <Node id={BRANCH[0]} unlocked={unlockedSet.has(BRANCH[0])} />
            </div>
          </div>
        </div>
      </div>

      {data && (
        <div className="progress-strip">
          <div className="stat">
            <div className="value">{data.progress.tasksCompleted}</div>
            <div className="label">Tasks completed</div>
          </div>
          <div className="stat">
            <div className="value">{data.progress.avgIdleMin}m</div>
            <div className="label">Avg idle / task</div>
          </div>
          <div className="stat">
            <div className="value">{data.progress.safetyAlertsUnresolved}</div>
            <div className="label">Unresolved alerts</div>
          </div>
          <div className="stat">
            <div className="value">
              {unlockedSet.size}/{Object.keys(MODULE_NAMES).length}
            </div>
            <div className="label">Modules unlocked</div>
          </div>
        </div>
      )}
    </div>
  );
}
