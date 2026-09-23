import { useState } from "react";
import { api } from "../api.js";

export default function StartTaskModal({ task, onClose, onStarted }) {
  const [seatbeltStatus, setSeatbeltStatus] = useState("unfastened");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.startTask(task.taskId, {
        seatbeltStatus,
        position: { x: Number(x), y: Number(y) },
      });
      setResult(res);
      if (res.status === "ready") onStarted?.(res);
    } catch (err) {
      setResult({ status: "blocked", reason: err.body?.reason || "request_failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>Start {task.taskId}</h2>
          <span className="sub">{task.location}</span>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label>Seatbelt</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-option${seatbeltStatus === "fastened" ? " active" : ""}`}
                onClick={() => setSeatbeltStatus("fastened")}
              >
                Fastened
              </button>
              <button
                type="button"
                className={`toggle-option${seatbeltStatus === "unfastened" ? " active" : ""}`}
                onClick={() => setSeatbeltStatus("unfastened")}
              >
                Unfastened
              </button>
            </div>
          </div>

          <div className="field-group">
            <label>Machine position (simulated coordinates)</label>
            <div className="pos-inputs">
              <input
                type="number"
                value={x}
                onChange={(e) => setX(e.target.value)}
                placeholder="x"
                aria-label="Position x"
              />
              <input
                type="number"
                value={y}
                onChange={(e) => setY(e.target.value)}
                placeholder="y"
                aria-label="Position y"
              />
            </div>
          </div>

          {result && (
            <div className={`modal-result ${result.status === "ready" ? "ok" : "blocked"}`}>
              {result.status === "ready"
                ? "Cleared — task is ready to start."
                : reasonText(result.reason)}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn primary" onClick={submit} disabled={submitting}>
            {submitting ? "Checking…" : "Attempt start"}
          </button>
        </div>
      </div>
    </div>
  );
}

function reasonText(reason) {
  if (reason === "seatbelt_not_fastened") return "Blocked — seatbelt not fastened.";
  if (reason === "proximity_hazard") return "Blocked — proximity hazard in this zone at that position.";
  return "Blocked — request could not be completed.";
}
