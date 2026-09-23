// Zero-dependency backend (Node built-ins only) implementing the full API
// contract in shared/api-contract.md. No scope cut from the original plan:
// dashboard checkoff, full safety gating, idle detection, the full training
// skill tree, and a proxy to the ML microservice for /predict.

const http = require("http");
const path = require("path");
const fs = require("fs");

const store = require("./store");
const dashboard = require("./rules/dashboard");
const safety = require("./rules/safety");
const idleDetection = require("./rules/idleDetection");
const trainingHub = require("./rules/trainingHub");
const mlClient = require("./mlClient");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "frontend", "public");

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function serveStatic(req, res, urlPath) {
  let filePath = urlPath === "/" ? "/index.html" : urlPath;
  filePath = path.join(PUBLIC_DIR, filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: "forbidden" });
  fs.readFile(filePath, (err, content) => {
    if (err) return send(res, 404, { error: "not_found", note: "frontend not built yet" });
    const ext = path.extname(filePath);
    const type = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
async function handleTasks(req, res, query) {
  send(res, 200, dashboard.listTasksForOperator(query.operatorId));
}

async function handleTaskStart(req, res, taskId) {
  const body = await readBody(req);
  const result = safety.attemptStart(taskId, {
    seatbeltStatus: body.seatbeltStatus,
    position: body.position,
  });
  if (result.error) return send(res, 404, result);
  send(res, 200, result);
}

async function handleSafetyStatus(req, res, query) {
  send(res, 200, safety.statusForMachine(query.machineId));
}

async function handleTelemetry(req, res) {
  const body = await readBody(req);
  const { machineId, taskId, rpm, gpsSpeed, engineHours, fuelUsed, loadCycles } = body;

  store.telemetryLog.push({
    machineId, taskId, rpm, gpsSpeed, engineHours, fuelUsed, loadCycles,
    at: new Date().toISOString(),
  });

  // A task moves ready -> in-progress on its first telemetry tick.
  const task = store.tasks.find((t) => t.taskId === taskId);
  if (task && task.status === "ready") task.status = "in-progress";

  const idleEvent = idleDetection.ingestTick({ machineId, taskId, rpm, gpsSpeed });
  const completed = dashboard.evaluateCheckoff(taskId);

  send(res, 200, {
    accepted: true,
    idleFlagged: Boolean(idleEvent),
    taskCompleted: Boolean(completed),
  });
}

async function handleIdleEvents(req, res, query) {
  send(res, 200, idleDetection.idleEventsForMachine(query.machineId));
}

async function handleTraining(req, res, query) {
  send(res, 200, trainingHub.progressFor(query.operatorId));
}

async function handlePredict(req, res) {
  const body = await readBody(req);
  const { taskType, operatorId, condition, location } = body;
  if (!taskType || !operatorId || !condition || !location) {
    return send(res, 400, { error: "missing_fields" });
  }
  try {
    const prediction = await mlClient.predict({ taskType, operatorId, condition, location });
    send(res, 200, prediction);
  } catch (err) {
    send(res, 503, { error: "ml_service_unavailable", detail: err.message });
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams);

  if (req.method === "OPTIONS") return send(res, 204, {});

  try {
    if (req.method === "GET" && url.pathname === "/tasks") return handleTasks(req, res, query);
    if (req.method === "POST" && /^\/tasks\/[^/]+\/start$/.test(url.pathname)) {
      return handleTaskStart(req, res, url.pathname.split("/")[2]);
    }
    if (req.method === "GET" && url.pathname === "/safety/status") return handleSafetyStatus(req, res, query);
    if (req.method === "POST" && url.pathname === "/events/telemetry") return handleTelemetry(req, res);
    if (req.method === "GET" && url.pathname === "/events/idle") return handleIdleEvents(req, res, query);
    if (req.method === "GET" && url.pathname === "/training/progress") return handleTraining(req, res, query);
    if (req.method === "POST" && url.pathname === "/predict") return handlePredict(req, res);

    if (req.method === "GET") return serveStatic(req, res, url.pathname);
    send(res, 404, { error: "not_found" });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: "server_error", detail: err.message });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Smart Operator Assistant backend on :${PORT}`));

module.exports = server;
