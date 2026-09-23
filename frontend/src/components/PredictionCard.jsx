import { useState } from "react";
import { api } from "../api.js";

const TASK_TYPES = ["excavation", "grading", "loading", "trenching"];
const CONDITIONS = ["dry", "wet", "muddy", "dusty"];
const LOCATIONS = ["Zone-A", "Zone-B", "Zone-C"];

export default function PredictionCard({ operatorId, task }) {
  const [taskType, setTaskType] = useState(task?.taskType || TASK_TYPES[0]);
  const [condition, setCondition] = useState(task?.condition || CONDITIONS[0]);
  const [location, setLocation] = useState(task?.location || LOCATIONS[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runPrediction() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.predict({ taskType, operatorId, condition, location });
      setResult(res);
    } catch (err) {
      setError(
        err.status === 503
          ? "ML service unavailable — start it with `python app.py` in ml-service/."
          : "Prediction request failed."
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const maxContribution = result
    ? Math.max(...result.featureAttribution.map((f) => Math.abs(f.contribution)))
    : 1;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Task time estimate</h2>
        <span className="sub">explainable regression</span>
      </div>
      <div className="panel-body">
        <div className="predict-form">
          <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={location} onChange={(e) => setLocation(e.target.value)} style={{ gridColumn: "1 / -1" }}>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <button className="btn primary" onClick={runPrediction} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Predicting…" : "Predict duration"}
        </button>

        {error && <div className="predict-error">{error}</div>}

        {!error && !result && (
          <div className="predict-placeholder">
            Set task type, condition and zone, then predict — the model was
            trained on the synthetic dataset with real per-operator history.
          </div>
        )}

        {result && (
          <div className="predict-result" style={{ marginTop: 16 }}>
            <div className="headline">
              <span className="num">{result.predictedDurationMin}</span>
              <span className="unit">minutes</span>
            </div>
            <div className="ci">
              Range: {result.confidenceIntervalMin[0]}–{result.confidenceIntervalMin[1]} min
            </div>

            {result.featureAttribution.map((f) => (
              <div className="attribution-row" key={f.feature}>
                <span className="name">{f.feature.replace(/_/g, " ")}</span>
                <div className="track">
                  <div
                    className="fill"
                    style={{ width: `${(Math.abs(f.contribution) / maxContribution) * 100}%` }}
                  />
                </div>
                <span className="pct">{Math.round(f.contribution * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
