from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
NODE_OUTPUT_DIR = BASE_DIR / "federated_nodes"
AGGREGATE_PATH = BASE_DIR / "aggregate.json"


@dataclass(frozen=True)
class FederatedNode:
    node_id: str
    department: str
    region: str


NODES = [
    FederatedNode("node-engineering", "Engineering", "APAC"),
    FederatedNode("node-finance", "Finance", "EMEA"),
    FederatedNode("node-operations", "Operations", "NA"),
]


DUMMY_API_DATA: dict[str, list[dict[str, Any]]] = {
    "node-engineering": [
        {"employee_ref": "ENG-001", "days_requested": 3, "approved": 1, "escalated": 0, "override_used": 0, "absence_risk": 0.12},
        {"employee_ref": "ENG-002", "days_requested": 16, "approved": 1, "escalated": 1, "override_used": 0, "absence_risk": 0.41},
        {"employee_ref": "ENG-003", "days_requested": 7, "approved": 1, "escalated": 0, "override_used": 0, "absence_risk": 0.18},
        {"employee_ref": "ENG-004", "days_requested": 2, "approved": 0, "escalated": 0, "override_used": 0, "absence_risk": 0.56},
    ],
    "node-finance": [
        {"employee_ref": "FIN-010", "days_requested": 5, "approved": 1, "escalated": 0, "override_used": 0, "absence_risk": 0.20},
        {"employee_ref": "FIN-011", "days_requested": 21, "approved": 0, "escalated": 1, "override_used": 1, "absence_risk": 0.63},
        {"employee_ref": "FIN-012", "days_requested": 11, "approved": 1, "escalated": 0, "override_used": 0, "absence_risk": 0.26},
        {"employee_ref": "FIN-013", "days_requested": 14, "approved": 1, "escalated": 0, "override_used": 0, "absence_risk": 0.30},
    ],
    "node-operations": [
        {"employee_ref": "OPS-100", "days_requested": 4, "approved": 1, "escalated": 0, "override_used": 0, "absence_risk": 0.14},
        {"employee_ref": "OPS-101", "days_requested": 18, "approved": 1, "escalated": 1, "override_used": 0, "absence_risk": 0.49},
        {"employee_ref": "OPS-102", "days_requested": 6, "approved": 1, "escalated": 0, "override_used": 0, "absence_risk": 0.17},
        {"employee_ref": "OPS-103", "days_requested": 9, "approved": 0, "escalated": 0, "override_used": 0, "absence_risk": 0.52},
        {"employee_ref": "OPS-104", "days_requested": 24, "approved": 0, "escalated": 1, "override_used": 1, "absence_risk": 0.71},
    ],
}


def fetch_mock_data_via_dummy_api(node: FederatedNode) -> list[dict[str, Any]]:
    payload = DUMMY_API_DATA.get(node.node_id, [])
    return [record.copy() for record in payload]


def train_local_model(node: FederatedNode, raw_records: list[dict[str, Any]]) -> dict[str, Any]:
    sample_count = len(raw_records)
    if sample_count == 0:
        raise ValueError(f"No mock data available for {node.node_id}.")

    approval_rate = mean(record["approved"] for record in raw_records)
    escalation_rate = mean(record["escalated"] for record in raw_records)
    override_rate = mean(record["override_used"] for record in raw_records)
    average_leave_days = mean(record["days_requested"] for record in raw_records)
    long_leave_ratio = mean(1 if record["days_requested"] > 14 else 0 for record in raw_records)
    average_absence_risk = mean(record["absence_risk"] for record in raw_records)

    processed_parameters = {
        "bias": round(approval_rate - 0.5, 4),
        "days_weight": round(average_leave_days / 30, 4),
        "escalation_weight": round(escalation_rate, 4),
        "override_weight": round(override_rate, 4),
        "risk_weight": round(average_absence_risk, 4),
        "long_leave_weight": round(long_leave_ratio, 4),
    }

    local_metrics = {
        "sample_count": sample_count,
        "approval_rate": round(approval_rate, 4),
        "escalation_rate": round(escalation_rate, 4),
        "override_rate": round(override_rate, 4),
        "average_leave_days": round(average_leave_days, 2),
        "average_absence_risk": round(average_absence_risk, 4),
    }

    return {
        "node_id": node.node_id,
        "department": node.department,
        "region": node.region,
        "training_mode": "local_only",
        "privacy_note": "Raw leave records remain at the node. Only processed parameters are shared.",
        "processed_parameters": processed_parameters,
        "local_metrics": local_metrics,
    }


def write_node_result(local_result: dict[str, Any]) -> None:
    node_path = NODE_OUTPUT_DIR / local_result["node_id"]
    node_path.mkdir(parents=True, exist_ok=True)
    output_path = node_path / "processed_parameters.json"
    output_path.write_text(json.dumps(local_result, indent=2), encoding="utf-8")


def aggregate_local_models(local_results: list[dict[str, Any]]) -> dict[str, Any]:
    total_samples = sum(result["local_metrics"]["sample_count"] for result in local_results)
    parameter_names = list(local_results[0]["processed_parameters"].keys())

    aggregated_parameters: dict[str, float] = {}
    for parameter_name in parameter_names:
        weighted_sum = sum(
            result["processed_parameters"][parameter_name]
            * result["local_metrics"]["sample_count"]
            for result in local_results
        )
        aggregated_parameters[parameter_name] = round(weighted_sum / total_samples, 4)

    aggregate_payload = {
        "aggregation_strategy": "weighted_federated_average",
        "privacy_principle": "Central aggregator receives processed parameters only.",
        "participating_nodes": [
            {
                "node_id": result["node_id"],
                "department": result["department"],
                "region": result["region"],
                "sample_count": result["local_metrics"]["sample_count"],
            }
            for result in local_results
        ],
        "global_parameters": aggregated_parameters,
        "total_training_samples": total_samples,
    }

    AGGREGATE_PATH.write_text(json.dumps(aggregate_payload, indent=2), encoding="utf-8")
    return aggregate_payload


def run_federated_learning_mock() -> dict[str, Any]:
    local_results: list[dict[str, Any]] = []

    for node in NODES:
        raw_records = fetch_mock_data_via_dummy_api(node)
        local_result = train_local_model(node, raw_records)
        write_node_result(local_result)
        local_results.append(local_result)

    return aggregate_local_models(local_results)


if __name__ == "__main__":
    aggregate = run_federated_learning_mock()
    print("Federated learning mock complete.")
    print(json.dumps(aggregate, indent=2))
