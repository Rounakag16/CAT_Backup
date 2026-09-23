// Talks to the ML microservice's POST /predict. Kept as its own module so the
// backend has exactly one place that knows the ML service exists — swapping
// its URL, or mocking it in tests, only touches this file.

const http = require("http");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

function predict(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL("/predict", ML_SERVICE_URL);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 3000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error("ml_service_bad_response"));
            }
          } else {
            reject(new Error(`ml_service_status_${res.statusCode}`));
          }
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("ml_service_timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = { predict };
