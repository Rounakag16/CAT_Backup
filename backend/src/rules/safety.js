// Bucket 2: Safety features — seatbelt compliance + geofenced proximity hazards.
// A task cannot move to "ready" until both checks pass. This is the pitch's
// core claim: safety is deterministic, not a model's judgment call.

const store = require("../store");

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function checkProximity(location, position) {
  const hazardPoint = store.HAZARD_POINTS[location];
  const zone = store.ZONES[location];
  if (!hazardPoint || !zone || zone.hazardRadius === 0) {
    return { hazard: false };
  }
  const d = distance(position || { x: 999, y: 999 }, hazardPoint);
  return { hazard: d <= zone.hazardRadius, distance: d, zone: location };
}

function attemptStart(taskId, { seatbeltStatus, position }) {
  const task = store.tasks.find((t) => t.taskId === taskId);
  if (!task) return { error: "task_not_found" };

  if (seatbeltStatus !== "fastened") {
    return { taskId, status: "blocked", reason: "seatbelt_not_fastened" };
  }

  const proximity = checkProximity(task.location, position);
  if (proximity.hazard) {
    store.safetyAlerts.push({
      machineId: task.machineId,
      taskId,
      type: "proximity_hazard",
      zone: task.location,
      distance: proximity.distance,
      at: new Date().toISOString(),
    });
    return { taskId, status: "blocked", reason: "proximity_hazard" };
  }

  task.status = "ready";
  task.startedAt = new Date().toISOString();
  return { taskId, status: task.status, startedAt: task.startedAt };
}

function statusForMachine(machineId) {
  const activeAlerts = store.safetyAlerts.filter((a) => a.machineId === machineId);
  const task = store.tasks.find((t) => t.machineId === machineId && t.status !== "complete");
  return {
    machineId,
    zone: task ? task.location : null,
    seatbeltStatus: activeAlerts.some((a) => a.type === "seatbelt") ? "unfastened" : "fastened",
    proximityAlert: activeAlerts.some((a) => a.type === "proximity_hazard"),
    activeAlerts,
  };
}

module.exports = { attemptStart, statusForMachine, checkProximity };
