import { api } from "../api.js";
import { usePolling } from "../hooks/usePolling.js";

export default function IdleEventLog({ machineId }) {
  const { data: events, error } = usePolling(
    () => api.getIdleEvents(machineId),
    [machineId],
    4000
  );

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Idle events</h2>
        <span className="sub">{machineId}</span>
      </div>

      {error && <div className="empty-state">Couldn't load idle events.</div>}
      {!error && !events && <div className="empty-state">Loading…</div>}
      {!error && events && events.length === 0 && (
        <div className="empty-state">No excessive idling flagged yet — RPM stays high with speed near 0 for 5+ minutes to trigger one.</div>
      )}

      {events && events.length > 0 && (
        <div>
          {[...events].reverse().map((event, i) => (
            <div className="idle-row" key={i}>
              <span className="duration">{event.idleDurationMin}m</span>
              <div>
                <div>{event.taskId}</div>
                <div className="meta">since {new Date(event.idleStart).toLocaleTimeString()}</div>
              </div>
              <span className="badge blocked">Flagged</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
