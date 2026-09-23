"""
Offline training for the task-time regression.

Reads the synthetic dataset produced by backend/data/generateData.js
(run `npm run generate-data` in backend/ first if the CSV doesn't exist yet),
trains a scikit-learn LinearRegression on one-hot task_type / condition /
location plus a per-operator historical-duration feature, and writes the
trained model out as a plain JSON file (model.json) rather than a pickle —
so the Flask app has no scikit-learn-version coupling at serve time and the
weights are human-inspectable.

Usage:
    python train.py [path/to/synthetic-dataset.csv]
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

DEFAULT_DATA_PATH = Path(__file__).parent.parent / "backend" / "data" / "synthetic-dataset.csv"

TASK_TYPES = ["excavation", "grading", "loading", "trenching"]
CONDITIONS = ["dry", "wet", "muddy", "dusty"]
LOCATIONS = ["Zone-A", "Zone-B", "Zone-C"]


def build_features(df: pd.DataFrame, operator_history: dict, global_mean: float) -> pd.DataFrame:
    features = pd.DataFrame(index=df.index)

    for t in TASK_TYPES:
        features[f"task_type_{t}"] = (df["taskType"] == t).astype(int)
    for c in CONDITIONS:
        features[f"condition_{c}"] = (df["condition"] == c).astype(int)
    for l in LOCATIONS:
        features[f"location_{l}"] = (df["location"] == l).astype(int)

    features["operator_history"] = df["operatorId"].map(operator_history).fillna(global_mean)

    return features


def main():
    data_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DATA_PATH
    if not data_path.exists():
        print(f"Dataset not found at {data_path}.")
        print("Run `npm run generate-data` in backend/ first.")
        sys.exit(1)

    df = pd.read_csv(data_path)
    df = df[df["taskStatus"] == "complete"].reset_index(drop=True)

    # Operator history = each operator's mean historical duration, computed
    # from the training data only (this is what makes "operator_history" a
    # real, non-leaky feature rather than the label in disguise).
    global_mean = df["durationMin"].mean()
    operator_history = df.groupby("operatorId")["durationMin"].mean().to_dict()

    X = build_features(df, operator_history, global_mean)
    y = df["durationMin"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = LinearRegression()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    residual_std = float(np.std(y_test - y_pred))

    print(f"Trained on {len(X_train)} rows, tested on {len(X_test)} rows")
    print(f"MAE: {mae:.2f} min | R^2: {r2:.3f} | residual std: {residual_std:.2f} min")

    artifact = {
        "feature_names": list(X.columns),
        "coefficients": {name: float(c) for name, c in zip(X.columns, model.coef_)},
        "intercept": float(model.intercept_),
        "operator_history": {k: float(v) for k, v in operator_history.items()},
        "global_mean_duration": float(global_mean),
        "residual_std": residual_std,
        "metrics": {"mae": mae, "r2": r2, "n_train": len(X_train), "n_test": len(X_test)},
        "task_types": TASK_TYPES,
        "conditions": CONDITIONS,
        "locations": LOCATIONS,
    }

    out_path = Path(__file__).parent / "model.json"
    out_path.write_text(json.dumps(artifact, indent=2))
    print(f"Wrote model artifact -> {out_path}")


if __name__ == "__main__":
    main()
