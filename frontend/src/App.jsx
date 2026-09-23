import { useState } from "react";
import SafetyBanner from "./components/SafetyBanner.jsx";
import TaskDashboard from "./components/TaskDashboard.jsx";
import PredictionCard from "./components/PredictionCard.jsx";
import TelemetrySimulator from "./components/TelemetrySimulator.jsx";
import IdleEventLog from "./components/IdleEventLog.jsx";
import TrainingHub from "./components/TrainingHub.jsx";

// Single-operator, single-machine view, matching the seed data in
// backend/src/store.js and the demo script in project_context.md §6.
const OPERATOR_ID = "OP1001";
const MACHINE_ID = "EXC001";

export default function App() {
  const [selectedTask, setSelectedTask] = useState(null);

  return (
    <div className="app">
      <header className="app-header">
        <div className="mark">
          <span className="chip">SOA</span>
          <h1>Smart Operator Assistant</h1>
        </div>
        <div className="operator-line">
          Operator <strong>{OPERATOR_ID}</strong> · Machine <strong>{MACHINE_ID}</strong>
        </div>
      </header>

      <SafetyBanner machineId={MACHINE_ID} />

      <div className="grid-main">
        <TaskDashboard
          operatorId={OPERATOR_ID}
          selectedTaskId={selectedTask?.taskId}
          onSelectTask={setSelectedTask}
        />
        <PredictionCard operatorId={OPERATOR_ID} task={selectedTask} />
      </div>

      <div className="grid-two">
        <TelemetrySimulator task={selectedTask} />
        <IdleEventLog machineId={MACHINE_ID} />
      </div>

      <div className="grid-full">
        <TrainingHub operatorId={OPERATOR_ID} />
      </div>
    </div>
  );
}
