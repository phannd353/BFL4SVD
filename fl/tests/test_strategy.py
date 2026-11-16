from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import torch
from flwr.app import ArrayRecord, MetricRecord
from flwr.serverapp.strategy import FedAvg

from src.hash import hash_state_dict
from src.strategy import QualityFedAvg


class QualityFedAvgTests(unittest.TestCase):
    def test_round_callbacks_record_aggregate_lineage(self) -> None:
        state_dict = {"weight": torch.tensor([1.0, 2.0])}
        arrays = ArrayRecord(state_dict)
        metrics = MetricRecord({"accuracy": 0.9})
        reply = MagicMock()
        reply.has_content.return_value = True
        reply.content.get.return_value = MetricRecord({"validation_score": 0.8})
        expected_hash = hash_state_dict(state_dict)

        with tempfile.TemporaryDirectory() as model_dir:
            strategy = QualityFedAvg(
                min_client_score=0.5,
                api_endpoint="http://api.example.test",
                auth_token="server-token",
                training_job_id="job-id",
                initial_model_hash="initial-hash",
                num_rounds=2,
                model_dir=model_dir,
            )
            with (
                patch("src.strategy.create_training_round") as start_round,
                patch("src.strategy.update_training_round") as complete_round,
                patch.object(
                    FedAvg,
                    "aggregate_train",
                    return_value=(arrays, metrics),
                ),
            ):
                strategy.create_first_round()
                result = strategy.aggregate_train(1, [reply])

            model_path = Path(model_dir) / f"{expected_hash}.pt"
            self.assertTrue(model_path.is_file())
            saved_state = torch.load(model_path, weights_only=True)
            self.assertEqual(hash_state_dict(saved_state), expected_hash)
            self.assertEqual(strategy.last_model_hash, expected_hash)
            self.assertEqual(result, (arrays, metrics))
            start_round.assert_any_call(
                "http://api.example.test",
                "server-token",
                "job-id",
                1,
                "initial-hash",
            )
            start_round.assert_any_call(
                "http://api.example.test",
                "server-token",
                "job-id",
                2,
                expected_hash,
            )
            complete_round.assert_called_once()
            self.assertEqual(complete_round.call_args.args[:4], (
                "http://api.example.test",
                "server-token",
                "job-id",
                1,
            ))
            self.assertEqual(
                complete_round.call_args.kwargs["aggregated_model_hash"],
                expected_hash,
            )

    def test_message_without_content_is_not_dereferenced(self) -> None:
        strategy = QualityFedAvg()
        reply = MagicMock()
        reply.has_content.return_value = False

        self.assertIsNone(strategy.aggregate_train(1, [reply]))
        reply.content.get.assert_not_called()


if __name__ == "__main__":
    unittest.main()
