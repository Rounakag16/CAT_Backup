// Bucket 3: Operator training hub — progressive content unlocking via
// log-derived competency milestones. No separate "training DB": everything
// is computed from completedTaskHistory + idleEvents + safetyAlerts.

const store = require("../store");

function competencyFor(operatorId) {
  const history = store.completedTaskHistory.filter((h) => h.operatorId === operatorId);
  const tasksCompleted = history.length;
  const gradingTasks = history.filter((h) => h.taskType === "grading").length;
  const unresolvedSafetyAlerts = history.reduce((s, h) => s + h.unresolvedSafetyAlerts, 0);
  const avgIdleMin = tasksCompleted
    ? history.reduce((s, h) => s + h.idleMin, 0) / tasksCompleted
    : 0;
  const last5 = history.slice(-5);
  const idleFlagsLast5 = last5.filter((h) => h.idleMin >= 5).length;

  return { tasksCompleted, gradingTasks, unresolvedSafetyAlerts, avgIdleMin, idleFlagsLast5 };
}

// Order matters: each module's prerequisite is the previous module's unlock,
// mirroring the skill-tree structure in shared/schema.md.
function evaluateModules(competency) {
  const modules = [];

  modules.push({ id: "basic-safety", unlocked: true, requirement: "always available" });

  const trenchUnlocked =
    competency.tasksCompleted >= 5 && competency.unresolvedSafetyAlerts === 0;
  modules.push({
    id: "trench-fundamentals",
    unlocked: trenchUnlocked,
    requirement: "5 tasks completed, 0 unresolved safety alerts",
  });

  const gradingUnlocked = trenchUnlocked && competency.gradingTasks >= 3;
  modules.push({
    id: "advanced-grading",
    unlocked: gradingUnlocked,
    requirement: "trench-fundamentals unlocked + 3 grading tasks completed",
  });

  const heavyLoadUnlocked =
    competency.tasksCompleted >= 10 && competency.avgIdleMin < 8;
  modules.push({
    id: "heavy-load-handling",
    unlocked: heavyLoadUnlocked,
    requirement: "10 tasks completed + average idle time under 8 min/task",
  });

  const zoneCUnlocked = gradingUnlocked && competency.idleFlagsLast5 === 0;
  modules.push({
    id: "zone-c-certification",
    unlocked: zoneCUnlocked,
    requirement: "advanced-grading unlocked + 0 idle-flags in last 5 tasks",
  });

  return modules;
}

function progressFor(operatorId) {
  const competency = competencyFor(operatorId);
  const modules = evaluateModules(competency);
  return {
    operatorId,
    unlockedModules: modules.filter((m) => m.unlocked).map((m) => m.id),
    lockedModules: modules.filter((m) => !m.unlocked).map((m) => ({ id: m.id, requirement: m.requirement })),
    progress: {
      tasksCompleted: competency.tasksCompleted,
      avgIdleMin: Number(competency.avgIdleMin.toFixed(1)),
      safetyAlertsUnresolved: competency.unresolvedSafetyAlerts,
    },
  };
}

module.exports = { progressFor, competencyFor, evaluateModules };
