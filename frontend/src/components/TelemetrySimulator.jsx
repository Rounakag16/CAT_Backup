import { useState } from "react";
import { api } from "../api.js";

// No real telemetry hardware exists — this panel is the stand-in described in
// project_context.md §4 ("simulated coordinates written into the log"). It
// lets an operator (or, in a demo, the presenter) push one tick at a time so
// the idle-detection and dashboard-checkoff rules have something to react to.
export default function TelemetrySimulator({ task, onTick }) {
  const [rpm, setRpm] = useState(1450);
  const [gpsSpeed, setGpsSpeed] = useState(0);
  const [engineHours, setEngineHours] = useState(812.4);
  const [fuelUsed, setFuelUsed] = useState(3.2);
  const [loadCycles, setLoadCycles] = useState(12);
  const [log, setLog] = useState([]);
  const [sending, setSending] = useState(false);

  if (!task) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h2>Telemetry</h2>
        </div>
        <div className="empty-state">Select a task to send simulated telemetry ticks.</div>
      </div>
    );
  }

  async function sendTick() {
    setSending(true);
    try {
      const res = await api.sendTelemetry({
        machineId: task.machineId,
        taskId: task.taskId,
        rpm: Number(rpm),
        gpsSpeed: Number(gpsSpeed),
        engineHours: Number(engineHours),
        fuelUsed: Number(fuelUsed),
        loadCycles: Number(loadCycles),
      });
      setLog((prev) => [
        {
          at: new Date().toLocaleTimeString(),
          rpm,
          gpsSpeed,
          engineHours,
          idleFlagged: res.idleFlagged,
          taskCompleted: res.taskCompleted,
        },
        ...prev,
      ].slice(0, 12));
      setEngineHours((h) => Number((Number(h) + 0.15).toFixed(2)));
      onTick?.(res);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Telemetry</h2>
        <span className="sub">
          {task.taskId} · {task.machineId}
        </span>
      </div>
      <div className="panel-body">
        <div className="telemetry-form">
          <div className="field-group">
            <label>RPM</label>
            <input type="number" value={rpm} onChange={(e) => setRpm(e.target.value)} />
          </div>
          <div className="field-group">
            <label>GPS speed (km/h)</label>
            <input type="number" value={gpsSpeed} onChange={(e) => setGpsSpeed(e.target.value)} />
          </div>
          <div className="field-group">
            <label>Engine hours</label>
            <input
              type="number"
              step="0.1"
              value={engineHours}
              onChange={(e) => setEngineHours(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label>Fuel used (L)</label>
            <input type="number" step="0.1" value={fuelUsed} onChange={(e) => setFuelUsed(e.target.value)} />
          </div>
          <div className="field-group full">
            <label>Load cycles</label>
            <input type="number" value={loadCycles} onChange={(e) => setLoadCycles(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn primary" onClick={sendTick} disabled={sending}>
            {sending ? "Sending…" : "Send tick"}
          </button>
          <button
            className="btn"
            onClick={() => {
              setRpm(1450);
              setGpsSpeed(0);
            }}
          >
            Preset: idling
          </button>
          <button
            className="btn"
            onClick={() => {
              setRpm(1600);
              setGpsSpeed(6);
            }}
          >
            Preset: working
          </button>
        </div>

        {log.length > 0 && (
          <div className="telemetry-log">
            {log.map((entry, i) => (
              <div key={i} className={`line${entry.idleFlagged ? " flag" : ""}`}>
                {entry.at} — RPM {entry.rpm}, {entry.gpsSpeed} km/h, {entry.engineHours}h
                {entry.idleFlagged ? " — idle flagged" : ""}
                {entry.taskCompleted ? " — task complete" : ""}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
