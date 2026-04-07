from __future__ import annotations

import json

import federated_learning_mock as fl_mock


def test_federated_mock_writes_local_and_global_outputs(tmp_path, monkeypatch):
    node_output_dir = tmp_path / "nodes"
    aggregate_path = tmp_path / "aggregate.json"

    monkeypatch.setattr(fl_mock, "NODE_OUTPUT_DIR", node_output_dir)
    monkeypatch.setattr(fl_mock, "AGGREGATE_PATH", aggregate_path)

    aggregate_payload = fl_mock.run_federated_learning_mock()

    assert aggregate_payload["aggregation_strategy"] == "weighted_federated_average"
    assert aggregate_payload["total_training_samples"] == 13
    assert "global_parameters" in aggregate_payload
    assert aggregate_path.exists()

    engineering_output = node_output_dir / "node-engineering" / "processed_parameters.json"
    assert engineering_output.exists()

    engineering_payload = json.loads(engineering_output.read_text(encoding="utf-8"))
    assert engineering_payload["training_mode"] == "local_only"
    assert "processed_parameters" in engineering_payload
    assert "privacy_note" in engineering_payload


def test_local_training_returns_processed_parameters_only():
    node = fl_mock.NODES[0]
    raw_records = fl_mock.fetch_mock_data_via_dummy_api(node)

    result = fl_mock.train_local_model(node, raw_records)

    assert "processed_parameters" in result
    assert "local_metrics" in result
    assert "privacy_note" in result
    assert "employee_ref" not in result
