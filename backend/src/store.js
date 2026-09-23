// Central in-memory store. Swap for a real DB later — every rule module reads/
// writes through this file only, so that's the one place storage would change.

const ZONES = {
  "Zone-A": { hazardRadius: 0, label: "Low-risk staging area" },
  "Zone-B": { hazardRadius: 15, label: "Active excavation, personnel nearby" },
  "Zone-C": { hazardRadius: 25, label: "Shared corridor with other machines" },
};

// Simulated "nearby personnel" points per zone — stand-in for a live proximity
// sensor feed. A machine position within hazardRadius of this point trips a
// proximity alert.
const HAZARD_POINTS = {
  "Zone-B": { x: 12, y: 6 },
  "Zone-C": { x: 20, y: 9 },
};

let tasks = [
  { taskId: "T-101", operatorId: "OP1001", machineId: "EXC001", taskType: "excavation", location: "Zone-B", condition: "wet", status: "blocked", scheduledStart: new Date().toISOString(), startedAt: null, completedAt: null },
  { taskId: "T-102", operatorId: "OP1001", machineId: "EXC001", taskType: "grading", location: "Zone-A", condition: "dry", status: "blocked", scheduledStart: new Date().toISOString(), startedAt: null, completedAt: null },
  { taskId: "T-103", operatorId: "OP1001", machineId: "EXC001", taskType: "trenching", location: "Zone-C", condition: "muddy", status: "blocked", scheduledStart: new Date().toISOString(), startedAt: null, completedAt: null },
];

let telemetryLog = [];      // every raw telemetry tick, keyed to a task
let idleEvents = [];        // flagged idle events
let safetyAlerts = [];      // proximity/seatbelt alerts
let completedTaskHistory = []; // { operatorId, taskType, idleMin, safetyAlerts, completedAt }

module.exports = {
  ZONES,
  HAZARD_POINTS,
  tasks,
  telemetryLog,
  idleEvents,
  safetyAlerts,
  completedTaskHistory,
};
