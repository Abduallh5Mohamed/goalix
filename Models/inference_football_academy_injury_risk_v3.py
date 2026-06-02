import argparse
import json
from pathlib import Path
import sys

import joblib
import pandas as pd

# =========================
# LOAD MODEL
# =========================

MODEL_PATH = Path(__file__).resolve().with_name(
    "football_academy_injury_risk_model_v3.joblib"
)

model = joblib.load(MODEL_PATH)

# =========================
# REQUIRED INPUT COLUMNS
# =========================

REQUIRED_COLUMNS = [
    "age",
    "position",
    "attendance_rate",
    "training_sessions_per_week",
    "match_minutes_last_week",
    "fatigue_rating",
    "previous_injury",
    "pain_or_discomfort"
]

# =========================
# VALIDATE INPUT
# =========================

def validate_input(record):

    missing = [
        col for col in REQUIRED_COLUMNS
        if col not in record
    ]

    if missing:
        raise ValueError(
            f"Missing required fields: {missing}"
        )

# =========================
# MAP RISK LEVEL
# =========================

def map_risk_level(probability):

    if probability < 0.35:
        return {
            "risk_level": "Low",
            "recommendation":
            "Continue normal training"
        }

    elif probability < 0.65:
        return {
            "risk_level": "Medium",
            "recommendation":
            "Monitor player and reduce training load slightly"
        }

    else:
        return {
            "risk_level": "High",
            "recommendation":
            "Reduce training load and alert medical staff"
        }

# =========================
# PREDICT FUNCTION
# =========================

def predict_injury_risk(record):

    validate_input(record)

    sample_input = pd.DataFrame(
        [record],
        columns=REQUIRED_COLUMNS
    )

    probability = model.predict_proba(
        sample_input
    )[:, 1][0]

    risk_data = map_risk_level(probability)

    result = {
        "risk_percentage":
        round(float(probability * 100), 2),

        "risk_level":
        risk_data["risk_level"],

        "alert_flag":
        risk_data["risk_level"] in [
            "Medium",
            "High"
        ],

        "recommendation":
        risk_data["recommendation"]
    }

    return result


def predict_record(record):
    prediction = predict_injury_risk(record)

    return {
        "player_id": record.get("player_id"),
        "player_name": record.get("player_name"),
        **prediction,
    }


def predict_payload(payload):
    records = payload
    if isinstance(payload, dict):
        records = payload.get("records", [payload])

    if not isinstance(records, list):
        raise ValueError("Input payload must be a record or list of records")

    results = []
    for record in records:
        try:
            results.append(predict_record(record))
        except Exception as exc:
            results.append({
                "player_id": record.get("player_id") if isinstance(record, dict) else None,
                "player_name": record.get("player_name") if isinstance(record, dict) else None,
                "error": str(exc),
            })

    return results

# =========================
# TEST EXAMPLE
# =========================

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-stdin", action="store_true")
    args = parser.parse_args()

    if args.json_stdin:
        payload = json.loads(sys.stdin.read() or "[]")
        print(json.dumps(predict_payload(payload), ensure_ascii=False))
        sys.exit(0)

    sample_player = {
        "age": 16,
        "position": "Midfielder",
        "attendance_rate": 0.88,
        "training_sessions_per_week": 5,
        "match_minutes_last_week": 90,
        "fatigue_rating": 4,
        "previous_injury": 0,
        "pain_or_discomfort": 0
    }

    prediction = predict_injury_risk(sample_player)

    print(prediction)
