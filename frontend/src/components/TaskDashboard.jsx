import { useState } from "react";
import { api } from "../api.js";
import { usePolling } from "../hooks/usePolling.js";
import StartTaskModal from "./StartTaskModal.jsx";

const STATUS_LABEL = {
  blocked: "Blocked",
  ready: "Ready",
  "in-progress": "In progress",
  complete: "Complete",
};

export default function TaskDashboard({ operatorId, onSelectTask, selectedTaskId }) {
  const { data: tasks, error, refresh } = usePolling(
    () => api.getTasks(operatorId),
    [operatorId],
    5000
  );
  const [modalTask, setModalTask] = useState(null);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Today's tasks</h2>
        <span className="sub">{operatorId}</span>
      </div>

      {error && <div className="empty-state">Couldn't reach the backend — is it running on :4000?</div>}
      {!error && !tasks && <div className="empty-state">Loading tasks…</div>}
      {!error && tasks && tasks.length === 0 && (
        <div className="empty-state">No tasks scheduled for this operator today.</div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="task-list">
          {tasks.map((task) => (
            <div
              key={task.taskId}
              className="task-row"
              style={{
                cursor: "pointer",
                background: selectedTaskId === task.taskId ? "var(--panel-raised)" : "transparent",
              }}
              onClick={() => onSelectTask(task)}
            >
              <span className="task-id">{task.taskId}</span>
              <div className="task-info">
                <div className="type">{task.taskType}</div>
                <div className="meta">
                  {task.location} · {task.condition}
                </div>
              </div>
              <span className={`badge ${task.status}`}>{STATUS_LABEL[task.status]}</span>
              {task.status === "blocked" ? (
                <button
                  className="btn small primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalTask(task);
                  }}
                >
                  Start
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}

      {modalTask && (
        <StartTaskModal
          task={modalTask}
          onClose={() => setModalTask(null)}
          onStarted={() => {
            setModalTask(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
