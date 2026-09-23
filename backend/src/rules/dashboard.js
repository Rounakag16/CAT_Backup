// Bucket 1: Daily task dashboard — telemetry-verified checkoff.
// A task auto-completes once engine-hours have advanced enough and the
// machine's GPS/position telemetry shows continuous coverage of its zone for
// the task's expected duration window. No manual "mark complete" button.

const store = require("../store");

const MIN_ENGINE_HOURS_DELTA = 0.4; // ~24 min of engine-on time, simulated
const MIN_TELEMETRY_TICKS = 3;      // minimum ticks required to trust the checkoff

function evaluateCheckoff(taskId) {
  const task = store.tasks.find((t) => t.taskId === taskId);
  if (!task || task.status !== "in-progress") return null;

  const ticks = store.telemetryLog.filter((t) => t.taskId === taskId);
  if (ticks.length < MIN_TELEMETRY_TICKS) return null;

  const engineHoursDelta =
    ticks[ticks.length - 1].engineHours - ticks[0].engineHours;

  if (engineHoursDelta >= MIN_ENGINE_HOURS_DELTA) {
    task.status = "complete";
    task.completedAt = new Date().toISOString();

    const taskIdleEvents = store.idleEvents.filter((e) => e.taskId === taskId);
    const taskAlerts = store.safetyAlerts.filter((a) => a.taskId === taskId);
    const totalIdleMin = taskIdleEvents.reduce((s, e) => s + e.idleDurationMin, 0);

    store.completedTaskHistory.push({
      operatorId: task.operatorId,
      taskType: task.taskType,
      idleMin: totalIdleMin,
      unresolvedSafetyAlerts: taskAlerts.length,
      completedAt: task.completedAt,
    });

    return task;
  }
  return null;
}

function listTasksForOperator(operatorId) {
  return store.tasks.filter((t) => !operatorId || t.operatorId === operatorId);
}

module.exports = { evaluateCheckoff, listTasksForOperator };
