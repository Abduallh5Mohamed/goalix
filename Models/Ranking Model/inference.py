from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
import sys
from typing import Dict

import pickle
import pandas as pd


@dataclass(frozen=True)
class InferenceInput:
    match_score: float
    coach_score: float
    attendance_score: float
    weekly_ai_score: float
    position: str
    trend: str = "Stable"
    rank: int = 1


@dataclass(frozen=True)
class ModelArtifacts:
    model: object


def get_grade(score: float) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


def load_artifacts(
    model_path: Path = Path(__file__).resolve().with_name("football_ranking_model.pkl"),
) -> ModelArtifacts:
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    with model_path.open("rb") as f:
        model = pickle.load(f)
    return ModelArtifacts(model=model)


def predict_player(
    inputs: InferenceInput,
    artifacts: ModelArtifacts,
    include_prediction: bool = False,
) -> Dict[str, object]:
    weekly_score = (
        inputs.match_score * 0.50
        + inputs.coach_score * 0.25
        + inputs.attendance_score * 0.15
        + inputs.weekly_ai_score * 0.10
    )

    result: Dict[str, object] = {
        "weekly_score": round(float(weekly_score), 2),
        "grade": get_grade(weekly_score),
        "trend": inputs.trend,
        "rank": int(inputs.rank),
    }
    if include_prediction:
        input_df = pd.DataFrame(
            [
                {
                    "match_score": inputs.match_score,
                    "coach_score": inputs.coach_score,
                    "attendance_score": inputs.attendance_score,
                    "weekly_ai_score": inputs.weekly_ai_score,
                    "position": inputs.position,
                }
            ]
        )
        predicted_next_score = float(artifacts.model.predict(input_df)[0])
        result["predicted_next_score"] = round(predicted_next_score, 2)

    return result


def _number(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _input_from_record(record: Dict[str, object]) -> InferenceInput:
    return InferenceInput(
        match_score=_number(record.get("match_score")),
        coach_score=_number(record.get("coach_score")),
        attendance_score=_number(record.get("attendance_score")),
        weekly_ai_score=_number(record.get("weekly_ai_score")),
        position=str(record.get("position") or "UNKNOWN"),
        trend=str(record.get("trend") or "Stable"),
        rank=int(_number(record.get("rank"), 1)),
    )


def predict_record(
    record: Dict[str, object],
    artifacts: ModelArtifacts,
    include_prediction: bool = True,
) -> Dict[str, object]:
    result = predict_player(
        _input_from_record(record),
        artifacts,
        include_prediction=include_prediction,
    )
    return {
        "id": record.get("id"),
        "player_id": record.get("player_id"),
        "player_name": record.get("player_name"),
        **result,
    }


def predict_payload(payload: object, artifacts: ModelArtifacts) -> list[Dict[str, object]]:
    records = payload
    if isinstance(payload, dict):
        records = payload.get("records", [payload])
    if not isinstance(records, list):
        raise ValueError("Input payload must be a record or list of records")

    results: list[Dict[str, object]] = []
    for record in records:
        try:
            if not isinstance(record, dict):
                raise ValueError("Each record must be an object")
            results.append(predict_record(record, artifacts))
        except Exception as exc:
            safe_record = record if isinstance(record, dict) else {}
            results.append(
                {
                    "id": safe_record.get("id"),
                    "player_id": safe_record.get("player_id"),
                    "player_name": safe_record.get("player_name"),
                    "error": str(exc),
                }
            )
    return results


def demo() -> None:
    artifacts = load_artifacts()
    samples = [
        InferenceInput(
            match_score=90.5,
            coach_score=90.0,
            attendance_score=90.0,
            weekly_ai_score=99.0,
            position="ATTACK",
            trend="Stable",
            rank=1,
        ),
        InferenceInput(
            match_score=75.0,
            coach_score=70.0,
            attendance_score=85.0,
            weekly_ai_score=60.0,
            position="MIDFIELD",
            trend="Improving",
            rank=5,
        ),
        InferenceInput(
            match_score=62.0,
            coach_score=58.0,
            attendance_score=70.0,
            weekly_ai_score=55.0,
            position="DEFENSE",
            trend="Stable",
            rank=12,
        ),
        InferenceInput(
            match_score=48.0,
            coach_score=52.0,
            attendance_score=65.0,
            weekly_ai_score=40.0,
            position="GOALKEEPER",
            trend="Declining",
            rank=20,
        ),
    ]

    for i, sample in enumerate(samples, start=1):
        print(f"Sample {i}:", predict_player(sample, artifacts))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-stdin", action="store_true")
    args = parser.parse_args()

    if args.json_stdin:
        artifacts = load_artifacts()
        payload = json.loads(sys.stdin.read() or "[]")
        print(json.dumps(predict_payload(payload, artifacts), ensure_ascii=False))
        sys.exit(0)

    demo()
