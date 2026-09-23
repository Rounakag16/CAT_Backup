"""
ML microservice — the one deliberate model in the system.

Serves POST /predict per shared/api-contract.md. Loads model.json (produced
by train.py) at startup; a missing model.json fails loudly at boot rather
than serving fake numbers.
"""

import json
from pathlib import Path

from flask import Flask, request, jsonify

MODEL_PATH = Path(__file__).parent / "model.json"

app = Flask(__name__)

if not MODEL_PATH.exists():
    raise SystemExit(
        f"model.json not found at {MODEL_PATH}.\n"
        "Run `python train.py` first (after generating the dataset with "
        "`npm run generate-data` in backend/)."
    )

with open(MODEL_PATH) as f:
    MODEL = json.load(f)

COEF = MODEL["coefficients"]
INTERCEPT = MODEL["intercept"]
OPERATOR_HISTORY = MODEL["operator_history"]
GLOBAL_MEAN = MODEL["global_mean_duration"]
RESIDUAL_STD = MODEL["residual_std"]
TASK_TYPES = MODEL["task_types"]
CONDITIONS = MODEL["conditions"]
LOCATIONS = MODEL["locations"]


def build_feature_vector(task_type, condition, location, operator_id):
    features = {}
    for t in TASK_TYPES:
        features[f"task_type_{t}"] = 1 if task_type == t else 0
    for c in CONDITIONS:
        features[f"condition_{c}"] = 1 if condition == c else 0
    for l in LOCATIONS:
        features[f"location_{l}"] = 1 if location == l else 0
    features["operator_history"] = OPERATOR_HISTORY.get(operator_id, GLOBAL_MEAN)
    return features


def predict_duration(task_type, condition, location, operator_id):
    features = build_feature_vector(task_type, condition, location, operator_id)

    prediction = INTERCEPT
    contributions = []
    for name, value in features.items():
        contribution = COEF.get(name, 0.0) * value
        prediction += contribution
        if value != 0:
            contributions.append({"feature": name, "raw": contribution})

    total_abs = sum(abs(c["raw"]) for c in contributions) or 1.0
    feature_attribution = sorted(
        (
            {"feature": c["feature"], "contribution": round(abs(c["raw"]) / total_abs, 2)}
            for c in contributions
        ),
        key=lambda c: c["contribution"],
        reverse=True,
    )

    predicted = max(5, round(prediction))
    margin = max(3, round(RESIDUAL_STD))

    return {
        "predictedDurationMin": predicted,
        "confidenceIntervalMin": [predicted - margin, predicted + margin],
        "featureAttribution": feature_attribution,
    }


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_metrics": MODEL["metrics"]})


@app.route("/predict", methods=["POST"])
def predict():
    body = request.get_json(silent=True) or {}
    task_type = body.get("taskType")
    operator_id = body.get("operatorId")
    condition = body.get("condition")
    location = body.get("location")

    missing = [k for k, v in {
        "taskType": task_type, "operatorId": operator_id,
        "condition": condition, "location": location,
    }.items() if not v]
    if missing:
        return jsonify({"error": "missing_fields", "fields": missing}), 400

    if task_type not in TASK_TYPES:
        return jsonify({"error": "invalid_task_type", "allowed": TASK_TYPES}), 400
    if condition not in CONDITIONS:
        return jsonify({"error": "invalid_condition", "allowed": CONDITIONS}), 400
    if location not in LOCATIONS:
        return jsonify({"error": "invalid_location", "allowed": LOCATIONS}), 400

    result = predict_duration(task_type, condition, location, operator_id)
    return jsonify(result)


if __name__ == "__main__":
    port = 5001
    print(f"ML microservice on :{port} (model trained on {MODEL['metrics']['n_train']} rows, "
          f"MAE {MODEL['metrics']['mae']:.2f} min)")
    app.run(host="0.0.0.0", port=port)
