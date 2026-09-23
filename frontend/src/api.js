// Thin wrapper around the endpoints in shared/api-contract.md. In dev, Vite's
// proxy (vite.config.js) forwards these paths to the backend on :4000, so
// BASE_URL is empty by default. Set VITE_API_URL for a production build that
// isn't served from the same origin as the backend.

const BASE_URL = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const err = new Error(body?.error || `request_failed_${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  getTasks: (operatorId) => request(`/tasks?operatorId=${encodeURIComponent(operatorId)}`),

  startTask: (taskId, { seatbeltStatus, position }) =>
    request(`/tasks/${encodeURIComponent(taskId)}/start`, {
      method: "POST",
      body: JSON.stringify({ seatbeltStatus, position }),
    }),

  getSafetyStatus: (machineId) =>
    request(`/safety/status?machineId=${encodeURIComponent(machineId)}`),

  sendTelemetry: (payload) =>
    request(`/events/telemetry`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getIdleEvents: (machineId) =>
    request(`/events/idle?machineId=${encodeURIComponent(machineId)}`),

  getTrainingProgress: (operatorId) =>
    request(`/training/progress?operatorId=${encodeURIComponent(operatorId)}`),

  predict: ({ taskType, operatorId, condition, location }) =>
    request(`/predict`, {
      method: "POST",
      body: JSON.stringify({ taskType, operatorId, condition, location }),
    }),
};
