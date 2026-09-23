// Generates a synthetic event log matching shared/schema.md. Run standalone
// (`node backend/data/generateData.js`) to produce a CSV for offline model
// training in the ML service — this file has no dependency on the live server.

const fs = require("fs");
const path = require("path");

const TASK_TYPES = ["excavation", "grading", "loading", "trenching"];
const CONDITIONS = ["dry", "wet", "muddy", "dusty"];
const LOCATIONS = ["Zone-A", "Zone-B", "Zone-C"];
const OPERATORS = ["OP1001", "OP1002", "OP1003", "OP1004"];

const BASE_DURATION = { excavation: 30, grading: 22, loading: 18, trenching: 35 };
const CONDITION_PENALTY = { dry: 0, wet: 9, muddy: 14, dusty: 3 };
const LOCATION_PENALTY = { "Zone-A": -1, "Zone-B": 2, "Zone-C": 4 };

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function gaussianNoise(stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stdDev;
}

function generateRow(i) {
  const taskType = pick(TASK_TYPES);
  const condition = pick(CONDITIONS);
  const location = pick(LOCATIONS);
  const operatorId = pick(OPERATORS);

  // operator "skill" is a stable per-operator multiplier so history is a real signal
  const operatorSkill = 0.85 + (OPERATORS.indexOf(operatorId) * 0.08);

  const trueDuration =
    (BASE_DURATION[taskType] + CONDITION_PENALTY[condition] + LOCATION_PENALTY[location]) *
    operatorSkill +
    gaussianNoise(2.5);

  const idlingTimeMin = Math.max(0, Math.round(gaussianNoise(4) + (condition === "muddy" ? 3 : 0)));

  return {
    timestamp: new Date(Date.now() - randInt(0, 30) * 86400000).toISOString(),
    machineId: `EXC0${randInt(1, 3)}`,
    operatorId,
    taskId: `T-${1000 + i}`,
    taskType,
    location,
    engineHours: Number((randInt(100, 900) + Math.random()).toFixed(1)),
    fuelUsed: Number((trueDuration * 0.12).toFixed(2)),
    loadCycles: randInt(4, 30),
    idlingTimeMin,
    seatbeltStatus: Math.random() < 0.97 ? "fastened" : "unfastened",
    proximityStatus: Math.random() < 0.05 ? "hazard" : "clear",
    safetyAlertTriggered: Math.random() < 0.05,
    condition,
    taskStatus: "complete",
    rpm: randInt(700, 2200),
    gpsSpeed: Number((Math.random() * 12).toFixed(1)),
    durationMin: Math.max(5, Math.round(trueDuration)), // label for training
  };
}

function generate(n = 2000) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(generateRow(i));
  return rows;
}

function toCsv(rows) {
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => row[h]).join(","));
  }
  return lines.join("\n");
}

if (require.main === module) {
  const rows = generate(2000);
  const outDir = path.join(__dirname);
  fs.writeFileSync(path.join(outDir, "synthetic-dataset.csv"), toCsv(rows));
  fs.writeFileSync(path.join(outDir, "synthetic-dataset.json"), JSON.stringify(rows, null, 2));
  console.log(`Generated ${rows.length} rows -> backend/data/synthetic-dataset.{csv,json}`);
}

module.exports = { generate, toCsv };
