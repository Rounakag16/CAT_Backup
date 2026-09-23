import { api } from "../api.js";
import { usePolling } from "../hooks/usePolling.js";

export default function SafetyBanner({ machineId }) {
  const { data, error } = usePolling(() => api.getSafetyStatus(machineId), [machineId], 3000);

  if (error) {
    return (
      <div className="safety-banner hazard">
        <span className="status-dot" />
        <span className="value warn">Safety status unavailable — backend unreachable</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="safety-banner">
        <span className="status-dot" />
        <span className="value">Loading safety status…</span>
      </div>
    );
  }

  const hazard = data.proximityAlert || data.seatbeltStatus === "unfastened";

  return (
    <div className={`safety-banner${hazard ? " hazard" : ""}`}>
      <span className="status-dot" />
      <div className="field">
        <span className="label">Machine</span>
        <span className="value">{data.machineId}</span>
      </div>
      <div className="field">
        <span className="label">Zone</span>
        <span className="value">{data.zone || "—"}</span>
      </div>
      <div className="field">
        <span className="label">Seatbelt</span>
        <span className={`value ${data.seatbeltStatus === "fastened" ? "ok" : "warn"}`}>
          {data.seatbeltStatus === "fastened" ? "Fastened" : "Unfastened"}
        </span>
      </div>
      <div className="field">
        <span className="label">Proximity</span>
        <span className={`value ${data.proximityAlert ? "warn" : "ok"}`}>
          {data.proximityAlert ? "Hazard" : "Clear"}
        </span>
      </div>
      {data.activeAlerts?.length > 0 && (
        <span className="alerts">
          {data.activeAlerts.length} active alert{data.activeAlerts.length === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
